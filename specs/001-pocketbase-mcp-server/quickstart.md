# Quickstart: PocketBase MCP Server

**Feature**: 001-pocketbase-mcp-server  
**Date**: 2026-01-15

## Prerequisites

- Node.js 18+ installed
- A running PocketBase instance (local or remote)
- Admin credentials for admin operations

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/pocketbase-mcp.git
cd pocketbase-mcp

# Install dependencies
npm install

# Build
npm run build
```

## Configuration

Set the PocketBase URL as an environment variable:

```bash
export POCKETBASE_URL="http://localhost:8090"
```

## Running the Server

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
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

## Usage Examples

### 1. Check Connection (No Auth)

```
Use pocketbase_get_auth_status to check if we're connected
```

### 2. Authenticate as Admin

```
Authenticate to PocketBase as admin with email admin@example.com and password secret123
```

### 3. List Collections

```
Show me all collections in the database
```

### 4. Query Records

```
Get the first 10 published posts, sorted by newest first, and include the author info
```

### 5. Create a Record

```
Create a new post with title "Hello World" and status "draft" in the posts collection
```

### 6. Update a Record

```
Update post abc123 to set status to "published"
```

### 7. Delete a Record

```
Delete the post with ID abc123
```

## Tool Reference

| Tool | Description |
|------|-------------|
| `pocketbase_auth_admin` | Login as admin |
| `pocketbase_auth_user` | Login as user |
| `pocketbase_get_auth_status` | Check current auth |
| `pocketbase_logout` | Clear auth session |
| `pocketbase_list_records` | Query records with filters |
| `pocketbase_get_record` | Get single record |
| `pocketbase_create_record` | Create new record |
| `pocketbase_update_record` | Update existing record |
| `pocketbase_delete_record` | Delete record |
| `pocketbase_list_collections` | List all collections (admin) |
| `pocketbase_get_collection` | Get collection schema (admin) |
| `pocketbase_create_collection` | Create collection (admin) |
| `pocketbase_update_collection` | Update collection (admin) |
| `pocketbase_delete_collection` | Delete collection (admin) |

## Output Formats

By default, all tools return TOML format for token efficiency:

```toml
page = 1
totalItems = 42

[[items]]
id = "abc123"
title = "My Post"
```

To get JSON instead, add `format: "json"` to any tool call.

## Troubleshooting

### "Connection Error: POCKETBASE_URL not set"

Set the environment variable before starting the server:

```bash
export POCKETBASE_URL="http://localhost:8090"
```

### "Auth Required" errors

Use `pocketbase_auth_admin` or `pocketbase_auth_user` first:

```
Authenticate as admin with email admin@example.com password secret123
```

### "Permission Denied" on collection operations

Collection management requires admin auth. Make sure you authenticated as admin (not user).

### Records not showing up

Check the collection's API rules in PocketBase admin UI. Empty string `""` means public access, `null` means admin only.
