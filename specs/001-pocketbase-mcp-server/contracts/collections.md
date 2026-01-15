# Collection Tool Contracts

All collection management tools require admin authentication.

## pocketbase_list_collections

List all collections in the PocketBase instance.

### Input Schema

```typescript
const ListCollectionsInput = z.object({
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
    .describe('Items per page'),
  filter: z.string()
    .optional()
    .describe('Filter expression (e.g., type="base")'),
  format: z.enum(['toml', 'json'])
    .default('toml')
    .describe('Output format')
}).strict();
```

### Output Schema

```typescript
const ListCollectionsOutput = z.object({
  page: z.number(),
  perPage: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['base', 'auth', 'view']),
    system: z.boolean(),
    fieldCount: z.number()
  }))
});
```

### Example

**Output (TOML):**
```toml
page = 1
perPage = 50
totalItems = 5
totalPages = 1

[[items]]
id = "_pb_users_auth_"
name = "users"
type = "auth"
system = true
fieldCount = 8

[[items]]
id = "posts_collection"
name = "posts"
type = "base"
system = false
fieldCount = 6

[[items]]
id = "comments_col"
name = "comments"
type = "base"
system = false
fieldCount = 4
```

### Annotations

```typescript
{
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
}
```

---

## pocketbase_get_collection

Get detailed schema information for a collection.

### Input Schema

```typescript
const GetCollectionInput = z.object({
  name: z.string()
    .min(1, 'Collection name required')
    .describe('Collection name or ID'),
  format: z.enum(['toml', 'json'])
    .default('toml')
    .describe('Output format')
}).strict();
```

### Output Schema

```typescript
const GetCollectionOutput = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['base', 'auth', 'view']),
  system: z.boolean(),
  fields: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean(),
    options: z.record(z.unknown())
  })),
  indexes: z.array(z.string()),
  listRule: z.string().nullable(),
  viewRule: z.string().nullable(),
  createRule: z.string().nullable(),
  updateRule: z.string().nullable(),
  deleteRule: z.string().nullable(),
  created: z.string(),
  updated: z.string()
});
```

### Example

**Input:**
```json
{
  "name": "posts"
}
```

**Output (TOML):**
```toml
id = "posts_collection"
name = "posts"
type = "base"
system = false
created = "2026-01-01T00:00:00.000Z"
updated = "2026-01-10T12:00:00.000Z"

listRule = ""
viewRule = ""
createRule = "@request.auth.id != ''"
updateRule = "@request.auth.id = author"
deleteRule = "@request.auth.id = author"

indexes = [
  "CREATE INDEX idx_posts_status ON posts (status)",
  "CREATE INDEX idx_posts_author ON posts (author)"
]

[[fields]]
name = "title"
type = "text"
required = true
[fields.options]
min = 1
max = 200

[[fields]]
name = "content"
type = "editor"
required = false
[fields.options]

[[fields]]
name = "status"
type = "select"
required = true
[fields.options]
values = ["draft", "published", "archived"]

[[fields]]
name = "author"
type = "relation"
required = true
[fields.options]
collectionId = "_pb_users_auth_"
cascadeDelete = false
```

---

## pocketbase_create_collection

Create a new collection with schema definition.

### Input Schema

```typescript
const CreateCollectionInput = z.object({
  name: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Invalid collection name')
    .describe('Collection name (alphanumeric, start with letter)'),
  type: z.enum(['base', 'auth'])
    .default('base')
    .describe('Collection type'),
  fields: z.array(z.object({
    name: z.string(),
    type: z.enum(['text', 'number', 'bool', 'email', 'url', 'date', 'select', 'json', 'file', 'relation', 'editor']),
    required: z.boolean().default(false),
    options: z.record(z.unknown()).optional()
  })).min(1, 'At least one field required')
    .describe('Field definitions'),
  listRule: z.string()
    .optional()
    .describe('List API rule (empty = public, null = admin only)'),
  viewRule: z.string()
    .optional()
    .describe('View API rule'),
  createRule: z.string()
    .optional()
    .describe('Create API rule'),
  updateRule: z.string()
    .optional()
    .describe('Update API rule'),
  deleteRule: z.string()
    .optional()
    .describe('Delete API rule'),
  indexes: z.array(z.string())
    .optional()
    .describe('Index definitions'),
  format: z.enum(['toml', 'json'])
    .default('toml')
    .describe('Output format')
}).strict();
```

### Output Schema

Same as `GetCollectionOutput`.

### Example

**Input:**
```json
{
  "name": "products",
  "type": "base",
  "fields": [
    {
      "name": "title",
      "type": "text",
      "required": true,
      "options": { "min": 1, "max": 200 }
    },
    {
      "name": "price",
      "type": "number",
      "required": true,
      "options": { "min": 0 }
    },
    {
      "name": "inStock",
      "type": "bool",
      "required": false
    }
  ],
  "listRule": "",
  "createRule": "@request.auth.id != ''"
}
```

### Annotations

```typescript
{
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false
}
```

---

## pocketbase_update_collection

Update an existing collection's schema or rules.

### Input Schema

```typescript
const UpdateCollectionInput = z.object({
  name: z.string()
    .min(1)
    .describe('Collection name to update'),
  newName: z.string()
    .optional()
    .describe('New collection name (rename)'),
  fields: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean().optional(),
    options: z.record(z.unknown()).optional()
  })).optional()
    .describe('Updated field definitions (replaces all fields)'),
  listRule: z.string().nullable().optional(),
  viewRule: z.string().nullable().optional(),
  createRule: z.string().nullable().optional(),
  updateRule: z.string().nullable().optional(),
  deleteRule: z.string().nullable().optional(),
  indexes: z.array(z.string()).optional(),
  format: z.enum(['toml', 'json'])
    .default('toml')
    .describe('Output format')
}).strict();
```

### Annotations

```typescript
{
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
}
```

---

## pocketbase_delete_collection

Delete a collection and all its records.

### Input Schema

```typescript
const DeleteCollectionInput = z.object({
  name: z.string()
    .min(1)
    .describe('Collection name to delete'),
  format: z.enum(['toml', 'json'])
    .default('toml')
    .describe('Output format')
}).strict();
```

### Output Schema

```typescript
const DeleteCollectionOutput = z.object({
  success: z.boolean(),
  deletedCollection: z.string(),
  message: z.string()
});
```

### Example

**Output (TOML):**
```toml
success = true
deletedCollection = "old_collection"
message = "Collection and all records deleted successfully"
```

### Annotations

```typescript
{
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false
}
```
