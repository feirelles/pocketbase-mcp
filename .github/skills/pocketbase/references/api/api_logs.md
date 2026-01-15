# Logs API

## Overview

The Logs API provides access to application logs, including authentication logs, request logs, and custom logs.

## Get Request Logs

```http
GET /api/logs/requests?page=1&perPage=50&filter=created>="2024-01-01"
Authorization: Bearer {admin_token}
```

Response:
```json
{
  "page": 1,
  "perPage": 50,
  "totalItems": 100,
  "totalPages": 2,
  "items": [
    {
      "id": "log_id",
      "method": "GET",
      "url": "/api/collections/posts/records",
      "status": 200,
      "duration": 15,
      "remoteIP": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "referer": "",
      "created": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Get Auth Logs

```http
GET /api/logs/auth?page=1&perPage=50
Authorization: Bearer {admin_token}
```

## Get Raw Logs

```http
GET /api/logs?type=request&level=error&page=1&perPage=50
Authorization: Bearer {admin_token}
```

---

**Note:** This is a placeholder file. See [core/going_to_production.md](../core/going_to_production.md) for logging best practices.
