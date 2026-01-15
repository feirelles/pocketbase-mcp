# go_migrations - Go Extensions

## Overview

PocketBase migrations capture schema changes and ensure collections look identical across environments. Generate them with `./pocketbase migrate collections`, edit them manually, or author Go-based migrations for more complex logic. See [go_overview.md](go_overview.md) for a complete walkthrough.

---

## Preparing for Data Imports

1. **Define collections and fields before importing data.** Either create them in the Admin UI and snapshot with `migrate collections`, or programmatically add them inside a migration using `app.FindCollectionByNameOrId` and the `schema` helpers.
2. **Record unique constraints in migrations.** Use indexes and validation rules so the import scripts can rely on deterministic upsert keys.
3. **Version relation changes.** If you add or rename relation fields, ship the migration alongside your import plan; run it first so the import sees the correct schema.
4. **Keep migrations idempotent.** Wrap schema mutations in guards (`if collection == nil { ... }`) when writing Go migrations to avoid panics on re-run.

For end-to-end import/export workflows, continue with [Data Migration Workflows](../core/data_migration.md).
