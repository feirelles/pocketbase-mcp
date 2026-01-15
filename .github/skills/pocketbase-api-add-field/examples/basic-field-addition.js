#!/usr/bin/env node

/**
 * Basic PocketBase Field Addition Example
 *
 * This example demonstrates how to add new fields to an existing PocketBase collection
 * using the JavaScript SDK API.
 */

const PocketBase = require('pocketbase');

// Configuration
const CONFIG = {
  pocketbaseUrl: process.env.POCKETBASE_URL || 'http://127.0.0.1:8090',
  adminEmail: process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com',
  adminPassword: process.env.POCKETBASE_ADMIN_PASSWORD || 'your-admin-password'
};

// Define new fields to add to the users collection
const NEW_FIELDS = [
  {
    name: 'bio',
    type: 'text',
    required: false,
    options: {
      max: 1000
    }
  },
  {
    name: 'avatar',
    type: 'file',
    required: false,
    options: {
      maxSelect: 1,
      maxSize: 5242880, // 5MB
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      thumbs: ['50x50', '150x150']
    }
  },
  {
    name: 'is_active',
    type: 'bool',
    required: false,
    default: true
  },
  {
    name: 'date_of_birth',
    type: 'date',
    required: false
  },
  {
    name: 'account_status',
    type: 'select',
    required: false,
    default: 'active',
    options: {
      values: ['active', 'inactive', 'suspended']
    }
  }
];

/**
 * Initialize PocketBase client and authenticate as admin
 */
async function initializePocketBase() {
  const pb = new PocketBase(CONFIG.pocketbaseUrl);

  try {
    await pb.admins.authWithPassword(CONFIG.adminEmail, CONFIG.adminPassword);
    console.log('✓ Admin authentication successful');
    return pb;
  } catch (error) {
    console.error('✗ Admin authentication failed:', error.message);
    throw error;
  }
}

/**
 * Get current collection schema
 */
async function getCollectionSchema(pb, collectionName) {
  try {
    const collection = await pb.collections.getOne(collectionName);
    console.log(`✓ Retrieved collection schema for: ${collection.name}`);
    console.log(`  Current fields: ${collection.schema.length}`);
    return collection;
  } catch (error) {
    console.error(`✗ Failed to get collection "${collectionName}":`, error.message);
    throw error;
  }
}

/**
 * Validate new fields against existing schema
 */
function validateNewFields(newFields, existingSchema) {
  const existingFieldNames = existingSchema.map(field => field.name);
  const newFieldNames = newFields.map(field => field.name);

  // Check for conflicts
  const conflicts = newFieldNames.filter(name => existingFieldNames.includes(name));

  if (conflicts.length > 0) {
    throw new Error(`Field name conflicts: ${conflicts.join(', ')}`);
  }

  // Validate field definitions
  newFields.forEach(field => {
    if (!field.name || !field.type) {
      throw new Error(`Invalid field definition: missing name or type`);
    }

    // Validate field name format
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.name)) {
      throw new Error(`Invalid field name format: ${field.name}`);
    }
  });

  console.log('✓ Field validation passed');
}

/**
 * Add new fields to collection schema
 */
async function addFieldsToCollection(pb, collection, newFields) {
  try {
    // Merge new fields with existing schema
    const updatedSchema = [...collection.schema, ...newFields];

    // Update collection
    const updatedCollection = await pb.collections.update(collection.id, {
      name: collection.name,
      schema: updatedSchema
    });

    console.log(`✓ Successfully added ${newFields.length} fields to collection "${collection.name}"`);
    console.log(`  Total fields now: ${updatedCollection.schema.length}`);

    // List new field names
    const newFieldNames = newFields.map(field => field.name);
    console.log(`  New fields: ${newFieldNames.join(', ')}`);

    return updatedCollection;

  } catch (error) {
    console.error(`✗ Failed to add fields to collection:`, error.message);
    throw error;
  }
}

/**
 * Verify the schema changes
 */
async function verifySchemaChanges(pb, collectionId, expectedFields) {
  try {
    const collection = await pb.collections.getOne(collectionId);
    const fieldNames = collection.schema.map(field => field.name);

    const missingFields = expectedFields.filter(field => !fieldNames.includes(field));
    const extraFields = expectedFields.filter(field => fieldNames.includes(field));

    console.log(`✓ Schema verification:`);
    console.log(`  Expected fields found: ${extraFields.length}/${expectedFields.length}`);
    console.log(`  Missing fields: ${missingFields.length}`);

    if (missingFields.length > 0) {
      console.log(`  Missing: ${missingFields.join(', ')}`);
    }

    return missingFields.length === 0;

  } catch (error) {
    console.error('✗ Schema verification failed:', error.message);
    return false;
  }
}

/**
 * Main execution function
 */
async function main() {
  const collectionName = process.argv[2] || 'users';

  console.log(`🔧 Adding fields to collection: ${collectionName}`);
  console.log(`🌐 PocketBase URL: ${CONFIG.pocketbaseUrl}`);
  console.log(`👤 Admin: ${CONFIG.adminEmail}`);
  console.log('');

  const pb = await initializePocketBase();

  try {
    // Get current collection
    const collection = await getCollectionSchema(pb, collectionName);

    // Validate new fields
    validateNewFields(NEW_FIELDS, collection.schema);

    // Add fields
    const updatedCollection = await addFieldsToCollection(pb, collection, NEW_FIELDS);

    // Verify changes
    const expectedFieldNames = NEW_FIELDS.map(field => field.name);
    const verificationPassed = await verifySchemaChanges(pb, collection.id, expectedFieldNames);

    if (verificationPassed) {
      console.log('\n✅ Field addition completed successfully!');
    } else {
      console.log('\n⚠️  Field addition completed but verification failed');
    }

    return updatedCollection;

  } catch (error) {
    console.error('\n❌ Field addition failed:', error.message);
    process.exit(1);

  } finally {
    // Clean up authentication
    pb.authStore.clear();
    console.log('\n🧹 Authentication cleared');
  }
}

/**
 * Run if executed directly
 */
if (require.main === module) {
  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Basic PocketBase Field Addition

Usage: node basic-field-addition.js [collection-name]

Environment Variables:
  POCKETBASE_URL           PocketBase server URL (default: http://127.0.0.1:8090)
  POCKETBASE_ADMIN_EMAIL   Admin email address
  POCKETBASE_ADMIN_PASSWORD Admin password

Examples:
  node basic-field-addition.js users
  POCKETBASE_URL=http://localhost:8090 node basic-field-addition.js posts
    `);
    process.exit(0);
  }

  main()
    .then(() => {
      console.log('Script completed successfully');
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  main,
  initializePocketBase,
  getCollectionSchema,
  validateNewFields,
  addFieldsToCollection,
  verifySchemaChanges,
  NEW_FIELDS,
  CONFIG
};