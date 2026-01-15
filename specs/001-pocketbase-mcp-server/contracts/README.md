# MCP Tool Contracts: PocketBase MCP Server

**Feature**: 001-pocketbase-mcp-server  
**Date**: 2026-01-15

This directory contains the Zod schemas defining input/output contracts for each MCP tool.

## Tool Index

### Authentication Tools

| Tool | Description | Auth Required |
|------|-------------|---------------|
| [pocketbase_auth_admin](./auth.md#pocketbase_auth_admin) | Authenticate as admin/superuser | No |
| [pocketbase_auth_user](./auth.md#pocketbase_auth_user) | Authenticate as regular user | No |
| [pocketbase_get_auth_status](./auth.md#pocketbase_get_auth_status) | Get current auth state | No |
| [pocketbase_logout](./auth.md#pocketbase_logout) | Clear authentication | No |

### Record Tools

| Tool | Description | Auth Required |
|------|-------------|---------------|
| [pocketbase_list_records](./records.md#pocketbase_list_records) | List records with filtering | Depends on rules |
| [pocketbase_get_record](./records.md#pocketbase_get_record) | Get single record by ID | Depends on rules |
| [pocketbase_create_record](./records.md#pocketbase_create_record) | Create new record | Depends on rules |
| [pocketbase_update_record](./records.md#pocketbase_update_record) | Update existing record | Depends on rules |
| [pocketbase_delete_record](./records.md#pocketbase_delete_record) | Delete record | Depends on rules |

### Collection Tools (Admin)

| Tool | Description | Auth Required |
|------|-------------|---------------|
| [pocketbase_list_collections](./collections.md#pocketbase_list_collections) | List all collections | Admin |
| [pocketbase_get_collection](./collections.md#pocketbase_get_collection) | Get collection schema | Admin |
| [pocketbase_create_collection](./collections.md#pocketbase_create_collection) | Create new collection | Admin |
| [pocketbase_update_collection](./collections.md#pocketbase_update_collection) | Update collection schema | Admin |
| [pocketbase_delete_collection](./collections.md#pocketbase_delete_collection) | Delete collection | Admin |

## Common Parameters

### Output Format

All tools that return data support:

```typescript
format: z.enum(['toml', 'json']).default('toml')
  .describe('Output format: toml (default, compact) or json')
```

### Pagination

List tools support:

```typescript
page: z.number().int().min(1).default(1)
  .describe('Page number (1-indexed)'),
perPage: z.number().int().min(1).max(500).default(50)
  .describe('Items per page (max 500)')
```

## Response Format

### Success (TOML)

```toml
# List response
page = 1
perPage = 50
totalItems = 127
totalPages = 3
hasMore = true

[[items]]
id = "abc123def456"
title = "My Post"
status = "published"
created = "2026-01-15 10:30:00.000Z"

[[items]]
id = "ghi789jkl012"
title = "Another Post"
status = "draft"
created = "2026-01-14 08:15:00.000Z"
```

### Error (TOML)

```toml
[error]
code = "NOT_FOUND"
message = "Collection 'posts' not found"
suggestion = "Use pocketbase_list_collections to see available collections"
```
