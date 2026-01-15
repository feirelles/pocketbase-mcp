#!/usr/bin/env node

/**
 * Batch PocketBase Schema Update Example
 *
 * This example demonstrates how to update multiple collections with new fields
 * in a single operation, with proper error handling and rollback capabilities.
 */

const PocketBase = require('pocketbase');

// Configuration
const CONFIG = {
  pocketbaseUrl: process.env.POCKETBASE_URL || 'http://127.0.0.1:8090',
  adminEmail: process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com',
  adminPassword: process.env.POCKETBASE_ADMIN_PASSWORD || 'your-admin-password'
};

// Define batch updates for multiple collections
const BATCH_UPDATES = [
  {
    collectionName: 'users',
    description: 'Add user profile fields',
    newFields: [
      {
        name: 'first_name',
        type: 'text',
        required: false,
        options: { max: 100 }
      },
      {
        name: 'last_name',
        type: 'text',
        required: false,
        options: { max: 100 }
      },
      {
        name: 'phone_number',
        type: 'text',
        required: false,
        options: { max: 20 }
      },
      {
        name: 'preferences',
        type: 'json',
        required: false
      }
    ]
  },
  {
    collectionName: 'posts',
    description: 'Add post management fields',
    newFields: [
      {
        name: 'featured',
        type: 'bool',
        required: false,
        default: false
      },
      {
        name: 'view_count',
        type: 'number',
        required: false,
        default: 0,
        options: { min: 0 }
      },
      {
        name: 'tags',
        type: 'select',
        required: false,
        options: {
          values: ['news', 'update', 'announcement', 'tutorial', 'general'],
          maxSelect: 3
        }
      }
    ]
  },
  {
    collectionName: 'comments',
    description: 'Add comment moderation fields',
    newFields: [
      {
        name: 'is_approved',
        type: 'bool',
        required: false,
        default: false
      },
      {
        name: 'moderated_by',
        type: 'relation',
        required: false,
        options: {
          collectionId: 'users',
          maxSelect: 1
        }
      },
      {
        name: 'moderation_date',
        type: 'datetime',
        required: false
      }
    ]
  }
];

/**
 * Schema Backup and Restore Manager
 */
class SchemaBackupManager {
  constructor(pb) {
    this.pb = pb;
    this.backups = new Map();
  }

  async createBackup(collectionId) {
    const collection = await this.pb.collections.getOne(collectionId);
    this.backups.set(collectionId, {
      original: collection,
      timestamp: new Date()
    });

    console.log(`📦 Created backup for collection: ${collection.name}`);
    return collection;
  }

  async restoreBackup(collectionId) {
    const backup = this.backups.get(collectionId);
    if (!backup) {
      throw new Error(`No backup found for collection ID: ${collectionId}`);
    }

    await this.pb.collections.update(collectionId, {
      name: backup.original.name,
      schema: backup.original.schema
    });

    console.log(`🔄 Restored backup for collection: ${backup.original.name}`);
    return backup.original;
  }

  async restoreAllBackups() {
    const restorePromises = Array.from(this.backups.keys()).map(
      collectionId => this.restoreBackup(collectionId)
    );

    await Promise.all(restorePromises);
    console.log(`🔄 Restored all ${this.backups.size} collection backups`);
  }

  listBackups() {
    console.log('\n📋 Available backups:');
    for (const [collectionId, backup] of this.backups) {
      console.log(`  ${backup.original.name} (${collectionId}) - ${backup.timestamp}`);
    }
  }
}

/**
 * Initialize PocketBase client and authenticate
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
 * Get collection by name or ID
 */
async function getCollection(pb, collectionName) {
  try {
    // Try to get by name first
    const collections = await pb.collections.getFullList();
    const collection = collections.find(c => c.name === collectionName);

    if (!collection) {
      throw new Error(`Collection "${collectionName}" not found`);
    }

    console.log(`✓ Found collection: ${collection.name} (${collection.id})`);
    return collection;
  } catch (error) {
    console.error(`✗ Failed to get collection "${collectionName}":`, error.message);
    throw error;
  }
}

/**
 * Validate fields against existing schema
 */
function validateFields(newFields, existingSchema, collectionName) {
  const existingFieldNames = existingSchema.map(field => field.name);
  const newFieldNames = newFields.map(field => field.name);

  // Check for conflicts
  const conflicts = newFieldNames.filter(name => existingFieldNames.includes(name));

  if (conflicts.length > 0) {
    throw new Error(`Collection "${collectionName}" field name conflicts: ${conflicts.join(', ')}`);
  }

  // Validate field definitions
  newFields.forEach(field => {
    if (!field.name || !field.type) {
      throw new Error(`Collection "${collectionName}" invalid field definition: missing name or type`);
    }

    // Validate field name format
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.name)) {
      throw new Error(`Collection "${collectionName}" invalid field name format: ${field.name}`);
    }

    // Validate select field options
    if (field.type === 'select' && (!field.options || !field.options.values)) {
      throw new Error(`Collection "${collectionName}" select field "${field.name}" missing values`);
    }

    // Validate relation field options
    if (field.type === 'relation' && (!field.options || !field.options.collectionId)) {
      throw new Error(`Collection "${collectionName}" relation field "${field.name}" missing collectionId`);
    }
  });

  console.log(`✓ Validated ${newFields.length} new fields for ${collectionName}`);
  return true;
}

/**
 * Update a single collection with new fields
 */
async function updateCollection(pb, backupManager, updateConfig) {
  const { collectionName, description, newFields } = updateConfig;

  try {
    console.log(`\n🔧 Updating collection: ${collectionName}`);
    console.log(`📝 Description: ${description}`);

    // Get current collection
    const collection = await getCollection(pb, collectionName);

    // Create backup
    await backupManager.createBackup(collection.id);

    // Validate new fields
    validateFields(newFields, collection.schema, collectionName);

    // Add fields to schema
    const updatedSchema = [...collection.schema, ...newFields];

    // Update collection
    const updatedCollection = await pb.collections.update(collection.id, {
      name: collection.name,
      schema: updatedSchema
    });

    console.log(`✓ Successfully added ${newFields.length} fields to ${collectionName}`);
    console.log(`  Total fields now: ${updatedCollection.schema.length}`);

    return {
      success: true,
      collectionName,
      newFieldNames: newFields.map(field => field.name),
      totalFields: updatedCollection.schema.length
    };

  } catch (error) {
    console.error(`✗ Failed to update collection "${collectionName}":`, error.message);
    throw error;
  }
}

/**
 * Execute batch schema updates
 */
async function executeBatchUpdates(pb, batchUpdates) {
  const backupManager = new SchemaBackupManager(pb);
  const results = [];

  try {
    console.log(`🚀 Starting batch schema updates for ${batchUpdates.length} collections...`);

    for (const updateConfig of batchUpdates) {
      const result = await updateCollection(pb, backupManager, updateConfig);
      results.push(result);
    }

    console.log(`\n✅ Batch update completed successfully!`);
    console.log(`📊 Results summary:`);
    results.forEach(result => {
      console.log(`  ${result.collectionName}: +${result.newFieldNames.length} fields (total: ${result.totalFields})`);
    });

    return results;

  } catch (error) {
    console.error(`\n❌ Batch update failed! Restoring backups...`);
    await backupManager.restoreAllBackups();
    console.error(`✅ All collections restored to original state`);
    throw error;
  }
}

/**
 * Generate batch update report
 */
function generateReport(results) {
  const report = {
    timestamp: new Date(),
    totalCollections: results.length,
    successfulUpdates: results.filter(r => r.success).length,
    failedUpdates: results.filter(r => !r.success).length,
    totalNewFields: results.reduce((sum, r) => sum + (r.newFieldNames?.length || 0), 0),
    collections: results.map(r => ({
      name: r.collectionName,
      success: r.success,
      newFieldsAdded: r.newFieldNames?.length || 0,
      newFieldNames: r.newFieldNames || [],
      totalFields: r.totalFields
    }))
  };

  return report;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔧 PocketBase Batch Schema Update');
  console.log(`🌐 PocketBase URL: ${CONFIG.pocketbaseUrl}`);
  console.log(`👤 Admin: ${CONFIG.adminEmail}`);
  console.log(`📝 Collections to update: ${BATCH_UPDATES.length}`);

  const pb = await initializePocketBase();

  try {
    // Execute batch updates
    const results = await executeBatchUpdates(pb, BATCH_UPDATES);

    // Generate and display report
    const report = generateReport(results);
    console.log('\n📊 Final Report:');
    console.log(`  Timestamp: ${report.timestamp}`);
    console.log(`  Collections processed: ${report.totalCollections}`);
    console.log(`  Successful updates: ${report.successfulUpdates}`);
    console.log(`  Total new fields added: ${report.totalNewFields}`);

    if (report.failedUpdates > 0) {
      console.log(`  Failed updates: ${report.failedUpdates}`);
    }

    return report;

  } catch (error) {
    console.error('\n❌ Batch schema update failed:', error.message);
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
PocketBase Batch Schema Update

Usage: node batch-schema-update.js

Environment Variables:
  POCKETBASE_URL           PocketBase server URL (default: http://127.0.0.1:8090)
  POCKETBASE_ADMIN_EMAIL   Admin email address
  POCKETBASE_ADMIN_PASSWORD Admin password

Features:
  - Updates multiple collections in a single operation
  - Automatic backup and rollback on failure
  - Field validation and conflict detection
  - Detailed progress reporting
  - Support for all PocketBase field types

Example Collections:
  - users: Profile fields, preferences
  - posts: Featured posts, view counts, tags
  - comments: Moderation fields

Customization:
  Edit BATCH_UPDATES constant in the script to define your own updates.
    `);
    process.exit(0);
  }

  main()
    .then(report => {
      console.log('\n✅ Batch update completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Batch update failed:', error);
      process.exit(1);
    });
}

module.exports = {
  main,
  executeBatchUpdates,
  updateCollection,
  validateFields,
  SchemaBackupManager,
  BATCH_UPDATES,
  CONFIG
};