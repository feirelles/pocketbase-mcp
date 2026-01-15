#!/usr/bin/env node

/**
 * Production PocketBase Migration Script
 *
 * This is a production-ready migration script with environment detection,
 * backup capabilities, and comprehensive error handling.
 */

const PocketBase = require('pocketbase');
const fs = require('fs');
const path = require('path');

// Migration configuration
const MIGRATION_CONFIG = {
  version: '0.2.0',
  description: 'Add user profiles and post management features',
  dryRun: process.argv.includes('--dry-run'),
  force: process.argv.includes('--force'),
  backupPath: process.env.MIGRATION_BACKUP_PATH || './backups'
};

// Environment configuration
const ENVIRONMENTS = {
  development: {
    url: process.env.DEV_POCKETBASE_URL || 'http://127.0.0.1:8090',
    email: process.env.DEV_POCKETBASE_ADMIN_EMAIL || 'admin@dev.local',
    password: process.env.DEV_POCKETBASE_ADMIN_PASSWORD || 'Dev123456!'
  },
  staging: {
    url: process.env.STAGING_POCKETBASE_URL || 'https://staging-api.example.com',
    email: process.env.STAGING_POCKETBASE_ADMIN_EMAIL || 'admin@staging.example.com',
    password: process.env.STAGING_POCKETBASE_ADMIN_PASSWORD
  },
  production: {
    url: process.env.PROD_POCKETBASE_URL || 'https://api.example.com',
    email: process.env.PROD_POCKETBASE_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.PROD_POCKETBASE_ADMIN_PASSWORD
  }
};

// Migration definitions
const MIGRATIONS = {
  '0.2.0': [
    {
      name: 'add_user_profile_fields',
      collection: 'users',
      description: 'Add comprehensive user profile fields',
      fields: [
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
          name: 'bio',
          type: 'text',
          required: false,
          options: { max: 2000 }
        },
        {
          name: 'avatar',
          type: 'file',
          required: false,
          options: {
            maxSelect: 1,
            maxSize: 5242880,
            mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
            thumbs: ['50x50', '150x150']
          }
        },
        {
          name: 'date_of_birth',
          type: 'date',
          required: false
        },
        {
          name: 'phone_number',
          type: 'text',
          required: false,
          options: { max: 20 }
        }
      ]
    },
    {
      name: 'add_post_management_fields',
      collection: 'posts',
      description: 'Add post management and categorization',
      fields: [
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
            values: ['news', 'update', 'announcement', 'tutorial', 'general', 'feature'],
            maxSelect: 3
          }
        },
        {
          name: 'published_at',
          type: 'datetime',
          required: false
        }
      ]
    },
    {
      name: 'add_schema_version_tracking',
      collection: 'users',
      description: 'Add schema version tracking for migration management',
      fields: [
        {
          name: 'schema_version',
          type: 'text',
          required: false,
          default: '0.1.0'
        },
        {
          name: 'last_migration_date',
          type: 'datetime',
          required: false
        }
      ]
    }
  ]
};

/**
 * Migration Manager Class
 */
class MigrationManager {
  constructor(environment, config = {}) {
    this.environment = environment;
    this.config = { ...MIGRATION_CONFIG, ...config };
    this.pb = null;
    this.backupManager = null;
    this.currentSchema = new Map();
  }

  async initialize() {
    // Get environment configuration
    const envConfig = ENVIRONMENTS[this.environment];
    if (!envConfig) {
      throw new Error(`Unknown environment: ${this.environment}`);
    }

    // Validate environment configuration
    if (!envConfig.url || !envConfig.email || !envConfig.password) {
      throw new Error(`Missing configuration for environment: ${this.environment}`);
    }

    // Initialize PocketBase client
    this.pb = new PocketBase(envConfig.url);
    await this.pb.admins.authWithPassword(envConfig.email, envConfig.password);

    console.log(`🔗 Connected to PocketBase: ${envConfig.url}`);
    console.log(`👤 Authenticated as: ${envConfig.email}`);
    console.log(`🌍 Environment: ${this.environment}`);

    // Initialize backup manager
    this.backupManager = new BackupManager(this.pb, this.config.backupPath);
  }

  async getCurrentSchemas() {
    console.log('\n📋 Loading current collection schemas...');

    try {
      const collections = await this.pb.collections.getFullList();

      for (const collection of collections) {
        this.currentSchema.set(collection.name, {
          id: collection.id,
          name: collection.name,
          schema: collection.schema
        });
      }

      console.log(`✓ Loaded schemas for ${collections.length} collections`);
      return this.currentSchema;

    } catch (error) {
      console.error('✗ Failed to load collection schemas:', error.message);
      throw error;
    }
  }

  async createBackups() {
    console.log('\n📦 Creating collection backups...');

    if (this.config.dryRun) {
      console.log('🔸 DRY RUN: Skipping backup creation');
      return;
    }

    await this.backupManager.createAllBackups(this.currentSchema);
    console.log('✓ All collections backed up');
  }

  async validateMigrations(migrations) {
    console.log('\n🔍 Validating migrations...');

    const errors = [];

    for (const migration of migrations) {
      const collectionSchema = this.currentSchema.get(migration.collection);

      if (!collectionSchema) {
        errors.push(`Collection "${migration.collection}" not found`);
        continue;
      }

      try {
        this.validateMigration(migration, collectionSchema);
      } catch (error) {
        errors.push(`Migration "${migration.name}": ${error.message}`);
      }
    }

    if (errors.length > 0) {
      console.error('✗ Migration validation failed:');
      errors.forEach(error => console.error(`  - ${error}`));
      throw new Error('Migration validation failed');
    }

    console.log(`✓ ${migrations.length} migrations validated successfully`);
  }

  validateMigration(migration, collectionSchema) {
    const existingFieldNames = collectionSchema.schema.map(field => field.name);

    // Check for field conflicts
    const conflicts = migration.fields.filter(field =>
      existingFieldNames.includes(field.name)
    );

    if (conflicts.length > 0) {
      throw new Error(`Field conflicts: ${conflicts.map(f => f.name).join(', ')}`);
    }

    // Validate field definitions
    migration.fields.forEach(field => {
      if (!field.name || !field.type) {
        throw new Error(`Invalid field definition: missing name or type`);
      }

      // Validate field name format
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.name)) {
        throw new Error(`Invalid field name format: ${field.name}`);
      }

      // Validate field-specific rules
      if (field.type === 'select' && (!field.options || !field.options.values)) {
        throw new Error(`Select field "${field.name}" missing values`);
      }

      if (field.type === 'relation' && (!field.options || !field.options.collectionId)) {
        throw new Error(`Relation field "${field.name}" missing collectionId`);
      }
    });
  }

  async executeMigrations(migrations) {
    console.log('\n🚀 Executing migrations...');

    if (this.config.dryRun) {
      console.log('🔸 DRY RUN: Skipping migration execution');
      return this.getDryRunReport(migrations);
    }

    const results = [];

    for (const migration of migrations) {
      try {
        console.log(`\n🔧 Executing: ${migration.name}`);
        console.log(`📝 ${migration.description}`);

        const result = await this.executeMigration(migration);
        results.push({ ...migration, ...result, success: true });

        console.log(`✓ Migration completed successfully`);

      } catch (error) {
        console.error(`✗ Migration failed:`, error.message);
        results.push({ ...migration, success: false, error: error.message });

        // Stop on first failure in production
        if (this.environment === 'production' && !this.config.force) {
          console.error('🛑 Stopping migrations due to production error');
          break;
        }
      }
    }

    return results;
  }

  async executeMigration(migration) {
    const collection = this.currentSchema.get(migration.collection);

    // Add new fields to schema
    const updatedSchema = [...collection.schema, ...migration.fields];

    // Update collection
    const updatedCollection = await this.pb.collections.update(collection.id, {
      name: collection.name,
      schema: updatedSchema
    });

    // Update current schema cache
    this.currentSchema.set(migration.collection, {
      id: collection.id,
      name: collection.name,
      schema: updatedCollection.schema
    });

    return {
      fieldsAdded: migration.fields.length,
      totalFields: updatedCollection.schema.length,
      newFieldNames: migration.fields.map(f => f.name)
    };
  }

  getDryRunReport(migrations) {
    const report = {
      dryRun: true,
      version: this.config.version,
      environment: this.environment,
      migrations: migrations.map(migration => ({
        name: migration.name,
        collection: migration.collection,
        description: migration.description,
        fieldsToAdd: migration.fields.length,
        fieldNames: migration.fields.map(f => f.name)
      }))
    };

    console.log('\n📊 Dry Run Report:');
    console.log(`Version: ${report.version}`);
    console.log(`Environment: ${report.environment}`);
    console.log(`Migrations: ${report.migrations.length}`);

    report.migrations.forEach(migration => {
      console.log(`\n  ${migration.name}:`);
      console.log(`    Collection: ${migration.collection}`);
      console.log(`    Fields to add: ${migration.fieldsToAdd}`);
      console.log(`    Field names: ${migration.fieldNames.join(', ')}`);
    });

    return report;
  }

  async run(targetVersion) {
    console.log(`\n🚀 Starting migration to version ${targetVersion}`);
    console.log(`🔧 Dry run: ${this.config.dryRun ? 'YES' : 'NO'}`);

    // Production safety check
    if (this.environment === 'production' && !this.config.dryRun && !this.config.force) {
      const confirmed = await this.confirmProductionMigration(targetVersion);
      if (!confirmed) {
        console.log('❌ Production migration cancelled');
        return null;
      }
    }

    try {
      // Initialize connection
      await this.initialize();

      // Load current schemas
      await this.getCurrentSchemas();

      // Create backups
      await this.createBackups();

      // Get migrations for target version
      const migrations = MIGRATIONS[targetVersion];
      if (!migrations) {
        throw new Error(`No migrations found for version ${targetVersion}`);
      }

      // Validate migrations
      await this.validateMigrations(migrations);

      // Execute migrations
      const results = await this.executeMigrations(migrations);

      // Generate report
      const report = this.generateReport(targetVersion, results);
      console.log('\n✅ Migration completed successfully!');
      this.displayReport(report);

      return report;

    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);

      if (!this.config.dryRun && this.environment !== 'development') {
        console.log('🔄 Restoring from backups...');
        await this.backupManager.restoreAllBackups();
        console.log('✅ All collections restored');
      }

      throw error;

    } finally {
      // Clean up authentication
      if (this.pb) {
        this.pb.authStore.clear();
        console.log('\n🧹 Authentication cleared');
      }
    }
  }

  async confirmProductionMigration(targetVersion) {
    console.log('\n⚠️  PRODUCTION MIGRATION WARNING');
    console.log(`You are about to migrate production database to version ${targetVersion}`);
    console.log('This action cannot be undone easily and may cause downtime.');
    console.log('');
    console.log('To proceed, set the environment variable:');
    console.log('  CONFIRM_PRODUCTION_MIGRATION=true');
    console.log('');
    console.log('Or use --force flag if you understand the risks.');

    return process.env.CONFIRM_PRODUCTION_MIGRATION === 'true';
  }

  generateReport(targetVersion, results) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      version: targetVersion,
      environment: this.environment,
      timestamp: new Date(),
      dryRun: this.config.dryRun,
      success: failed.length === 0,
      summary: {
        totalMigrations: results.length,
        successfulMigrations: successful.length,
        failedMigrations: failed.length,
        totalFieldsAdded: successful.reduce((sum, r) => sum + (r.fieldsAdded || 0), 0)
      },
      migrations: results
    };
  }

  displayReport(report) {
    console.log('\n📊 Migration Report:');
    console.log(`Version: ${report.version}`);
    console.log(`Environment: ${report.environment}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Status: ${report.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Dry Run: ${report.dryRun ? 'Yes' : 'No'}`);
    console.log('');
    console.log('Summary:');
    console.log(`  Total migrations: ${report.summary.totalMigrations}`);
    console.log(`  Successful: ${report.summary.successfulMigrations}`);
    console.log(`  Failed: ${report.summary.failedMigrations}`);
    console.log(`  Fields added: ${report.summary.totalFieldsAdded}`);
  }
}

/**
 * Backup Manager Class
 */
class BackupManager {
  constructor(pb, backupPath) {
    this.pb = pb;
    this.backupPath = backupPath;
    this.backups = new Map();
  }

  async createAllBackups(schemas) {
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupPath, `backup-${timestamp}.json`);

    const backupData = {
      timestamp: new Date(),
      version: 'pre-migration',
      collections: Array.from(schemas.values())
    };

    // Save to file
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

    console.log(`📦 Backup saved to: ${backupFile}`);
    this.backupFile = backupFile;

    return backupFile;
  }

  async restoreAllBackups() {
    if (!this.backupFile || !fs.existsSync(this.backupFile)) {
      throw new Error('No backup file found for restoration');
    }

    const backupData = JSON.parse(fs.readFileSync(this.backupFile, 'utf8'));

    for (const collectionData of backupData.collections) {
      try {
        await this.pb.collections.update(collectionData.id, {
          name: collectionData.name,
          schema: collectionData.schema
        });
      } catch (error) {
        console.error(`Failed to restore collection ${collectionData.name}:`, error.message);
      }
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const targetVersion = args.find(arg => arg.startsWith('--version='))?.split('=')[1];
  const environment = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'development';

  if (!targetVersion) {
    console.error('Error: Please specify --version=X.X.X');
    process.exit(1);
  }

  console.log('🚀 PocketBase Migration Script');
  console.log(`Target Version: ${targetVersion}`);
  console.log(`Environment: ${environment}`);

  const migrator = new MigrationManager(environment, MIGRATION_CONFIG);

  try {
    const report = await migrator.run(targetVersion);
    process.exit(report?.success ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

/**
 * Run if executed directly
 */
if (require.main === module) {
  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
PocketBase Production Migration Script

Usage: node migration-script.js --version=X.X.X --env=environment [options]

Arguments:
  --version=X.X.X    Target migration version
  --env=env         Target environment (development, staging, production)
  --dry-run         Simulate migration without making changes
  --force           Force production migration without confirmation

Environment Variables:
  Development:
    DEV_POCKETBASE_URL
    DEV_POCKETBASE_ADMIN_EMAIL
    DEV_POCKETBASE_ADMIN_PASSWORD

  Staging:
    STAGING_POCKETBASE_URL
    STAGING_POCKETBASE_ADMIN_EMAIL
    STAGING_POCKETBASE_ADMIN_PASSWORD

  Production:
    PROD_POCKETBASE_URL
    PROD_POCKETBASE_ADMIN_EMAIL
    PROD_POCKETBASE_ADMIN_PASSWORD
    CONFIRM_PRODUCTION_MIGRATION=true

Examples:
  node migration-script.js --version=0.2.0 --env=development --dry-run
  node migration-script.js --version=0.2.0 --env=staging
  node migration-script.js --version=0.2.0 --env=production --force

Features:
  - Environment-specific configuration
  - Automatic backup and rollback
  - Comprehensive validation
  - Dry run mode for testing
  - Production safety checks
  - Detailed progress reporting
    `);
    process.exit(0);
  }

  main();
}

module.exports = {
  MigrationManager,
  BackupManager,
  MIGRATIONS,
  ENVIRONMENTS,
  MIGRATION_CONFIG
};