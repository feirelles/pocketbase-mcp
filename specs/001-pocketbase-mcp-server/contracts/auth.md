# Authentication Tool Contracts

## pocketbase_auth_admin

Authenticate as PocketBase admin/superuser to access admin-only operations.

### Input Schema

```typescript
const AuthAdminInput = z.object({
  email: z.string()
    .email('Invalid email format')
    .describe('Admin email address'),
  password: z.string()
    .min(1, 'Password required')
    .describe('Admin password'),
  format: z.enum(['toml', 'json'])
    .default('toml')
    .describe('Output format')
}).strict();
```

### Output Schema

```typescript
const AuthAdminOutput = z.object({
  success: z.boolean(),
  authType: z.literal('admin'),
  admin: z.object({
    id: z.string(),
    email: z.string()
  }),
  tokenExpiry: z.string().nullable()
});
```

### Example

**Input:**
```json
{
  "email": "admin@example.com",
  "password": "secretpassword"
}
```

**Output (TOML):**
```toml
success = true
authType = "admin"
tokenExpiry = "2026-01-15T12:30:00.000Z"

[admin]
id = "admin_abc123"
email = "admin@example.com"
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

## pocketbase_auth_user

Authenticate as a regular user from an auth collection.

### Input Schema

```typescript
const AuthUserInput = z.object({
  collection: z.string()
    .default('users')
    .describe('Auth collection name (default: users)'),
  email: z.string()
    .email('Invalid email format')
    .describe('User email address'),
  password: z.string()
    .min(1, 'Password required')
    .describe('User password'),
  format: z.enum(['toml', 'json'])
    .default('toml')
    .describe('Output format')
}).strict();
```

### Output Schema

```typescript
const AuthUserOutput = z.object({
  success: z.boolean(),
  authType: z.literal('user'),
  collection: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    verified: z.boolean(),
    created: z.string(),
    updated: z.string()
  }).passthrough(), // Allow additional fields from schema
  tokenExpiry: z.string().nullable()
});
```

### Example

**Input:**
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Output (TOML):**
```toml
success = true
authType = "user"
collection = "users"
tokenExpiry = "2026-01-15T12:30:00.000Z"

[user]
id = "user_xyz789"
email = "user@example.com"
verified = true
created = "2026-01-01T00:00:00.000Z"
updated = "2026-01-10T15:30:00.000Z"
```

---

## pocketbase_get_auth_status

Get current authentication status without making any changes.

### Input Schema

```typescript
const GetAuthStatusInput = z.object({
  format: z.enum(['toml', 'json'])
    .default('toml')
    .describe('Output format')
}).strict();
```

### Output Schema

```typescript
const GetAuthStatusOutput = z.object({
  isAuthenticated: z.boolean(),
  authType: z.enum(['admin', 'user']).nullable(),
  model: z.object({
    id: z.string(),
    email: z.string()
  }).passthrough().nullable(),
  tokenValid: z.boolean(),
  tokenExpiry: z.string().nullable()
});
```

### Example

**Output (TOML) - Authenticated:**
```toml
isAuthenticated = true
authType = "admin"
tokenValid = true
tokenExpiry = "2026-01-15T12:30:00.000Z"

[model]
id = "admin_abc123"
email = "admin@example.com"
```

**Output (TOML) - Not authenticated:**
```toml
isAuthenticated = false
tokenValid = false
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

## pocketbase_logout

Clear current authentication session.

### Input Schema

```typescript
const LogoutInput = z.object({
  format: z.enum(['toml', 'json'])
    .default('toml')
    .describe('Output format')
}).strict();
```

### Output Schema

```typescript
const LogoutOutput = z.object({
  success: z.boolean(),
  message: z.string()
});
```

### Example

**Output (TOML):**
```toml
success = true
message = "Successfully logged out"
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
