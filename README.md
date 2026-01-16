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
| `pocketbase_auth_user` | Authenticate as regular user |
| `pocketbase_get_auth_status` | Check current authentication state |
| `pocketbase_logout` | Clear authentication session |

### Records

| Tool | Description |
|------|-------------|
| `pocketbase_list_records` | List records with filtering, sorting, pagination |
| `pocketbase_get_record` | Get a single record by ID |
| `pocketbase_create_record` | Create a new record |
| `pocketbase_update_record` | Update an existing record (partial) |
| `pocketbase_delete_record` | Delete a record |

### Collections (Admin Only)

| Tool | Description |
|------|-------------|
| `pocketbase_list_collections` | List all collections |
| `pocketbase_get_collection` | Get collection schema details |
| `pocketbase_create_collection` | Create a new collection |
| `pocketbase_update_collection` | Update collection schema |
| `pocketbase_delete_collection` | Delete a collection |

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
