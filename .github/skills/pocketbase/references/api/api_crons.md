# Crons API

## Overview

The Crons API manages background jobs and scheduled tasks.

## List Crons

```http
GET /api/crons
Authorization: Bearer {admin_token}
```

## Get Single Cron

```http
GET /api/crons/{cronId}
Authorization: Bearer {admin_token}
```

## Create Cron

```http
POST /api/crons
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "name": "daily-backup",
  "query": "SELECT 1",
  "cron": "0 2 * * *",
  "schedule": "0 2 * * *"
}
```

## Update Cron

```http
PATCH /api/crons/{cronId}
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "cron": "0 3 * * *"
}
```

## Delete Cron

```http
DELETE /api/crons/{cronId}
Authorization: Bearer {admin_token}
```

---

**Note:** This is a placeholder file. See [go/jobs_scheduling.md](../go/go_jobs_scheduling.md) for background jobs.
