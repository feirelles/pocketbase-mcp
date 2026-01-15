# Data Migration Workflows

PocketBase does not ship with a one-click import/export pipeline, but the core project maintainers outline several supported patterns in [GitHub discussion #6287](https://github.com/pocketbase/pocketbase/discussions/6287). This guide explains how to choose the right workflow, hardens the existing helper scripts, and points to extension patterns you can adapt for larger migrations.

---

## Decision Guide

| Scenario | Recommended Path | Notes |
| --- | --- | --- |
| Small/medium data sets (< 100k records) and you just need JSON dumps | [Web API scripts](#option-1-web-api-scripts) | Works everywhere; slower but simplest to automate |
| You want transactions, schema automation, or better performance | [Custom CLI commands](#option-2-custom-cli-commands) | Implement in JS `pb_hooks` or native Go extensions |
| You must transform data from another live database | [Mini Go program bridging databases](#option-3-mini-go-bridge) | Connect to PocketBase `pb_data` alongside the legacy DB |
| You already have CSV or SQLite dumps | [External tooling](#option-4-external-import-tools) | sqlite3 `.import`, community tools like `pocketbase-import` |
| You need full control and understand PB internals | [Raw SQLite scripts](#option-5-raw-sqlite-scripts) | Only if you know how PB stores complex field types |

> **Tip:** If you are migrating an application that already works and you do not plan on extending it, consider whether the migration effort is worth it—the PocketBase author recommends staying on the stable stack unless you need PB-specific capabilities.

---

## Pre-flight Checklist

1. **Back up `pb_data/` first.** Use `sqlite3` or the Backups API before experimenting.
2. **Create collections and fields up-front.** Use the Admin UI, migrations (`./pocketbase migrate collections`), or extension code so relations, file fields, and validation rules exist before import.
3. **Map unique keys per collection.** Decide which field(s) you will use for upserts (e.g., `email` on `users`).
4. **Audit data types.** PocketBase stores multi-selects and relation sets as JSON arrays, and file fields expect PocketBase-managed file IDs.
5. **Plan authentication.** Admin endpoints require a superuser token; scripts now prompt for credentials.
6. **Run a dry run.** Use the script `--dry-run` flag or custom command to validate payloads before writing.

---

## Option 1: Web API Scripts

Use the hardened Python helpers in `scripts/` when you need a portable solution without custom builds.

### Export

```bash
python scripts/export_data.py \
  http://127.0.0.1:8090 \
  pb_export \
  --email admin@example.com \
  --batch-size 500 \
  --format ndjson \
  --exclude _pb_users,_migrations
```

- Authenticates as an admin (password prompt if omitted).
- Enumerates collections dynamically; filter with `--collections` or `--exclude`.
- Streams records page-by-page and writes per-collection `.json` or `.ndjson` files plus a `manifest.json` summary.
- Use NDJSON for large exports where you want to stream line-by-line elsewhere.

### Import

```bash
python scripts/import_data.py \
  http://127.0.0.1:8090 \
  pb_export \
  --email admin@example.com \
  --upsert users=email --upsert orders=orderNumber \
  --concurrency 4 \
  --batch-size 200 \
  --dry-run
```

- Supports `.json` and `.ndjson` dumps.
- Cleans system fields (`id`, `created`, `updated`, `@expand`).
- Optional per-collection upserts via `--upsert collection=field` (use `*=field` as a fallback).
- Batches and runs limited concurrency to reduce HTTP latency, with optional throttling between batches.
- `--dry-run` validates payloads without writing to the database. When satisfied, re-run without the flag.
- Fails fast if a collection is missing unless `--skip-missing` is set.

This approach is intentionally simple and aligns with the "v1" recommendation from the PocketBase maintainer. Expect higher runtimes for large datasets but minimal setup.

---

## Option 2: Custom CLI Commands

Register commands inside `pb_hooks/` or a Go extension to bypass the REST layer and operate inside a database transaction.

### JS `pb_hooks` example

```js
/// <reference path="../pb_data/types.d.ts" />
const { Command } = require("commander");

$app.rootCmd.addCommand(new Command({
  use: "data:import <file> <collection>",
  run: (cmd, args) => {
    const rows = require(args[0]);
    const collection = $app.findCollectionByNameOrId(args[1]);
    $app.runInTransaction((tx) => {
      for (const row of rows) {
        const record = new Record(collection);
        record.load(row);
        tx.save(record);
      }
    });
  },
}));

$app.rootCmd.addCommand(new Command({
  use: "data:export <collection> <file>",
  run: (cmd, args) => {
    const records = $app.findAllRecords(args[0], cmd.getOptionValue("batch") || 1000);
    $os.writeFile(args[1], JSON.stringify(records, null, 2), 0o644);
  },
}));
```

- Invoke with `./pocketbase data:import ./users.json users`.
- Wrap heavy operations in `runInTransaction` and consider `saveNoValidate` only after cleaning data.
- Extend with chunks, progress logs, or schema checks per your needs.

See also: [`references/go/go_console_commands.md`](../go/go_console_commands.md) for Go equivalents and CLI wiring tips.

---

## Option 3: Mini Go Bridge

For zero-downtime migrations or complex transformations, create a Go program that embeds PocketBase and connects to your legacy database driver (`database/sql`, `pgx`, etc.).

High-level steps:

1. Import `github.com/pocketbase/pocketbase` as a module and boot the app in headless mode.
2. Connect to the legacy database, stream rows, and normalize data types.
3. Use `app.RunInTransaction` plus `app.FindCollectionByNameOrId` to create records directly.
4. Batch writes to avoid exhausting memory; reuse prepared statements for speed.

Refer to [`references/go/go_database.md`](../go/go_database.md) and [`references/go/go_migrations.md`](../go/go_migrations.md) for transaction helpers and schema management patterns.

---

## Option 4: External Import Tools

- **sqlite3 CLI** (`.import`, `.dump`, `.excel`): usable when the source data already matches the PocketBase schema. Ensure collections/fields exist first.
- **Community tool [`michal-kapala/pocketbase-import`](https://github.com/michal-kapala/pocketbase-import)**: handles CSV and flat JSON, creates text fields dynamically, and wraps operations in a transaction.
- **Custom CSV pipelines**: parse CSV with your preferred language, then leverage the REST scripts or CLI commands above.

Always inspect the generated SQLite tables after import to confirm multi-value fields and relation columns are stored as expected.

---

## Option 5: Raw SQLite Scripts

This path edits `pb_data/data.db` directly. Only attempt it if you fully understand PocketBase’s internal schema conventions:

1. Snapshot the database before touching it.
2. Insert `_collections` metadata before writing to collection tables so the Admin UI and APIs recognize the data.
3. Convert non-SQLite dumps (PostgreSQL/MySQL) to SQLite-compatible syntax.
4. Manually serialize multiselects, relation lists, and JSON fields.

Treat this as a last resort when other methods are impractical.

---

## Validation & Rollback

1. Compare counts between source and target collections (`records/count` endpoint or SQL).
2. Spot-check a few complex records (relations, files, arrays).
3. Run application-level smoke tests or automation scripts.
4. If issues appear, restore the pre-flight backup and iterate.
5. Document the exact command set you used for future recoveries.

---

## Related References

- [`scripts/export_data.py`](../../scripts/export_data.py) – authenticated export script with filters, pagination, and NDJSON support.
- [`scripts/import_data.py`](../../scripts/import_data.py) – authenticated import script with upsert, batching, and dry-run.
- [`references/go/go_console_commands.md`](../go/go_console_commands.md) – extend PocketBase with custom CLI commands.
- [`references/go/go_routing.md`](../go/go_routing.md) – expose admin-only import/export endpoints if you prefer HTTP jobs.
- [`references/api/api_records.md`](../api/api_records.md) – record filtering syntax used by the scripts.
- [`references/api/api_backups.md`](../api/api_backups.md) – full database backup/restore (different from selective migrations).

---

## Summary Checklist

- [ ] Pick a workflow that matches the data volume and complexity.
- [ ] Prepare schema and unique constraints before importing.
- [ ] Run exports with authentication and pagination.
- [ ] Test imports with `--dry-run`, then run again without it.
- [ ] Validate data counts and integrity, keep a rollback plan handy.
