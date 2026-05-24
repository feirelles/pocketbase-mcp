---
name: pocketbase
description: Guide for using the @feirelles/pocketbase-mcp server effectively — querying records, managing collection schemas, authenticating as admin/user, building correct PocketBase filter expressions, designing API rules, and handling field types. Use this skill whenever the user mentions PocketBase, pb.collection, working with the local PocketBase MCP server (tools prefixed `pocketbase_`), designing collections, writing filters, security rules, file URLs/thumbnails, or backups — even if they don't explicitly name "PocketBase".
---

# PocketBase MCP Skill

This skill helps Claude work effectively with the PocketBase MCP server in this repository. The server exposes 20 tools (prefixed `pocketbase_`) that wrap PocketBase v0.22+ via the official JavaScript SDK. See `src/tools/` for source.

## When to use which tool

| Goal | Tool | Auth needed |
|---|---|---|
| Check server reachable | `pocketbase_health_check` | none |
| Login as admin/superuser | `pocketbase_auth_admin` | none |
| Login as end-user | `pocketbase_auth_user` | none |
| Check current session | `pocketbase_get_auth_status` | none |
| End session | `pocketbase_logout` | none |
| Discover collections | `pocketbase_list_collections` | admin |
| Inspect collection schema | `pocketbase_get_collection` | admin |
| Create/update/delete collection | `pocketbase_create_collection` / `_update_` / `_delete_` | admin |
| Query records | `pocketbase_list_records` | depends on `listRule` |
| Get one record | `pocketbase_get_record` | depends on `viewRule` |
| Create/update/delete record | `pocketbase_create_record` / `_update_` / `_delete_` | depends on rules |
| Build a file URL (with thumbs) | `pocketbase_get_file_url` | none (URL only) |
| Server logs / stats | `pocketbase_list_logs` / `_get_log` / `_log_stats` | admin |
| Backups | `pocketbase_list_backups` / `_create_` / `_restore_` / `_delete_` | admin |

## Always-do workflow

1. **Start with auth status.** Call `pocketbase_get_auth_status` before doing anything that may need auth — avoids confusing 401/403 errors later.
2. **Discover before guessing.** Use `pocketbase_list_collections` then `pocketbase_get_collection` to confirm field names and types instead of inventing them.
3. **Prefer `skipTotal=true` for large lists** when you don't need the total count — much faster on big tables.
4. **Use `fields` to project** only what you need (reduces response size and token usage).
5. **Use `expand` for relations** instead of doing N+1 reads (e.g. `expand="author,category"`).
6. **Default output is TOML** (~25% smaller than JSON). Only pass `format: "json"` when the caller needs JSON or you need nested arrays that TOML serializes awkwardly.

## Authentication model (PocketBase v0.22+)

- **Admin / superuser**: lives in the system collection `_superusers`. Required for any collection-schema operation, logs, or backups. `pocketbase_auth_admin` takes `email` + `password`.
- **Regular user**: lives in any auth-type collection (default `users`). `pocketbase_auth_user` takes `identity` (email OR username, NOT `email`) + `password`. Pass `identityField` to disambiguate.
- The MCP server holds **one singleton session** in memory. `pocketbase_logout` clears it.

Common mistake: using `email="..."` for `pocketbase_auth_user`. The parameter is `identity` (it supports both email and username).

## PocketBase filter syntax (used by `filter:` parameter)

Filters are evaluated server-side. Examples:

```text
status = "published"
status = "published" && views > 100
created >= "2026-01-01 00:00:00"
title ~ "claude"                    # contains (case-insensitive)
title !~ "draft"                    # does not contain
tags ?= "javascript"                # any-of (for multi-value fields)
author.verified = true              # relation field traversal
id = "abc123def456789"
```

Operators: `=`, `!=`, `>`, `>=`, `<`, `<=`, `~` (contains), `!~` (not contains), `?=`, `?!=`, `?>`, `?>=`, `?<`, `?<=`, `?~`, `?!~` (any-of variants for multi-value fields).
Logical: `&&`, `||`. Group with `()`.

**Quote string literals** with `"..."` or `'...'`. Always quote dates (`"2026-01-01 00:00:00"`). Numbers and booleans unquoted.

**Special placeholders** (only valid inside API rules, not in `filter` parameter):
- `@request.auth.id` — current authenticated user's id
- `@request.auth.collectionName` — auth collection
- `@request.body.*` — incoming request body
- `@collection.<name>.*` — query another collection

## Sort syntax

Comma-separated field names. Prefix with `-` for descending.

```text
sort = "-created"               # newest first
sort = "status,-priority"       # status asc, then priority desc
sort = "@random"                # random order (use sparingly)
```

## Field types cheat sheet

When designing schemas, these are the supported PocketBase types and their critical option keys (the MCP server flattens `options.*` into field-level keys automatically — see `src/tools/collections.ts`):

| Type | Key options |
|---|---|
| `text` | `min`, `max`, `pattern`, `autogeneratePattern`, `primaryKey` |
| `number` | `min`, `max`, `onlyInt` |
| `bool` | (just `required`) |
| `email` | `onlyDomains`, `exceptDomains` |
| `url` | `onlyDomains`, `exceptDomains` |
| `date` | `min`, `max` (ISO strings) |
| `autodate` | `onCreate`, `onUpdate` — for `created` / `updated` timestamps |
| `select` | `values: [...]`, `maxSelect` (1 = single, >1 = multi) |
| `relation` | `collectionId` (accepts collection name OR id — MCP server resolves names), `cascadeDelete`, `maxSelect`, `minSelect`, `displayFields` |
| `file` | `maxSelect`, `maxSize` (bytes), `mimeTypes: [...]`, `thumbs: [...]`, `protected` |
| `json` | `maxSize` |
| `editor` | `maxSize`, `convertUrls` |
| `geoPoint` | (lat/lon) |

**Auto-injected by `pocketbase_create_collection`** if you don't define them: `id` (15-char `[a-z0-9]`), `created` (autodate onCreate), `updated` (autodate onCreate+onUpdate). See `src/tools/collections.ts:271-303`.

**Examples on disk**: `examples/create-collection-with-relations.json`, `examples/create-collection-with-autodate.json`.

## API rules (collection-level access control)

Each collection has 5 rule strings: `listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`.

- `null` (or unset) → **admin-only** (denied via public API)
- `""` (empty string) → **public** (anyone, even unauthenticated)
- A filter expression → users matching the filter

Common patterns:

```text
listRule:   "@request.auth.id != ''"                       # any logged-in user
viewRule:   "@request.auth.id = author.id"                 # only the owner
createRule: "@request.auth.id != '' && @request.body.author = @request.auth.id"
updateRule: "@request.auth.id = author.id"
deleteRule: null                                            # admin-only
```

See `references/security_rules.md` for a deeper guide (visibility rules, multi-tenant patterns, validation, ownership).

## File URLs & thumbnails

`pocketbase_get_file_url` builds a URL — no network call. Thumb formats:

| Format | Behavior |
|---|---|
| `WxH` | Crop to WxH (center) |
| `WxHt` / `WxHb` | Crop top / bottom |
| `WxHf` | Fit inside WxH (no crop) |
| `0xH` | Resize to height, preserve aspect |
| `Wx0` | Resize to width, preserve aspect |

Pass `download: true` to force browser download instead of inline render.

## Error handling

The server returns structured errors with `code`, `message`, and usually a `suggestion`:

| Code | Meaning |
|---|---|
| `CONNECTION_ERROR` | Server unreachable — check `POCKETBASE_URL` |
| `AUTH_REQUIRED` | Need to call `pocketbase_auth_admin` or `_auth_user` first |
| `AUTH_FAILED` | Bad credentials |
| `PERMISSION_DENIED` | Auth ok but collection rule blocks operation |
| `NOT_FOUND` | Collection or record id wrong |
| `VALIDATION_ERROR` | Bad input — check `fieldErrors` field for per-field detail |
| `RATE_LIMITED` | Backoff and retry |
| `SERVER_ERROR` | Check PocketBase logs (use `pocketbase_list_logs`) |

When you see `VALIDATION_ERROR`, the response often includes `fieldErrors: { fieldName: "..." }` — surface that to the user instead of just the generic message.

## Response size & pagination

`pocketbase_list_records` auto-truncates if the formatted response exceeds `MAX_RESPONSE_SIZE` (see `src/constants.ts`). When you see `_truncated: true` in the response, narrow with `filter`/`fields` or paginate (`page` + `perPage`).

Default `perPage` is `50`, max accepted by PocketBase is `500`. For very large traversals, prefer `skipTotal=true` and walk pages.

## Quick recipes

**Find authored posts of the current user (admin already logged in):**
```
pocketbase_list_records(
  collection="posts",
  filter="author = '<userId>' && status = 'published'",
  sort="-created",
  expand="author",
  fields="id,title,created,expand"
)
```

**Add a `status` select field to an existing collection** — fetch current fields, append the new one, send all of them back (PocketBase replaces the full `fields` array on update):

1. `pocketbase_get_collection(name="posts")` → grab `fields`
2. Append `{ name: "status", type: "select", required: true, options: { values: ["draft","published"], maxSelect: 1 } }`
3. `pocketbase_update_collection(name="posts", fields=[...full updated list...])`

**Create a one-to-many relation** (comments → posts):
```
pocketbase_create_collection(
  name="comments",
  type="base",
  fields=[
    { name: "text", type: "text", required: true },
    { name: "post", type: "relation", required: true,
      options: { collectionId: "posts", cascadeDelete: true, maxSelect: 1 } }
  ],
  listRule: "",
  createRule: "@request.auth.id != ''"
)
```
Note the MCP server accepts the collection **name** (`"posts"`) and resolves it to an id for you.

## References (load on demand)

- [security_rules.md](references/security_rules.md) — comprehensive guide to designing API rules, ownership patterns, multi-tenant access, common pitfalls.
- [api_reference.md](references/api_reference.md) — broader PocketBase API/SDK reference for when you need behavior the MCP doesn't expose.

## Don't

- Don't invent collection or field names — call `pocketbase_list_collections` / `pocketbase_get_collection` first.
- Don't pass `email` to `pocketbase_auth_user`; the parameter is `identity`.
- Don't omit auth before calling collection-management or backup/log tools — they will fail with `AUTH_REQUIRED`.
- Don't try to drive realtime subscriptions through the MCP — this server is request/response only.
- Don't use this MCP to push large file uploads — file content goes via PocketBase REST directly; the MCP exposes only metadata and URLs.
