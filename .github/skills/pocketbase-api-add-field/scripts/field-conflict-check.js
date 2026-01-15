#!/usr/bin/env node

/**
 * PocketBase Field Conflict Detection Utility
 *
 * This utility detects potential field conflicts and naming collisions
 * when adding new fields to PocketBase collections.
 */

const PocketBase = require('pocketbase');

/**
 * Field Conflict Checker Class
 */
class FieldConflictChecker {
  constructor(pbUrl, adminCredentials) {
    this.pb = new PocketBase(pbUrl);
    this.adminCredentials = adminCredentials;
    this.reservedKeywords = [
      // PocketBase system fields
      'id', 'created', 'updated', 'collectionId', 'collectionName',
      // Common SQL reserved words
      'select', 'insert', 'update', 'delete', 'create', 'drop', 'alter',
      'table', 'index', 'primary', 'foreign', 'key', 'constraint',
      'null', 'not', 'default', 'unique', 'check', 'references',
      // JavaScript reserved words
      'var', 'let', 'const', 'function', 'class', 'return', 'if', 'else',
      'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'try', 'catch', 'finally', 'throw', 'new', 'this', 'typeof'
    ];
  }

  async authenticate() {
    await this.pb.admins.authWithPassword(
      this.adminCredentials.email,
      this.adminCredentials.password
    );
  }

  async getAllCollections() {
    const collections = await this.pb.collections.getFullList();
    const allFields = new Map();

    for (const collection of collections) {
      allFields.set(collection.name, {
        id: collection.id,
        name: collection.name,
        fields: collection.schema,
        fieldNames: collection.schema.map(field => field.name)
      });
    }

    return allFields;
  }

  checkReservedKeywords(fieldNames) {
    const conflicts = [];

    fieldNames.forEach(name => {
      if (this.reservedKeywords.includes(name.toLowerCase())) {
        conflicts.push({
          fieldName: name,
          type: 'reserved_keyword',
          severity: 'high',
          message: `${name} is a reserved keyword and may cause issues`
        });
      }
    });

    return conflicts;
  }

  checkNamingConventions(fieldNames) {
    const conflicts = [];

    fieldNames.forEach(name => {
      // Check for invalid characters
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
        conflicts.push({
          fieldName: name,
          type: 'invalid_format',
          severity: 'high',
          message: `${name} contains invalid characters (use letters, numbers, underscores only)`
        });
      }

      // Check length
      if (name.length > 50) {
        conflicts.push({
          fieldName: name,
          type: 'too_long',
          severity: 'medium',
          message: `${name} is too long (50 characters max)`
        });
      }

      // Check for consecutive underscores
      if (name.includes('__')) {
        conflicts.push({
          fieldName: name,
          type: 'double_underscore',
          severity: 'low',
          message: `${name} contains consecutive underscores (consider single underscore)`
        });
      }

      // Check for trailing underscore
      if (name.endsWith('_')) {
        conflicts.push({
          fieldName: name,
          type: 'trailing_underscore',
          severity: 'low',
          message: `${name} ends with underscore (may indicate poor naming)`
        });
      }

      // Check for all caps
      if (name === name.toUpperCase() && name.length > 1) {
        conflicts.push({
          fieldName: name,
          type: 'all_caps',
          severity: 'low',
          message: `${name} is all caps (consider snake_case)`
        });
      }
    });

    return conflicts;
  }

  checkFieldNamingPatterns(fieldNames, collectionName) {
    const conflicts = [];

    // Check for common anti-patterns
    const antiPatterns = [
      { pattern: /^(field|column|attr)_/, message: 'Redundant "field/column/attr" prefix' },
      { pattern: /_(field|column|attr)$/, message: 'Redundant "field/column/attr" suffix' },
      { pattern: /^temp_/, message: 'Temporary field (should be removed)' },
      { pattern: /^test_/, message: 'Test field (should not be in production)' },
      { pattern: /_test$/, message: 'Test field (should not be in production)' },
      { pattern: /^new_/, message: 'Temporary "new" prefix' },
      { pattern: /_new$/, message: 'Temporary "new" suffix' },
      { pattern: /^old_/, message: 'Deprecated "old" prefix' },
      { pattern: /_old$/, message: 'Deprecated "old" suffix' }
    ];

    fieldNames.forEach(name => {
      for (const { pattern, message } of antiPatterns) {
        if (pattern.test(name)) {
          conflicts.push({
            fieldName: name,
            type: 'naming_pattern',
            severity: 'medium',
            message: `${name}: ${message}`,
            suggestion: this.getSuggestion(name, pattern)
          });
        }
      }
    });

    return conflicts;
  }

  getSuggestion(name, pattern) {
    const suggestions = [
      { pattern: /^(field|column|attr)_/, replace: '' },
      { pattern: /_(field|column|attr)$/, replace: '' },
      { pattern: /^(temp|test|new|old)_/, replace: '' },
      { pattern: /_(temp|test|new|old)$/, replace: '' }
    ];

    for (const { pattern: p, replace } of suggestions) {
      if (p.toString() === pattern.toString()) {
        return name.replace(p, replace);
      }
    }

    return null;
  }

  checkDuplicateFieldNames(fieldNames) {
    const conflicts = [];
    const nameCounts = {};

    fieldNames.forEach(name => {
      nameCounts[name] = (nameCounts[name] || 0) + 1;
    });

    Object.entries(nameCounts).forEach(([name, count]) => {
      if (count > 1) {
        conflicts.push({
          fieldName: name,
          type: 'duplicate_name',
          severity: 'high',
          message: `${name} appears ${count} times (field names must be unique)`,
          count
        });
      }
    });

    return conflicts;
  }

  checkSimilarFieldNames(fieldNames, threshold = 0.8) {
    const conflicts = [];

    for (let i = 0; i < fieldNames.length; i++) {
      for (let j = i + 1; j < fieldNames.length; j++) {
        const name1 = fieldNames[i];
        const name2 = fieldNames[j];

        // Skip if they're the same name
        if (name1 === name2) continue;

        // Calculate similarity ratio
        const similarity = this.calculateSimilarity(name1, name2);

        if (similarity >= threshold) {
          conflicts.push({
            fieldNames: [name1, name2],
            type: 'similar_name',
            severity: 'medium',
            message: `${name1} and ${name2} are very similar (${(similarity * 100).toFixed(1)}%)`,
            similarity
          });
        }
      }
    }

    return conflicts;
  }

  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  async checkCollectionFieldConflicts(collectionName, newFields) {
    const collections = await this.getAllCollections();
    const collection = collections.get(collectionName);

    if (!collection) {
      throw new Error(`Collection "${collectionName}" not found`);
    }

    const existingFieldNames = collection.fieldNames;
    const newFieldNames = newFields.map(field => field.name);

    const conflicts = [];

    // Check conflicts with existing fields
    const directConflicts = newFieldNames.filter(name =>
      existingFieldNames.includes(name)
    );

    directConflicts.forEach(name => {
      conflicts.push({
        fieldName: name,
        type: 'existing_field_conflict',
        severity: 'high',
        message: `${name} already exists in collection "${collectionName}"`,
        existingType: collection.fields.find(f => f.name === name)?.type
      });
    });

    // Check new fields against each other
    const newFieldConflicts = this.checkDuplicateFieldNames(newFieldNames);
    conflicts.push(...newFieldConflicts);

    // Check reserved keywords in new fields
    const reservedConflicts = this.checkReservedKeywords(newFieldNames);
    conflicts.push(...reservedConflicts);

    // Check naming conventions
    const namingConflicts = this.checkNamingConventions(newFieldNames);
    conflicts.push(...namingConflicts);

    // Check naming patterns
    const patternConflicts = this.checkFieldNamingPatterns(newFieldNames, collectionName);
    conflicts.push(...patternConflicts);

    // Check similar names
    const similarConflicts = this.checkSimilarFieldNames([...existingFieldNames, ...newFieldNames]);
    conflicts.push(...similarConflicts.filter(c =>
      c.fieldNames.some(name => newFieldNames.includes(name))
    );

    return {
      collectionName,
      existingFieldCount: existingFieldNames.length,
      newFieldCount: newFieldNames.length,
      conflicts,
      severity: this.calculateOverallSeverity(conflicts)
    };
  }

  async checkGlobalFieldConflicts(allNewFields) {
    const collections = await this.getAllCollections();
    const conflicts = [];

    for (const [collectionName, collectionData] of collections) {
      const newFieldsForCollection = allNewFields.filter(f => f.collection === collectionName);

      if (newFieldsForCollection.length > 0) {
        const collectionConflicts = await this.checkCollectionFieldConflicts(
          collectionName,
          newFieldsForCollection
        );
        conflicts.push(collectionConflicts);
      }
    }

    return conflicts;
  }

  calculateOverallSeverity(conflicts) {
    if (conflicts.length === 0) return 'none';

    const severityCounts = {
      high: conflicts.filter(c => c.severity === 'high').length,
      medium: conflicts.filter(c => c.severity === 'medium').length,
      low: conflicts.filter(c => c.severity === 'low').length
    };

    if (severityCounts.high > 0) return 'high';
    if (severityCounts.medium > 2) return 'high';
    if (severityCounts.medium > 0) return 'medium';
    if (severityCounts.low > 5) return 'medium';
    return 'low';
  }

  displayConflictReport(report) {
    console.log(`\n📋 Field Conflict Report for "${report.collectionName}"`);
    console.log(`Existing fields: ${report.existingFieldCount}`);
    console.log(`New fields: ${report.newFieldCount}`);
    console.log(`Conflicts: ${report.conflicts.length}`);
    console.log(`Overall severity: ${report.severity.toUpperCase()}`);

    if (report.conflicts.length === 0) {
      console.log('\n✅ No conflicts detected!');
      return;
    }

    // Group conflicts by severity
    const grouped = {
      high: report.conflicts.filter(c => c.severity === 'high'),
      medium: report.conflicts.filter(c => c.severity === 'medium'),
      low: report.conflicts.filter(c => c.severity === 'low')
    };

    // Display high severity conflicts
    if (grouped.high.length > 0) {
      console.log('\n🚨 High Severity Conflicts:');
      grouped.high.forEach((conflict, index) => {
        console.log(`  ${index + 1}. ${conflict.message}`);
        if (conflict.existingType) {
          console.log(`     Existing field type: ${conflict.existingType}`);
        }
      });
    }

    // Display medium severity conflicts
    if (grouped.medium.length > 0) {
      console.log('\n⚠️  Medium Severity Issues:');
      grouped.medium.forEach((conflict, index) => {
        console.log(`  ${index + 1}. ${conflict.message}`);
        if (conflict.suggestion) {
          console.log(`     Suggestion: ${conflict.suggestion}`);
        }
      });
    }

    // Display low severity conflicts
    if (grouped.low.length > 0) {
      console.log('\n💡 Low Severity Suggestions:');
      grouped.low.forEach((conflict, index) => {
        console.log(`  ${index + 1}. ${conflict.message}`);
      });
    }

    // Display recommendations
    console.log('\n💡 Recommendations:');
    if (grouped.high.length > 0) {
      console.log('  - Fix high severity conflicts before proceeding');
    }
    if (grouped.medium.length > 0) {
      console.log('  - Consider addressing medium severity issues');
    }
    if (grouped.low.length > 3) {
      console.log('  - Review field naming conventions');
    }
  }
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('🔍 PocketBase Field Conflict Checker');
    console.log('\nUsage:');
    console.log('  node field-conflict-check.js <collection-name> <field-file.json>');
    console.log('\nArguments:');
    console.log('  collection-name    Name of the collection to check');
    console.log('  field-file.json    JSON file with new field definitions');
    console.log('\nExample field file:');
    console.log('[');
    console.log('  { "name": "new_field", "type": "text" },');
    console.log('  { "name": "another_field", "type": "number" }');
    console.log(']');
    console.log('\nEnvironment Variables:');
    console.log('  POCKETBASE_URL           PocketBase server URL');
    console.log('  POCKETBASE_ADMIN_EMAIL   Admin email address');
    console.log('  POCKETBASE_ADMIN_PASSWORD Admin password');
    process.exit(0);
  }

  const collectionName = args[0];
  const fieldFile = args[1];

  if (!collectionName || !fieldFile) {
    console.error('❌ Both collection name and field file are required');
    process.exit(1);
  }

  const pocketbaseUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
  const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || 'your-admin-password';

  // Load field definitions
  let newFields;
  try {
    const fieldData = require('fs').readFileSync(fieldFile, 'utf8');
    newFields = JSON.parse(fieldData);
  } catch (error) {
    console.error('❌ Failed to load field definitions:', error.message);
    process.exit(1);
  }

  const checker = new FieldConflictChecker(pocketbaseUrl, {
    email: adminEmail,
    password: adminPassword
  });

  try {
    await checker.authenticate();

    const report = await checker.checkCollectionFieldConflicts(collectionName, newFields);
    checker.displayConflictReport(report);

    // Exit with error code based on severity
    const exitCode = report.severity === 'high' ? 1 : 0;
    process.exit(exitCode);

  } catch (error) {
    console.error('❌ Conflict check failed:', error.message);
    process.exit(1);

  } finally {
    checker.pb.authStore.clear();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  FieldConflictChecker
};