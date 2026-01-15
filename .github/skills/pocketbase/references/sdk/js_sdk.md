# JavaScript SDK

## Overview

The JavaScript SDK is the primary way to interact with PocketBase from frontend applications. It's available via CDN or npm package.

## Installation

### Via CDN

```html
<script src="https://cdn.jsdelivr.net/npm/pocketbase@latest/dist/pocketbase.umd.js"></script>
<script>
  const pb = new PocketBase('http://127.0.0.1:8090');
</script>
```

### Via npm

```bash
npm install pocketbase
```

```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');
```

## Initialization

```javascript
const pb = new PocketBase('http://127.0.0.1:8090');
```

For advanced configuration (custom auth store, language, fetch implementation, etc.), refer to the [official JS SDK README](https://github.com/pocketbase/js-sdk).

## Core Features

### Authentication
- User registration and login
- OAuth2 integration
- Auth state management
- JWT token handling

### Data Operations
- CRUD operations on collections
- Filtering, sorting, pagination
- Relation expansion
- Batch operations

### Realtime
- WebSocket subscriptions
- Live updates
- Event handling

### File Management
- File uploads
- File URL generation
- Thumbnail access

## Common Use Cases

### React Integration

```javascript
import { useEffect, useState } from 'react';
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

function useAuth() {
  const [user, setUser] = useState(pb.authStore.model);

  useEffect(() => {
    const unsub = pb.authStore.onChange(() => {
      setUser(pb.authStore.model);
    });
    return () => unsub();
  }, []);

  return { user };
}

function PostsList() {
  const [posts, setPosts] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    loadPosts();

    // Subscribe to realtime updates
    pb.collection('posts').subscribe('*', () => {
      loadPosts();
    });

    return () => pb.collection('posts').unsubscribe();
  }, []);

  async function loadPosts() {
    const records = await pb.collection('posts').getList(1, 50);
    setPosts(records.items);
  }

  async function createPost(data) {
    await pb.collection('posts').create(data);
  }

  return (
    <div>
      {user && (
        <button onClick={() => createPost({ title: 'New Post' })}>
          Create Post
        </button>
      )}
      {posts.map(post => <div key={post.id}>{post.title}</div>)}
    </div>
  );
}
```

### Vue.js Integration

```javascript
import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

export default {
  data() {
    return {
      posts: [],
      user: pb.authStore.model
    };
  },
  mounted() {
    this.loadPosts();

    // Subscribe to auth changes
    pb.authStore.onChange(() => {
      this.user = pb.authStore.model;
    });

    // Subscribe to realtime
    pb.collection('posts').subscribe('*', () => {
      this.loadPosts();
    });
  },
  beforeUnmount() {
    pb.collection('posts').unsubscribe();
  },
  methods: {
    async loadPosts() {
      const records = await pb.collection('posts').getList(1, 50);
      this.posts = records.items;
    },
    async login(email, password) {
      await pb.collection('users').authWithPassword(email, password);
      this.user = pb.authStore.model;
    }
  }
};
```

### Vanilla JavaScript

```javascript
const pb = new PocketBase('http://127.0.0.1:8090');

async function loadPosts() {
  const response = await pb.collection('posts').getList(1, 50);
  renderPosts(response.items);
}

function renderPosts(posts) {
  const container = document.getElementById('posts');
  container.innerHTML = posts.map(post => `
    <div class="post">
      <h3>${post.title}</h3>
      <p>${post.content}</p>
    </div>
  `).join('');
}

async function createPost(title, content) {
  await pb.collection('posts').create({
    title,
    content
  });
  await loadPosts();
}

// Subscribe to realtime
pb.collection('posts').subscribe('*', () => {
  loadPosts();
});

// Initialize
loadPosts();
```

---

**Note:** This is a placeholder file. See [core/getting_started.md](../core/getting_started.md) for detailed SDK usage examples.
