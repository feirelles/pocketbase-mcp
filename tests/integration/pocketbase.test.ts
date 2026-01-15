#!/usr/bin/env node
/**
 * Integration test script for PocketBase MCP Server
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'feirelles@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Hempfelipe1!';

async function runTests() {
  console.log('🧪 PocketBase MCP Server Integration Tests\n');
  console.log(`📡 PocketBase URL: ${POCKETBASE_URL}\n`);
  
  const pb = new PocketBase(POCKETBASE_URL);
  let passed = 0;
  let failed = 0;
  
  // Test 1: Health check
  try {
    const health = await pb.health.check();
    console.log('✅ Test 1: Health check - PASS');
    passed++;
  } catch (e) {
    console.log('❌ Test 1: Health check - FAIL:', e.message);
    failed++;
  }
  
  // Test 2: Admin authentication (v0.21+ uses _superusers)
  try {
    const auth = await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log(`✅ Test 2: Admin auth - PASS (id: ${auth.record.id})`);
    passed++;
  } catch (e) {
    console.log('❌ Test 2: Admin auth - FAIL:', e.message);
    failed++;
    console.log('\n⚠️  Cannot continue without admin auth\n');
    process.exit(1);
  }
  
  // Test 3: List collections
  try {
    const collections = await pb.collections.getList(1, 10);
    console.log(`✅ Test 3: List collections - PASS (${collections.totalItems} collections)`);
    passed++;
  } catch (e) {
    console.log('❌ Test 3: List collections - FAIL:', e.message);
    failed++;
  }
  
  // Test 4: Create a test collection
  const testCollectionName = `test_mcp_${Date.now()}`;
  try {
    const collection = await pb.collections.create({
      name: testCollectionName,
      type: 'base',
      // PocketBase v0.21+ uses 'fields' instead of 'schema'
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'text' },
        { name: 'active', type: 'bool' },
      ],
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
    });
    console.log(`✅ Test 4: Create collection - PASS (${testCollectionName})`);
    passed++;
    
    // Test 5: Get collection schema
    try {
      const schema = await pb.collections.getOne(testCollectionName);
      // v0.21+ uses 'fields' instead of 'schema'
      const fieldCount = schema.fields?.length ?? schema.schema?.length ?? 0;
      console.log(`✅ Test 5: Get collection schema - PASS (${fieldCount} fields)`);
      passed++;
    } catch (e) {
      console.log('❌ Test 5: Get collection schema - FAIL:', e.message);
      failed++;
    }
    
    // Test 6: Create a record
    try {
      const record = await pb.collection(testCollectionName).create({
        title: 'Test Record',
        content: 'This is a test record created by MCP integration test',
        active: true,
      });
      console.log(`✅ Test 6: Create record - PASS (id: ${record.id})`);
      passed++;
      
      // Test 7: Get record
      try {
        const fetched = await pb.collection(testCollectionName).getOne(record.id);
        console.log(`✅ Test 7: Get record - PASS (title: ${fetched.title})`);
        passed++;
      } catch (e) {
        console.log('❌ Test 7: Get record - FAIL:', e.message);
        failed++;
      }
      
      // Test 8: Update record
      try {
        const updated = await pb.collection(testCollectionName).update(record.id, {
          title: 'Updated Test Record',
          active: false,
        });
        console.log(`✅ Test 8: Update record - PASS (title: ${updated.title})`);
        passed++;
      } catch (e) {
        console.log('❌ Test 8: Update record - FAIL:', e.message);
        failed++;
      }
      
      // Test 9: List records with filter
      try {
        const list = await pb.collection(testCollectionName).getList(1, 10, {
          filter: 'active = false',
        });
        console.log(`✅ Test 9: List records with filter - PASS (${list.totalItems} records)`);
        passed++;
      } catch (e) {
        console.log('❌ Test 9: List records with filter - FAIL:', e.message);
        failed++;
      }
      
      // Test 10: Delete record
      try {
        await pb.collection(testCollectionName).delete(record.id);
        console.log(`✅ Test 10: Delete record - PASS`);
        passed++;
      } catch (e) {
        console.log('❌ Test 10: Delete record - FAIL:', e.message);
        failed++;
      }
      
    } catch (e) {
      console.log('❌ Test 6: Create record - FAIL:', e.message);
      failed++;
    }
    
    // Test 11: Delete collection (cleanup)
    try {
      await pb.collections.delete(collection.id);
      console.log(`✅ Test 11: Delete collection - PASS`);
      passed++;
    } catch (e) {
      console.log('❌ Test 11: Delete collection - FAIL:', e.message);
      failed++;
    }
    
  } catch (e) {
    console.log('❌ Test 4: Create collection - FAIL:', e.message);
    failed++;
  }
  
  // Test 12: Logout
  try {
    pb.authStore.clear();
    const isValid = pb.authStore.isValid;
    if (!isValid) {
      console.log('✅ Test 12: Logout - PASS');
      passed++;
    } else {
      console.log('❌ Test 12: Logout - FAIL: Auth still valid');
      failed++;
    }
  } catch (e) {
    console.log('❌ Test 12: Logout - FAIL:', e.message);
    failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
