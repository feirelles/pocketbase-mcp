# Health API

## Overview

The Health API provides system health checks, metrics, and status information.

## Check Health Status

```http
GET /api/health
```

Response:
```json
{
  "code": 200,
  "data": {
    "status": "ok",
    "metrics": {
      "clients": 5,
      "requests": 1000,
      "errors": 2
    }
  }
}
```

## Detailed Health Check

```http
GET /api/health/detailed
Authorization: Bearer {admin_token}
```

Response:
```json
{
  "status": "ok",
  "version": "0.20.0",
  "uptime": 3600,
  "database": {
    "status": "ok",
    "size": 1048576,
    "connections": 5
  },
  "cache": {
    "status": "ok",
    "hits": 100,
    "misses": 10
  },
  "metrics": {
    "active_connections": 5,
    "total_requests": 1000,
    "error_rate": 0.02
  }
}
```

## Metrics

```http
GET /api/metrics
Authorization: Bearer {admin_token}
```

---

**Note:** This is a placeholder file. See [core/going_to_production.md](../core/going_to_production.md#monitoring-and-logging) for monitoring best practices.
