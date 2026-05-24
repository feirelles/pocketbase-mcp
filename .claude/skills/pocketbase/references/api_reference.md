# PocketBase API Reference

Comprehensive guide to working with PocketBase APIs, SDKs, and common patterns.

## Table of Contents
1. [Installation & Setup](#installation--setup)
2. [JavaScript SDK](#javascript-sdk)
3. [REST API](#rest-api)
4. [Authentication](#authentication)
5. [CRUD Operations](#crud-operations)
6. [File Uploads](#file-uploads)
7. [Real-time Subscriptions](#real-time-subscriptions)
8. [Error Handling](#error-handling)

## Installation & Setup

### JavaScript SDK (Browser)
```html
<script src="https://unpkg.com/pocketbase@latest/dist/pocketbase.umd.js"></script>
<script>
  const pb = new PocketBase('http://127.0.0.1:8090');
</script>
```

### JavaScript SDK (ESM)
```bash
npm install pocketbase
```

```javascript
import PocketBase from 'pocketbase'

const pb = new PocketBase('http://127.0.0.1:8090')
```

### Python SDK
```bash
pip install pocketbase
```

```python
from pocketbase import PocketBase

pb = PocketBase('http://127.0.0.1:8090')
```

## JavaScript SDK

### Initialize Client
```javascript
import PocketBase from 'pocketbase'

// Browser or ESM
const pb = new PocketBase('http://127.0.0.1:8090')

// Auto-cancel previous requests when new one is fired
pb.autoCancellation(false)
```

### Authentication

**Register User**
```javascript
const authData = await pb.collection('users').create({
  email: 'test@example.com',
  password: '123456789',
  passwordConfirm: '123456789',
  name: 'John Doe'
})

// Or with additional profile fields
const authData = await pb.collection('users').create({
  email: 'test@example.com',
  password: '123456789',
  passwordConfirm: '123456789',
  name: 'John Doe',
  avatar: fileData // File instance
})
```

**Login**
```javascript
const authData = await pb.collection('users').authWithPassword(
  'test@example.com',
  '123456789'
)

// Access auth fields
console.log(authData.user.email)
console.log(authData.token) // JWT access token
```

**Login with OAuth2 (Google, GitHub, etc.)**
```javascript
const authData = await pb.collection('users').authWithOAuth2({
  provider: 'google',
  code: 'oa2-code-from-provider'
})
```

**Current Authenticated User**
```javascript
// Get current user
const user = pb.authStore.model

// Check if authenticated
if (pb.authStore.isValid) {
  // User is authenticated
}

// Refresh current user
const user = await pb.collection('users').authRefresh()

// Logout
pb.authStore.clear()
```

### CRUD Operations

**Create Record**
```javascript
const record = await pb.collection('posts').create({
  title: 'My First Post',
  content: 'Hello world!',
  author: pb.authStore.model.id // Link to current user
})
```

**Get Single Record**
```javascript
const record = await pb.collection('posts').getOne('RECORD_ID')

// With expand
const record = await pb.collection('posts').getOne('RECORD_ID', {
  expand: 'author'
})

console.log(record.expand?.email) // If author is a relation
```

**Get Multiple Records (List)**
```javascript
// Basic list
const records = await pb.collection('posts').getList(1, 50)

// With filtering, sorting, and expansion
const records = await pb.collection('posts').getList(1, 50, {
  filter: 'status = "published"',
  sort: '-created',
  expand: 'author,comments',
  fields: 'id,title,author,created'
})
```

**Update Record**
```javascript
const updated = await pb.collection('posts').update('RECORD_ID', {
  title: 'Updated Title'
})
```

**Delete Record**
```javascript
await pb.collection('posts').delete('RECORD_ID')
```

### Filtering & Querying

**Filter Examples**
```javascript
// Basic equality
const records = await pb.collection('posts').getList(1, 50, {
  filter: 'status = "published"'
})

// Multiple conditions
const records = await pb.collection('posts').getList(1, 50, {
  filter: 'status = "published" && created >= "2024-01-01"'
})

// Regex
const records = await pb.collection('posts').getList(1, 50, {
  filter: 'title ~ "Hello"'
})

// In array
const records = await pb.collection('posts').getList(1, 50, {
  filter: 'categoryId ~ ["tech", "coding"]'
})

// Null check
const records = await pb.collection('posts').getList(1, 50, {
  filter: 'published != null'
})
```

**Sorting**
```javascript
// Sort by single field
const records = await pb.collection('posts').getList(1, 50, {
  sort: 'created'
})

// Sort by multiple fields
const records = await pb.collection('posts').getList(1, 50, {
  sort: 'status,-created'
})
```

### File Uploads

**Upload File**
```javascript
const formData = new FormData()
formData.append('avatar', fileInput.files[0])

const updated = await pb.collection('users').update('RECORD_ID', formData)
```

**Get File URL**
```javascript
const url = pb.files.getURL(record, record.avatar)
```

**Download File**
```javascript
const blob = await pb.files.download(record, record.fileField)
```

### Real-time Subscriptions

**Subscribe to Collection**
```javascript
// Listen to all record changes in a collection
pb.collection('posts').subscribe('*', function (e) {
  console.log(e.action) // 'create', 'update', or 'delete'
  console.log(e.record) // The changed record
})
```

**Subscribe to Specific Record**
```javascript
// Listen to changes for a specific record
pb.collection('posts').subscribe('RECORD_ID', function (e) {
  console.log('Record changed:', e.record)
})
```

**Unsubscribe**
```javascript
// Unsubscribe from specific record
pb.collection('posts').unsubscribe('RECORD_ID')

// Unsubscribe from all posts collection
pb.collection('posts').unsubscribe()

// Unsubscribe from all collections
pb.collections.unsubscribe()
```

### Batch Operations

**Create Multiple Records**
```javascript
const promises = records.map(record => {
  return pb.collection('posts').create({
    title: record.title,
    content: record.content
  })
})

const results = await Promise.all(promises)
```

## REST API

### Direct HTTP Requests

**Get Records**
```bash
curl -X GET "http://127.0.0.1:8090/api/collections/posts/records?page=1&perPage=50" \
  -H "Authorization: Bearer JWT_TOKEN"
```

**Create Record**
```bash
curl -X POST "http://127.0.0.1:8090/api/collections/posts/records" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Post",
    "content": "Content here"
  }'
```

**Update Record**
```bash
curl -X PATCH "http://127.0.0.1:8090/api/collections/posts/records/RECORD_ID" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'
```

**Delete Record**
```bash
curl -X DELETE "http://127.0.0.1:8090/api/collections/posts/records/RECORD_ID" \
  -H "Authorization: Bearer JWT_TOKEN"
```

### File Upload via REST API
```bash
curl -X POST "http://127.0.0.1:8090/api/collections/users/records/RECORD_ID" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -F 'avatar=@/path/to/file.jpg'
```

## Error Handling

### SDK Error Handling
```javascript
try {
  const record = await pb.collection('posts').getOne('INVALID_ID')
} catch (e) {
  // 404: Record not found
  if (e.status === 404) {
    console.log('Record not found')
  }

  // 403: Permission denied
  if (e.status === 403) {
    console.log('You do not have permission to access this record')
  }

  // 400: Validation error
  if (e.status === 400) {
    console.log('Validation error:', e.data)
  }

  console.error('Error:', e.message)
}
```

### Common HTTP Status Codes
- **200/201**: Success
- **400**: Bad Request (validation error)
- **401**: Unauthorized (not logged in)
- **403**: Forbidden (permission denied)
- **404**: Not Found
- **500**: Internal Server Error

### Validation Errors
```javascript
try {
  await pb.collection('users').create({
    email: 'invalid-email', // Will fail validation
    password: '123' // Too short
  })
} catch (e) {
  console.log(e.data) // { email: ['Invalid email'], password: ['Too short'] }
}
```

## Security Considerations

### CORS Configuration
Configure CORS in PocketBase settings to allow specific origins:

```javascript
// In admin UI > Settings > CORS
// Add your frontend origin (e.g., http://localhost:3000)
```

### Environment Variables
```javascript
// Production configuration
const pb = new PocketBase('https://your-production-url.com')

// Enable auto-cancellation in production
pb.autoCancellation(true)
```

### Rate Limiting
PocketBase includes built-in rate limiting. For custom rate limiting, add it in your application logic or use a reverse proxy.

## Best Practices

1. **Always use HTTPS in production**
2. **Validate data on both client and server**
3. **Use proper CORS configuration**
4. **Implement row-level security rules**
5. **Use pagination for large datasets**
6. **Cache frequent queries on the client**
7. **Unsubscribe from real-time events when no longer needed**
8. **Use file size and type validation**
9. **Implement proper error boundaries**
10. **Log security events and authentication failures**
