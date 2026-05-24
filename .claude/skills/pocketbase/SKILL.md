---
name: pocketbase
description: Guide for using the @feirelles/pocketbase-mcp server (v2.0+, multi-instance). Covers the connect-first flow, the `instance` parameter for multi-PocketBase setups, querying records, managing collection schemas, authenticating as admin/user, building correct PocketBase filter expressions, designing API rules, and handling field types. Use this skill whenever the user mentions PocketBase, pb.collection, the local PocketBase MCP server (tools prefixed `pocketbase_`), designing collections, writing filters, security rules, file URLs/thumbnails, backups, or running against multiple PocketBase instances — even if they don't explicitly name "PocketBase".
---

# PocketBase MCP Skill

This skill helps Claude work effectively with the PocketBase MCP server in this repository. Since v2.0 the server holds **a registry of named PocketBase connections** so one MCP process can talk to multiple PB instances simultaneously. See `src/` for source.

## The connect-first flow

The server starts with an empty registry. The very first thing to do in any session is establish **at least one connection**:

```
pocketbase_connect name="local" url="http://localhost:8090"
```

The server validates reachability via `/api/health` before storing the entry. If PocketBase isn't up the call returns `CONNECTION_ERROR` and nothing is registered — the agent should surface the message and let the user fix it (start PB, correct the URL, etc.).

If the user only mentioned a URL once at the start of the conversation, register it eagerly with a sensible name like `"local"` or the project name — don't keep asking on every turn. Use `pocketbase_list_connections` to confirm state if you're unsure.

Once at least one connection exists, every other tool can be called. If only one connection is registered, you can omit `instance`; the server resolves to that one automatically.

## The `instance` parameter

Every tool accepts an optional `instance: string` parameter naming a registered connection.

| Situation | Behavior |
|---|---|
| 0 connections registered, `instance` omitted | `NO_CONNECTION` error with suggestion to `pocketbase_connect` |
| 1 connection registered, `instance` omitted | uses it |
| 2+ connections registered, `instance` omitted | `VALIDATION_ERROR` listing the registered names — pass `instance=<name>` |
| `instance="x"` and `x` registered | uses it |
| `instance="x"` and `x` not registered | `VALIDATION_ERROR` listing registered names |

**Single-PB sessions**: forget `instance` exists. The server defaults to the only connection.

**Multi-PB sessions**: always pass `instance=<name>` to disambiguate. Auth state is **isolated per connection** — logging in as admin on `projA` does not auth you on `projB`.

## Tool catalog

### Connection management

| Tool | Auth | Purpose |
|---|---|---|
| `pocketbase_connect(name, url)` | none | Register a connection (validates `/api/health`) |
| `pocketbase_disconnect(name)` | none | Remove a connection, clear its authStore |
| `pocketbase_list_connections()` | none | Snapshot of all connections with auth state |

### Authentication (per-instance)

| Tool | Auth | Notes |
|---|---|---|
| `pocketbase_auth_admin(email, password, instance?)` | none → admin | Logs in against the `_superusers` collection |
| `pocketbase_auth_user(identity, password, collection?, identityField?, instance?)` | none → user | `identity` accepts email OR username |
| `pocketbase_get_auth_status(instance?)` | none | Returns auth state for the resolved instance only |
| `pocketbase_logout(instance?, all?)` | none | Clear one connection's auth or `all: true` to clear every connection |

### Records

| Tool | Auth required | Notes |
|---|---|---|
| `pocketbase_list_records(collection, filter?, sort?, fields?, expand?, page?, perPage?, skipTotal?, instance?)` | depends on `listRule` | Default `perPage=50`, max `500` |
| `pocketbase_get_record(collection, id, fields?, expand?, instance?)` | depends on `viewRule` | — |
| `pocketbase_create_record(collection, data, expand?, fields?, instance?)` | depends on `createRule` | — |
| `pocketbase_update_record(collection, id, data, expand?, fields?, instance?)` | depends on `updateRule` | Partial update |
| `pocketbase_delete_record(collection, id, instance?)` | depends on `deleteRule` | — |

### Collections (admin)

| Tool | Auth required | Notes |
|---|---|---|
| `pocketbase_list_collections(filter?, page?, perPage?, instance?)` | admin | — |
| `pocketbase_get_collection(name, instance?)` | admin | Returns full schema with field details |
| `pocketbase_create_collection(name, type, fields, *Rule, indexes?, instance?)` | admin | Auto-injects `id`, `created`, `updated` if absent |
| `pocketbase_update_collection(name, newName?, fields?, *Rule, indexes?, instance?)` | admin | `fields` replaces the entire list |
| `pocketbase_delete_collection(name, instance?)` | admin | Deletes records too |

### Admin / observability

| Tool | Auth required | Notes |
|---|---|---|
| `pocketbase_health_check(instance? \| url?)` | none | Pass `url` to probe without registering |
| `pocketbase_list_logs(filter?, sort?, page?, perPage?, instance?)` | admin | — |
| `pocketbase_get_log(id, instance?)` | admin | — |
| `pocketbase_log_stats(filter?, instance?)` | admin | Hourly aggregates |
| `pocketbase_list_backups(instance?)` | admin | — |
| `pocketbase_create_backup(name?, instance?)` | admin | `name` auto-generated if omitted |
| `pocketbase_restore_backup(name, instance?)` | admin | Server may restart |
| `pocketbase_delete_backup(name, instance?)` | admin | — |

### Files

| Tool | Auth | Notes |
|---|---|---|
| `pocketbase_get_file_url(collection, recordId, filename, thumb?, download?, instance?)` | none | Builds a URL string; no HTTP call |

## Always-do workflow

1. **`pocketbase_list_connections`** — find out what's registered. If empty and the user mentioned a PocketBase URL, `pocketbase_connect` first.
2. **`pocketbase_get_auth_status` (per instance you'll touch)** — confirms whether admin/user auth is needed.
3. **Discover before guessing** — `pocketbase_list_collections` then `pocketbase_get_collection name=<x>` to confirm fields before crafting filters or record payloads.
4. **Use `skipTotal=true` for large lists** when you don't need the count.
5. **Use `fields=` to project** only what you need (token-efficient).
6. **Use `expand=` for relations** instead of N+1 reads.
7. **Default output is TOML** (~25% smaller than JSON). Pass `format: "json"` only when nested arrays serialize awkwardly or the caller wants JSON.

## Authentication model (PocketBase v0.22+)

- **Admin / superuser** lives in the system collection `_superusers`. Required for collection-schema, logs, and backup operations. `pocketbase_auth_admin` takes `email + password + (instance?)`. You must `pocketbase_connect` first.
- **Regular user** lives in any auth-type collection (default `users`). `pocketbase_auth_user` takes `identity + password` (the param is `identity`, NOT `email` — it accepts both email and username). Pass `identityField` to disambiguate.
- **AuthStore is per-connection**. After `pocketbase_disconnect` and re-`pocketbase_connect` with the same name, you must re-authenticate.

Common mistake: using `email="..."` for `pocketbase_auth_user`. The parameter is `identity`.

## PocketBase filter syntax (used by `filter:` parameter)

Filters run server-side. Examples:

```text
status = "published"
status = "published" && views > 100
created >= "2026-01-01 00:00:00"
title ~ "claude"                    # contains (case-insensitive)
title !~ "draft"                    # does not contain
tags ?= "javascript"                # any-of (multi-value fields)
author.verified = true              # relation traversal
id = "abc123def456789"
```

Operators: `=`, `!=`, `>`, `>=`, `<`, `<=`, `~`, `!~`, `?=`, `?!=`, `?>`, `?>=`, `?<`, `?<=`, `?~`, `?!~` (any-of variants for multi-value fields).
Logical: `&&`, `||`. Group with `()`.

Quote string literals with `"..."` or `'...'`. Always quote dates (`"2026-01-01 00:00:00"`). Numbers and booleans unquoted.

**Special placeholders** (valid inside API rules, NOT in `filter` parameter):
- `@request.auth.id`, `@request.auth.collectionName`
- `@request.body.*`
- `@collection.<name>.*`

## Sort syntax

```text
sort = "-created"               # newest first
sort = "status,-priority"
sort = "@random"
```

## Field types cheat sheet

The MCP server flattens `options.*` into field-level keys automatically (see `src/tools/collections.ts`).

| Type | Key options |
|---|---|
| `text` | `min`, `max`, `pattern`, `autogeneratePattern`, `primaryKey` |
| `number` | `min`, `max`, `onlyInt` |
| `bool` | (just `required`) |
| `email` / `url` | `onlyDomains`, `exceptDomains` |
| `date` | `min`, `max` (ISO strings) |
| `autodate` | `onCreate`, `onUpdate` |
| `select` | `values: [...]`, `maxSelect` (1=single, >1=multi) |
| `relation` | `collectionId` (accepts collection name OR id — server resolves names), `cascadeDelete`, `maxSelect`, `minSelect`, `displayFields` |
| `file` | `maxSelect`, `maxSize` (bytes), `mimeTypes: [...]`, `thumbs: [...]`, `protected` |
| `json` | `maxSize` |
| `editor` | `maxSize`, `convertUrls` |
| `geoPoint` | (lat/lon) |

**Auto-injected by `pocketbase_create_collection`** if absent: `id` (15-char `[a-z0-9]`), `created` (autodate onCreate), `updated` (autodate onCreate+onUpdate). See `examples/create-collection-with-relations.json` and `examples/create-collection-with-autodate.json`.

## API rules (collection-level access control)

Each collection has 5 rule strings: `listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`.

- `null` (or unset) → **admin-only** (denied via public API)
- `""` (empty string) → **public** (anyone)
- A filter expression → users matching the filter

```text
listRule:   "@request.auth.id != ''"                       # any logged-in user
viewRule:   "@request.auth.id = author.id"                 # only the owner
createRule: "@request.auth.id != '' && @request.body.author = @request.auth.id"
updateRule: "@request.auth.id = author.id"
deleteRule: null                                            # admin-only
```

See `references/security_rules.md` for a deeper guide.

## File URLs & thumbnails

`pocketbase_get_file_url` builds a URL — no network call. Thumb formats:

| Format | Behavior |
|---|---|
| `WxH` | Crop to WxH (center) |
| `WxHt` / `WxHb` | Crop top / bottom |
| `WxHf` | Fit inside WxH (no crop) |
| `0xH` | Resize to height, preserve aspect |
| `Wx0` | Resize to width, preserve aspect |

Pass `download: true` to force browser download.

## Error handling

Structured errors with `code`, `message`, and usually `suggestion`:

| Code | Meaning |
|---|---|
| `NO_CONNECTION` | No connections registered — call `pocketbase_connect` |
| `CONNECTION_ERROR` | Connection registered/probed but PB unreachable |
| `AUTH_REQUIRED` | Need to authenticate on this instance first |
| `AUTH_FAILED` | Bad credentials |
| `PERMISSION_DENIED` | Auth ok but collection rule blocks operation |
| `NOT_FOUND` | Collection or record id wrong |
| `VALIDATION_ERROR` | Bad input — check `fieldErrors` for per-field detail |
| `RATE_LIMITED` | Backoff and retry |
| `SERVER_ERROR` | Check PocketBase logs (`pocketbase_list_logs`) |

`VALIDATION_ERROR` often carries `fieldErrors: { fieldName: "..." }`. Surface those to the user.

## Response size & pagination

`pocketbase_list_records` auto-truncates when the formatted response exceeds `MAX_RESPONSE_SIZE`. When you see `_truncated: true`, narrow with `filter`/`fields` or paginate.

Default `perPage=50`, max `500`. For large traversals: `skipTotal=true` + walk pages.

## Quick recipes

**Fresh session — single PB:**
```
pocketbase_connect name="local" url="http://localhost:8090"
pocketbase_auth_admin email="admin@example.com" password="..."
pocketbase_list_collections
```

**Compare two PocketBases (e.g., staging vs prod):**
```
pocketbase_connect name="staging" url="http://localhost:8090"
pocketbase_connect name="prod"    url="http://prod.example.com"

pocketbase_auth_admin instance="staging" email="..." password="..."
pocketbase_auth_admin instance="prod"    email="..." password="..."

pocketbase_get_collection instance="staging" name="posts"
pocketbase_get_collection instance="prod"    name="posts"
# diff the field lists / rules
```

**Two Claude Code agents, each on its own project:**
- Agent A (project A) spawns its own MCP process via stdio. It calls `pocketbase_connect name="local" url="http://localhost:8090"`.
- Agent B (project B) spawns ITS own MCP process. It calls `pocketbase_connect name="local" url="http://localhost:8091"`.
- Each process keeps its own registry and authStore. They don't see each other.

**Add a `status` select field to an existing collection** — fetch current fields, append, send all back (`pocketbase_update_collection` replaces the full `fields` array):

1. `pocketbase_get_collection name="posts"` → grab `fields`
2. Append `{ name: "status", type: "select", required: true, options: { values: ["draft","published"], maxSelect: 1 } }`
3. `pocketbase_update_collection name="posts" fields=[...full updated list...]`

**Create a one-to-many relation** (comments → posts):
```
pocketbase_create_collection
  name="comments"
  type="base"
  fields=[
    { name: "text", type: "text", required: true },
    { name: "post", type: "relation", required: true,
      options: { collectionId: "posts", cascadeDelete: true, maxSelect: 1 } }
  ]
  listRule=""
  createRule="@request.auth.id != ''"
```
Note: the server accepts the collection **name** (`"posts"`) and resolves it to an id automatically.

**Ad-hoc health probe without registering:**
```
pocketbase_health_check url="http://localhost:8091"
```
Useful to verify a PB is up before deciding to `pocketbase_connect`.

## References (load on demand)

- [security_rules.md](references/security_rules.md) — comprehensive guide to API rules, ownership patterns, multi-tenant access.
- [api_reference.md](references/api_reference.md) — broader PocketBase API/SDK reference for behavior the MCP doesn't expose.

## Don't

- Don't call any tool before `pocketbase_connect` — you'll just get `NO_CONNECTION`.
- Don't omit `instance` when 2+ connections are registered — the resolver errors.
- Don't invent collection or field names — `pocketbase_list_collections` / `pocketbase_get_collection` first.
- Don't pass `email` to `pocketbase_auth_user`; the parameter is `identity`.
- Don't expect auth to carry across instances — each has its own authStore. Login once per instance you'll use.
- Don't drive realtime subscriptions through this MCP — it's request/response only.
- Don't push large file uploads through this MCP — file content goes via PocketBase REST directly; this MCP exposes only metadata and URLs.
