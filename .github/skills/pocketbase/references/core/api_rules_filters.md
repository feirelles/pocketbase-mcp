# API Rules and Filters

## Overview

PocketBase uses rule expressions to control access to collections and records. Rules are evaluated server-side and determine who can create, read, update, or delete data.

## Rule Types

There are four main rule types for collections:

1. **List Rule** - Controls who can list/query multiple records
2. **View Rule** - Controls who can view individual records
3. **Create Rule** - Controls who can create new records
4. **Update Rule** - Controls who can update records
5. **Delete Rule** - Controls who can delete records

## Rule Syntax

### Basic Comparison Operators

```javascript
// Equality
field = value
field != value

// String matching
field ~ "substring"
field !~ "substring"
field = "exact match"

// Numeric comparison
count > 10
age >= 18
price < 100
quantity != 0

// Date comparison
created >= "2024-01-01"
updated <= "2024-12-31"
published_date != null
```

### Logical Operators

```javascript
// AND
condition1 && condition2
condition1 && condition2 && condition3

// OR
condition1 || condition2

// NOT
!(condition)
status != "draft"
```

### Special Variables

```javascript
@request.auth              // Current authenticated user object
@request.auth.id           // Current user ID
@request.auth.email        // User email
@request.auth.role         // User role (admin, authenticated)
@request.auth.verified     // Email verification status
@request.timestamp         // Current server timestamp
```

### Field References

```javascript
// Reference own field
user_id = @request.auth.id

// Reference nested field (for JSON fields)
settings.theme = "dark"

// Reference array field
tags ~ ["javascript", "react"]

// Reference all elements in array
categoryId ~ ["tech", "programming", "web"]
```

### Array Operations

```javascript
// Check if array contains value
tags ~ "javascript"

// Check if any array element matches condition
categories.id ~ ["cat1", "cat2"]

// Check if array is not empty
images != []

// Check if array is empty
images = []
```

### String Operations

```javascript
// Pattern matching with wildcards
title ~ "Hello*"

// Case-sensitive regex
content ~ /pattern/i

// Starts with
title ~ "^Getting started"

// Contains
description ~ "important"
```

## Common Rule Patterns

### Owner-Based Access Control

**Users can only access their own records**

```javascript
// List Rule - show only user's records in lists
user_id = @request.auth.id

// View Rule - can only view own records
user_id = @request.auth.id

// Create Rule - only authenticated users can create
@request.auth.id != ""

// Update Rule - only owner can update
user_id = @request.auth.id

// Delete Rule - only owner can delete
user_id = @request.auth.id
```

### Public Read, Authenticated Write

**Anyone can read, only authenticated users can create/modify**

```javascript
// List Rule - public can read
status = "published"

// View Rule - public can view published items
status = "published"

// Create Rule - authenticated users only
@request.auth.id != ""

// Update Rule - author or admin can update
author_id = @request.auth.id || @request.auth.role = "admin"

// Delete Rule - author or admin can delete
author_id = @request.auth.id || @request.auth.role = "admin"
```

### Role-Based Access

**Different permissions based on user role**

```javascript
// Admins can do everything
List Rule: true
View Rule: true
Create Rule: @request.auth.role = "admin"
Update Rule: @request.auth.role = "admin"
Delete Rule: @request.auth.role = "admin"

// Moderators can manage non-admin content
List Rule: true
View Rule: true
Create Rule: @request.auth.role = "moderator" || @request.auth.role = "admin"
Update Rule: @request.auth.role = "moderator" || @request.auth.role = "admin"
Delete Rule: @request.auth.role = "admin"

// Regular users have limited access
List Rule: @request.auth.role != ""
View Rule: @request.auth.role != ""
Create Rule: @request.auth.role = "authenticated"
Update Rule: false
Delete Rule: false
```

### Status-Based Access

**Access based on record status**

```javascript
// Only show published content publicly
List Rule: status = "published"

// Drafts visible to authors
List Rule: status = "published" || author_id = @request.auth.id

// Published items visible to all
View Rule: status = "published"

// Authors can edit their own
Update Rule: author_id = @request.auth.id

// Deletion only for drafts
Delete Rule: status = "draft"
```

### Verified User Only

**Only verified users can interact**

```javascript
// Only verified users
Create Rule: @request.auth.verified = true
Update Rule: @request.auth.verified = true
Delete Rule: @request.auth.verified = true
```

### Time-Based Access

**Access based on time constraints**

```javascript
// Only future events
start_date > @request.timestamp

// Only published items or drafts for authors
status = "published" || (status = "draft" && author_id = @request.auth.id)

// Only items from last 30 days
created >= dateSubtract(@request.timestamp, 30, "days")
```

### Complex Multi-Condition Rules

**E-commerce order access**

```javascript
// Customers can view their own orders
List Rule: user_id = @request.auth.id
View Rule: user_id = @request.auth.id

// Staff can view all orders
View Rule: @request.auth.role = "staff" || user_id = @request.auth.id

// Only staff can create orders for customers
Create Rule: @request.auth.role = "staff"

// Customers can update their orders only if pending
Update Rule: (user_id = @request.auth.id && status = "pending") || @request.auth.role = "staff"

// Only staff can cancel orders
Delete Rule: @request.auth.role = "staff"
```

## Filtering in Queries

Rules control access, but you can also filter data in queries.

### Basic Filters

```javascript
// Equality
const records = await pb.collection('posts').getList(1, 50, {
  filter: 'status = "published"'
});

// Not equal
filter: 'category != "draft"'

// Multiple conditions
filter: 'status = "published" && created >= "2024-01-01"'

// OR condition
filter: 'category = "tech" || category = "programming"'
```

### String Filters

```javascript
// Contains substring
filter: 'title ~ "PocketBase"'

// Not contains
filter: 'content !~ "spam"'

// Pattern matching
filter: 'title ~ "Getting started*"'

// Regex (case insensitive)
filter: 'content ~ /important/i'

// Starts with
filter: 'email ~ "^admin@"'
```

### Numeric Filters

```javascript
// Greater than
filter: 'price > 100'

// Greater than or equal
filter: 'age >= 18'

// Less than
filter: 'stock < 10'

// Less than or equal
filter: 'price <= 50'

// Between (inclusive)
filter: 'price >= 10 && price <= 100'
```

### Date Filters

```javascript
// After date
filter: 'created >= "2024-01-01"'

// Before date
filter: 'event_date <= "2024-12-31"'

// Date range
filter: 'created >= "2024-01-01" && created <= "2024-12-31"'

// Last 30 days
filter: 'created >= dateSubtract(@request.timestamp, 30, "days")'

// Next 7 days
filter: 'event_date <= dateAdd(@request.timestamp, 7, "days")'
```

### Array Filters

```javascript
// Array contains value
filter: 'tags ~ "javascript"'

// Array contains any of multiple values
filter: 'tags ~ ["javascript", "react", "vue"]'

// Array does not contain value
filter: 'categories !~ "private"'

// Check if array is not empty
filter: 'images != []'

// Check if array is empty
filter: 'comments = []'
```

### Relation Filters

```javascript
// Filter by related record field
filter: 'author.email = "user@example.com"'

// Expand and filter
filter: 'expand.author.role = "admin"'

// Multiple relation levels
filter: 'expand.post.expand.author.role = "moderator"'
```

### NULL Checks

```javascript
// Field is not null
filter: 'published_date != null'

// Field is null
filter: 'archived_date = null'

// Field exists (not null or empty string)
filter: 'deleted != ""'
```

## Sorting

```javascript
// Sort by single field
sort: 'created'

// Sort by field descending
sort: '-created'

// Sort by multiple fields
sort: 'status,-created'

// Sort by numeric field
sort: 'price'

// Sort by string field (alphabetical)
sort: 'title'

// Sort by relation field
sort: 'expand.author.name'
```

## Field Selection

```javascript
// Select specific fields
fields: 'id,title,author,created'

// Exclude large fields
fields: 'id,title,author,-content'

// Select all fields
fields: '*'

// Select with relations
fields: 'id,title,expand.author.name'
```

## Pagination

```javascript
// Get page 1 with 50 items per page
const page1 = await pb.collection('posts').getList(1, 50)

// Get page 2
const page2 = await pb.collection('posts').getList(2, 50)

// Get all (use carefully - can be slow)
const all = await pb.collection('posts').getFullList(200)

// Get with cursor-based pagination (PocketBase 0.20+)
const records = await pb.collection('posts').getList(1, 50, {
  filter: 'created >= "2024-01-01"',
  sort: 'created'
})
```

## Relation Expansion

```javascript
// Expand single relation
expand: 'author'

// Expand multiple relations
expand: 'author,comments'

// Expand nested relations
expand: 'author,comments.author'

// Access expanded data
const post = await pb.collection('posts').getOne('POST_ID', {
  expand: 'author'
});
console.log(post.expand.author.email);
```

## Advanced Filter Functions

```javascript
// Date arithmetic
filter: 'created >= dateSubtract(@request.timestamp, 7, "days")'

// String length
filter: 'length(title) > 10'

// Count array elements
filter: 'count(tags) > 0'

// Case-insensitive matching
filter: 'lower(name) = lower("JOHN")'

// Extract JSON field
filter: 'settings->theme = "dark"'
```

## Performance Considerations

### Indexing for Filters

```sql
-- Create indexes for commonly filtered fields
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created ON posts(created);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_status_created ON posts(status, created);
```

### Efficient Rules

**Good:**
```javascript
// Simple, indexed field comparison
user_id = @request.auth.id
status = "published"
created >= "2024-01-01"
```

**Avoid (can be slow):**
```javascript
// Complex string matching
title ~ /javascript.*framework/i
// Use equals or prefix matching instead
title = "JavaScript Framework"

// Nested relation checks
expand.post.expand.author.role = "admin"
// Pre-compute or use views
```

### Pagination Best Practices

```javascript
// Always paginate large datasets
const records = await pb.collection('posts').getList(1, 50, {
  filter: 'status = "published"',
  sort: '-created',
  fields: 'id,title,author,created'  // Select only needed fields
});

// Use cursor-based pagination for infinite scroll
let cursor = null;
const batch1 = await pb.collection('posts').getList(1, 50, {
  sort: 'created'
});
cursor = batch1.items[batch1.items.length - 1].created;

const batch2 = await pb.collection('posts').getList(1, 50, {
  filter: `created < "${cursor}"`,
  sort: 'created'
});
```

## Real-time and Rules

Real-time subscriptions respect the same rules:

```javascript
// Subscribe to changes
pb.collection('posts').subscribe('*', function(e) {
  console.log(e.action); // 'create', 'update', 'delete'
  console.log(e.record); // Changed record
});

// User will only receive events for records they have access to
// based on their current rules
```

## Testing Rules

### Test as Different Users

```javascript
// Test public access
const publicPosts = await pb.collection('posts').getList(1, 50);
// Should respect public rules

// Test authenticated access
pb.collection('users').authWithPassword('user@example.com', 'password');
const userPosts = await pb.collection('posts').getList(1, 50);
// Should show more based on rules

// Test admin access
pb.admins.authWithPassword('admin@example.com', 'password');
const adminPosts = await pb.collection('posts').getList(1, 50);
// Should show everything
```

### Rule Testing Checklist

- [ ] Public users see appropriate data
- [ ] Authenticated users see correct data
- [ ] Users can't access others' private data
- [ ] Admins have full access
- [ ] Create rules work for authorized users
- [ ] Create rules block unauthorized users
- [ ] Update rules work correctly
- [ ] Delete rules work correctly
- [ ] Real-time updates respect rules

## Common Pitfalls

### 1. Forgetting List vs View Rules

```javascript
// WRONG - Both rules same
List Rule: user_id = @request.auth.id
View Rule: user_id = @request.auth.id

// RIGHT - Public can view, private in lists
List Rule: status = "published"
View Rule: status = "published" || user_id = @request.auth.id
```

### 2. Using Wrong Comparison

```javascript
// WRONG - string comparison for numbers
price > "100"

// RIGHT - numeric comparison
price > 100
```

### 3. Not Indexing Filtered Fields

```javascript
// If filtering by 'status', ensure index exists
CREATE INDEX idx_posts_status ON posts(status);
```

### 4. Over-restrictive Rules

```javascript
// Too restrictive - breaks functionality
List Rule: false  // No one can see anything

// Better - allow authenticated users to read
List Rule: @request.auth.id != ""
```

### 5. Forgetting to Handle NULL

```javascript
// May not work if published_date is null
filter: 'published_date >= "2024-01-01"'

// Better - handle nulls explicitly
filter: 'published_date != null && published_date >= "2024-01-01"'
```

## Security Best Practices

1. **Start with restrictive rules**
   ```javascript
   // Default to no access
   Create Rule: @request.auth.role = "admin"
   ```

2. **Test rules thoroughly**
   - Test as different user types
   - Verify data isolation
   - Check edge cases

3. **Log and monitor**
   - Check for unauthorized access attempts
   - Monitor rule performance
   - Track slow queries

4. **Use views for complex access logic**
   - Pre-compute expensive checks
   - Simplify rule logic

5. **Regular security audits**
   - Review rules periodically
   - Check for privilege escalation
   - Verify data isolation

## Related Topics

- [Collections](collections.md) - Collection configuration
- [Authentication](authentication.md) - User management
- [Working with Relations](working_with_relations.md) - Relationship patterns
- [Security Rules](../security_rules.md) - Comprehensive security patterns
- [API Records](../api_records.md) - Record CRUD operations
