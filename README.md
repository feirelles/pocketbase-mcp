# PocketBase MCP Server

An MCP (Model Context Protocol) server that enables AI agents to interact with [PocketBase](https://pocketbase.io) instances for data queries and administration.

## Features

- Query records with filtering, sorting, pagination, and relation expansion
- Full CRUD operations for records and collections
- Admin and user authentication
- Collection schema management
- Compact TOML output format (25% smaller than JSON, configurable)
- Type-safe TypeScript implementation with Zod validation
- Supports all PocketBase field types: text, number, bool, email, url, date, autodate, select, json, file, relation, editor, geoPoint

## Installation

```bash
npm install @feirelles/pocketbase-mcp
```

Or clone and build locally:

```bash
git clone https://github.com/feirelles/pocketbase-mcp.git
cd pocketbase-mcp
npm install
npm run build
```

## Configuration

Set the PocketBase URL as an environment variable:

```bash
export POCKETBASE_URL="http://localhost:8090"
```

## MCP Client Configuration

### Claude Desktop

Add to `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pocketbase": {
      "command": "node",
      "args": ["/path/to/pocketbase-mcp/dist/index.js"],
      "env": {
        "POCKETBASE_URL": "http://localhost:8090"
      }
    }
  }
}
```

### VS Code (Copilot)

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "pocketbase": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/pocketbase-mcp/dist/index.js"],
      "env": {
        "POCKETBASE_URL": "http://localhost:8090"
      }
    }
  }
}
```

## Available Tools

### Authentication

| Tool | Description |
|------|-------------|
| `pocketbase_auth_admin` | Authenticate as admin/superuser |
| `pocketbase_auth_user` | Authenticate as regular user (supports email/username) |
| `pocketbase_get_auth_status` | Check current authentication state |
| `pocketbase_logout` | Clear authentication session |

### Records

| Tool | Description |
|------|-------------|
| `pocketbase_list_records` | List records with filtering, sorting, pagination, skipTotal |
| `pocketbase_get_record` | Get a single record by ID |
| `pocketbase_create_record` | Create a new record (supports expand/fields in response) |
| `pocketbase_update_record` | Update an existing record (supports expand/fields in response) |
| `pocketbase_delete_record` | Delete a record |

### Collections (Admin Only)

| Tool | Description |
|------|-------------|
| `pocketbase_list_collections` | List all collections |
| `pocketbase_get_collection` | Get collection schema details |
| `pocketbase_create_collection` | Create a new collection |
| `pocketbase_update_collection` | Update collection schema |
| `pocketbase_delete_collection` | Delete a collection |

### Administration (Admin Only)

| Tool | Description |
|------|-------------|
| `pocketbase_health_check` | Check server health status (no auth required) |
| `pocketbase_list_logs` | List server logs with filtering |
| `pocketbase_get_log` | Get a single log entry by ID |
| `pocketbase_log_stats` | Get hourly log statistics |
| `pocketbase_list_backups` | List all available backup files |
| `pocketbase_create_backup` | Create a new database backup |
| `pocketbase_restore_backup` | Restore from a backup file |
| `pocketbase_delete_backup` | Delete a backup file |

### Files

| Tool | Description |
|------|-------------|
| `pocketbase_get_file_url` | Generate URL to access files with optional thumbnail |

## Usage

The MCP server enables AI agents to interact with your PocketBase instance through natural language. Agents can:

- Query and manage records across collections
- Authenticate as admin or regular users
- Create and modify collection schemas
- Manage data with full CRUD capabilities

Simply ask the AI agent to perform operations on your PocketBase data, and it will use the appropriate tools automatically.

## Output Format

By default, all tools return TOML format for token efficiency:

```toml
page = 1
perPage = 50
totalItems = 42
hasMore = false

[[items]]
id = "abc123def456"
title = "My Post"
status = "published"
created = "2026-01-15T10:30:00.000Z"
```

To get JSON instead, add `format: "json"` to any tool call.

## Error Handling

Errors are returned in a structured format:

```toml
[error]
code = "NOT_FOUND"
message = "Collection 'posts' not found"
suggestion = "Use pocketbase_list_collections to see available collections"
```

Error codes:
- `CONNECTION_ERROR` - Cannot connect to PocketBase
- `AUTH_REQUIRED` - Authentication needed
- `AUTH_FAILED` - Invalid credentials
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input data
- `PERMISSION_DENIED` - Insufficient permissions

## Field Types and Special Handling

### Relation Fields

When creating or updating collections with `relation` type fields, you can use either:
- Collection **name** (e.g., `"users"`) - automatically resolved to ID
- Collection **ID** (e.g., `"pbc_2478858439"`) - used directly

The MCP server automatically resolves collection names to their IDs for convenience.

**Example:**
```json
{
  "name": "author",
  "type": "relation",
  "required": true,
  "options": {
    "collectionId": "users",
    "cascadeDelete": false,
    "maxSelect": 1,
    "displayFields": ["email", "name"]
  }
}
```

See [examples/create-collection-with-relations.json](examples/create-collection-with-relations.json) for a complete example.

### Select Fields

For `select` fields, provide `values` and `maxSelect` in the options:

```json
{
  "name": "status",
  "type": "select",
  "required": true,
  "options": {
    "values": ["draft", "published", "archived"],
    "maxSelect": 1
  }
}
```

### AutoDate Fields

For `autodate` fields, specify when they should update:

```json
{
  "name": "created",
  "type": "autodate",
  "options": {
    "onCreate": true,
    "onUpdate": false
  }
}
```

### File Fields and URLs

Use `pocketbase_get_file_url` to generate URLs for files stored in PocketBase. Supports thumbnail generation for images (JPG, PNG, GIF, WebP).

**Thumbnail formats:**
- `WxH` - Crop to WxH viewbox (from center)
- `WxHt` - Crop from top
- `WxHb` - Crop from bottom
- `WxHf` - Fit inside WxH (no crop)
- `0xH` - Resize to height, preserve aspect ratio
- `Wx0` - Resize to width, preserve aspect ratio

**Example:**
```
pocketbase_get_file_url(
  collection="posts",
  recordId="abc123",
  filename="photo.jpg",
  thumb="200x200"
)
```

## Troubleshooting

### Connection Issues

If you get `CONNECTION_ERROR`:
1. Verify PocketBase is running: `curl http://localhost:8090/api/health`
2. Check `POCKETBASE_URL` is correctly set
3. Ensure no firewall blocking the port

### Authentication Issues

- **Admin auth fails**: Verify email/password for `_superusers` collection
- **User auth fails**: Use `identity` parameter (can be email OR username)
- **Permission denied**: Check collection API rules in PocketBase admin

### Common Mistakes

1. **Using `email` instead of `identity` for user auth**
   - Correct: `identity="user@example.com"` or `identity="johndoe"`
   - Wrong: `email="user@example.com"` (only for admin auth)

2. **Forgetting to authenticate before admin operations**
   - Use `pocketbase_auth_admin` first
   - Check with `pocketbase_get_auth_status`

3. **Creating backups without name**
   - `name` is optional - if omitted, auto-generated

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (watch)
npm run dev

# Lint
npm run lint

# Test
npm test
```

## Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## License

MIT
