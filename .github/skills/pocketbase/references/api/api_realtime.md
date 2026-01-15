# Realtime API

## Overview

PocketBase provides real-time updates via WebSocket connections, allowing your application to receive instant notifications when data changes.

## Connection

### Automatic Connection (SDK)

```javascript
// SDK automatically manages WebSocket connection
const pb = new PocketBase('http://127.0.0.1:8090');

// Connection is established automatically
pb.realtime.connection.addListener('open', () => {
  console.log('Connected to realtime');
});

pb.realtime.connection.addListener('close', () => {
  console.log('Disconnected from realtime');
});

pb.realtime.connection.addListener('error', (error) => {
  console.error('Realtime error:', error);
});
```

### Manual WebSocket Connection

```javascript
const ws = new WebSocket('ws://127.0.0.1:8090/api/realtime');

ws.onopen = function() {
  console.log('WebSocket connected');
};

ws.onclose = function() {
  console.log('WebSocket disconnected');
};

ws.onerror = function(error) {
  console.error('WebSocket error:', error);
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Real-time event:', data);
};
```

## Subscriptions

### Subscribe to Collection

Listen to all changes in a collection:

```javascript
// Subscribe to all posts changes
pb.collection('posts').subscribe('*', function (e) {
  console.log(e.action);  // 'create', 'update', or 'delete'
  console.log(e.record);  // Changed record

  if (e.action === 'create') {
    // New post created
  } else if (e.action === 'update') {
    // Post updated
  } else if (e.action === 'delete') {
    // Post deleted
  }
});
```

### Subscribe to Specific Record

Listen to changes for a specific record:

```javascript
// Subscribe to specific post
pb.collection('posts').subscribe('RECORD_ID', function (e) {
  console.log('Post changed:', e.record);
});

// Multiple records
pb.collection('posts').subscribe('ID1', callback);
pb.collection('posts').subscribe('ID2', callback);
```

### Subscribe via Admin Client

```javascript
// Subscribe using admin client
pb.admin.onChange('records', 'posts', (action, record) => {
  console.log(`${action} on posts:`, record);
});
```

## Event Object

### Create Event

```javascript
{
  "action": "create",
  "record": {
    "id": "RECORD_ID",
    "title": "New Post",
    "content": "Hello",
    "created": "2024-01-01T00:00:00.000Z",
    "updated": "2024-01-01T00:00:00.000Z"
  }
}
```

### Update Event

```javascript
{
  "action": "update",
  "record": {
    "id": "RECORD_ID",
    "title": "Updated Post",
    "content": "Updated content",
    "created": "2024-01-01T00:00:00.000Z",
    "updated": "2024-01-01T12:00:00.000Z"
  }
}
```

### Delete Event

```javascript
{
  "action": "delete",
  "record": {
    "id": "RECORD_ID"
  }
}
```

## Unsubscribing

### Unsubscribe from Specific Record

```javascript
// Unsubscribe from specific record
pb.collection('posts').unsubscribe('RECORD_ID');

// Or using the subscription object
const unsubscribe = pb.collection('posts').subscribe('*', callback);
unsubscribe();  // Stop listening
```

### Unsubscribe from Collection

```javascript
// Unsubscribe from all collection changes
pb.collection('posts').unsubscribe();
```

### Unsubscribe from All Collections

```javascript
// Stop all subscriptions
pb.collections.unsubscribe();
```

## Realtime with React

### Hook Example

```javascript
import { useEffect, useState } from 'react';

function useRealtime(collection, recordId, callback) {
  useEffect(() => {
    let unsubscribe;

    if (recordId) {
      // Subscribe to specific record
      unsubscribe = pb.collection(collection).subscribe(recordId, callback);
    } else {
      // Subscribe to all collection changes
      unsubscribe = pb.collection(collection).subscribe('*', callback);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [collection, recordId]);
}

// Usage
function PostList() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    // Load initial data
    loadPosts();

    // Subscribe to realtime updates
    pb.collection('posts').subscribe('*', (e) => {
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
    const records = await pb.collection('posts').getList(1, 50);
    setPosts(records.items);
  }

  return (
    <div>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

### Optimized React Example

```javascript
import { useEffect, useState } from 'react';

function PostDetails({ postId }) {
  const [post, setPost] = useState(null);

  useEffect(() => {
    if (!postId) return;

    // Load initial data
    loadPost();

    // Subscribe to this specific post
    const unsubscribe = pb.collection('posts').subscribe(postId, (e) => {
      setPost(e.record);
    });

    return () => {
      unsubscribe();
    };
  }, [postId]);

  async function loadPost() {
    const record = await pb.collection('posts').getOne(postId);
    setPost(record);
  }

  if (!post) return <div>Loading...</div>;

  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </div>
  );
}
```

## Realtime with Vue.js

```javascript
export default {
  data() {
    return {
      posts: []
    }
  },
  async mounted() {
    await this.loadPosts();

    // Subscribe to realtime updates
    pb.collection('posts').subscribe('*', (e) => {
      if (e.action === 'create') {
        this.posts.unshift(e.record);
      } else if (e.action === 'update') {
        const index = this.posts.findIndex(p => p.id === e.record.id);
        if (index !== -1) {
          this.posts.splice(index, 1, e.record);
        }
      } else if (e.action === 'delete') {
        this.posts = this.posts.filter(p => p.id !== e.record.id);
      }
    });
  },
  beforeUnmount() {
    pb.collection('posts').unsubscribe();
  },
  methods: {
    async loadPosts() {
      const records = await pb.collection('posts').getList(1, 50);
      this.posts = records.items;
    }
  }
}
```

## Realtime with Vanilla JavaScript

```javascript
const postsList = document.getElementById('posts');

async function loadPosts() {
  const response = await pb.collection('posts').getList(1, 50);
  renderPosts(response.items);
}

function renderPosts(posts) {
  postsList.innerHTML = posts.map(post => `
    <div class="post">
      <h3>${post.title}</h3>
      <p>${post.content}</p>
    </div>
  `).join('');
}

// Subscribe to realtime updates
pb.collection('posts').subscribe('*', (e) => {
  if (e.action === 'create') {
    prependPost(e.record);
  } else if (e.action === 'update') {
    updatePost(e.record);
  } else if (e.action === 'delete') {
    removePost(e.record.id);
  }
});

function prependPost(post) {
  const div = document.createElement('div');
  div.className = 'post';
  div.innerHTML = `<h3>${post.title}</h3><p>${post.content}</p>`;
  postsList.prepend(div);
}

// Initialize
loadPosts();
```

## Use Cases

### 1. Live Chat

```javascript
// Subscribe to messages
pb.collection('messages').subscribe('*', (e) => {
  if (e.action === 'create') {
    addMessageToUI(e.record);
  }
});

// Send message
async function sendMessage(content) {
  await pb.collection('messages').create({
    content: content,
    user: pb.authStore.model.id,
    room: roomId
  });
}
```

### 2. Notification System

```javascript
// Subscribe to notifications
pb.collection('notifications').subscribe('*', (e) => {
  if (e.action === 'create' && e.record.user_id === pb.authStore.model.id) {
    showNotification(e.record.message);
    updateBadge();
  }
});
```

### 3. Collaborative Editing

```javascript
// Subscribe to document changes
pb.collection('documents').subscribe('DOCUMENT_ID', (e) => {
  if (e.action === 'update') {
    updateEditor(e.record.content);
  }
});

// Debounce updates
let updateTimeout;
function onEditorChange(content) {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(async () => {
    await pb.collection('documents').update('DOCUMENT_ID', {
      content: content
    });
  }, 500);
}
```

### 4. Live Dashboard

```javascript
// Subscribe to metrics changes
pb.collection('metrics').subscribe('*', (e) => {
  if (e.action === 'update') {
    updateDashboard(e.record);
  }
});

// Subscribe to events
pb.collection('events').subscribe('*', (e) => {
  if (e.action === 'create') {
    addEventToFeed(e.record);
  }
});
```

### 5. Shopping Cart Updates

```javascript
// Subscribe to cart changes
pb.collection('cart_items').subscribe('*', (e) => {
  if (e.action === 'create' && e.record.user_id === pb.authStore.model.id) {
    updateCartCount();
  } else if (e.action === 'delete') {
    updateCartCount();
  }
});
```

## Authentication and Realtime

### Authenticated Subscriptions

```javascript
// Subscribe only after authentication
pb.collection('users').authWithPassword('email', 'password').then(() => {
  // Now subscribe to private data
  pb.collection('messages').subscribe('*', (e) => {
    // Will only receive messages user has access to
  });
});
```

### Multiple User Types

```javascript
// Different subscriptions based on role
if (pb.authStore.model.role === 'admin') {
  // Admin sees all updates
  pb.collection('posts').subscribe('*', handleAdminUpdate);
} else {
  // Regular users see limited updates
  pb.collection('posts').subscribe('*', handleUserUpdate);
}
```

## Filtering Realtime Events

```javascript
// Client-side filtering
pb.collection('posts').subscribe('*', (e) => {
  // Only show published posts
  if (e.record.status === 'published') {
    updateUI(e.record);
  }
});

// Or use server-side rules (better)
```

## Performance Considerations

### 1. Limit Subscriptions

```javascript
// Good - subscribe to specific records needed
pb.collection('posts').subscribe('POST_ID', callback);

// Bad - subscribe to everything
pb.collection('posts').subscribe('*', callback); // Only when necessary
```

### 2. Unsubscribe When Done

```javascript
useEffect(() => {
  const unsubscribe = pb.collection('posts').subscribe('*', callback);

  return () => {
    unsubscribe();  // Clean up
  };
}, []);
```

### 3. Batch UI Updates

```javascript
// Instead of updating on every event
pb.collection('posts').subscribe('*', (e) => {
  updateUI(e.record);  // Triggers re-render every time
});

// Batch updates
const updates = [];
pb.collection('posts').subscribe('*', (e) => {
  updates.push(e.record);

  if (updates.length >= 10) {
    batchUpdateUI(updates);
    updates.length = 0;
  }
});
```

### 4. Use Debouncing for Frequent Updates

```javascript
let updateTimeout;

pb.collection('metrics').subscribe('*', (e) => {
  clearTimeout(updateTimeout);

  updateTimeout = setTimeout(() => {
    updateDashboard();
  }, 100);  // Update at most every 100ms
});
```

## Connection Management

### Reconnection Strategy

```javascript
pb.realtime.connection.addListener('close', () => {
  // Attempt reconnection
  setTimeout(() => {
    pb.realtime.connect();
  }, 5000);  // Reconnect after 5 seconds
});
```

### Manual Connection Control

```javascript
// Disconnect
pb.realtime.disconnect();

// Reconnect
pb.realtime.connect();

// Check connection status
const isConnected = pb.realtime.connection.isOpen;
```

### Heartbeat

```javascript
// Keep connection alive
setInterval(() => {
  if (pb.realtime.connection.isOpen) {
    pb.realtime.send({ action: 'ping' });
  }
}, 30000);  // Every 30 seconds
```

## Error Handling

```javascript
pb.collection('posts').subscribe('*', (e) => {
  try {
    handleEvent(e);
  } catch (error) {
    console.error('Error handling event:', error);
    // Don't let errors break the subscription
  }
});

// Handle connection errors
pb.realtime.connection.addListener('error', (error) => {
  console.error('Realtime connection error:', error);
  // Show error to user or attempt reconnection
});
```

## Security

### Server-Side Security

Realtime events respect collection rules:

```javascript
// Users will only receive events for records they can access
// No need for additional client-side filtering based on permissions
```

### Client-Side Validation

```javascript
pb.collection('posts').subscribe('*', (e) => {
  // Validate event data
  if (!e.record || !e.action) {
    console.warn('Invalid event:', e);
    return;
  }

  // Process event
  handleEvent(e);
});
```

## Troubleshooting

**Not receiving events**
- Check if subscribed to correct collection
- Verify user is authenticated
- Check console for errors
- Ensure WebSocket connection is open

**Receiving too many events**
- Unsubscribe from unnecessary subscriptions
- Filter events client-side
- Use more specific subscriptions

**Memory leaks**
- Always unsubscribe in component cleanup
- Check for duplicate subscriptions
- Use useEffect cleanup function

**Disconnections**
- Implement reconnection logic
- Add heartbeat/ping
- Show connection status to user

## Related Topics

- [Records API](api_records.md) - CRUD operations
- [API Rules & Filters](../core/api_rules_filters.md) - Security
- [Collections](../core/collections.md) - Collection setup
