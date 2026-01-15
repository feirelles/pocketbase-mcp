# Advanced PocketBase Schema Modification Patterns

Advanced techniques and patterns for complex schema modifications and migrations.

## Batch Schema Updates

### Update Multiple Collections

```javascript
async function updateMultipleCollections(collectionUpdates) {
  const pb = new PocketBase('http://127.0.0.1:8090');

  try {
    await pb.admins.authWithPassword('admin@example.com', 'password');

    const results = [];

    for (const update of collectionUpdates) {
      const { collectionId, newFields } = update;

      const collection = await pb.collections.getOne(collectionId);
      const updatedSchema = [...collection.schema, ...newFields];

      const updatedCollection = await pb.collections.update(collectionId, {
        name: collection.name,
        schema: updatedSchema
      });

      results.push({
        collectionId: collectionId,
        success: true,
        collection: updatedCollection
      });
    }

    return results;

  } catch (error) {
    console.error('Batch update failed:', error);
    throw error;
  } finally {
    pb.authStore.clear();
  }
}

// Usage
const updates = [
  {
    collectionId: 'users',
    newFields: [
      { name: 'bio', type: 'text', required: false }
    ]
  },
  {
    collectionId: 'posts',
    newFields: [
      { name: 'featured', type: 'bool', required: false, default: false }
    ]
  }
];

await updateMultipleCollections(updates);
```

### Conditional Field Addition

```javascript
async function addFieldIfNotExists(collectionId, newField) {
  const pb = new PocketBase('http://127.0.0.1:8090');

  try {
    await pb.admins.authWithPassword('admin@example.com', 'password');

    const collection = await pb.collections.getOne(collectionId);
    const existingFieldNames = collection.schema.map(field => field.name);

    if (!existingFieldNames.includes(newField.name)) {
      const updatedSchema = [...collection.schema, newField];

      await pb.collections.update(collectionId, {
        name: collection.name,
        schema: updatedSchema
      });

      console.log(`Added field: ${newField.name}`);
      return true;
    } else {
      console.log(`Field already exists: ${newField.name}`);
      return false;
    }

  } finally {
    pb.authStore.clear();
  }
}
```

## Schema Migration Patterns

### Version-based Migrations

```javascript
class PocketBaseMigrator {
  constructor(pbUrl, adminCredentials) {
    this.pb = new PocketBase(pbUrl);
    this.credentials = adminCredentials;
    this.version = '0.1.0';
  }

  async authenticate() {
    await this.pb.admins.authWithPassword(
      this.credentials.email,
      this.credentials.password
    );
  }

  async getCurrentSchema(collectionId) {
    return await this.pb.collections.getOne(collectionId);
  }

  async addMigrationField(collectionId) {
    const collection = await this.getCurrentSchema(collectionId);

    // Add schema_version field if it doesn't exist
    if (!collection.schema.some(field => field.name === 'schema_version')) {
      const versionField = {
        name: 'schema_version',
        type: 'text',
        required: false,
        default: this.version
      };

      const updatedSchema = [...collection.schema, versionField];
      await this.pb.collections.update(collectionId, {
        name: collection.name,
        schema: updatedSchema
      });
    }
  }

  async migrateTo(targetVersion) {
    console.log(`Migrating to version ${targetVersion}...`);

    // Add migration tracking field
    await this.addMigrationField('users');
    await this.addMigrationField('posts');

    // Execute specific migrations based on target version
    const migrations = this.getMigrationsForVersion(targetVersion);

    for (const migration of migrations) {
      console.log(`Running: ${migration.name}`);
      await migration.execute(this.pb);
    }

    console.log(`Migration to ${targetVersion} completed`);
  }

  getMigrationsForVersion(version) {
    const migrationMap = {
      '0.2.0': [
        {
          name: 'add_user_profile_fields',
          execute: async (pb) => {
            const collection = await pb.collections.getOne('users');
            const newFields = [
              { name: 'bio', type: 'text', required: false },
              { name: 'avatar', type: 'file', required: false }
            ];

            const updatedSchema = [...collection.schema, ...newFields];
            await pb.collections.update(collection.id, {
              name: collection.name,
              schema: updatedSchema
            });
          }
        }
      ],
      '0.3.0': [
        {
          name: 'add_post_featured_field',
          execute: async (pb) => {
            const collection = await pb.collections.getOne('posts');
            const featuredField = {
              name: 'featured',
              type: 'bool',
              required: false,
              default: false
            };

            const updatedSchema = [...collection.schema, featuredField];
            await pb.collections.update(collection.id, {
              name: collection.name,
              schema: updatedSchema
            });
          }
        }
      ]
    };

    return migrationMap[version] || [];
  }
}
```

### Rollback Support

```javascript
class SchemaManager {
  constructor(pb, collectionId) {
    this.pb = pb;
    this.collectionId = collectionId;
    this.backup = null;
  }

  async createBackup() {
    this.backup = await this.pb.collections.getOne(this.collectionId);
    console.log('Schema backup created');
  }

  async restoreBackup() {
    if (!this.backup) {
      throw new Error('No backup available');
    }

    await this.pb.collections.update(this.collectionId, {
      name: this.backup.name,
      schema: this.backup.schema
    });

    console.log('Schema restored from backup');
  }

  async safeUpdate(newFields) {
    await this.createBackup();

    try {
      const collection = await this.pb.collections.getOne(this.collectionId);
      const updatedSchema = [...collection.schema, ...newFields];

      await this.pb.collections.update(this.collectionId, {
        name: collection.name,
        schema: updatedSchema
      });

      console.log('Schema updated successfully');
      return true;

    } catch (error) {
      console.error('Schema update failed, restoring backup:', error);
      await this.restoreBackup();
      throw error;
    }
  }
}

// Usage
const manager = new SchemaManager(pb, 'users');
await manager.safeUpdate([
  { name: 'new_field', type: 'text', required: false }
]);
```

## Data Migration Patterns

### Migrate Data Between Fields

```javascript
async function migrateFieldData(collectionId, oldFieldName, newFieldName, transformFn) {
  const pb = new PocketBase('http://127.0.0.1:8090');

  try {
    await pb.admins.authWithPassword('admin@example.com', 'password');

    // Get all records in batches to avoid memory issues
    let page = 1;
    const batchSize = 50;
    let hasMore = true;
    let totalUpdated = 0;

    while (hasMore) {
      const records = await pb.collection(collectionId).getList(page, batchSize, {
        filter: `${oldFieldName} != null && ${oldFieldName} != ""`
      });

      for (const record of records.items) {
        const oldValue = record[oldFieldName];
        const newValue = transformFn ? transformFn(oldValue) : oldValue;

        if (newValue !== null && newValue !== undefined) {
          await pb.collection(collectionId).update(record.id, {
            [newFieldName]: newValue,
            [oldFieldName]: null // Clear old field
          });

          totalUpdated++;
        }
      }

      hasMore = records.items.length === batchSize;
      page++;
    }

    console.log(`Migrated ${totalUpdated} records from ${oldFieldName} to ${newFieldName}`);
    return totalUpdated;

  } finally {
    pb.authStore.clear();
  }
}

// Example: Migrate string date to proper date field
await migrateFieldData('users', 'birth_date_string', 'birth_date', (value) => {
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
});
```

### Populate Default Values

```javascript
async function populateDefaultValues(collectionId, fieldName, defaultGenerator) {
  const pb = new PocketBase('http://127.0.0.1:8090');

  try {
    await pb.admins.authWithPassword('admin@example.com', 'password');

    let page = 1;
    const batchSize = 50;
    let hasMore = true;
    let totalUpdated = 0;

    while (hasMore) {
      const records = await pb.collection(collectionId).getList(page, batchSize, {
        filter: `${fieldName} = null || ${fieldName} = ""`
      });

      for (const record of records.items) {
        const defaultValue = defaultGenerator(record);

        await pb.collection(collectionId).update(record.id, {
          [fieldName]: defaultValue
        });

        totalUpdated++;
      }

      hasMore = records.items.length === batchSize;
      page++;
    }

    console.log(`Populated default values for ${totalUpdated} records`);
    return totalUpdated;

  } finally {
    pb.authStore.clear();
  }
}

// Example: Set default status based on creation date
await populateDefaultValues('users', 'account_status', (record) => {
  const createdDate = new Date(record.created);
  const now = new Date();
  const daysSinceCreation = (now - createdDate) / (1000 * 60 * 60 * 24);

  return daysSinceCreation > 30 ? 'inactive' : 'active';
});
```

## Validation and Testing Patterns

### Schema Validation

```javascript
function validateSchema(schema) {
  const errors = [];
  const fieldNames = schema.map(field => field.name);

  // Check for duplicate field names
  const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate field names: ${duplicates.join(', ')}`);
  }

  // Validate each field
  schema.forEach((field, index) => {
    // Check required properties
    if (!field.name || !field.type) {
      errors.push(`Field at index ${index} missing name or type`);
    }

    // Validate field name format
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.name)) {
      errors.push(`Invalid field name: ${field.name}`);
    }

    // Validate field type
    const validTypes = ['text', 'number', 'email', 'url', 'select', 'date', 'datetime', 'bool', 'file', 'json', 'relation'];
    if (!validTypes.includes(field.type)) {
      errors.push(`Invalid field type: ${field.type} for field: ${field.name}`);
    }

    // Validate relation fields
    if (field.type === 'relation') {
      if (!field.options || !field.options.collectionId) {
        errors.push(`Relation field ${field.name} missing collectionId`);
      }
    }

    // Validate select fields
    if (field.type === 'select') {
      if (!field.options || !field.options.values || field.options.values.length === 0) {
        errors.push(`Select field ${field.name} missing values`);
      }
    }
  });

  return errors;
}
```

### Dry Run Mode

```javascript
async function dryRunSchemaUpdate(collectionId, newFields) {
  const pb = new PocketBase('http://127.0.0.1:8090');

  try {
    await pb.admins.authWithPassword('admin@example.com', 'password');

    const collection = await pb.collections.getOne(collectionId);
    const updatedSchema = [...collection.schema, ...newFields];

    // Validate the new schema
    const validationErrors = validateSchema(updatedSchema);
    if (validationErrors.length > 0) {
      console.error('Schema validation errors:');
      validationErrors.forEach(error => console.error(`  - ${error}`));
      return { valid: false, errors: validationErrors };
    }

    // Check for conflicts
    const existingFieldNames = collection.schema.map(field => field.name);
    const newFieldNames = newFields.map(field => field.name);
    const conflicts = newFieldNames.filter(name => existingFieldNames.includes(name));

    if (conflicts.length > 0) {
      console.warn('Field name conflicts:');
      conflicts.forEach(name => console.warn(`  - ${name} already exists`));
    }

    console.log('Dry run completed:');
    console.log(`  Collection: ${collection.name}`);
    console.log(`  Current fields: ${collection.schema.length}`);
    console.log(`  New fields: ${newFields.length}`);
    console.log(`  Total fields: ${updatedSchema.length}`);

    return {
      valid: validationErrors.length === 0,
      conflicts,
      newSchema: updatedSchema
    };

  } finally {
    pb.authStore.clear();
  }
}
```

## Integration Patterns

### CI/CD Integration

```javascript
// migrate-schema.js - Command line tool
const PocketBase = require('pocketbase');

async function runMigration(targetVersion, dryRun = false) {
  const pb = new PocketBase(process.env.POCKETBASE_URL);

  if (!dryRun) {
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL,
      process.env.POCKETBASE_ADMIN_PASSWORD
    );
  }

  try {
    const migrator = new PocketBaseMigrator(process.env.POCKETBASE_URL, {
      email: process.env.POCKETBASE_ADMIN_EMAIL,
      password: process.env.POCKETBASE_ADMIN_PASSWORD
    });

    if (dryRun) {
      console.log('DRY RUN MODE - No changes will be made');
      // Run validation only
    } else {
      await migrator.migrateTo(targetVersion);
    }

  } finally {
    if (!dryRun) {
      pb.authStore.clear();
    }
  }
}

// CLI usage
const args = process.argv.slice(2);
const version = args.find(arg => arg.startsWith('--version='))?.split('=')[1];
const dryRun = args.includes('--dry-run');

if (!version) {
  console.error('Please specify --version=X.X.X');
  process.exit(1);
}

runMigration(version, dryRun)
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
```

### Environment-Specific Migrations

```javascript
class EnvironmentAwareMigrator {
  constructor(environment) {
    this.environment = environment;
    this.pbUrl = this.getBaseUrl();
  }

  getBaseUrl() {
    switch (this.environment) {
      case 'development':
        return 'http://127.0.0.1:8090';
      case 'staging':
        return 'https://staging-api.example.com';
      case 'production':
        return 'https://api.example.com';
      default:
        throw new Error(`Unknown environment: ${this.environment}`);
    }
  }

  async migrate() {
    if (this.environment === 'production') {
      const confirmation = await this.confirmProductionMigration();
      if (!confirmation) {
        console.log('Production migration cancelled');
        return;
      }
    }

    // Run migration with environment-specific logic
    await this.runMigration();
  }

  async confirmProductionMigration() {
    // Implement confirmation logic (could be interactive or API-based)
    console.log('WARNING: About to run migration in PRODUCTION');
    console.log('This action cannot be undone easily.');
    return process.env.CONFIRM_PRODUCTION === 'true';
  }
}
```

These advanced patterns provide comprehensive solutions for complex schema modification scenarios in production environments.