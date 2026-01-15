# Working with Relations in PocketBase

## Overview

Relations create links between collections, allowing you to:
- Link records across collections
- Create one-to-one relationships
- Create one-to-many relationships
- Create many-to-many relationships
- Maintain data integrity
- Build complex data models

## Relation Field Types

### 1. One-to-One (Single Relation)
Each record relates to exactly one record in another collection.

**Example:** User → Profile
- Each user has one profile
- Each profile belongs to one user

```json
{
  "name": "profile",
  "type": "relation",
  "options": {
    "collectionId": "PROFILE_COLLECTION_ID",
    "maxSelect": 1,
    "cascadeDelete": true
  }
}
```

### 2. One-to-Many (Single Record, Multiple Related)
One record relates to many records in another collection.

**Example:** Post → Comments
- One post has many comments
- Each comment belongs to one post

**On Post Collection:**
```json
{
  "name": "comments",
  "type": "relation",
  "options": {
    "collectionId": "COMMENTS_COLLECTION_ID",
    "maxSelect": null,
    "cascadeDelete": true
  }
}
```

**On Comments Collection:**
```json
{
  "name": "post",
  "type": "relation",
  "options": {
    "collectionId": "POSTS_COLLECTION_ID",
    "maxSelect": 1,
    "cascadeDelete": true
  }
}
```

### 3. Many-to-Many (Junction Table)
Multiple records relate to multiple records in another collection.

**Example:** Posts ↔ Tags
- One post has many tags
- One tag belongs to many posts

**Junction Collection (posts_tags):**
```json
{
  "name": "post",
  "type": "relation",
  "options": {
    "collectionId": "POSTS_COLLECTION_ID",
    "maxSelect": 1
  }
}
```

```json
{
  "name": "tag",
  "type": "relation",
  "options": {
    "collectionId": "TAGS_COLLECTION_ID",
    "maxSelect": 1
  }
}
```

## Relation Field Options

### collectionId
Target collection ID:

```json
"collectionId": "abcd1234abcd1234abcd1234"
```

### maxSelect
Maximum number of related records:
- `1` - Single relation
- `null` or `2+` - Multiple relations

```json
"maxSelect": 1        // One-to-one
"maxSelect": null     // One-to-many
"maxSelect": 5        // Limited multiple
```

### cascadeDelete
Delete related records when this record is deleted:

```json
"cascadeDelete": true  // Delete comments when post deleted
"cascadeDelete": false // Keep comments when post deleted
```

### displayFields
Fields to show when displaying relation:

```json
"displayFields": ["name", "email"]
```

## Creating Relations

### One-to-Many Example

**Collections:**
1. `posts` collection
2. `comments` collection

**Posts Schema:**
```json
[
  {
    "name": "title",
    "type": "text",
    "required": true
  },
  {
    "name": "content",
    "type": "text"
  }
]
```

**Comments Schema:**
```json
[
  {
    "name": "post",
    "type": "relation",
    "options": {
      "collectionId": "POSTS_COLLECTION_ID",
      "maxSelect": 1
    }
  },
  {
    "name": "author",
    "type": "relation",
    "options": {
      "collectionId": "USERS_COLLECTION_ID",
      "maxSelect": 1
    }
  },
  {
    "name": "content",
    "type": "text",
    "required": true
  }
]
```

### Create Related Records

```javascript
// Create post
const post = await pb.collection('posts').create({
  title: 'My First Post',
  content: 'Hello world!'
});

// Create comment with relation
const comment = await pb.collection('comments').create({
  post: post.id,  // Link to post
  author: pb.authStore.model.id,  // Link to current user
  content: 'Great post!'
});
```

## Querying Relations

### Get Record with Related Data

```javascript
// Get post with comments expanded
const post = await pb.collection('posts').getOne(postId, {
  expand: 'comments'
});

console.log(post.title);
post.expand.comments.forEach(comment => {
  console.log(comment.content);
});
```

### Filter by Related Field

```javascript
// Get all comments for a specific post
const comments = await pb.collection('comments').getList(1, 50, {
  filter: 'post = "' + postId + '"'
});

// Or use expand
const post = await pb.collection('posts').getOne(postId, {
  expand: 'comments'
});
const comments = post.expand.comments;
```

### Filter by Nested Relation

```javascript
// Get posts where author email is specific value
const posts = await pb.collection('posts').getList(1, 50, {
  filter: 'expand.author.email = "user@example.com"'
});
```

### Filter by Relation's Related Field

```javascript
// Get comments on posts by specific author
const comments = await pb.collection('comments').getList(1, 50, {
  filter: 'expand.post.author.email = "user@example.com"'
});
```

## Updating Relations

### Update One-to-One Relation

```javascript
// Create profile for user
const profile = await pb.collection('profiles').create({
  bio: 'My bio',
  user: userId  // Link to user
});
```

### Update One-to-Many Relation

```javascript
// Add comment to post
const comment = await pb.collection('comments').create({
  post: postId,
  content: 'New comment'
});

// Comments are automatically added to post's comments array
```

### Update Many-to-Many Relations

```javascript
// Create post
const post = await pb.collection('posts').create({
  title: 'My Post',
  content: 'Content'
});

// Create junction record for tag
await pb.collection('posts_tags').create({
  post: post.id,
  tag: tagId
});

// Get all tags for post
const tags = await pb.collection('posts_tags').getList(1, 100, {
  filter: 'post = "' + post.id + '"',
  expand: 'tag'
});

const tagNames = tags.items.map(item => item.expand.tag.name);
```

## Expanding Relations

### Basic Expand

```javascript
// Expand single level
const post = await pb.collection('posts').getOne(postId, {
  expand: 'comments'
});

// Expand multiple relations
const post = await pb.collection('posts').getOne(postId, {
  expand: 'comments,author'
});
```

### Nested Expand

```javascript
// Expand two levels deep
const comments = await pb.collection('comments').getList(1, 50, {
  expand: 'post.author'
});

comments.items.forEach(comment => {
  console.log(comment.content);                    // Comment content
  console.log(comment.expand.post.title);          // Post title
  console.log(comment.expand.post.expand.author);  // Author object
});
```

### Selective Field Expansion

```javascript
// Expand and select specific fields
const posts = await pb.collection('posts').getList(1, 50, {
  expand: 'author',
  fields: 'id,title,expand.author.name,expand.author.email'
});
```

## Deleting Relations

### Delete with Cascade

```javascript
// If cascadeDelete is true, deleting post deletes comments
await pb.collection('posts').delete(postId);
// All comments with post = this postId are deleted
```

### Delete Without Cascade

```javascript
// If cascadeDelete is false, delete comment manually
await pb.collection('comments').delete(commentId);
// Post remains
```

### Update to Remove Relation

```javascript
// Remove relation by setting to null (for optional relations)
const updated = await pb.collection('comments').update(commentId, {
  post: null
});
```

## Many-to-Many Pattern

### Approach 1: Junction Collection

**Collections:**
- `posts`
- `tags`
- `posts_tags` (junction)

**posts_tags Schema:**
```json
[
  {
    "name": "post",
    "type": "relation",
    "options": {
      "collectionId": "POSTS_COLLECTION_ID",
      "maxSelect": 1
    }
  },
  {
    "name": "tag",
    "type": "relation",
    "options": {
      "collectionId": "TAGS_COLLECTION_ID",
      "maxSelect": 1
    }
  }
]
```

**Operations:**

```javascript
// Add tag to post
await pb.collection('posts_tags').create({
  post: postId,
  tag: tagId
});

// Get all tags for post
const postTags = await pb.collection('posts_tags').getList(1, 100, {
  filter: 'post = "' + postId + '"',
  expand: 'tag'
});

const tags = postTags.items.map(item => item.expand.tag);

// Remove tag from post
await pb.collection('posts_tags').delete(junctionRecordId);
```

### Approach 2: Array Field (Advanced)

**Posts Collection:**
```json
{
  "name": "tags",
  "type": "json"  // Store tag IDs in JSON array
}
```

**Operations:**

```javascript
// Add tag
const post = await pb.collection('posts').getOne(postId);
const tags = post.tags || [];
tags.push(tagId);

await pb.collection('posts').update(postId, {
  tags: tags
});

// Filter by tag
const posts = await pb.collection('posts').getList(1, 50, {
  filter: 'tags ?~ "' + tagId + '"'
});
```

## Common Patterns

### User Posts Pattern

**Collections:**
- `users` (auth)
- `posts` (base)

**Posts Schema:**
```json
[
  {
    "name": "author",
    "type": "relation",
    "options": {
      "collectionId": "USERS_COLLECTION_ID",
      "maxSelect": 1
    }
  },
  {
    "name": "title",
    "type": "text"
  },
  {
    "name": "content",
    "type": "text"
  }
]
```

**Operations:**

```javascript
// Create post as current user
const post = await pb.collection('posts').create({
  author: pb.authStore.model.id,
  title: 'My Post',
  content: 'Content'
});

// Get my posts
const myPosts = await pb.collection('posts').getList(1, 50, {
  filter: 'author = "' + pb.authStore.model.id + '"'
});

// Get post with author info
const post = await pb.collection('posts').getOne(postId, {
  expand: 'author'
});

console.log(post.expand.author.email);
```

### E-commerce Order Pattern

**Collections:**
- `users` (auth)
- `products` (base)
- `orders` (base)
- `order_items` (base)

**Order Items Schema:**
```json
[
  {
    "name": "order",
    "type": "relation",
    "options": {
      "collectionId": "ORDERS_COLLECTION_ID",
      "maxSelect": 1
    }
  },
  {
    "name": "product",
    "type": "relation",
    "options": {
      "collectionId": "PRODUCTS_COLLECTION_ID",
      "maxSelect": 1
    }
  },
  {
    "name": "quantity",
    "type": "number"
  },
  {
    "name": "price",
    "type": "number"
  }
]
```

**Operations:**

```javascript
// Create order
const order = await pb.collection('orders').create({
  user: userId,
  status: 'pending',
  total: 0
});

// Add items to order
let total = 0;
for (const item of cart) {
  await pb.collection('order_items').create({
    order: order.id,
    product: item.productId,
    quantity: item.quantity,
    price: item.price
  });
  total += item.quantity * item.price;
}

// Update order total
await pb.collection('orders').update(order.id, {
  total: total
});

// Get order with items
const orderWithItems = await pb.collection('orders').getOne(orderId, {
  expand: 'items,items.product,user'
});
```

### Social Media Follow Pattern

**Collections:**
- `users` (auth)
- `follows` (base)

**Follows Schema:**
```json
[
  {
    "name": "follower",
    "type": "relation",
    "options": {
      "collectionId": "USERS_COLLECTION_ID",
      "maxSelect": 1
    }
  },
  {
    "name": "following",
    "type": "relation",
    "options": {
      "collectionId": "USERS_COLLECTION_ID",
      "maxSelect": 1
    }
  }
]
```

**Operations:**

```javascript
// Follow user
await pb.collection('follows').create({
  follower: currentUserId,
  following: targetUserId
});

// Unfollow
await pb.collection('follows').delete(followId);

// Get people I follow
const following = await pb.collection('follows').getList(1, 100, {
  filter: 'follower = "' + currentUserId + '"',
  expand: 'following'
});

const followingUsers = following.items.map(item => item.expand.following);

// Get my followers
const followers = await pb.collection('follows').getList(1, 100, {
  filter: 'following = "' + currentUserId + '"',
  expand: 'follower'
});
```

## Self-Referencing Relations

Create hierarchical data (categories, organizational structure):

```json
{
  "name": "parent",
  "type": "relation",
  "options": {
    "collectionId": "CATEGORIES_COLLECTION_ID",
    "maxSelect": 1,
    "cascadeDelete": false
  }
}
```

**Operations:**

```javascript
// Create category with parent
const child = await pb.collection('categories').create({
  name: 'JavaScript',
  parent: parentCategoryId
});

// Get all top-level categories
const topLevel = await pb.collection('categories').getList(1, 50, {
  filter: 'parent = ""'
});

// Get children of category
const children = await pb.collection('categories').getList(1, 50, {
  filter: 'parent = "' + parentId + '"'
});
```

## Relation Rules

Control who can create, update, or delete relations:

### Owner-Based Rules

```javascript
// Comments collection
Create Rule: @request.auth.id != ""
Update Rule: author = @request.auth.id
Delete Rule: author = @request.auth.id

// Posts collection
Update Rule: author = @request.auth.id || @request.auth.role = "admin"
Delete Rule: author = @request.auth.id || @request.auth.role = "admin"
```

### Prevent Relation Changes

```javascript
// Once created, relation cannot be changed
Update Rule: false
```

### Read-Only Relations

```javascript
// Anyone can read, only admins can modify
View Rule: true
Update Rule: @request.auth.role = "admin"
```

## Performance Optimization

### Index Related Fields

```sql
-- Index foreign keys for faster joins
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
```

### Use Views for Complex Queries

Create a view for frequently accessed relation data:

```sql
CREATE VIEW post_with_stats AS
SELECT
  p.*,
  (SELECT COUNT(*) FROM comments c WHERE c.post = p.id) as comment_count,
  (SELECT COUNT(*) FROM likes l WHERE l.post = p.id) as like_count
FROM posts p;
```

### Limit Expand Depth

```javascript
// Instead of
expand: 'comments,comments.author,comments.author.profile'

// Use
expand: 'comments,author'
// Then load author.profile separately if needed
```

### Paginate Relations

```javascript
// For large relation arrays
const page1 = await pb.collection('posts').getOne(postId, {
  expand: 'comments',
  filter: 'created >= "2024-01-01"'  // Filter comments
});

const page2 = await pb.collection('comments').getList(1, 50, {
  filter: 'post = "' + postId + '" && created >= "2024-01-15"'
});
```

## Troubleshooting

**Relation not showing in expand**
- Check collectionId is correct
- Verify relation field name
- Check if related record exists
- Ensure user has permission to access related record

**Can't create relation**
- Check createRule on both collections
- Verify user is authenticated
- Ensure target record exists
- Check maxSelect limit

**Slow relation queries**
- Add database indexes
- Reduce expand depth
- Use views for complex queries
- Consider denormalization for performance

**Circular reference errors**
- Avoid circular relation definitions
- Use views to flatten data
- Limit expand depth

## Best Practices

1. **Plan your data model**
   - Sketch relationships before implementing
   - Consider query patterns
   - Plan for scalability

2. **Use cascadeDelete wisely**
   - True for dependent data (comments → posts)
   - False for independent references (posts → authors)

3. **Index foreign keys**
   - Always index fields used in relations
   - Improves join performance

4. **Limit expand depth**
   - 2-3 levels max
   - Use views for deeper expansions

5. **Consider denormalization**
   - Store frequently accessed data directly
   - Use views or triggers to keep in sync

6. **Use junction tables for many-to-many**
   - Most flexible approach
   - Easy to query and update

7. **Test relation rules thoroughly**
   - Verify permissions work correctly
   - Test cascadeDelete behavior

## Related Topics

- [Collections](collections.md) - Collection design
- [API Rules & Filters](api_rules_filters.md) - Security rules
- [Schema Templates](../templates/schema_templates.md) - Pre-built relation schemas
- [API Records](../api_records.md) - CRUD with relations
