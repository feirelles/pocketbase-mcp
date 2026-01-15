#!/usr/bin/env python3
#!/usr/bin/env python3
"""PocketBase data export helper with admin auth, pagination, filters, and NDJSON support."""

import argparse
import json
from getpass import getpass
from pathlib import Path
from typing import Dict, Iterable, List, Optional

import requests


DEFAULT_BATCH_SIZE = 200
REQUEST_TIMEOUT = 30


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


def list_collections(base_url: str, headers: Dict[str, str]) -> List[Dict]:
    collections: List[Dict] = []
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
        collections.extend(items)
        total = payload.get("totalItems", len(collections))
        if page * 200 >= total or not items:
            break
        page += 1
    return collections


def filter_collections(
    collections: Iterable[Dict],
    include: Optional[List[str]],
    exclude: Optional[List[str]],
    include_system: bool,
) -> List[Dict]:
    include_set = {name.strip() for name in include or [] if name.strip()}
    exclude_set = {name.strip() for name in exclude or [] if name.strip()}
    filtered: List[Dict] = []
    for collection in collections:
        name = collection.get("name")
        if not name:
            continue
        if include_set and name not in include_set:
            continue
        if name in exclude_set:
            continue
        if not include_system and collection.get("system"):
            continue
        filtered.append(collection)
    filtered.sort(key=lambda c: c.get("name", ""))
    return filtered


def export_collection(
    base_url: str,
    collection: Dict,
    headers: Dict[str, str],
    output_dir: Path,
    batch_size: int,
    fmt: str,
) -> int:
    name = collection["name"]
    output_dir.mkdir(parents=True, exist_ok=True)
    total_written = 0
    file_ext = "ndjson" if fmt == "ndjson" else "json"
    output_path = output_dir / f"{name}.{file_ext}"
    records_url = f"{base_url}/api/collections/{name}/records"

    with output_path.open("w", encoding="utf-8") as handle:
        page = 1
        aggregated: List[Dict] = []
        while True:
            response = requests.get(
                records_url,
                params={"page": page, "perPage": batch_size},
                headers=headers,
                timeout=REQUEST_TIMEOUT,
            )
            response.raise_for_status()
            payload = response.json()
            items = payload.get("items", [])
            if not items:
                break
            if fmt == "ndjson":
                for item in items:
                    handle.write(json.dumps(item, ensure_ascii=False))
                    handle.write("\n")
            else:
                aggregated.extend(items)
            total_written += len(items)
            total_items = payload.get("totalItems")
            if total_items and total_written >= total_items:
                break
            page += 1

        if fmt == "json":
            json.dump(
                {
                    "collection": name,
                    "exportedAt": collection.get("updated", ""),
                    "items": aggregated,
                },
                handle,
                ensure_ascii=False,
                indent=2,
            )

    return total_written


def build_manifest(output_dir: Path, manifest: List[Dict]):
    if not manifest:
        return
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export PocketBase collections")
    parser.add_argument("base_url", help="PocketBase base URL, e.g. http://127.0.0.1:8090")
    parser.add_argument(
        "output_dir",
        nargs="?",
        default="pocketbase_export",
        help="Directory to write exported files",
    )
    parser.add_argument("--email", help="Admin email for authentication")
    parser.add_argument("--password", help="Admin password (omit to prompt)")
    parser.add_argument(
        "--collections",
        help="Comma-separated collection names to export",
    )
    parser.add_argument(
        "--exclude",
        help="Comma-separated collection names to skip",
    )
    parser.add_argument(
        "--include-system",
        action="store_true",
        help="Include system collections (default: skip)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help="Records per request (default: 200)",
    )
    parser.add_argument(
        "--format",
        choices=["json", "ndjson"],
        default="json",
        help="Output format per collection",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    base_url = args.base_url.rstrip("/")
    output_dir = Path(args.output_dir)

    headers = authenticate(base_url, args.email, args.password)

    collections = list_collections(base_url, headers)
    include = args.collections.split(",") if args.collections else None
    exclude = args.exclude.split(",") if args.exclude else None
    filtered = filter_collections(collections, include, exclude, args.include_system)

    if not filtered:
        raise RuntimeError("No collections selected for export")

    manifest: List[Dict] = []
    for collection in filtered:
        name = collection["name"]
        count = export_collection(
            base_url,
            collection,
            headers,
            output_dir,
            max(args.batch_size, 1),
            args.format,
        )
        manifest.append({"collection": name, "records": count})
        print(f"Exported {name}: {count} records")

    build_manifest(output_dir, manifest)
    print(f"Completed export to {output_dir.resolve()}")


if __name__ == "__main__":
    main()
