# Collections in PocketBase

## Overview

Collections are the fundamental data structures in PocketBase, similar to tables in a relational database. They define the schema and behavior of your data.

## Collection Types

### 1. Base Collection
Flexible collection with custom schema. Used for:
- Posts, articles, products
- Comments, messages
- Any application-specific data

**Characteristics:**
- No built-in authentication
- Custom fields only
- Full CRUD operations
- Can be accessed via REST API

### 2. Auth Collection
Special collection for user accounts. Used for:
- User registration and login
- User profiles and settings
- Authentication workflows

**Characteristics:**
- Built-in auth fields (`email`, `password`, `emailVisibility`, `verified`)
- Automatic user ID tracking on creation
- OAuth2 support
- Password management
- Email verification
- Password reset functionality

### 3. View Collection
Read-only collection based on SQL views. Used for:
- Complex joins and aggregations
- Denormalized data for performance
- Reporting and analytics
- Dashboard metrics

**Characteristics:**
- Read-only (no create, update, delete)
- Defined via SQL query
- Auto-updates when source data changes
- Useful for performance optimization

## Creating Collections

### Via Admin UI
1. Navigate to Collections
2. Click "New Collection"
3. Choose collection type
4. Configure name and schema
5. Save

### Via API
```javascript
const collection = await pb.collections.create({
  name: 'products',
  type: 'base',
  schema: [
    {
      name: 'name',
      type: 'text',
      required: true
    },
    {
      name: 'price',
      type: 'number',
      required: true
    }
  ]
});
```

## Schema Field Types

### Text
Short to medium text strings.

```json
{
  "name": "title",
  "type": "text",
  "options": {
    "min": null,
    "max": null,
    "pattern": ""
  }
}
```

**Options:**
- `min` - Minimum character length
- `max` - Maximum character length
- `pattern` - Regex pattern for validation

### Number
Integer or decimal numbers.

```json
{
  "name": "price",
  "type": "number",
  "options": {
    "min": null,
    "max": null,
    "noDecimal": false
  }
}
```

**Options:**
- `min` - Minimum value
- `max` - Maximum value
- `noDecimal` - Allow only integers

### Email
Email addresses with validation.

```json
{
  "name": "contact_email",
  "type": "email"
}
```

### URL
URLs with validation.

```json
{
  "name": "website",
  "type": "url"
}
```

### Date
Date and time values.

```json
{
  "name": "published_date",
  "type": "date",
  "options": {
    "min": "",
    "max": ""
  }
}
```

### Boolean
True/false values.

```json
{
  "name": "is_published",
  "type": "bool"
}
```

### JSON
Arbitrary JSON data.

```json
{
  "name": "metadata",
  "type": "json"
}
```

### Relation
Links to records in other collections.

```json
{
  "name": "author",
  "type": "relation",
  "options": {
    "collectionId": "AUTH_COLLECTION_ID",
    "cascadeDelete": false,
    "maxSelect": 1,
    "displayFields": null
  }
}
```

**Options:**
- `collectionId` - Target collection ID
- `cascadeDelete` - Delete related records when this is deleted
- `maxSelect` - Maximum number of related records (1 or null for unlimited)
- `displayFields` - Fields to display when showing the relation

### File
File uploads and storage.

```json
{
  "name": "avatar",
  "type": "file",
  "options": {
    "maxSelect": 1,
    "maxSize": 5242880,
    "mimeTypes": ["image/*"],
    "thumbs": ["100x100", "300x300"]
  }
}
```

**Options:**
- `maxSelect` - Maximum number of files
- `maxSize` - Maximum file size in bytes
- `mimeTypes` - Allowed MIME types (array or ["*"] for all)
- `thumbs` - Auto-generate image thumbnails at specified sizes

### Select
Dropdown with predefined options.

```json
{
  "name": "status",
  "type": "select",
  "options": {
    "values": ["draft", "published", "archived"],
    "maxSelect": 1
  }
}
```

**Options:**
- `values` - Array of allowed values
- `maxSelect` - Maximum selections (1 for single select, null for multi-select)

### Autodate
Automatically populated dates.

```json
{
  "name": "created",
  "type": "autodate",
  "options": {
    "onCreate": true,
    "onUpdate": false
  }
}
```

**Options:**
- `onCreate` - Set on record creation
- `onUpdate` - Update on record modification

### Username
Unique usernames (valid only for auth collections).

```json
{
  "name": "username",
  "type": "username",
  "options": {
    "min": 3,
    "max": null
  }
}
```

## Collection Rules

Rules control who can access, create, update, and delete records.

### Types of Rules

1. **List Rule** - Who can list/view multiple records
2. **View Rule** - Who can view individual records
3. **Create Rule** - Who can create new records
4. **Update Rule** - Who can modify records
5. **Delete Rule** - Who can delete records

### Rule Syntax

**Authenticated Users Only**
```
@request.auth.id != ""
```

**Owner-Based Access**
```
user_id = @request.auth.id
```

**Role-Based Access**
```
@request.auth.role = 'admin'
```

**Conditional Access**
```
status = 'published' || @request.auth.id = author_id
```

**Complex Conditions**
```
@request.auth.role = 'moderator' && @request.auth.verified = true
```

### Special Variables

- `@request.auth` - Current authenticated user
- `@request.auth.id` - User ID
- `@request.auth.email` - User email
- `@request.auth.role` - User role
- `@request.auth.verified` - Email verification status

### Rule Examples

**Public Blog Posts**
```
List Rule: status = 'published'
View Rule: status = 'published'
Create Rule: @request.auth.id != ''
Update Rule: author_id = @request.auth.id
Delete Rule: author_id = @request.auth.id
```

**Private User Data**
```
List Rule: user_id = @request.auth.id
View Rule: user_id = @request.auth.id
Create Rule: @request.auth.id != ''
Update Rule: user_id = @request.auth.id
Delete Rule: user_id = @request.auth.id
```

**Admin-Only Content**
```
List Rule: @request.auth.role = 'admin'
View Rule: @request.auth.role = 'admin'
Create Rule: @request.auth.role = 'admin'
Update Rule: @request.auth.role = 'admin'
Delete Rule: @request.auth.role = 'admin'
```

**Moderated Comments**
```
List Rule: status = 'approved' || author_id = @request.auth.id
View Rule: status = 'approved' || author_id = @request.auth.id
Create Rule: @request.auth.id != ''
Update Rule: author_id = @request.auth.id
Delete Rule: author_id = @request.auth.id || @request.auth.role = 'moderator'
```

## Collection Indexes

Indexes improve query performance on frequently searched or sorted fields.

### Creating Indexes

**Via Admin UI**
1. Go to collection settings
2. Click "Indexes" tab
3. Click "New Index"
4. Select fields to index
5. Save

**Via API**
```javascript
await pb.collections.update('COLLECTION_ID', {
  indexes: [
    'CREATE INDEX idx_posts_status ON posts(status)',
    'CREATE INDEX idx_posts_author ON posts(author_id)',
    'CREATE INDEX idx_posts_created ON posts(created)'
  ]
});
```

### Index Best Practices

1. **Index fields used in filters**
   ```sql
   CREATE INDEX idx_posts_status ON posts(status)
   ```

2. **Index fields used in sorts**
   ```sql
   CREATE INDEX idx_posts_created ON posts(created)
   ```

3. **Index foreign keys (relations)**
   ```sql
   CREATE INDEX idx_comments_post ON comments(post_id)
   ```

4. **Composite indexes for multi-field queries**
   ```sql
   CREATE INDEX idx_posts_status_created ON posts(status, created)
   ```

5. **Don't over-index** - Each index adds overhead to writes

## Collection Options

### General Options

- **Name** - Collection identifier (used in API endpoints)
- **Type** - base, auth, or view
- **System collection** - Built-in collections (users, _pb_users_auth_)
- **List encryption** - Encrypt data in list views

### API Options

- **API keys** - Manage read/write API keys
- **CRUD endpoints** - Enable/disable specific endpoints
- **File access** - Configure public/private file access

### Auth Collection Options

- **Min password length** - Minimum password requirements
- **Password constraints** - Require uppercase, numbers, symbols
- **Email verification** - Require email confirmation
- **OAuth2 providers** - Configure social login

## Managing Collections

### List Collections
```javascript
const collections = await pb.collections.getList(1, 50);
```

### Get Collection
```javascript
const collection = await pb.collections.getOne('COLLECTION_ID');
```

### Update Collection
```javascript
const updated = await pb.collections.update('COLLECTION_ID', {
  name: 'new_name',
  schema: [
    // updated schema
  ]
});
```

### Delete Collection
```javascript
await pb.collections.delete('COLLECTION_ID');
```

### Export Collection Schema
```javascript
const collection = await pb.collections.getOne('COLLECTION_ID');
const schemaJSON = JSON.stringify(collection.schema, null, 2);
```

## Best Practices

1. **Plan Schema Carefully**
   - Design before implementing
   - Consider future needs
   - Use appropriate field types

2. **Use Relations Wisely**
   - Normalize data appropriately
   - Set cascadeDelete when appropriate
   - Consider performance impact

3. **Set Rules Early**
   - Security from the start
   - Test rules thoroughly
   - Document rule logic

4. **Index Strategically**
   - Profile slow queries
   - Index commonly filtered fields
   - Avoid over-indexing

5. **Use Auth Collections for Users**
   - Built-in auth features
   - OAuth2 support
   - Password management

6. **Use Views for Complex Queries**
   - Improve performance
   - Simplify frontend code
   - Pre-compute expensive joins

## Common Patterns

### Blog/Post System
```
Collections:
- posts (base) - title, content, author, status, published_date
- categories (base) - name, slug, description
- tags (base) - name, slug
- posts_tags (base) - post_id, tag_id (relation join)
```

### E-commerce
```
Collections:
- products (base) - name, price, description, category, stock
- orders (base) - user, items, total, status
- order_items (base) - order, product, quantity, price
- categories (base) - name, parent (self-relation)
```

### Social Network
```
Collections:
- posts (base) - author, content, media, created, visibility
- likes (base) - post, user (unique constraint)
- follows (base) - follower, following (unique constraint)
- users (auth) - built-in auth + profile fields
```

## Troubleshooting

**Collection not showing data**
- Check listRule
- Verify user permissions
- Check if view collection is properly configured

**Slow queries**
- Add database indexes
- Optimize rule conditions
- Use views for complex joins

**Can't create records**
- Check createRule
- Verify required fields
- Ensure user is authenticated

**File uploads failing**
- Check maxSize and mimeTypes
- Verify file field options
- Check user has create permissions

## Related Topics

- [Authentication](authentication.md) - User management
- [API Rules & Filters](api_rules_filters.md) - Security rules syntax
- [Working with Relations](working_with_relations.md) - Field relationships
- [Files Handling](files_handling.md) - File uploads and storage
- [Schema Templates](../templates/schema_templates.md) - Pre-built schemas
