#!/usr/bin/env node

/**
 * PocketBase Schema Validation Utility
 *
 * This utility validates PocketBase collection schemas for common issues,
 * field conflicts, and configuration errors.
 */

const PocketBase = require('pocketbase');

// Validation rules
const VALID_FIELD_TYPES = [
  'text', 'number', 'email', 'url', 'select', 'date', 'datetime',
  'bool', 'file', 'json', 'relation'
];

const FIELD_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;

// Maximum field name length
const MAX_FIELD_NAME_LENGTH = 50;

/**
 * Schema Validator Class
 */
class SchemaValidator {
  constructor(pbUrl, adminCredentials) {
    this.pb = new PocketBase(pbUrl);
    this.adminCredentials = adminCredentials;
  }

  async authenticate() {
    await this.pb.admins.authWithPassword(
      this.adminCredentials.email,
      this.adminCredentials.password
    );
  }

  validateFieldName(name, index) {
    const errors = [];

    // Check required
    if (!name) {
      errors.push(`Field at index ${index}: name is required`);
      return errors;
    }

    // Check length
    if (name.length > MAX_FIELD_NAME_LENGTH) {
      errors.push(`Field "${name}": name exceeds ${MAX_FIELD_NAME_LENGTH} characters`);
    }

    // Check format
    if (!FIELD_NAME_REGEX.test(name)) {
      errors.push(`Field "${name}": invalid format (must start with letter, contain only letters, numbers, and underscores)`);
    }

    // Check for reserved keywords
    const reservedKeywords = ['id', 'created', 'updated', 'collectionId', 'collectionName'];
    if (reservedKeywords.includes(name)) {
      errors.push(`Field "${name}": reserved keyword (use different name)`);
    }

    return errors;
  }

  validateFieldType(type, fieldName) {
    const errors = [];

    if (!type) {
      errors.push(`Field "${fieldName}": type is required`);
      return errors;
    }

    if (!VALID_FIELD_TYPES.includes(type)) {
      errors.push(`Field "${fieldName}": invalid type "${type}" (valid: ${VALID_FIELD_TYPES.join(', ')})`);
    }

    return errors;
  }

  validateSelectField(field) {
    const errors = [];

    if (field.type === 'select') {
      if (!field.options || !field.options.values) {
        errors.push(`Select field "${field.name}": missing values in options`);
        return errors;
      }

      if (!Array.isArray(field.options.values) || field.options.values.length === 0) {
        errors.push(`Select field "${field.name}": values must be non-empty array`);
      } else {
        // Check for empty strings
        const emptyValues = field.options.values.filter(v => !v || typeof v !== 'string');
        if (emptyValues.length > 0) {
          errors.push(`Select field "${field.name}": values must be non-empty strings`);
        }

        // Check for duplicates
        const uniqueValues = [...new Set(field.options.values)];
        if (uniqueValues.length !== field.options.values.length) {
          errors.push(`Select field "${field.name}": duplicate values found`);
        }
      }

      // Check maxSelect
      if (field.options.maxSelect !== undefined) {
        if (typeof field.options.maxSelect !== 'number' || field.options.maxSelect < 1) {
          errors.push(`Select field "${field.name}": maxSelect must be positive number`);
        } else if (field.options.maxSelect > field.options.values.length) {
          errors.push(`Select field "${field.name}": maxSelect cannot exceed number of values`);
        }
      }
    }

    return errors;
  }

  validateTextField(field) {
    const errors = [];

    if (field.type === 'text' && field.options) {
      if (field.options.min !== undefined) {
        if (typeof field.options.min !== 'number' || field.options.min < 0) {
          errors.push(`Text field "${field.name}": min must be non-negative number`);
        }
      }

      if (field.options.max !== undefined) {
        if (typeof field.options.max !== 'number' || field.options.max <= 0) {
          errors.push(`Text field "${field.name}": max must be positive number`);
        }
      }

      if (field.options.min !== undefined && field.options.max !== undefined) {
        if (field.options.min >= field.options.max) {
          errors.push(`Text field "${field.name}": min must be less than max`);
        }
      }

      if (field.options.pattern !== undefined) {
        try {
          new RegExp(field.options.pattern);
        } catch (regexError) {
          errors.push(`Text field "${field.name}": invalid regex pattern`);
        }
      }
    }

    return errors;
  }

  validateNumberField(field) {
    const errors = [];

    if (field.type === 'number' && field.options) {
      if (field.options.min !== undefined && typeof field.options.min !== 'number') {
        errors.push(`Number field "${field.name}": min must be a number`);
      }

      if (field.options.max !== undefined && typeof field.options.max !== 'number') {
        errors.push(`Number field "${field.name}": max must be a number`);
      }

      if (field.options.min !== undefined && field.options.max !== undefined) {
        if (field.options.min >= field.options.max) {
          errors.push(`Number field "${field.name}": min must be less than max`);
        }
      }
    }

    return errors;
  }

  validateFileField(field) {
    const errors = [];

    if (field.type === 'file' && field.options) {
      if (field.options.maxSelect !== undefined) {
        if (typeof field.options.maxSelect !== 'number' || field.options.maxSelect < 1) {
          errors.push(`File field "${field.name}": maxSelect must be positive number`);
        }
      }

      if (field.options.maxSize !== undefined) {
        if (typeof field.options.maxSize !== 'number' || field.options.maxSize <= 0) {
          errors.push(`File field "${field.name}": maxSize must be positive number`);
        }
      }

      if (field.options.mimeTypes && Array.isArray(field.options.mimeTypes)) {
        const invalidMimeTypes = field.options.mimeTypes.filter(mime => {
          return typeof mime !== 'string' || !mime.includes('/');
        });

        if (invalidMimeTypes.length > 0) {
          errors.push(`File field "${field.name}": invalid mimeTypes found`);
        }
      }

      if (field.options.thumbs && Array.isArray(field.options.thumbs)) {
        const invalidThumbs = field.options.thumbs.filter(thumb => {
          return typeof thumb !== 'string' || !/^\d+x\d+$/.test(thumb);
        });

        if (invalidThumbs.length > 0) {
          errors.push(`File field "${field.name}": invalid thumb formats (use "WIDTHxHEIGHT" format)`);
        }
      }
    }

    return errors;
  }

  validateRelationField(field) {
    const errors = [];

    if (field.type === 'relation' && field.options) {
      if (!field.options.collectionId) {
        errors.push(`Relation field "${field.name}": collectionId is required`);
      }

      if (typeof field.options.collectionId !== 'string') {
        errors.push(`Relation field "${field.name}": collectionId must be a string`);
      }

      if (field.options.maxSelect !== undefined) {
        if (typeof field.options.maxSelect !== 'number' || field.options.maxSelect < 1) {
          errors.push(`Relation field "${field.name}": maxSelect must be positive number`);
        }
      }
    }

    return errors;
  }

  validateField(field, index) {
    const errors = [];

    // Validate name
    errors.push(...this.validateFieldName(field.name, index));

    // Validate type
    errors.push(...this.validateFieldType(field.type, field.name));

    // Type-specific validations
    errors.push(...this.validateSelectField(field));
    errors.push(...this.validateTextField(field));
    errors.push(...this.validateNumberField(field));
    errors.push(...this.validateFileField(field));
    errors.push(...this.validateRelationField(field));

    return errors;
  }

  validateSchema(schema, collectionName) {
    const errors = [];
    const fieldNames = [];

    // Check if schema is array
    if (!Array.isArray(schema)) {
      errors.push(`${collectionName}: schema must be an array`);
      return errors;
    }

    // Validate each field
    schema.forEach((field, index) => {
      const fieldErrors = this.validateField(field, index);
      errors.push(...fieldErrors.map(error => `${collectionName}: ${error}`));

      if (field.name) {
        fieldNames.push(field.name);
      }
    });

    // Check for duplicate field names
    const uniqueFieldNames = [...new Set(fieldNames)];
    if (uniqueFieldNames.length !== fieldNames.length) {
      const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
      duplicates.forEach(name => {
        errors.push(`${collectionName}: duplicate field name "${name}"`);
      });
    }

    return errors;
  }

  async validateAllCollections() {
    const errors = [];
    const collections = await this.pb.collections.getFullList();

    console.log(`\n📋 Validating ${collections.length} collections...`);

    for (const collection of collections) {
      console.log(`  Validating: ${collection.name}`);
      const collectionErrors = this.validateSchema(collection.schema, collection.name);
      errors.push(...collectionErrors);
    }

    return { collections, errors };
  }

  async validateCollection(collectionNameOrId) {
    const collection = await this.pb.collections.getOne(collectionNameOrId);
    const errors = this.validateSchema(collection.schema, collection.name);

    return { collection, errors };
  }

  async validateNewFields(collectionNameOrId, newFields) {
    const collection = await this.pb.collections.getOne(collectionNameOrId);
    const existingFieldNames = collection.schema.map(field => field.name);
    const errors = [];

    console.log(`\n🔍 Validating ${newFields.length} new fields for collection "${collection.name}"...`);

    // Check for conflicts with existing fields
    const conflicts = newFields.filter(field =>
      existingFieldNames.includes(field.name)
    );

    if (conflicts.length > 0) {
      errors.push(`Field name conflicts: ${conflicts.map(f => f.name).join(', ')}`);
    }

    // Check for conflicts within new fields
    const newFieldNames = newFields.map(field => field.name);
    const newFieldConflicts = newFieldNames.filter((name, index) =>
      newFieldNames.indexOf(name) !== index
    );

    if (newFieldConflicts.length > 0) {
      errors.push(`New field conflicts: ${newFieldConflicts.join(', ')}`);
    }

    // Validate each new field
    newFields.forEach((field, index) => {
      const fieldErrors = this.validateField(field, index);
      errors.push(...fieldErrors.map(error => `New field: ${error}`));
    });

    return { collection, errors };
  }

  displayValidationResults(results) {
    const { collections, errors } = results;

    console.log('\n📊 Validation Results:');
    console.log(`  Collections checked: ${collections.length}`);
    console.log(`  Errors found: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Validation Errors:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });

      console.log('\n💡 Recommendations:');
      if (errors.some(e => e.includes('duplicate field name'))) {
        console.log('  - Use unique field names across collections');
      }
      if (errors.some(e => e.includes('invalid format'))) {
        console.log('  - Field names must start with a letter and contain only letters, numbers, and underscores');
      }
      if (errors.some(e => e.includes('invalid type'))) {
        console.log(`  - Use valid field types: ${VALID_FIELD_TYPES.join(', ')}`);
      }
      if (errors.some(e => e.includes('missing values'))) {
        console.log('  - Select fields must have non-empty values array in options');
      }
    } else {
      console.log('\n✅ All collections passed validation!');
    }
  }
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);
  const collectionName = args.find(arg => !arg.startsWith('--'));

  if (!collectionName && args.length === 0) {
    console.log('📋 PocketBase Schema Validator');
    console.log('\nUsage:');
    console.log('  node validate-schema.js [collection-name] [options]');
    console.log('\nOptions:');
    console.log('  --help, -h          Show this help');
    console.log('  --validate-new file  Validate new fields from JSON file');
    console.log('\nEnvironment Variables:');
    console.log('  POCKETBASE_URL           PocketBase server URL');
    console.log('  POCKETBASE_ADMIN_EMAIL   Admin email address');
    console.log('  POCKETBASE_ADMIN_PASSWORD Admin password');
    process.exit(0);
  }

  const pocketbaseUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
  const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || 'your-admin-password';

  const validator = new SchemaValidator(pocketbaseUrl, {
    email: adminEmail,
    password: adminPassword
  });

  try {
    await validator.authenticate();

    let results;

    if (collectionName) {
      results = await validator.validateCollection(collectionName);
    } else {
      results = await validator.validateAllCollections();
    }

    validator.displayValidationResults(results);

    process.exit(results.errors.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);

  } finally {
    validator.pb.authStore.clear();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  SchemaValidator,
  VALID_FIELD_TYPES,
  FIELD_NAME_REGEX,
  MAX_FIELD_NAME_LENGTH
};