# Collections API

## Overview

The Collections API allows you to programmatically manage PocketBase collections, including creating, updating, deleting, and configuring collections.

## List Collections

```http
GET /api/collections
Authorization: Bearer {admin_token}
```

Response:
```json
{
  "page": 1,
  "perPage": 30,
  "totalItems": 3,
  "totalPages": 1,
  "items": [
    {
      "id": "_pbc_344172009",
      "name": "users",
      "type": "auth",
      "system": false,
      "fields": [
        {
          "name": "email",
          "type": "email",
          "required": true,
          "options": {
            "exceptDomains": null,
            "onlyDomains": null
          }
        },
        {
          "name": "verified",
          "type": "bool",
          "required": false
        }
      ],
      "indexes": [],
      "listRule": null,
      "viewRule": null,
      "createRule": null,
      "updateRule": null,
      "deleteRule": null,
      "created": "2024-01-01 12:00:00Z",
      "updated": "2024-01-10 08:30:00Z"
    }
  ]
}
```

## Get Single Collection

```http
GET /api/collections/{collectionId}
Authorization: Bearer {admin_token}
```

## Create Collection

```http
POST /api/collections
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "name": "products",
  "type": "base",
  "fields": [
    {
      "name": "title",
      "type": "text",
      "required": true,
      "options": {
        "min": 1,
        "max": 200
      }
    },
    {
      "name": "price",
      "type": "number",
      "required": true,
      "options": {
        "min": 0
      }
    }
  ],
  "indexes": [],
  "listRule": "status = 'published'",
  "viewRule": "status = 'published'",
  "createRule": "@request.auth.id != ''",
  "updateRule": "@request.auth.role = 'admin'",
  "deleteRule": "@request.auth.role = 'admin'"
}
```

## Update Collection

```http
PATCH /api/collections/{collectionId}
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "name": "products",
  "fields": [
    {
      "name": "title",
      "type": "text",
      "required": true
    }
  ],
  "indexes": [
    "CREATE INDEX idx_products_title ON products (title)"
  ],
  "listRule": "status = 'published'",
  "updateRule": "@request.auth.role = 'admin'"
}
```

## Delete Collection

```http
DELETE /api/collections/{collectionId}
Authorization: Bearer {admin_token}
```

## Import Collections

```http
POST /api/collections/import
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "collections": [
    {
      "name": "posts",
      "type": "base",
      "fields": [
        {
          "name": "title",
          "type": "text"
        }
      ],
      "listRule": "",
      "viewRule": "",
      "createRule": "@request.auth.id != ''"
    }
  ]
}

For the full set of fields and options, refer to the [official API Collections reference](https://pocketbase.io/docs/api-collections/).
**Note:** This is a placeholder file. See [core/collections.md](../core/collections.md) for comprehensive collection documentation.
