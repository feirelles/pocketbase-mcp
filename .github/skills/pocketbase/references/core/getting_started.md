# Getting Started with PocketBase

## Overview

PocketBase is an open-source backend consisting of:
- **SQLite database** with real-time subscriptions
- **Built-in Admin Dashboard UI** (single-page application)
- **Authentication** (email/password, OAuth2, magic link)
- **File storage** with automatic image resizing
- **RESTful APIs** with CORS support
- **WebSocket** for real-time updates
- **Admin dashboard** for data management

## Quick Setup

### Option 1: Download Binary

```bash
# Download latest release
wget https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_0.20.0_linux_amd64.zip

# Unzip
unzip pocketbase_0.20.0_linux_amd64.zip

# Serve on port 8090
./pocketbase serve --http=0.0.0.0:8090
```

Visit http://127.0.0.1:8090/_/ to access the admin dashboard.

💡 **Want to master the PocketBase CLI?** See the comprehensive [CLI Commands Guide](cli_commands.md) for detailed information on `serve`, `migrate`, `superuser`, and all CLI commands.

### Option 2: Docker

```bash
docker run -d \
  -v pb_data:/pb_data \
  -p 8090:8090 \
  --name pocketbase \
  ghcr.io/pocketbase/pocketbase:latest serve --http=0.0.0.0:8090
```

### Option 3: Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  pocketbase:
    image: ghcr.io/pocketbase/pocketbase:latest
    command: serve --http=0.0.0.0:8090
    volumes:
      - ./pb_data:/pb_data
    ports:
      - "8090:8090"
```

Run:
```bash
docker-compose up -d
```

## First Steps in Admin Dashboard

1. **Create Admin Account**
   - Navigate to http://localhost:8090/_/
   - Enter email and password
   - Click "Create and Login"

2. **Configure Settings**
   - Go to Settings → CORS
   - Add your frontend domain (e.g., `http://localhost:3000`)
   - Click "Save"

3. **Create Your First Collection**
   - Go to Collections → New Collection
   - Choose between:
     - **Base collection** - flexible schema
     - **Auth collection** - for user management
     - **View collection** - read-only computed data

## Basic Concepts

### Collections
Collections are like tables in a traditional database. Each collection has:
- **Schema** - fields and their types
- **Rules** - access control (read, write, delete)
- **Indexes** - performance optimization
- **Options** - additional settings

### Records
Records are individual entries in a collection, similar to rows in a table. Each record:
- Has a unique `id`
- Contains data based on collection schema
- Has built-in fields: `id`, `created`, `updated`

### Authentication
User accounts can be created through:
- Email/Password registration
- OAuth2 providers (Google, GitHub, etc.)
- Magic link authentication

### Files
File fields allow:
- Single or multiple file uploads
- Automatic thumbnail generation
- MIME type restrictions
- Size limits

## Frontend Integration

### JavaScript SDK

```html
<script src="https://cdn.jsdelivr.net/npm/pocketbase@latest/dist/pocketbase.umd.js"></script>
<script>
  const pb = new PocketBase('http://127.0.0.1:8090');

  // Example: Register user
  const authData = await pb.collection('users').create({
    email: 'test@example.com',
    password: 'password123',
    passwordConfirm: 'password123'
  });

  // Example: Login
  const authData = await pb.collection('users').authWithPassword(
    'test@example.com',
    'password123'
  );

  // Example: Create record
  const record = await pb.collection('posts').create({
    title: 'My First Post',
    content: 'Hello world!'
  });
</script>
```

### React Integration

```bash
npm install pocketbase
```

```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

// React hook for auth state
function useAuth() {
  const [user, setUser] = React.useState(pb.authStore.model);

  React.useEffect(() => {
    const unsub = pb.authStore.onChange(() => {
      setUser(pb.authStore.model);
    });

    return () => unsub();
  }, []);

  return { user };
}

// React component
function Posts() {
  const [posts, setPosts] = React.useState([]);

  React.useEffect(() => {
    loadPosts();

    // Subscribe to real-time updates
    pb.collection('posts').subscribe('*', () => {
      loadPosts();
    });

    return () => pb.collection('posts').unsubscribe();
  }, []);

  async function loadPosts() {
    const records = await pb.collection('posts').getList(1, 50);
    setPosts(records.items);
  }

  return posts.map(post => <div key={post.id}>{post.title}</div>);
}
```

## Next Steps

- **Schema Design** - Define your data structure (see `collections.md`)
- **Authentication** - Set up user management (see `authentication.md`)
- **Security Rules** - Control data access (see `security_rules.md`)
- **API Integration** - Build your frontend (see `api_records.md`)
- **Production Setup** - Deploy to production (see `going_to_production.md`)

## Common First Tasks

### Task: Create a Blog
1. Create `posts` collection (auth collection)
2. Add fields: `title`, `content`, `published` (bool)
3. Set rules: public read, author write
4. Create first post via Admin UI or API

### Task: User Profiles
1. Users collection already exists (auth collection)
2. Add profile fields: `name`, `bio`, `avatar`
3. Set rules: user can update own profile
4. Build profile page in frontend

### Task: Comments System
1. Create `comments` collection (base collection)
2. Add fields: `post`, `author`, `content`
3. Create relation to posts collection
4. Set rules: public read, authenticated write

## Troubleshooting

**Can't access admin dashboard**
- Check if PocketBase is running
- Verify port 8090 is not blocked
- Try http://127.0.0.1:8090/_/ instead of localhost

**CORS errors in frontend**
- Go to Settings → CORS
- Add your frontend domain
- Save changes

**Can't create records**
- Check collection rules
- Verify user is authenticated
- Check required fields are provided

**File uploads failing**
- Check file size limits
- Verify MIME types allowed
- Ensure user has create permissions

## Resources

- [Official Docs](https://pocketbase.io/docs/)
- [Examples](https://github.com/pocketbase/examples)
- [Discord Community](https://discord.gg/G5Vd6UF)
- [GitHub Repository](https://github.com/pocketbase/pocketbase)
