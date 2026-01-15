# PocketBase Schema Templates

Pre-built collection schemas for common application types.

## Table of Contents
1. [Blog Platform](#blog-platform)
2. [E-commerce Store](#e-commerce-store)
3. [Social Network](#social-network)
4. [Task Management](#task-management)
5. [Forum/Discussion Board](#forumdiscussion-board)
6. [Real Estate Listings](#real-estate-listings)
7. [Learning Management System](#learning-management-system)

## Blog Platform

### Posts Collection
```json
{
  "id": "posts",
  "name": "Posts",
  "type": "base",
  "system": false,
  "schema": [
    {
      "id": "title",
      "name": "title",
      "type": "text",
      "required": true,
      "options": {
        "min": 1,
        "max": 200
      }
    },
    {
      "id": "slug",
      "name": "slug",
      "type": "text",
      "required": true,
      "unique": true,
      "options": {
        "min": 1,
        "max": 200
      }
    },
    {
      "id": "content",
      "name": "content",
      "type": "text",
      "required": true,
      "options": {
        "min": 1
      }
    },
    {
      "id": "excerpt",
      "name": "excerpt",
      "type": "text",
      "options": {
        "max": 500
      }
    },
    {
      "id": "featured_image",
      "name": "featured_image",
      "type": "file",
      "required": false,
      "options": {
        "maxSelect": 1,
        "maxSize": 5242880,
        "mimeTypes": ["image/jpeg", "image/png", "image/webp"]
      }
    },
    {
      "id": "author",
      "name": "author",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "users",
        "cascadeDelete": false,
        "maxSelect": 1
      }
    },
    {
      "id": "category",
      "name": "category",
      "type": "relation",
      "options": {
        "collectionId": "categories",
        "cascadeDelete": false,
        "maxSelect": 1
      }
    },
    {
      "id": "tags",
      "name": "tags",
      "type": "text",
      "options": {
        "maxSelect": 50
      }
    },
    {
      "id": "status",
      "name": "status",
      "type": "select",
      "required": true,
      "options": {
        "values": ["draft", "published", "archived"]
      }
    },
    {
      "id": "published_date",
      "name": "published_date",
      "type": "date",
      "required": false
    },
    {
      "id": "view_count",
      "name": "view_count",
      "type": "number",
      "required": true,
      "options": {
        "min": 0
      }
    }
  ],
  "listRule": "status = 'published'",
  "viewRule": "status = 'published'",
  "createRule": "@request.auth.id != ''",
  "updateRule": "author = @request.auth.id || @request.auth.id = 'ADMIN_ID'",
  "deleteRule": "author = @request.auth.id || @request.auth.id = 'ADMIN_ID'"
}
```

### Categories Collection
```json
{
  "id": "categories",
  "name": "Categories",
  "type": "base",
  "system": false,
  "schema": [
    {
      "id": "name",
      "name": "name",
      "type": "text",
      "required": true,
      "unique": true,
      "options": {
        "min": 1,
        "max": 100
      }
    },
    {
      "id": "slug",
      "name": "slug",
      "type": "text",
      "required": true,
      "unique": true,
      "options": {
        "min": 1,
        "max": 100
      }
    },
    {
      "id": "description",
      "name": "description",
      "type": "text",
      "options": {
        "max": 500
      }
    },
    {
      "id": "color",
      "name": "color",
      "type": "text",
      "options": {
        "max": 7
      }
    }
  ],
  "listRule": "",
  "viewRule": "",
  "createRule": "@request.auth.id != ''",
  "updateRule": "@request.auth.id != ''",
  "deleteRule": "@request.auth.id != ''"
}
```

### Comments Collection
```json
{
  "id": "comments",
  "name": "Comments",
  "type": "base",
  "system": false,
  "schema": [
    {
      "id": "content",
      "name": "content",
      "type": "text",
      "required": true,
      "options": {
        "min": 1,
        "max": 1000
      }
    },
    {
      "id": "author",
      "name": "author",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "users",
        "cascadeDelete": false,
        "maxSelect": 1
      }
    },
    {
      "id": "post",
      "name": "post",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "posts",
        "cascadeDelete": true,
        "maxSelect": 1
      }
    },
    {
      "id": "parent",
      "name": "parent",
      "type": "relation",
      "options": {
        "collectionId": "comments",
        "cascadeDelete": false,
        "maxSelect": 1
      }
    },
    {
      "id": "is_approved",
      "name": "is_approved",
      "type": "bool",
      "required": true
    }
  ],
  "listRule": "is_approved = true",
  "viewRule": "is_approved = true",
  "createRule": "@request.auth.id != ''",
  "updateRule": "author = @request.auth.id || @request.auth.id = 'ADMIN_ID'",
  "deleteRule": "author = @request.auth.id || @request.auth.id = 'ADMIN_ID'"
}
```

## E-commerce Store

### Products Collection
```json
{
  "id": "products",
  "name": "Products",
  "type": "base",
  "schema": [
    {
      "id": "name",
      "name": "name",
      "type": "text",
      "required": true,
      "options": {
        "min": 1,
        "max": 200
      }
    },
    {
      "id": "slug",
      "name": "slug",
      "type": "text",
      "required": true,
      "unique": true,
      "options": {
        "min": 1,
        "max": 200
      }
    },
    {
      "id": "description",
      "name": "description",
      "type": "text",
      "options": {}
    },
    {
      "id": "price",
      "name": "price",
      "type": "number",
      "required": true,
      "options": {
        "min": 0
      }
    },
    {
      "id": "compare_at_price",
      "name": "compare_at_price",
      "type": "number",
      "options": {
        "min": 0
      }
    },
    {
      "id": "sku",
      "name": "sku",
      "type": "text",
      "unique": true,
      "options": {
        "min": 1,
        "max": 100
      }
    },
    {
      "id": "inventory",
      "name": "inventory",
      "type": "number",
      "required": true,
      "options": {
        "min": 0
      }
    },
    {
      "id": "images",
      "name": "images",
      "type": "file",
      "options": {
        "maxSelect": 10,
        "maxSize": 10485760,
        "mimeTypes": ["image/jpeg", "image/png", "image/webp"]
      }
    },
    {
      "id": "category",
      "name": "category",
      "type": "relation",
      "options": {
        "collectionId": "categories",
        "cascadeDelete": false,
        "maxSelect": 1
      }
    },
    {
      "id": "is_active",
      "name": "is_active",
      "type": "bool",
      "required": true
    }
  ],
  "listRule": "is_active = true",
  "viewRule": "is_active = true",
  "createRule": "@request.auth.id != ''",
  "updateRule": "@request.auth.id != ''",
  "deleteRule": "@request.auth.id != ''"
}
```

### Orders Collection
```json
{
  "id": "orders",
  "name": "Orders",
  "type": "base",
  "schema": [
    {
      "id": "order_number",
      "name": "order_number",
      "type": "text",
      "required": true,
      "unique": true,
      "options": {
        "min": 1,
        "max": 100
      }
    },
    {
      "id": "customer",
      "name": "customer",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "users",
        "cascadeDelete": false,
        "maxSelect": 1
      }
    },
    {
      "id": "items",
      "name": "items",
      "type": "json",
      "required": true
    },
    {
      "id": "subtotal",
      "name": "subtotal",
      "type": "number",
      "required": true,
      "options": {
        "min": 0
      }
    },
    {
      "id": "tax",
      "name": "tax",
      "type": "number",
      "options": {
        "min": 0
      }
    },
    {
      "id": "shipping",
      "name": "shipping",
      "type": "number",
      "options": {
        "min": 0
      }
    },
    {
      "id": "total",
      "name": "total",
      "type": "number",
      "required": true,
      "options": {
        "min": 0
      }
    },
    {
      "id": "status",
      "name": "status",
      "type": "select",
      "required": true,
      "options": {
        "values": ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]
      }
    },
    {
      "id": "shipping_address",
      "name": "shipping_address",
      "type": "json",
      "required": true
    },
    {
      "id": "notes",
      "name": "notes",
      "type": "text",
      "options": {}
    }
  ],
  "listRule": "customer = @request.auth.id",
  "viewRule": "customer = @request.auth.id",
  "createRule": "customer = @request.auth.id",
  "updateRule": "@request.auth.id != ''",
  "deleteRule": "@request.auth.id != ''"
}
```

## Social Network

### Posts Collection
```json
{
  "id": "posts",
  "name": "Posts",
  "type": "base",
  "schema": [
    {
      "id": "content",
      "name": "content",
      "type": "text",
      "required": true,
      "options": {
        "min": 1,
        "max": 2000
      }
    },
    {
      "id": "image",
      "name": "image",
      "type": "file",
      "options": {
        "maxSelect": 1,
        "maxSize": 10485760,
        "mimeTypes": ["image/jpeg", "image/png", "image/webp"]
      }
    },
    {
      "id": "author",
      "name": "author",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "users",
        "cascadeDelete": true,
        "maxSelect": 1
      }
    }
  ],
  "listRule": "",
  "viewRule": "",
  "createRule": "@request.auth.id != ''",
  "updateRule": "author = @request.auth.id",
  "deleteRule": "author = @request.auth.id"
}
```

### Likes Collection
```json
{
  "id": "likes",
  "name": "Likes",
  "type": "base",
  "schema": [
    {
      "id": "user",
      "name": "user",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "users",
        "cascadeDelete": true,
        "maxSelect": 1
      }
    },
    {
      "id": "post",
      "name": "post",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "posts",
        "cascadeDelete": true,
        "maxSelect": 1
      }
    }
  ],
  "indexes": ["CREATE UNIQUE INDEX idx_likes_user_post ON likes (user, post)"],
  "listRule": "",
  "viewRule": "",
  "createRule": "@request.auth.id != ''",
  "updateRule": "@request.auth.id != ''",
  "deleteRule": "user = @request.auth.id"
}
```

## Task Management

### Tasks Collection
```json
{
  "id": "tasks",
  "name": "Tasks",
  "type": "base",
  "schema": [
    {
      "id": "title",
      "name": "title",
      "type": "text",
      "required": true,
      "options": {
        "min": 1,
        "max": 200
      }
    },
    {
      "id": "description",
      "name": "description",
      "type": "text",
      "options": {}
    },
    {
      "id": "status",
      "name": "status",
      "type": "select",
      "required": true,
      "options": {
        "values": ["todo", "in_progress", "review", "done"]
      }
    },
    {
      "id": "priority",
      "name": "priority",
      "type": "select",
      "required": true,
      "options": {
        "values": ["low", "medium", "high", "urgent"]
      }
    },
    {
      "id": "assignee",
      "name": "assignee",
      "type": "relation",
      "options": {
        "collectionId": "users",
        "cascadeDelete": false,
        "maxSelect": 1
      }
    },
    {
      "id": "reporter",
      "name": "reporter",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "users",
        "cascadeDelete": false,
        "maxSelect": 1
      }
    },
    {
      "id": "due_date",
      "name": "due_date",
      "type": "date",
      "required": false
    },
    {
      "id": "tags",
      "name": "tags",
      "type": "text",
      "options": {
        "maxSelect": 20
      }
    }
  ],
  "listRule": "assignee = @request.auth.id || reporter = @request.auth.id",
  "viewRule": "assignee = @request.auth.id || reporter = @request.auth.id",
  "createRule": "@request.auth.id != ''",
  "updateRule": "assignee = @request.auth.id || reporter = @request.auth.id",
  "deleteRule": "reporter = @request.auth.id"
}
```

## Forum/Discussion Board

### Threads Collection
```json
{
  "id": "threads",
  "name": "Threads",
  "type": "base",
  "schema": [
    {
      "id": "title",
      "name": "title",
      "type": "text",
      "required": true,
      "options": {
        "min": 1,
        "max": 200
      }
    },
    {
      "id": "content",
      "name": "content",
      "type": "text",
      "required": true,
      "options": {
        "min": 1
      }
    },
    {
      "id": "author",
      "name": "author",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "users",
        "cascadeDelete": false,
        "maxSelect": 1
      }
    },
    {
      "id": "category",
      "name": "category",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "categories",
        "cascadeDelete": false,
        "maxSelect": 1
      }
    },
    {
      "id": "is_pinned",
      "name": "is_pinned",
      "type": "bool",
      "required": true
    },
    {
      "id": "is_locked",
      "name": "is_locked",
      "type": "bool",
      "required": true
    },
    {
      "id": "view_count",
      "name": "view_count",
      "type": "number",
      "required": true,
      "options": {
        "min": 0
      }
    }
  ],
  "listRule": "",
  "viewRule": "",
  "createRule": "@request.auth.id != ''",
  "updateRule": "author = @request.auth.id || @request.auth.id = 'ADMIN_ID'",
  "deleteRule": "author = @request.auth.id || @request.auth.id = 'ADMIN_ID'"
}
```

### Replies Collection
```json
{
  "id": "replies",
  "name": "Replies",
  "type": "base",
  "schema": [
    {
      "id": "content",
      "name": "content",
      "type": "text",
      "required": true,
      "options": {
        "min": 1,
        "max": 5000
      }
    },
    {
      "id": "author",
      "name": "author",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "users",
        "cascadeDelete": false,
        "maxSelect": 1
      }
    },
    {
      "id": "thread",
      "name": "thread",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "threads",
        "cascadeDelete": true,
        "maxSelect": 1
      }
    },
    {
      "id": "parent",
      "name": "parent",
      "type": "relation",
      "options": {
        "collectionId": "replies",
        "cascadeDelete": false,
        "maxSelect": 1
      }
    }
  ],
  "listRule": "",
  "viewRule": "",
  "createRule": "@request.auth.id != ''",
  "updateRule": "author = @request.auth.id || @request.auth.id = 'ADMIN_ID'",
  "deleteRule": "author = @request.auth.id || @request.auth.id = 'ADMIN_ID'"
}
```

## Real Estate Listings

### Properties Collection
```json
{
  "id": "properties",
  "name": "Properties",
  "type": "base",
  "schema": [
    {
      "id": "title",
      "name": "title",
      "type": "text",
      "required": true,
      "options": {
        "min": 1,
        "max": 200
      }
    },
    {
      "id": "description",
      "name": "description",
      "type": "text",
      "options": {}
    },
    {
      "id": "price",
      "name": "price",
      "type": "number",
      "required": true,
      "options": {
        "min": 0
      }
    },
    {
      "id": "property_type",
      "name": "property_type",
      "type": "select",
      "required": true,
      "options": {
        "values": ["house", "apartment", "condo", "land", "commercial"]
      }
    },
    {
      "id": "address",
      "name": "address",
      "type": "text",
      "required": true,
      "options": {
        "min": 1,
        "max": 500
      }
    },
    {
      "id": "city",
      "name": "city",
      "type": "text",
      "required": true,
      "options": {
        "min": 1,
        "max": 100
      }
    },
    {
      "id": "state",
      "name": "state",
      "type": "text",
      "required": true,
      "options": {
        "min": 2,
        "max": 2
      }
    },
    {
      "id": "zip_code",
      "name": "zip_code",
      "type": "text",
      "required": true,
      "options": {
        "min": 5,
        "max": 10
      }
    },
    {
      "id": "bedrooms",
      "name": "bedrooms",
      "type": "number",
      "options": {
        "min": 0
      }
    },
    {
      "id": "bathrooms",
      "name": "bathrooms",
      "type": "number",
      "options": {
        "min": 0
      }
    },
    {
      "id": "square_feet",
      "name": "square_feet",
      "type": "number",
      "options": {
        "min": 0
      }
    },
    {
      "id": "images",
      "name": "images",
      "type": "file",
      "options": {
        "maxSelect": 20,
        "maxSize": 10485760,
        "mimeTypes": ["image/jpeg", "image/png", "image/webp"]
      }
    },
    {
      "id": "agent",
      "name": "agent",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "users",
        "cascadeDelete": false,
        "maxSelect": 1
      }
    }
  ],
  "listRule": "",
  "viewRule": "",
  "createRule": "@request.auth.id != ''",
  "updateRule": "agent = @request.auth.id || @request.auth.id = 'ADMIN_ID'",
  "deleteRule": "agent = @request.auth.id || @request.auth.id = 'ADMIN_ID'"
}
```

## Learning Management System

### Courses Collection
```json
{
  "id": "courses",
  "name": "Courses",
  "type": "base",
  "schema": [
    {
      "id": "title",
      "name": "title",
      "type": "text",
      "required": true,
      "options": {
        "min": 1,
        "max": 200
      }
    },
    {
      "id": "description",
      "name": "description",
      "type": "text",
      "options": {}
    },
    {
      "id": "instructor",
      "name": "instructor",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "users",
        "cascadeDelete": false,
        "maxSelect": 1
      }
    },
    {
      "id": "price",
      "name": "price",
      "type": "number",
      "options": {
        "min": 0
      }
    },
    {
      "id": "thumbnail",
      "name": "thumbnail",
      "type": "file",
      "options": {
        "maxSelect": 1,
        "maxSize": 5242880,
        "mimeTypes": ["image/jpeg", "image/png", "image/webp"]
      }
    },
    {
      "id": "category",
      "name": "category",
      "type": "relation",
      "options": {
        "collectionId": "categories",
        "cascadeDelete": false,
        "maxSelect": 1
      }
    },
    {
      "id": "is_published",
      "name": "is_published",
      "type": "bool",
      "required": true
    }
  ],
  "listRule": "is_published = true",
  "viewRule": "is_published = true",
  "createRule": "@request.auth.id != ''",
  "updateRule": "instructor = @request.auth.id || @request.auth.id = 'ADMIN_ID'",
  "deleteRule": "instructor = @request.auth.id || @request.auth.id = 'ADMIN_ID'"
}
```

### Enrollments Collection
```json
{
  "id": "enrollments",
  "name": "Enrollments",
  "type": "base",
  "schema": [
    {
      "id": "student",
      "name": "student",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "users",
        "cascadeDelete": true,
        "maxSelect": 1
      }
    },
    {
      "id": "course",
      "name": "course",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "courses",
        "cascadeDelete": true,
        "maxSelect": 1
      }
    },
    {
      "id": "progress",
      "name": "progress",
      "type": "number",
      "required": true,
      "options": {
        "min": 0,
        "max": 100
      }
    },
    {
      "id": "status",
      "name": "status",
      "type": "select",
      "required": true,
      "options": {
        "values": ["enrolled", "in_progress", "completed", "dropped"]
      }
    }
  ],
  "listRule": "student = @request.auth.id",
  "viewRule": "student = @request.auth.id",
  "createRule": "student = @request.auth.id",
  "updateRule": "student = @request.auth.id",
  "deleteRule": "student = @request.auth.id"
}
```
