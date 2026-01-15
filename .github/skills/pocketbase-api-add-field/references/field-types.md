# PocketBase Field Types Reference

Complete reference for all PocketBase field types and their configuration options.

## Basic Field Types

### Text Field

```javascript
{
  name: 'field_name',
  type: 'text',
  required: true,
  options: {
    min: 1,        // Minimum length
    max: 255,      // Maximum length
    pattern: '^[a-zA-Z0-9]+$' // Regex pattern
  }
}
```

**Use Cases:** Names, descriptions, titles, any text input
**Validation:** String length and optional regex pattern

### Number Field

```javascript
{
  name: 'age',
  type: 'number',
  required: false,
  options: {
    min: 0,        // Minimum value
    max: 150       // Maximum value
  }
}
```

**Use Cases:** Ages, quantities, measurements, any numeric input
**Validation:** Numeric range constraints

### Email Field

```javascript
{
  name: 'email_address',
  type: 'email',
  required: true
}
```

**Use Cases:** Email addresses with automatic validation
**Validation:** Email format validation built-in

### URL Field

```javascript
{
  name: 'website',
  type: 'url',
  required: false
}
```

**Use Cases:** Website URLs, external links
**Validation:** URL format validation built-in

## Selection Field Types

### Select Field (Single Choice)

```javascript
{
  name: 'status',
  type: 'select',
  required: true,
  options: {
    values: ['active', 'inactive', 'pending', 'archived']
  }
}
```

**Use Cases:** Status fields, categories, single-choice options
**Constraints:** Values must be exact strings from the provided list

### Select Field (Multiple Choice)

```javascript
{
  name: 'tags',
  type: 'select',
  required: false,
  options: {
    values: ['red', 'blue', 'green', 'yellow'],
    maxSelect: 3  // Maximum number of selections
  }
}
```

**Use Cases:** Tags, categories, multi-choice options
**Constraints:** Multiple selections allowed, limited by maxSelect

## Date and Time Fields

### Date Field

```javascript
{
  name: 'birth_date',
  type: 'date',
  required: false
}
```

**Use Cases:** Birth dates, event dates, appointments
**Format:** YYYY-MM-DD format

### DateTime Field

```javascript
{
  name: 'created_at',
  type: 'datetime',
  required: false,
  default: 'now'  // Default to current timestamp
}
```

**Use Cases:** Timestamps, creation/update dates
**Format:** ISO 8601 datetime format

## Boolean Field

```javascript
{
  name: 'is_active',
  type: 'bool',
  required: false,
  default: true
}
```

**Use Cases:** Boolean flags, enable/disable settings
**Values:** true/false

## File Fields

### Single File Upload

```javascript
{
  name: 'avatar',
  type: 'file',
  required: false,
  options: {
    maxSelect: 1,                                    // Maximum files
    maxSize: 5242880,                               // 5MB in bytes
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'], // Allowed MIME types
    thumbs: ['100x100', '300x300']                   // Thumbnail sizes
  }
}
```

### Multiple File Upload

```javascript
{
  name: 'documents',
  type: 'file',
  required: false,
  options: {
    maxSelect: 5,                                    // Up to 5 files
    maxSize: 10485760,                               // 10MB per file
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  }
}
```

## JSON Field

```javascript
{
  name: 'metadata',
  type: 'json',
  required: false
}
```

**Use Cases:** Complex nested data, configuration objects, flexible schemas
**Format:** Valid JSON objects/arrays

## Relation Fields

### Single Relation

```javascript
{
  name: 'user_profile',
  type: 'relation',
  required: false,
  options: {
    collectionId: 'profiles',        // Target collection ID
    maxSelect: 1                    // Single related record
  }
}
```

### Multiple Relations

```javascript
{
  name: 'team_members',
  type: 'relation',
  required: false,
  options: {
    collectionId: 'users',           // Target collection ID
    maxSelect: 10                   // Up to 10 related records
  }
}
```

## Special Field Properties

### Required Fields

```javascript
{
  name: 'required_field',
  type: 'text',
  required: true  // Cannot be null/empty
}
```

### Default Values

```javascript
{
  name: 'status',
  type: 'select',
  required: false,
  default: 'active',  // Default value for new records
  options: {
    values: ['active', 'inactive', 'pending']
  }
}
```

### Unique Fields (via Index)

Note: Uniqueness is handled at the collection level via indexes, not field-level options.

## Field Naming Conventions

### Best Practices

- Use snake_case for field names
- Use descriptive names that indicate the data type
- Avoid reserved keywords and special characters
- Keep names under 50 characters
- Use consistent naming patterns across collections

### Examples

```javascript
// Good field names
{
  name: 'first_name',      // Clear and descriptive
  name: 'user_id',         // Clear reference
  name: 'created_at',      // Timestamp naming
  name: 'is_active',       // Boolean indicator
  name: 'profile_image',   // File field indicator
}

// Avoid
{
  name: 'fn',              // Too abbreviated
  name: '123field',        // Starts with number
  name: 'field-name',      // Contains hyphens
  name: 'reserved',        // Reserved keyword
}
```

## Field Type Limitations

### Size Constraints

- **Text fields:** Maximum length depends on database limits (typically 1MB+)
- **Number fields:** 64-bit floating point numbers
- **File fields:** Individual file size limits based on PocketBase configuration
- **JSON fields:** Stored as text, subject to database string limits

### Performance Considerations

- **File fields:** Large files impact database size and backup/restore times
- **Relation fields:** Complex queries may impact performance
- **JSON fields:** Indexing not possible on nested content
- **Text fields:** Large text fields impact query performance

## Migration Patterns

### Adding New Fields

When adding new fields to existing collections:

```javascript
// Optional fields for backward compatibility
{
  name: 'new_feature',
  type: 'bool',
  required: false,  // Important for existing records
  default: false
}

// Required fields for new data only
{
  name: 'version',
  type: 'select',
  required: true,  // Will need migration for existing records
  options: {
    values: ['v1', 'v2']
  }
}
```

### Field Modifications

Note: PocketBase doesn't support direct field type changes. Use migration patterns:

1. Add new field with desired type
2. Migrate data from old field
3. Delete old field
4. Optionally rename new field

### Field Deletion

```javascript
// To "delete" a field, simply omit it from the schema
const newSchema = existingSchema.filter(field => field.name !== 'deprecated_field');
```

## Validation Patterns

### Common Validation Combinations

```javascript
// Username field
{
  name: 'username',
  type: 'text',
  required: true,
  options: {
    min: 3,
    max: 30,
    pattern: '^[a-zA-Z0-9_]+$'
  }
}

// Age field
{
  name: 'age',
  type: 'number',
  required: false,
  options: {
    min: 13,
    max: 120
  }
}

// Status field
{
  name: 'account_status',
  type: 'select',
  required: true,
  default: 'active',
  options: {
    values: ['active', 'inactive', 'suspended', 'deleted']
  }
}

// Profile image
{
  name: 'profile_image',
  type: 'file',
  required: false,
  options: {
    maxSelect: 1,
    maxSize: 2097152, // 2MB
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    thumbs: ['50x50', '150x150']
  }
}
```

This reference provides all the information needed to configure any field type in PocketBase collections programmatically.