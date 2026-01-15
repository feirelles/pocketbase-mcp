# Backups API

## Overview

PocketBase ships with a Backups API for full database snapshots. It is distinct from the per-collection import/export workflows described in [Data Migration Workflows](../../core/data_migration.md). Use backups for disaster recovery or environment cloning; use targeted migrations when you need fine-grained control over specific collections.

## List Backups

```http
GET /api/backups
Authorization: Bearer {admin_token}
```

## Create Backup

```http
POST /api/backups
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "name": "backup-2024-01-01"
}
```

## Download Backup

```http
GET /api/backups/{backupId}/download
Authorization: Bearer {admin_token}
```

## Upload Backup

```http
POST /api/backups/upload
Content-Type: multipart/form-data
Authorization: Bearer {admin_token}

file: backup.sql
```

## Restore Backup

```http
POST /api/backups/{backupId}/restore
Authorization: Bearer {admin_token}
```

### Best practices

- Schedule backups before and after running large data migrations.
- Store backups off the instance (object storage or encrypted volumes) and version them alongside schema migrations.
- To restore into a clean instance and then migrate selective collections, combine this API with the targeted tools documented in [Data Migration Workflows](../../core/data_migration.md).

See also [core/going_to_production.md](../core/going_to_production.md#backup-strategy) for operational guidance.
