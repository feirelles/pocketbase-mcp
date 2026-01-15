# PocketBase Security Rules

Comprehensive guide to implementing security and access control in PocketBase collections.

## Table of Contents
1. [Understanding Security Rules](#understanding-security-rules)
2. [Rule Types](#rule-types)
3. [Common Patterns](#common-patterns)
4. [Role-Based Access Control](#role-based-access-control)
5. [Field-Level Security](#field-level-security)
6. [File Security](#file-security)
7. [Examples by Use Case](#examples-by-use-case)
8. [Testing Rules](#testing-rules)

## Understanding Security Rules

PocketBase uses four types of security rules per collection:

1. **listRule** - Who can view the list of records
2. **viewRule** - Who can view individual records
3. **createRule** - Who can create new records
4. **updateRule** - Who can update existing records
5. **deleteRule** - Who can delete records

### Rule Context Variables

- `@request.auth.id` - ID of the authenticated user making the request
- `@request.auth` - The full authenticated user record
- `@request.method` - HTTP method (GET, POST, PATCH, DELETE)
- `id` - ID of the current record being accessed

### Common Comparison Operators

- `=` - Equals
- `!=` - Not equals
- `<`, `<=`, `>`, `>=` - Numeric comparisons
- `~` - Contains/in (for arrays and relations)
- `!~` - Not contains
- `~` with regex - Pattern matching (e.g., `name ~ "test"`)

## Rule Types

### Public Access (No Authentication)
```javascript
// Anyone can read, only authenticated can write
listRule: ""
viewRule: ""
createRule: "@request.auth.id != ''"
```

### Authenticated Users Only
```javascript
// Only authenticated users can access
listRule: "@request.auth.id != ''"
viewRule: "@request.auth.id != ''"
createRule: "@request.auth.id != ''"
updateRule: "@request.auth.id != ''"
deleteRule: "@request.auth.id != ''"
```

### Owner-Based Access Control
```javascript
// Only the record owner can modify
createRule: "@request.auth.id != ''"
updateRule: "user_id = @request.auth.id"
deleteRule: "user_id = @request.auth.id"
```

### Admin-Only Access
```javascript
// Only admins can access (requires user role field)
listRule: "@request.auth.role = 'admin'"
viewRule: "@request.auth.role = 'admin'"
createRule: "@request.auth.role = 'admin'"
updateRule: "@request.auth.role = 'admin'"
deleteRule: "@request.auth.role = 'admin'"
```

### Read Public, Write Owner
```javascript
// Public can read, only owner can write
listRule: ""
viewRule: ""
createRule: "@request.auth.id != ''"
updateRule: "author = @request.auth.id"
deleteRule: "author = @request.auth.id"
```

## Common Patterns

### Pattern 1: User Profile (User Can Only Modify Their Own)
```javascript
listRule: "@request.auth.id = user_id"
viewRule: "@request.auth.id = user_id"
createRule: "@request.auth.id = user_id"
updateRule: "@request.auth.id = user_id"
deleteRule: "@request.auth.id = user_id"

// Where user_id is a field that stores the record owner's ID
```

### Pattern 2: Posts/Articles (Public Read, Owner Write)
```javascript
listRule: "status = 'published'"
viewRule: "status = 'published'"
createRule: "@request.auth.id != ''"
updateRule: "author = @request.auth.id"
deleteRule: "author = @request.auth.id"
```

### Pattern 3: Comments (Nested Under Parent)
```javascript
listRule: "post.status = 'published'"
viewRule: "post.status = 'published'"
createRule: "@request.auth.id != ''"
updateRule: "author = @request.auth.id"
deleteRule: "author = @request.auth.id"

// Assuming 'post' is a relation field
```

### Pattern 4: Team Projects (Team Members Only)
```javascript
listRule: "@request.auth.id ~ members"
viewRule: "@request.auth.id ~ members"
createRule: "@request.auth.id ~ members"
updateRule: "creator = @request.auth.id || @request.auth.id ~ members"
deleteRule: "creator = @request.auth.id"

// Where 'members' is an array of user IDs
```

### Pattern 5: E-commerce Orders
```javascript
// Customers can see their own orders
listRule: "customer = @request.auth.id"
viewRule: "customer = @request.auth.id"
createRule: "customer = @request.auth.id"
updateRule: "@request.auth.id != ''"  // Only admins/staff can update
deleteRule: "@request.auth.id != ''"  // Only admins can delete
```

## Role-Based Access Control

### Basic RBAC with User Roles

First, add a role field to your users collection:
```json
{
  "id": "role",
  "name": "role",
  "type": "select",
  "required": true,
  "options": {
    "values": ["user", "moderator", "admin"]
  }
}
```

Now use the role in security rules:

**Regular Collection (User/Moderator/Admin)**
```javascript
listRule: "@request.auth.id != ''"
viewRule: "@request.auth.id != ''"
createRule: "@request.auth.id != ''"
updateRule: "user_id = @request.auth.id || @request.auth.role = 'moderator' || @request.auth.role = 'admin'"
deleteRule: "@request.auth.role = 'moderator' || @request.auth.role = 'admin'"
```

**Admin-Only Collection**
```javascript
listRule: "@request.auth.role = 'admin'"
viewRule: "@request.auth.role = 'admin'"
createRule: "@request.auth.role = 'admin'"
updateRule: "@request.auth.role = 'admin'"
deleteRule: "@request.auth.role = 'admin'"
```

**Moderator+ Collection**
```javascript
listRule: "@request.auth.id != ''"
viewRule: "@request.auth.id != ''"
createRule: "@request.auth.id != ''"
updateRule: "user_id = @request.auth.id || @request.auth.role != 'user'"
deleteRule: "@request.auth.role != 'user'"
```

### Advanced RBAC: Permission Matrix

```javascript
// Roles: user, author, editor, admin
// Permissions: read, write, delete, publish

// For 'posts' collection:
createRule: "@request.auth.role = 'author' || @request.auth.role = 'editor' || @request.auth.role = 'admin'"
updateRule: "author = @request.auth.id || @request.auth.role = 'editor' || @request.auth.role = 'admin'"
deleteRule: "author = @request.auth.id || @request.auth.role = 'admin'"
updateRule: "status = 'draft' && (author = @request.auth.id || @request.auth.role = 'editor' || @request.auth.role = 'admin')"

// Only editors and admins can publish
updateRule: "if(status != 'published'){ author = @request.auth.id } else { @request.auth.role = 'editor' || @request.auth.role = 'admin' }"
```

## Field-Level Security

Restrict access to specific fields using the `options` parameter in the schema.

### Read-Only Fields
```json
{
  "id": "created_by",
  "name": "created_by",
  "type": "relation",
  "required": true,
  "options": {
    "collectionId": "users",
    "cascadeDelete": false,
    "maxSelect": 1
  },
  "presentable": false  // Don't show in public APIs
}
```

### Admin-Only Fields
```json
{
  "id": "internal_notes",
  "name": "internal_notes",
  "type": "text",
  "options": {},
  "onlyAllow": ["@request.auth.role = 'admin'"]  // Only admins can set
}
```

### User-Owned Fields
```json
{
  "id": "private_data",
  "name": "private_data",
  "type": "json",
  "options": {},
  "onlyAllow": ["user_id = @request.auth.id || @request.auth.role = 'admin'"]
}
```

## File Security

Control who can upload, view, and delete files.

### Private Files (Owner Only)
```javascript
// User avatars - only owner can upload
createRule: "@request.auth.id != ''"
updateRule: "@request.auth.id = user_id"

// File access rule (in file field options):
// This controls who can access the file URL
"options": {
  "maxSelect": 1,
  "maxSize": 5242880,
  "thumbs": ["100x100", "300x300"],
  "filterSelect": "user_id = @request.auth.id"
}
```

### Public Files (Viewable by All)
```javascript
// Blog post images - authenticated users can upload
createRule: "@request.auth.id != ''"
updateRule: "author = @request.auth.id"

// File is publicly viewable
```

### Members-Only Files
```javascript
// Team documents - only team members can access
createRule: "@request.auth.id ~ team_members"
updateRule: "@request.auth.id ~ team_members"

// File access filter
"filterSelect": "@request.auth.id ~ team_members"
```

## Examples by Use Case

### Blog Platform
```javascript
// Posts
listRule: "status = 'published'"
viewRule: "status = 'published'"
createRule: "@request.auth.id != ''"
updateRule: "author = @request.auth.id"
deleteRule: "author = @request.auth.id"

// Comments (must be authenticated)
listRule: "is_approved = true"
viewRule: "is_approved = true"
createRule: "@request.auth.id != ''"
updateRule: "author = @request.auth.id"
deleteRule: "author = @request.auth.id"
```

### Social Network
```javascript
// Posts (public)
listRule: ""
viewRule: ""
createRule: "@request.auth.id != ''"
updateRule: "author = @request.auth.id"
deleteRule: "author = @request.auth.id"

// Private Messages
listRule: "sender = @request.auth.id || receiver = @request.auth.id"
viewRule: "sender = @request.auth.id || receiver = @request.auth.id"
createRule: "@request.auth.id != ''"
updateRule: "@request.auth.id != ''"  // Only mark as read
deleteRule: "sender = @request.auth.id || receiver = @request.auth.id"
```

### SaaS Application
```javascript
// Workspaces
listRule: "@request.auth.id ~ members"
viewRule: "@request.auth.id ~ members"
createRule: "@request.auth.id ~ members"
updateRule: "@request.auth.id ~ owners"
deleteRule: "@request.auth.id ~ owners"

// Workspace Records
listRule: "workspace.members.id ?= @request.auth.id"
viewRule: "workspace.members.id ?= @request.auth.id"
createRule: "workspace.members.id ?= @request.auth.id"
updateRule: "workspace.members.id ?= @request.auth.id"
deleteRule: "workspace.owners.id ?= @request.auth.id"
```

### E-commerce
```javascript
// Products
listRule: "is_active = true"
viewRule: "is_active = true"
createRule: "@request.auth.id != ''"  // Staff only in real app
updateRule: "@request.auth.id != ''"  // Staff only
deleteRule: "@request.auth.id != ''"  // Staff only

// Orders
listRule: "customer = @request.auth.id"
viewRule: "customer = @request.auth.id"
createRule: "customer = @request.auth.id"
updateRule: "@request.auth.id != ''"  // Staff can update status
deleteRule: "@request.auth.id != ''"  // Staff only
```

### Project Management
```javascript
// Projects
listRule: "@request.auth.id ~ members || @request.auth.id = owner"
viewRule: "@request.auth.id ~ members || @request.auth.id = owner"
createRule: "@request.auth.id != ''"
updateRule: "@request.auth.id = owner || @request.auth.id ~ managers"
deleteRule: "@request.auth.id = owner"

// Tasks
listRule: "project.members.id ?= @request.auth.id"
viewRule: "project.members.id ?= @request.auth.id"
createRule: "project.members.id ?= @request.auth.id"
updateRule: "assignee = @request.auth.id || @request.auth.id ~ project.managers"
deleteRule: "@request.auth.id ~ project.managers"
```

## Testing Rules

### Manual Testing
1. Create a test user account
2. Create records with different ownership
3. Test each rule (list, view, create, update, delete)
4. Test with different user roles
5. Test edge cases (null values, missing relations, etc.)

### Programmatic Testing
```javascript
// Test with authenticated user
const pb = new PocketBase('http://127.0.0.1:8090')

// Login
await pb.collection('users').authWithPassword('test@example.com', 'password')

try {
  // Try to create record
  const record = await pb.collection('posts').create({
    title: 'Test',
    content: 'Content'
  })
  console.log('✓ Create successful')
} catch (e) {
  console.log('✗ Create failed:', e.data)
}

try {
  // Try to get list
  const records = await pb.collection('posts').getList(1, 50)
  console.log('✓ List successful:', records.items.length, 'records')
} catch (e) {
  console.log('✗ List failed:', e.message)
}
```

### Common Pitfalls

1. **Forgetting `!= ''` check**
   ```javascript
   // Wrong - allows anonymous users
   createRule: "user_id = user_id"

   // Correct - requires authentication
   createRule: "@request.auth.id != '' && user_id = @request.auth.id"
   ```

2. **Incorrect relation syntax**
   ```javascript
   // Wrong
   listRule: "user.id = @request.auth.id"

   // Correct
   listRule: "user = @request.auth.id"
   ```

3. **Not handling null values**
   ```javascript
   // If field can be null, add explicit check
   listRule: "status != null && status = 'published'"
   ```

4. **Over-restrictive rules**
   ```javascript
   // This prevents admins from accessing
   updateRule: "author = @request.auth.id"

   // Better - allows admin override
   updateRule: "author = @request.auth.id || @request.auth.role = 'admin'"
   ```

## Best Practices

1. **Use the principle of least privilege** - Start restrictive, add permissions as needed
2. **Test with multiple user roles** - Don't just test with admin users
3. **Document your rules** - Add comments explaining complex rules
4. **Use consistent naming** - Name fields clearly (e.g., `author` instead of `user`)
5. **Validate on the client** - Don't rely solely on server-side validation
6. **Use indexes** - Add database indexes for fields used in rules
7. **Monitor access** - Log security events and failed attempts
8. **Regular audits** - Review rules periodically for security issues

## Security Checklist

- [ ] All sensitive collections require authentication
- [ ] Users can only access their own data
- [ ] Admin-only collections are properly protected
- [ ] File uploads have size and type restrictions
- [ ] Delete operations are properly restricted
- [ ] Rules handle edge cases (null values, empty arrays)
- [ ] Public data is explicitly marked as public
- [ ] Internal data is never exposed via rules
- [ ] Rules are tested with multiple user types
- [ ] Complex rules are documented and reviewed
