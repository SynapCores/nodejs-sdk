/**
 * Example: API Key Authentication with SynapCores TypeScript SDK
 * 
 * This example demonstrates how to authenticate using API keys with the SynapCores SDK.
 * API keys provide a secure way to authenticate programmatic access to your AIDB instance.
 */

import { SynapCores } from '@synapcores/sdk';

async function main() {
  // Get API key from environment variable (recommended for production)
  // API keys can start with 'ak_' (ak_prod_...) or 'aidb_' (legacy format)
  // You can set this with: export AIDB_API_KEY="ak_prod_your_key_here"
  const apiKey = process.env.AIDB_API_KEY || 'ak_prod_demo_key_12345'; // Replace with your actual key

  if (!process.env.AIDB_API_KEY) {
    console.log('Warning: AIDB_API_KEY environment variable not set');
    console.log('Using demo API key for testing (replace with your actual key)');
  }

  try {
    // Initialize client with API key authentication
    const client = new SynapCores({
      host: 'localhost',
      port: 8080,
      apiKey: apiKey,
      useHttps: false, // Set to true in production
    });

    console.log('✅ Successfully connected to AIDB with API key');

    // Test the connection by listing collections
    const collections = await client.listCollections();
    console.log('📚 Available collections:', collections);

    // Execute a simple query using the new executeQuery method
    const result = await client.executeQuery({
      sql: 'SELECT 1 as test, NOW() as current_time',
      parameters: [],
    });
    console.log('🔍 Query columns:', result.columns.map(c => c.name));
    console.log('🔍 Query rows:', result.rows);

    // Test permissions by trying to create a collection
    // This will fail if the API key has ReadOnly permission
    try {
      const testCollection = await client.createCollectionWithSchema({
        name: 'test_api_key_collection',
        description: 'Test collection for API key validation',
        schema: {
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'data', type: 'string', required: true },
          ],
        },
      });
      console.log('✅ API key has write permissions - collection created');

      // Clean up
      await client.deleteCollection('test_api_key_collection');
    } catch (error: any) {
      if (error.code === 'FORBIDDEN' || error.message.includes('permission') || error.name === 'AuthenticationError') {
        console.log('ℹ️ API key has read-only permissions:', error.message);
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    if (error.code === 'AUTH_ERROR' || error.code === 'AUTH_FAILED' || error.name === 'AuthenticationError') {
      console.error('❌ Authentication failed:', error.message);
      console.log('Please check that:');
      console.log("1. Your API key is valid and starts with 'ak_' or 'aidb_'");
      console.log('2. The API key has not expired');
      console.log('3. The API key is active (not revoked)');
    } else {
      console.error('❌ Error:', error.message);
      console.log('Please check that AIDB is running on localhost:8080');
    }
  }
}

// Run the example
main().catch(console.error);