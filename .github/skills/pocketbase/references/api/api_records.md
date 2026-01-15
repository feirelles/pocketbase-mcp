# Records API

## Overview

The Records API provides CRUD operations for collection records. It handles:
- Creating records
- Reading records (single or list)
- Updating records
- Deleting records
- Batch operations
- Real-time subscriptions

## Authentication

Most record operations require authentication:

```javascript
// Include JWT token in requests
const token = pb.authStore.token;

// Or use SDK which handles it automatically
const pb = new PocketBase('http://127.0.0.1:8090');
```

## Create Record

### Create Single Record

```javascript
const record = await pb.collection('posts').create({
  title: 'My Post',
  content: 'Hello world!',
  author: pb.authStore.model.id,
  published: true
});

// Returns full record with ID, timestamps, etc.
console.log(record.id);
console.log(record.created);
console.log(record.updated);
```

### Create with Files

```javascript
const formData = new FormData();
formData.append('title', 'Post with Image');
formData.append('image', fileInput.files[0]);

const record = await pb.collection('posts').create(formData);
const imageUrl = pb.files.getURL(record, record.image);
```

### Create with Relations

```javascript
const post = await pb.collection('posts').create({
  title: 'My Post',
  author: authorId,  // User ID
  category: categoryId  // Category ID
});
```

## Read Records

### Get Single Record

```javascript
const record = await pb.collection('posts').getOne('RECORD_ID');

// Get with expand
const record = await pb.collection('posts').getOne('RECORD_ID', {
  expand: 'author,comments'
});
```

### Get Multiple Records (List)

```javascript
const records = await pb.collection('posts').getList(1, 50);

// Returns:
// {
//   page: 1,
//   perPage: 50,
//   totalItems: 100,
//   totalPages: 2,
//   items: [ ... array of records ... ]
// }
```

### Pagination

```javascript
// Page 1
const page1 = await pb.collection('posts').getList(1, 50);

// Page 2
const page2 = await pb.collection('posts').getList(2, 50);

// Large perPage
const all = await pb.collection('posts').getList(1, 200);

// Get all records (use carefully)
const allRecords = await pb.collection('posts').getFullList();
```

### Filtering

```javascript
const records = await pb.collection('posts').getList(1, 50, {
  filter: 'status = "published"'
});

// Multiple conditions
const records = await pb.collection('posts').getList(1, 50, {
  filter: 'status = "published" && created >= "2024-01-01"'
});

// With OR
const records = await pb.collection('posts').getList(1, 50, {
  filter: 'category = "tech" || category = "programming"'
});

// By relation field
const records = await pb.collection('comments').getList(1, 50, {
  filter: 'expand.post.title ~ "PocketBase"'
});
```

### Sorting

```javascript
// Sort by created date descending
const records = await pb.collection('posts').getList(1, 50, {
  sort: '-created'
});

// Sort by title ascending
const records = await pb.collection('posts').getList(1, 50, {
  sort: 'title'
});

// Multiple fields
const records = await pb.collection('posts').getList(1, 50, {
  sort: 'status,-created'  // status ascending, then created descending
});
```

### Field Selection

```javascript
// Select specific fields
const records = await pb.collection('posts').getList(1, 50, {
  fields: 'id,title,author,created'
});

// Exclude large fields
const records = await pb.collection('posts').getList(1, 50, {
  fields: 'id,title,author,created,-content'
});

// Select with expand
const records = await pb.collection('posts').getList(1, 50, {
  fields: 'id,title,expand.author.name'
});
```

### Relation Expansion

```javascript
// Expand single relation
const posts = await pb.collection('posts').getList(1, 50, {
  expand: 'author'
});

// Expand multiple relations
const posts = await pb.collection('posts').getList(1, 50, {
  expand: 'author,comments'
});

// Expand nested relations
const comments = await pb.collection('comments').getList(1, 50, {
  expand: 'post.author'
});

// Use expand in filters
const posts = await pb.collection('posts').getList(1, 50, {
  expand: 'author',
  filter: 'expand.author.role = "admin"'
});
```

### Cursor-Based Pagination (PocketBase 0.20+)

```javascript
// First page
const page1 = await pb.collection('posts').getList(1, 50, {
  sort: 'created'
});

// Get cursor (last item's sort value)
const cursor = page1.items[page1.items.length - 1].created;

// Next page
const page2 = await pb.collection('posts').getList(1, 50, {
  filter: `created < "${cursor}"`,
  sort: 'created'
});
```

## Update Record

### Update Single Record

```javascript
const updated = await pb.collection('posts').update('RECORD_ID', {
  title: 'Updated Title',
  status: 'published'
});

// Returns updated record
console.log(updated.title);
console.log(updated.updated);
```

### Update with Files

```javascript
const formData = new FormData();
formData.append('title', 'Updated Post');
formData.append('image', newFile);  // Replace image
// or
formData.append('image', null);     // Remove image

const updated = await pb.collection('posts').update('RECORD_ID', formData);
```

### Update Relations

```javascript
// Update relation
const updated = await pb.collection('posts').update('RECORD_ID', {
  author: newAuthorId
});

// Add to one-to-many relation
const comment = await pb.collection('comments').create({
  post: postId,
  content: 'New comment'
});

// Update comment
await pb.collection('comments').update(comment.id, {
  content: 'Updated comment'
});
```

## Delete Record

```javascript
// Delete single record
await pb.collection('posts').delete('RECORD_ID');

// Returns true on success, throws on failure
```

## Batch Operations

### Create Multiple Records

```javascript
const records = await pb.collection('posts').createBatch([
  {
    title: 'Post 1',
    content: 'Content 1'
  },
  {
    title: 'Post 2',
    content: 'Content 2'
  }
]);

console.log(records.length);  // 2
```

### Update Multiple Records

```javascript
const records = await pb.collection('posts').updateBatch([
  {
    id: 'RECORD_ID_1',
    title: 'Updated Title 1'
  },
  {
    id: 'RECORD_ID_2',
    title: 'Updated Title 2'
  }
]);
```

### Delete Multiple Records

```javascript
await pb.collection('posts').deleteBatch([
  'RECORD_ID_1',
  'RECORD_ID_2',
  'RECORD_ID_3'
]);
```

## Real-time Subscriptions

### Subscribe to All Collection Changes

```javascript
// Subscribe to all changes
pb.collection('posts').subscribe('*', function (e) {
  console.log(e.action);  // 'create', 'update', or 'delete'
  console.log(e.record);  // Changed record

  if (e.action === 'create') {
    console.log('New post created:', e.record);
  } else if (e.action === 'update') {
    console.log('Post updated:', e.record);
  } else if (e.action === 'delete') {
    console.log('Post deleted:', e.record);
  }
});
```

### Subscribe to Specific Record

```javascript
// Subscribe to specific record
pb.collection('posts').subscribe('RECORD_ID', function (e) {
  console.log('Record changed:', e.record);
});
```

### Unsubscribe

```javascript
// Unsubscribe from specific record
pb.collection('posts').unsubscribe('RECORD_ID');

// Unsubscribe from all collection changes
pb.collection('posts').unsubscribe();

// Unsubscribe from all collections
pb.collections.unsubscribe();
```

### Real-time with React

```javascript
import { useEffect, useState } from 'react';

function PostsList() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    loadPosts();

    // Subscribe to real-time updates
    pb.collection('posts').subscribe('*', function (e) {
      if (e.action === 'create') {
        setPosts(prev => [e.record, ...prev]);
      } else if (e.action === 'update') {
        setPosts(prev => prev.map(p => p.id === e.record.id ? e.record : p));
      } else if (e.action === 'delete') {
        setPosts(prev => prev.filter(p => p.id !== e.record.id));
      }
    });

    return () => {
      pb.collection('posts').unsubscribe();
    };
  }, []);

  async function loadPosts() {
    const records = await pb.collection('posts').getList(1, 50, {
      expand: 'author'
    });
    setPosts(records.items);
  }

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>
          <h3>{post.title}</h3>
          <p>By {post.expand?.author?.name}</p>
        </div>
      ))}
    </div>
  );
}
```

## Error Handling

```javascript
try {
  const record = await pb.collection('posts').getOne('INVALID_ID');
} catch (error) {
  console.error('Error:', error.message);
  // Handle specific errors
  if (error.status === 404) {
    console.log('Record not found');
  } else if (error.status === 403) {
    console.log('Access denied');
  }
}
```

### Common Error Codes

- `400` - Bad Request (validation error)
- `403` - Forbidden (access denied)
- `404` - Not Found (record doesn't exist)
- `422` - Unprocessable Entity (validation failed)

## REST API Reference

### Direct HTTP Requests

```javascript
// Create
fetch('http://127.0.0.1:8090/api/collections/posts/records', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${pb.authStore.token}`
  },
  body: JSON.stringify({
    title: 'My Post',
    content: 'Hello world!'
  })
});

// Read
fetch('http://127.0.0.1:8090/api/collections/posts/records/RECORD_ID', {
  headers: {
    'Authorization': `Bearer ${pb.authStore.token}`
  }
});

// Update
fetch('http://127.0.0.1:8090/api/collections/posts/records/RECORD_ID', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${pb.authStore.token}`
  },
  body: JSON.stringify({
    title: 'Updated Title'
  })
});

// Delete
fetch('http://127.0.0.1:8090/api/collections/posts/records/RECORD_ID', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${pb.authStore.token}`
  }
});

// List
fetch('http://127.0.0.1:8090/api/collections/posts/records?page=1&perPage=50', {
  headers: {
    'Authorization': `Bearer ${pb.authStore.token}`
  }
});
```

### Query Parameters for List

```
GET /api/collections/{collection}/records

Query Parameters:
- page          : Page number (default: 1)
- perPage       : Items per page (default: 50, max: 500)
- filter        : Filter expression
- sort          : Sort expression
- fields        : Fields to return
- expand        : Relations to expand
- skip          : Number of records to skip (alternative to cursor)
```

### Filtering Examples

```javascript
// Via SDK
const records = await pb.collection('posts').getList(1, 50, {
  filter: 'status = "published" && views > 100'
});

// Via REST
fetch('http://127.0.0.1:8090/api/collections/posts/records?filter=(status="published" && views>100)')
```

### Sorting Examples

```javascript
// Via SDK
const records = await pb.collection('posts').getList(1, 50, {
  sort: '-created,title'
});

// Via REST
fetch('http://127.0.0.1:8090/api/collections/posts/records?sort=-created,title')
```

## Performance Tips

### 1. Use Pagination

```javascript
// Instead of getting all records
const all = await pb.collection('posts').getFullList(1000);

// Use pagination
let page = 1;
let allRecords = [];

while (true) {
  const records = await pb.collection('posts').getList(page, 50);
  allRecords = allRecords.concat(records.items);

  if (page >= records.totalPages) break;
  page++;
}
```

### 2. Select Only Needed Fields

```javascript
// Instead of fetching everything
const posts = await pb.collection('posts').getList(1, 50);

// Select only needed fields
const posts = await pb.collection('posts').getList(1, 50, {
  fields: 'id,title,author,created'
});
```

### 3. Use Filters Efficiently

```javascript
// Good - uses indexes
const posts = await pb.collection('posts').getList(1, 50, {
  filter: 'status = "published" && created >= "2024-01-01"'
});

// Slow - can't use indexes well
const posts = await pb.collection('posts').getList(1, 50, {
  filter: 'title ~ ".*pattern.*"'
});
```

### 4. Limit Expand Depth

```javascript
// Good - limit to 2 levels
const posts = await pb.collection('posts').getList(1, 50, {
  expand: 'author,comments'
});

// Slower - 3 levels
const posts = await pb.collection('posts').getList(1, 50, {
  expand: 'author,comments,comments.author'
});
```

### 5. Use Batch Operations

```javascript
// Instead of multiple requests
await pb.collection('posts').create({ title: 'Post 1' });
await pb.collection('posts').create({ title: 'Post 2' });
await pb.collection('posts').create({ title: 'Post 3' });

// Use batch
await pb.collection('posts').createBatch([
  { title: 'Post 1' },
  { title: 'Post 2' },
  { title: 'Post 3' }
]);
```

## WebSocket Connections

### Manual WebSocket Connection

```javascript
const ws = new WebSocket('ws://127.0.0.1:8090/api/realtime');

ws.onopen = function() {
  // Subscribe to collection
  ws.send(JSON.stringify({
    action: 'subscribe',
    collection: 'posts'
  }));
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Real-time update:', data);
};
```

### Connection Status

```javascript
pb.realtime.connection.addListener('open', () => {
  console.log('Realtime connected');
});

pb.realtime.connection.addListener('close', () => {
  console.log('Realtime disconnected');
});

pb.realtime.connection.addListener('error', (error) => {
  console.log('Realtime error:', error);
});
```

## Related Topics

- [Collections](../core/collections.md) - Collection configuration
- [API Rules & Filters](../core/api_rules_filters.md) - Security and filtering
- [Authentication](../core/authentication.md) - User authentication
- [Working with Relations](../core/working_with_relations.md) - Relations
- [Real-time API](api_realtime.md) - WebSocket subscriptions
- [Files API](api_files.md) - File uploads
