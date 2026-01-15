# Record Tool Contracts

## pocketbase_list_records

List records from a collection with filtering, sorting, and pagination.

### Input Schema

```typescript
const ListRecordsInput = z.object({
  collection: z.string()
    .min(1, 'Collection name required')
    .describe('Collection name to query'),
  page: z.number()
    .int()
    .min(1)
    .default(1)
    .describe('Page number (1-indexed)'),
  perPage: z.number()
    .int()
    .min(1)
    .max(500)
    .default(50)
    .describe('Items per page (max 500)'),
  filter: z.string()
    .optional()
    .describe('PocketBase filter expression (e.g., status="published")'),
  sort: z.string()
    .optional()
    .describe('Sort field(s), prefix with - for descending (e.g., -created)'),
  fields: z.string()
    .optional()
    .describe('Comma-separated fields to return (e.g., id,title,created)'),
  expand: z.string()
    .optional()
    .describe('Relations to expand (e.g., author,comments)'),
  format: z.enum(['toml', 'json'])
    .default('toml')
    .describe('Output format')
}).strict();
```

### Output Schema

```typescript
const ListRecordsOutput = z.object({
  page: z.number(),
  perPage: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
  hasMore: z.boolean(),
  nextOffset: z.number().optional(),
  items: z.array(z.record(z.unknown()))
});
```

### Example

**Input:**
```json
{
  "collection": "posts",
  "filter": "status = 'published'",
  "sort": "-created",
  "perPage": 10,
  "expand": "author"
}
```

**Output (TOML):**
```toml
page = 1
perPage = 10
totalItems = 47
totalPages = 5
hasMore = true
nextOffset = 10

[[items]]
id = "abc123def456"
title = "Getting Started with PocketBase"
status = "published"
created = "2026-01-15T10:30:00.000Z"

[items.expand.author]
id = "user_xyz789"
name = "John Doe"
email = "john@example.com"

[[items]]
id = "ghi789jkl012"
title = "Advanced Queries"
status = "published"
created = "2026-01-14T08:15:00.000Z"
```

### Annotations

```typescript
{
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
}
```

---

## pocketbase_get_record

Get a single record by ID.

### Input Schema

```typescript
const GetRecordInput = z.object({
  collection: z.string()
    .min(1, 'Collection name required')
    .describe('Collection name'),
  id: z.string()
    .min(1, 'Record ID required')
    .describe('Record ID to retrieve'),
  fields: z.string()
    .optional()
    .describe('Comma-separated fields to return'),
  expand: z.string()
    .optional()
    .describe('Relations to expand'),
  format: z.enum(['toml', 'json'])
    .default('toml')
    .describe('Output format')
}).strict();
```

### Output Schema

```typescript
const GetRecordOutput = z.object({
  id: z.string(),
  created: z.string(),
  updated: z.string()
}).passthrough(); // Allow any additional fields
```

### Example

**Input:**
```json
{
  "collection": "posts",
  "id": "abc123def456",
  "expand": "author,comments"
}
```

**Output (TOML):**
```toml
id = "abc123def456"
title = "Getting Started with PocketBase"
content = "PocketBase is an open source backend..."
status = "published"
created = "2026-01-15T10:30:00.000Z"
updated = "2026-01-15T14:00:00.000Z"

[expand.author]
id = "user_xyz789"
name = "John Doe"

[[expand.comments]]
id = "comment_001"
text = "Great article!"
```

---

## pocketbase_create_record

Create a new record in a collection.

### Input Schema

```typescript
const CreateRecordInput = z.object({
  collection: z.string()
    .min(1, 'Collection name required')
    .describe('Collection name'),
  data: z.record(z.unknown())
    .describe('Record data as key-value pairs'),
  format: z.enum(['toml', 'json'])
    .default('toml')
    .describe('Output format')
}).strict();
```

### Output Schema

```typescript
const CreateRecordOutput = z.object({
  id: z.string(),
  created: z.string(),
  updated: z.string()
}).passthrough();
```

### Example

**Input:**
```json
{
  "collection": "posts",
  "data": {
    "title": "New Post",
    "content": "This is the content...",
    "status": "draft",
    "author": "user_xyz789"
  }
}
```

**Output (TOML):**
```toml
id = "new_record_id"
title = "New Post"
content = "This is the content..."
status = "draft"
author = "user_xyz789"
created = "2026-01-15T16:00:00.000Z"
updated = "2026-01-15T16:00:00.000Z"
```

### Annotations

```typescript
{
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true
}
```

---

## pocketbase_update_record

Update an existing record (partial update / patch).

### Input Schema

```typescript
const UpdateRecordInput = z.object({
  collection: z.string()
    .min(1, 'Collection name required')
    .describe('Collection name'),
  id: z.string()
    .min(1, 'Record ID required')
    .describe('Record ID to update'),
  data: z.record(z.unknown())
    .describe('Fields to update (partial update)'),
  format: z.enum(['toml', 'json'])
    .default('toml')
    .describe('Output format')
}).strict();
```

### Output Schema

```typescript
const UpdateRecordOutput = z.object({
  id: z.string(),
  created: z.string(),
  updated: z.string()
}).passthrough();
```

### Example

**Input:**
```json
{
  "collection": "posts",
  "id": "abc123def456",
  "data": {
    "status": "published",
    "publishedAt": "2026-01-15T17:00:00.000Z"
  }
}
```

**Output (TOML):**
```toml
id = "abc123def456"
title = "Getting Started with PocketBase"
status = "published"
publishedAt = "2026-01-15T17:00:00.000Z"
created = "2026-01-15T10:30:00.000Z"
updated = "2026-01-15T17:00:00.000Z"
```

### Annotations

```typescript
{
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
}
```

---

## pocketbase_delete_record

Delete a record by ID.

### Input Schema

```typescript
const DeleteRecordInput = z.object({
  collection: z.string()
    .min(1, 'Collection name required')
    .describe('Collection name'),
  id: z.string()
    .min(1, 'Record ID required')
    .describe('Record ID to delete'),
  format: z.enum(['toml', 'json'])
    .default('toml')
    .describe('Output format')
}).strict();
```

### Output Schema

```typescript
const DeleteRecordOutput = z.object({
  success: z.boolean(),
  deletedId: z.string(),
  message: z.string()
});
```

### Example

**Input:**
```json
{
  "collection": "posts",
  "id": "abc123def456"
}
```

**Output (TOML):**
```toml
success = true
deletedId = "abc123def456"
message = "Record deleted successfully"
```

### Annotations

```typescript
{
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true
}
```
