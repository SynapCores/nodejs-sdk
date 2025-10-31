/**
 * Complete SQL and Vector Operations Demo for SynapCores Node.js SDK
 *
 * This example demonstrates all the newly implemented features:
 * 1. Complete SQL support (table management, transactions, indexes, batch operations)
 * 2. Advanced SQL features (CTEs, window functions, JSON operations, prepared statements)
 * 3. Vector operations (arithmetic, similarity, search)
 *
 * Prerequisites:
 * - AIDB server running on localhost:8080
 * - Valid API key with necessary permissions
 */

import { SynapCores } from '../src/client';
import {
  ColumnDefinition,
  CreateTableOptions,
  AlterTableOptions,
  IndexDefinition,
  TransactionOptions,
  BatchInsertOptions,
  CTEDefinition,
  WindowFunctionOptions,
  KNNSearchOptions,
  HybridSearchOptions,
} from '../src/types/client';

async function demonstrateCompleteSDK() {
  // Initialize the client
  const client = new SynapCores({
    host: 'localhost',
    port: 8080,
    apiKey: 'aidb_your_api_key_here', // Replace with your actual API key
    useHttps: false,
    timeout: 30000,
  });

  console.log('🚀 Starting Complete SynapCores SDK Demo\n');

  try {
    // =================================================================
    // TABLE MANAGEMENT OPERATIONS
    // =================================================================
    console.log('📊 TABLE MANAGEMENT OPERATIONS');
    console.log('===============================');

    // Define columns for our demo tables
    const userColumns: ColumnDefinition[] = [
      {
        name: 'id',
        dataType: 'INTEGER',
        constraints: [{ type: 'PRIMARY_KEY' }]
      },
      {
        name: 'username',
        dataType: 'VARCHAR(50)',
        constraints: [{ type: 'UNIQUE' }, { type: 'NOT_NULL' }]
      },
      {
        name: 'email',
        dataType: 'VARCHAR(255)',
        constraints: [{ type: 'NOT_NULL' }]
      },
      {
        name: 'profile_data',
        dataType: 'JSONB'
      },
      {
        name: 'embedding',
        dataType: 'VECTOR(1536)'
      },
      {
        name: 'created_at',
        dataType: 'TIMESTAMP',
        defaultValue: 'CURRENT_TIMESTAMP'
      }
    ];

    const tableOptions: CreateTableOptions = {
      ifNotExists: true,
      constraints: [
        {
          type: 'CHECK',
          columns: ['email'],
          expression: "email LIKE '%@%.%'"
        }
      ]
    };

    // Create users table
    console.log('Creating users table...');
    await client.createTable('users', userColumns, tableOptions);
    console.log('✅ Users table created');

    // Create products table for e-commerce demo
    const productColumns: ColumnDefinition[] = [
      {
        name: 'id',
        dataType: 'INTEGER',
        constraints: [{ type: 'PRIMARY_KEY' }]
      },
      {
        name: 'name',
        dataType: 'TEXT',
        constraints: [{ type: 'NOT_NULL' }]
      },
      {
        name: 'description',
        dataType: 'TEXT'
      },
      {
        name: 'price',
        dataType: 'DECIMAL(10,2)',
        constraints: [{ type: 'CHECK', expression: 'price > 0' }]
      },
      {
        name: 'category_id',
        dataType: 'INTEGER'
      },
      {
        name: 'embedding',
        dataType: 'VECTOR(1536)'
      },
      {
        name: 'metadata',
        dataType: 'JSONB'
      }
    ];

    console.log('Creating products table...');
    await client.createTable('products', productColumns, { ifNotExists: true });
    console.log('✅ Products table created');

    // Show all tables
    console.log('📋 Listing all tables:');
    const tables = await client.showTables();
    console.log(tables);

    // Describe table structure
    console.log('📖 Describing users table:');
    const tableInfo = await client.describeTable('users');
    console.log(JSON.stringify(tableInfo, null, 2));

    // =================================================================
    // INDEX MANAGEMENT
    // =================================================================
    console.log('\n🔍 INDEX MANAGEMENT');
    console.log('==================');

    // Create indexes for better performance
    const emailIndex: IndexDefinition = {
      name: 'idx_users_email',
      tableName: 'users',
      columns: [{ name: 'email', order: 'ASC' }],
      unique: true,
      ifNotExists: true
    };

    console.log('Creating email index...');
    await client.createIndex(emailIndex);
    console.log('✅ Email index created');

    // Create composite index
    const userProfileIndex: IndexDefinition = {
      name: 'idx_users_profile',
      tableName: 'users',
      columns: [
        { name: 'username', order: 'ASC' },
        { name: 'created_at', order: 'DESC' }
      ],
      ifNotExists: true
    };

    console.log('Creating composite index...');
    await client.createIndex(userProfileIndex);
    console.log('✅ Composite index created');

    // Show all indexes
    console.log('📋 Listing all indexes:');
    const indexes = await client.showIndexes();
    console.log(indexes);

    // =================================================================
    // TRANSACTION SUPPORT
    // =================================================================
    console.log('\n💳 TRANSACTION SUPPORT');
    console.log('=====================');

    const transactionOptions: TransactionOptions = {
      isolationLevel: 'READ_COMMITTED',
      readOnly: false,
      timeout: 10000
    };

    console.log('Beginning transaction...');
    const transaction = await client.beginTransaction(transactionOptions);
    console.log(`✅ Transaction started: ${transaction.id}`);

    try {
      // Insert some test data within transaction
      await client.sql(`
        INSERT INTO users (id, username, email, profile_data) VALUES
        (1, 'alice', 'alice@example.com', '{"role": "admin", "preferences": {"theme": "dark"}}'),
        (2, 'bob', 'bob@example.com', '{"role": "user", "preferences": {"theme": "light"}}')
      `);

      console.log('✅ Test data inserted');

      // Commit transaction
      await client.commitTransaction();
      console.log('✅ Transaction committed');
    } catch (error) {
      console.log('❌ Error in transaction, rolling back...');
      await client.rollbackTransaction();
      throw error;
    }

    // =================================================================
    // BATCH OPERATIONS
    // =================================================================
    console.log('\n📦 BATCH OPERATIONS');
    console.log('==================');

    // Generate sample embeddings
    const sampleEmbedding1 = Array.from({ length: 1536 }, () => Math.random());
    const sampleEmbedding2 = Array.from({ length: 1536 }, () => Math.random());

    // Batch insert products
    const batchInsertOptions: BatchInsertOptions = {
      tableName: 'products',
      columns: ['id', 'name', 'description', 'price', 'category_id', 'embedding', 'metadata'],
      rows: [
        {
          id: 1,
          name: 'Laptop Pro',
          description: 'High-performance laptop for professionals',
          price: 1999.99,
          category_id: 1,
          embedding: sampleEmbedding1,
          metadata: { brand: 'TechCorp', warranty: '2 years' }
        },
        {
          id: 2,
          name: 'Wireless Mouse',
          description: 'Ergonomic wireless mouse with precision tracking',
          price: 49.99,
          category_id: 2,
          embedding: sampleEmbedding2,
          metadata: { brand: 'AccessoryPlus', warranty: '1 year' }
        }
      ],
      onConflict: 'REPLACE',
      batchSize: 1000
    };

    console.log('Performing batch insert...');
    const batchResult = await client.batchInsert(batchInsertOptions);
    console.log(`✅ Batch insert completed: ${batchResult.successful}/${batchResult.totalProcessed} successful`);

    // =================================================================
    // ADVANCED SQL FEATURES
    // =================================================================
    console.log('\n⚡ ADVANCED SQL FEATURES');
    console.log('=======================');

    // Prepared Statements
    console.log('📝 Prepared Statements:');
    const preparedStmt = await client.prepareStatement(
      'SELECT * FROM users WHERE username = $1 AND email LIKE $2',
      { name: 'find_user_by_username_email' }
    );
    console.log(`✅ Prepared statement created: ${preparedStmt.id}`);

    const preparedResult = await client.executePrepared(preparedStmt.id, ['alice', '%@example.com']);
    console.log(`📊 Prepared query result: ${preparedResult.rowCount} rows`);

    // Common Table Expressions (CTEs)
    console.log('🔗 Common Table Expressions:');
    const ctes: CTEDefinition[] = [
      {
        name: 'user_stats',
        query: `
          SELECT
            COUNT(*) as total_users,
            COUNT(CASE WHEN profile_data->>'role' = 'admin' THEN 1 END) as admin_users
          FROM users
        `
      },
      {
        name: 'product_stats',
        query: `
          SELECT
            COUNT(*) as total_products,
            AVG(price) as avg_price
          FROM products
        `
      }
    ];

    const cteResult = await client.queryWithCTEs(
      ctes,
      'SELECT * FROM user_stats CROSS JOIN product_stats'
    );
    console.log('📊 CTE query result:', cteResult.rows);

    // JSON Operations
    console.log('📄 JSON Operations:');
    const jsonResult = await client.jsonQuery(
      'users',
      'profile_data',
      'extract',
      'role'
    );
    console.log('📊 JSON extraction result:', jsonResult.rows);

    // Update JSON data
    await client.jsonQuery(
      'users',
      'profile_data',
      'update',
      'last_login',
      new Date().toISOString(),
      "username = 'alice'"
    );
    console.log('✅ JSON data updated');

    // =================================================================
    // VECTOR OPERATIONS
    // =================================================================
    console.log('\n🧮 VECTOR OPERATIONS');
    console.log('===================');

    // Vector Arithmetic
    console.log('➕ Vector Arithmetic:');
    const vector1 = [1.0, 2.0, 3.0, 4.0];
    const vector2 = [0.5, 1.5, 2.5, 3.5];

    const addResult = await client.vectorAdd(vector1, vector2);
    console.log(`✅ Vector addition result: [${addResult.result.values.slice(0, 4).join(', ')}...]`);

    const dotProduct = await client.vectorDotProduct(vector1, vector2);
    console.log(`✅ Dot product: ${dotProduct.dotProduct}`);

    const magnitude = await client.vectorMagnitude(vector1);
    console.log(`✅ Vector magnitude: ${magnitude.magnitude}`);

    // Vector Similarity
    console.log('📐 Vector Similarity:');
    const cosineResult = await client.cosineSimilarity(vector1, vector2);
    console.log(`✅ Cosine similarity: ${cosineResult.similarity}`);

    const l2Result = await client.l2Distance(vector1, vector2);
    console.log(`✅ L2 distance: ${l2Result.distance}`);

    // Vector Search
    console.log('🔍 Vector Search:');

    // Generate embeddings for our demo data
    const queryEmbedding = await client.embed('laptop computer technology');
    console.log('✅ Generated query embedding');

    // Update products with actual embeddings
    await client.sql(`
      UPDATE products SET embedding = $1 WHERE id = 1
    `, { 1: Array.isArray(queryEmbedding) ? queryEmbedding[0] : queryEmbedding });

    await client.sql(`
      UPDATE products SET embedding = $1 WHERE id = 2
    `, { 1: Array.isArray(queryEmbedding) ? queryEmbedding[0] : queryEmbedding });

    // K-Nearest Neighbors Search
    const knnOptions: KNNSearchOptions = {
      queryVector: Array.isArray(queryEmbedding) ? queryEmbedding[0] : queryEmbedding,
      k: 5,
      tableName: 'products',
      vectorColumn: 'embedding',
      metadataColumns: ['id', 'name', 'price'],
      filter: { price: { '$lte': 2000 } }
    };

    console.log('🎯 Performing KNN search...');
    const knnResults = await client.knnSearch(knnOptions);
    console.log(`✅ KNN search found ${knnResults.length} results`);
    knnResults.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.metadata?.name} (similarity: ${result.similarity.toFixed(4)})`);
    });

    // Hybrid Search (Vector + SQL)
    const hybridOptions: HybridSearchOptions = {
      vector: Array.isArray(queryEmbedding) ? queryEmbedding[0] : queryEmbedding,
      textQuery: 'laptop',
      sqlFilter: 'price > 100',
      k: 3,
      threshold: 0.7,
      metric: 'cosine',
      weights: { vector: 0.7, text: 0.3 }
    };

    console.log('🔗 Performing hybrid search...');
    const hybridResults = await client.hybridSearch(hybridOptions);
    console.log(`✅ Hybrid search found ${hybridResults.length} results`);

    // =================================================================
    // ADVANCED QUERIES AND ANALYTICS
    // =================================================================
    console.log('\n📈 ADVANCED ANALYTICS');
    console.log('====================');

    // Window Functions
    console.log('🪟 Window Functions:');
    const windowFunctions = [
      {
        alias: 'price_rank',
        function: 'ROW_NUMBER()',
        options: {
          orderBy: [{ column: 'price', direction: 'DESC' as const }]
        }
      },
      {
        alias: 'running_total',
        function: 'SUM(price)',
        options: {
          orderBy: [{ column: 'id', direction: 'ASC' as const }],
          frame: { type: 'ROWS' as const, start: 'UNBOUNDED PRECEDING' }
        }
      }
    ];

    const windowResult = await client.queryWithWindowFunctions(
      'SELECT id, name, price FROM products',
      windowFunctions
    );
    console.log('📊 Window function results:', windowResult.rows);

    // Complex analytics query
    console.log('📊 Complex Analytics:');
    const analyticsResult = await client.sql(`
      SELECT
        COUNT(*) as total_products,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        STDDEV(price) as price_stddev
      FROM products
    `);
    console.log('📈 Product analytics:', analyticsResult.rows[0]);

    // =================================================================
    // CLEANUP
    // =================================================================
    console.log('\n🧹 CLEANUP');
    console.log('=========');

    // Deallocate prepared statements
    await client.deallocatePrepared('find_user_by_username_email');
    console.log('✅ Prepared statements deallocated');

    // Drop indexes
    await client.dropIndex('idx_users_email', { ifExists: true });
    await client.dropIndex('idx_users_profile', { ifExists: true });
    console.log('✅ Indexes dropped');

    // Drop tables (commented out to preserve data)
    // await client.dropTable('products', { ifExists: true });
    // await client.dropTable('users', { ifExists: true });
    // console.log('✅ Tables dropped');

    console.log('\n🎉 Complete SDK Demo Finished Successfully!');
    console.log('============================================');

  } catch (error) {
    console.error('❌ Demo failed:', error);

    // Show error details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }

    // Cleanup on error
    try {
      if (client.getCurrentTransaction()) {
        await client.rollbackTransaction();
        console.log('🔄 Transaction rolled back due to error');
      }
    } catch (rollbackError) {
      console.error('❌ Failed to rollback transaction:', rollbackError);
    }
  }
}

// Performance benchmarking function
async function benchmarkOperations() {
  const client = new SynapCores({
    host: 'localhost',
    port: 8080,
    apiKey: 'aidb_your_api_key_here',
  });

  console.log('\n⚡ PERFORMANCE BENCHMARKS');
  console.log('========================');

  try {
    // Benchmark vector operations
    const largeVector1 = Array.from({ length: 1536 }, () => Math.random());
    const largeVector2 = Array.from({ length: 1536 }, () => Math.random());

    console.time('Vector Addition (1536d)');
    await client.vectorAdd(largeVector1, largeVector2);
    console.timeEnd('Vector Addition (1536d)');

    console.time('Cosine Similarity (1536d)');
    await client.cosineSimilarity(largeVector1, largeVector2);
    console.timeEnd('Cosine Similarity (1536d)');

    // Benchmark batch operations
    const batchData = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1000,
      name: `Product ${i + 1000}`,
      price: Math.random() * 1000,
      embedding: Array.from({ length: 1536 }, () => Math.random())
    }));

    console.time('Batch Insert (1000 rows)');
    await client.batchInsert({
      tableName: 'products',
      rows: batchData,
      batchSize: 100
    });
    console.timeEnd('Batch Insert (1000 rows)');

    console.log('✅ Performance benchmarks completed');

  } catch (error) {
    console.error('❌ Benchmark failed:', error);
  }
}

// Error handling examples
async function demonstrateErrorHandling() {
  const client = new SynapCores({
    host: 'localhost',
    port: 8080,
    apiKey: 'aidb_invalid_key', // Intentionally invalid
  });

  console.log('\n🚨 ERROR HANDLING EXAMPLES');
  console.log('==========================');

  try {
    // This should fail with authentication error
    await client.sql('SELECT 1');
  } catch (error: any) {
    console.log(`✅ Caught expected error: ${error.name} - ${error.message}`);
  }

  try {
    // This should fail with validation error
    await client.vectorAdd([1, 2, 3], [1, 2]); // Mismatched dimensions
  } catch (error: any) {
    console.log(`✅ Caught expected error: ${error.name} - ${error.message}`);
  }
}

// Main execution
if (require.main === module) {
  demonstrateCompleteSDK()
    .then(() => benchmarkOperations())
    .then(() => demonstrateErrorHandling())
    .catch(console.error);
}

export {
  demonstrateCompleteSDK,
  benchmarkOperations,
  demonstrateErrorHandling
};