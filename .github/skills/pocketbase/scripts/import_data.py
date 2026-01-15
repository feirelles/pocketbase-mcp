#!/usr/bin/env python3
#!/usr/bin/env python3
"""PocketBase data import helper with admin auth, batching, optional upsert, and dry-run."""

import argparse
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from getpass import getpass
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional, Tuple

import requests


REQUEST_TIMEOUT = 30
DEFAULT_BATCH_SIZE = 100
DROP_KEYS = {"id", "created", "updated", "@collectionId", "@collectionName", "@expand"}


def authenticate(base_url: str, email: Optional[str], password: Optional[str]) -> Dict[str, str]:
    if not email:
        return {}
    if not password:
        password = getpass(prompt="Admin password: ")
    response = requests.post(
        f"{base_url}/api/admins/auth-with-password",
        json={"identity": email, "password": password},
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    token = response.json().get("token")
    if not token:
        raise RuntimeError("Authentication response missing token")
    return {"Authorization": f"Bearer {token}"}


def list_collections(base_url: str, headers: Dict[str, str]) -> Dict[str, Dict]:
    collections: Dict[str, Dict] = {}
    page = 1
    while True:
        response = requests.get(
            f"{base_url}/api/collections",
            params={"page": page, "perPage": 200},
            headers=headers,
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
        items = payload.get("items", [])
        for item in items:
            if item.get("name"):
                collections[item["name"]] = item
        total = payload.get("totalItems", len(collections))
        if page * 200 >= total or not items:
            break
        page += 1
    return collections


def chunked(iterable: Iterable[Dict], size: int) -> Iterator[List[Dict]]:
    chunk: List[Dict] = []
    for item in iterable:
        chunk.append(item)
        if len(chunk) >= size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk


def iter_ndjson(file_path: Path) -> Iterator[Dict]:
    with file_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            yield json.loads(line)


def load_json_records(file_path: Path) -> Tuple[List[Dict], Optional[str]]:
    with file_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if isinstance(payload, dict):
        return payload.get("items", []), payload.get("collection")
    if isinstance(payload, list):
        return payload, None
    raise ValueError(f"Unsupported JSON structure in {file_path}")


def clean_record(record: Dict) -> Dict:
    return {k: v for k, v in record.items() if k not in DROP_KEYS}


def prepend_items(items: Iterable[Dict], iterator: Iterator[Dict]) -> Iterator[Dict]:
    for item in items:
        yield item
    for item in iterator:
        yield item


def build_filter(field: str, value) -> str:
    if value is None:
        return f"{field} = null"
    if isinstance(value, bool):
        return f"{field} = {str(value).lower()}"
    if isinstance(value, (int, float)):
        return f"{field} = {value}"
    escaped = str(value).replace("\"", r"\"")
    return f'{field} = "{escaped}"'


def request_with_retry(session: requests.Session, method: str, url: str, *, retries: int = 3, backoff: float = 1.0, **kwargs) -> requests.Response:
    last_response: Optional[requests.Response] = None
    for attempt in range(retries):
        response = session.request(method, url, timeout=REQUEST_TIMEOUT, **kwargs)
        status = response.status_code
        if status in {429, 503} and attempt < retries - 1:
            time.sleep(backoff)
            backoff = min(backoff * 2, 8)
            last_response = response
            continue
        if status >= 400:
            response.raise_for_status()
        return response
    assert last_response is not None
    last_response.raise_for_status()


def find_existing(
    base_url: str,
    collection: str,
    field: str,
    value,
    headers: Dict[str, str],
) -> Optional[Dict]:
    session = requests.Session()
    try:
        response = request_with_retry(
            session,
            "get",
            f"{base_url}/api/collections/{collection}/records",
            headers=headers,
            params={
                "page": 1,
                "perPage": 1,
                "filter": build_filter(field, value),
                "skipTotal": 1,
            },
        )
        items = response.json().get("items", [])
        if items:
            return items[0]
        return None
    finally:
        session.close()


def process_record(
    base_url: str,
    collection: str,
    record: Dict,
    headers: Dict[str, str],
    upsert_field: Optional[str],
    dry_run: bool,
) -> Tuple[bool, Optional[str]]:
    data = clean_record(record)
    if dry_run:
        return True, None
    session = requests.Session()
    try:
        url = f"{base_url}/api/collections/{collection}/records"
        if upsert_field and upsert_field in record:
            existing = find_existing(base_url, collection, upsert_field, record.get(upsert_field), headers)
            if existing:
                record_id = existing.get("id")
                if record_id:
                    response = request_with_retry(
                        session,
                        "patch",
                        f"{url}/{record_id}",
                        headers=headers,
                        json=data,
                    )
                    return response.ok, None
        response = request_with_retry(
            session,
            "post",
            url,
            headers=headers,
            json=data,
        )
        return response.status_code in {200, 201}, None
    except requests.HTTPError as exc:
        return False, f"HTTP {exc.response.status_code}: {exc.response.text[:200]}"
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)
    finally:
        session.close()


def parse_upsert(args: argparse.Namespace) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    for item in args.upsert or []:
        if "=" not in item:
            raise ValueError(f"Invalid upsert mapping '{item}'. Use collection=field or *=field")
        collection, field = item.split("=", 1)
        mapping[collection.strip()] = field.strip()
    return mapping


def infer_collection(file_path: Path, first_record: Optional[Dict]) -> str:
    if first_record and first_record.get("@collectionName"):
        return first_record["@collectionName"]
    return file_path.stem


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import PocketBase data dumps")
    parser.add_argument("base_url", help="PocketBase base URL, e.g. http://127.0.0.1:8090")
    parser.add_argument("input_path", help="Directory or file with export data")
    parser.add_argument("--email", help="Admin email for authentication")
    parser.add_argument("--password", help="Admin password (omit to prompt)")
    parser.add_argument("--collections", help="Comma-separated collections to include")
    parser.add_argument("--exclude", help="Comma-separated collections to skip")
    parser.add_argument("--upsert", action="append", help="collection=field mapping (use *=field for default)")
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE, help="Records per batch")
    parser.add_argument("--concurrency", type=int, default=4, help="Concurrent workers per batch")
    parser.add_argument("--throttle", type=float, default=0.0, help="Seconds to sleep between batches")
    parser.add_argument("--dry-run", action="store_true", help="Parse files without writing to PocketBase")
    parser.add_argument("--skip-missing", action="store_true", help="Skip files whose collections do not exist")
    return parser.parse_args()


def main():
    args = parse_args()
    base_url = args.base_url.rstrip("/")
    input_path = Path(args.input_path)
    if not input_path.exists():
        raise SystemExit(f"Input path {input_path} does not exist")

    headers = authenticate(base_url, args.email, args.password)
    collections = list_collections(base_url, headers)

    include = {c.strip() for c in args.collections.split(",")} if args.collections else None
    exclude = {c.strip() for c in args.exclude.split(",")} if args.exclude else set()
    upsert_map = parse_upsert(args)

    if input_path.is_file():
        files = [input_path]
    else:
        files = sorted(
            p for p in input_path.iterdir() if p.is_file() and p.suffix.lower() in {".json", ".ndjson"}
        )

    if not files:
        raise SystemExit("No data files found")

    for file_path in files:
        if file_path.stem == "manifest":
            continue

        if file_path.suffix.lower() == ".ndjson":
            iterator = iter_ndjson(file_path)
            peeked: List[Dict] = []
            try:
                first_record = next(iterator)
                peeked.append(first_record)
            except StopIteration:
                print(f"Skipping {file_path.name}: no records")
                continue
            source_iter = prepend_items(peeked, iterator)
            meta_collection = None
        else:
            records, meta_collection = load_json_records(file_path)
            if not records:
                print(f"Skipping {file_path.name}: no records")
                continue
            first_record = records[0]
            source_iter = iter(records)

        collection = meta_collection or infer_collection(file_path, first_record)
        if include and collection not in include:
            continue
        if collection in exclude:
            continue
        if collection not in collections:
            if args.skip_missing:
                print(f"Skipping {file_path.name}: collection '{collection}' not found")
                continue
            raise SystemExit(f"Collection '{collection}' not found in PocketBase")

        print(f"Importing {file_path.name} -> {collection}")
        total = success = 0
        failures: List[str] = []
        field = upsert_map.get(collection, upsert_map.get("*"))

        source_iter = prepend_items(peeked, iterator)
        for batch in chunked(source_iter, max(args.batch_size, 1)):
            workers = max(args.concurrency, 1)
            if workers == 1:
                for record in batch:
                    ok, error = process_record(base_url, collection, record, headers, field, args.dry_run)
                    total += 1
                    success += int(ok)
                    if not ok and error:
                        failures.append(error)
            else:
                with ThreadPoolExecutor(max_workers=workers) as executor:
                    futures = {
                        executor.submit(
                            process_record,
                            base_url,
                            collection,
                            record,
                            headers,
                            field,
                            args.dry_run,
                        ): record
                        for record in batch
                    }
                    for future in as_completed(futures):
                        ok, error = future.result()
                        total += 1
                        success += int(ok)
                        if not ok and error:
                            failures.append(error)
            if args.throttle > 0:
                time.sleep(args.throttle)

        print(f"  {success}/{total} records processed")
        if failures:
            print(f"  {len(failures)} failures (showing up to 3):")
            for message in failures[:3]:
                print(f"    - {message}")


if __name__ == "__main__":
    main()
