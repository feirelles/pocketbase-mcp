# Research: PocketBase MCP Server

**Feature**: 001-pocketbase-mcp-server  
**Date**: 2026-01-15  
**Status**: Complete

## Technology Decisions

### 1. TOML Library for Node.js

**Decision**: Use `@iarna/toml` for TOML serialization

**Rationale**:
- Most mature and widely used TOML library for Node.js
- Full TOML v1.0.0 compliance
- Supports both parsing and stringifying
- Well-maintained with TypeScript types available
- Lightweight (~50KB)

**Alternatives considered**:
- `toml` (npm): Read-only, no stringify support
- `smol-toml`: Newer, less battle-tested
- Custom serializer: Unnecessary complexity

**Installation**: `npm install @iarna/toml`

### 2. MCP Transport Protocol

**Decision**: Use stdio transport (not HTTP)

**Rationale**:
- Simpler deployment - runs as local process
- No port management or network configuration
- Better security - no network exposure
- Standard for local MCP servers
- Constitution specifies "stdio for local"

**Alternatives considered**:
- Streamable HTTP: Overkill for local use, adds complexity
- SSE: Deprecated in MCP spec

### 3. PocketBase SDK Usage

**Decision**: Use official `pocketbase` JavaScript SDK directly

**Rationale**:
- Official SDK maintained by PocketBase team
- Handles auth token management automatically
- Full API coverage including realtime
- TypeScript types included
- Simple API: `pb.collection('name').getList()`

**Alternatives considered**:
- Direct HTTP calls with axios: More work, reinventing the wheel
- Custom wrapper: SDK already provides clean abstraction

### 4. Authentication Strategy

**Decision**: Store auth state in PocketBase SDK instance (in-memory)

**Rationale**:
- SDK's `authStore` handles token persistence
- Automatic token refresh on 401 responses
- Separate admin vs user auth flows
- No external token storage needed

**Implementation notes**:
- Admin auth: `pb.admins.authWithPassword(email, password)`
- User auth: `pb.collection('users').authWithPassword(email, password)`
- Auth status: `pb.authStore.isValid`, `pb.authStore.model`

### 5. Output Format Strategy

**Decision**: TOML by default, JSON optional via `format` parameter

**Rationale**:
- TOML is 20-30% more compact than JSON for typical data
- More readable for AI agents parsing responses
- Reduces token usage in LLM context windows
- JSON fallback for compatibility when needed

**Token savings example** (10 records with 5 fields each):
- JSON: ~1,200 characters
- TOML: ~900 characters (25% reduction)

### 6. Error Handling Pattern

**Decision**: Return structured errors with actionable messages

**Error format**:
```toml
[error]
code = "AUTH_REQUIRED"
message = "Admin authentication required for this operation"
suggestion = "Use pocketbase_auth_admin tool first"
```

**Error codes**:
- `CONNECTION_ERROR`: PocketBase unreachable
- `AUTH_REQUIRED`: Operation needs authentication
- `AUTH_FAILED`: Invalid credentials
- `NOT_FOUND`: Record/collection doesn't exist
- `VALIDATION_ERROR`: Invalid input data
- `PERMISSION_DENIED`: Insufficient permissions

## Best Practices Applied

### From MCP Builder Skill

1. **Tool Naming**: `pocketbase_<action>_<resource>` pattern
2. **Descriptions**: Concise, action-oriented, include key params
3. **Input Validation**: Zod schemas with constraints and defaults
4. **Pagination**: Default 50, max 500, return `has_more` and `next_offset`
5. **Character Limits**: 25KB max response, truncate with message

### From PocketBase Skill

1. **Filtering Syntax**: Pass PocketBase filter strings directly
2. **Relation Expansion**: Support `expand` parameter for nested data
3. **Field Selection**: Support `fields` parameter to reduce payload
4. **Sorting**: Support `sort` parameter (prefix `-` for descending)

## Dependencies

### Production

```json
{
  "@modelcontextprotocol/sdk": "^1.6.1",
  "pocketbase": "^0.21.0",
  "@iarna/toml": "^3.0.0",
  "zod": "^3.23.8"
}
```

### Development

```json
{
  "@types/node": "^22.10.0",
  "typescript": "^5.7.2",
  "vitest": "^2.0.0",
  "tsx": "^4.19.2",
  "eslint": "^9.0.0",
  "@typescript-eslint/eslint-plugin": "^8.0.0"
}
```

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| How to handle file uploads? | Base64 encoding in JSON, SDK handles conversion |
| How to handle realtime subscriptions? | Use MCP notifications for subscription events |
| How to configure PocketBase URL? | Environment variable `POCKETBASE_URL` |
| Token refresh strategy? | SDK handles automatically via authStore |
