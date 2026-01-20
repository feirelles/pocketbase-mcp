import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

// Auth
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || 'admin123456';

try {
  await pb.admins.authWithPassword(adminEmail, adminPassword);
  console.log('✓ Authenticated');
  
  const collection = await pb.collections.getOne('contacts');
  console.log('\n=== Collection Object ===');
  console.log(JSON.stringify(collection, null, 2));
  
  console.log('\n=== Schema/Fields ===');
  console.log('schema:', collection.schema);
  console.log('fields:', collection.fields);
  
} catch (error) {
  console.error('Error:', error);
}
