/**
 * Vector Operations Demo for SynapCores Node.js SDK
 *
 * This example focuses specifically on vector operations:
 * - Vector arithmetic (add, subtract, scalar multiply, dot product)
 * - Vector similarity functions (cosine, L2 distance, inner product)
 * - Vector search operations (KNN, range-based, hybrid search)
 * - Vector normalization and magnitude calculations
 */

import { SynapCores } from '../src/client';
import {
  KNNSearchOptions,
  RangeSearchOptions,
  HybridSearchOptions,
  VectorSearchResult
} from '../src/types/client';

async function vectorArithmeticDemo(client: SynapCores) {
  console.log('🧮 VECTOR ARITHMETIC OPERATIONS');
  console.log('===============================');

  // Sample vectors
  const vector1 = [1.0, 2.0, 3.0, 4.0, 5.0];
  const vector2 = [0.5, 1.5, 2.5, 3.5, 4.5];
  const scalar = 2.5;

  console.log(`Vector 1: [${vector1.join(', ')}]`);
  console.log(`Vector 2: [${vector2.join(', ')}]`);
  console.log(`Scalar: ${scalar}\n`);

  // Vector addition
  console.log('➕ Vector Addition:');
  const addResult = await client.vectorAdd(vector1, vector2);
  console.log(`Result: [${addResult.result.values.join(', ')}]`);
  console.log(`Time: ${addResult.tookMs}ms\n`);

  // Vector subtraction
  console.log('➖ Vector Subtraction:');
  const subtractResult = await client.vectorSubtract(vector1, vector2);
  console.log(`Result: [${subtractResult.result.values.join(', ')}]`);
  console.log(`Time: ${subtractResult.tookMs}ms\n`);

  // Scalar multiplication
  console.log('✖️ Scalar Multiplication:');
  const scalarResult = await client.vectorScalarMultiply(vector1, scalar);
  console.log(`Result: [${scalarResult.result.values.join(', ')}]`);
  console.log(`Time: ${scalarResult.tookMs}ms\n`);

  // Dot product
  console.log('🔵 Dot Product:');
  const dotResult = await client.vectorDotProduct(vector1, vector2);
  console.log(`Result: ${dotResult.dotProduct}`);
  console.log(`Time: ${dotResult.tookMs}ms\n`);

  // Vector magnitude
  console.log('📏 Vector Magnitude:');
  const magnitudeResult = await client.vectorMagnitude(vector1);
  console.log(`Magnitude: ${magnitudeResult.magnitude}`);
  console.log(`Time: ${magnitudeResult.tookMs}ms\n`);

  // Vector normalization
  console.log('🎯 Vector Normalization:');
  const normalizeResult = await client.normalizeVector(vector1);
  console.log(`Normalized: [${normalizeResult.result.values.map(v => v.toFixed(4)).join(', ')}]`);
  console.log(`Time: ${normalizeResult.tookMs}ms\n`);
}

async function vectorSimilarityDemo(client: SynapCores) {
  console.log('📐 VECTOR SIMILARITY FUNCTIONS');
  console.log('==============================');

  // Create two similar vectors for meaningful similarity scores
  const vector1 = [0.8, 0.6, 0.0, 0.0];
  const vector2 = [0.9, 0.436, 0.0, 0.0]; // Similar to vector1
  const vector3 = [0.0, 0.0, 0.8, 0.6];   // Orthogonal to vector1

  console.log(`Vector 1: [${vector1.join(', ')}]`);
  console.log(`Vector 2: [${vector2.join(', ')}] (similar)`);
  console.log(`Vector 3: [${vector3.join(', ')}] (orthogonal)\n`);

  // Cosine similarity
  console.log('📊 Cosine Similarity:');
  const cosine12 = await client.cosineSimilarity(vector1, vector2);
  const cosine13 = await client.cosineSimilarity(vector1, vector3);
  console.log(`Vector1 ↔ Vector2: ${cosine12.similarity.toFixed(4)} (should be high)`);
  console.log(`Vector1 ↔ Vector3: ${cosine13.similarity.toFixed(4)} (should be low)\n`);

  // L2 (Euclidean) distance
  console.log('📏 L2 (Euclidean) Distance:');
  const l2_12 = await client.l2Distance(vector1, vector2);
  const l2_13 = await client.l2Distance(vector1, vector3);
  console.log(`Vector1 ↔ Vector2: ${l2_12.distance?.toFixed(4)} (should be small)`);
  console.log(`Vector1 ↔ Vector3: ${l2_13.distance?.toFixed(4)} (should be large)\n`);

  // Inner product
  console.log('🔶 Inner Product:');
  const inner12 = await client.innerProduct(vector1, vector2);
  const inner13 = await client.innerProduct(vector1, vector3);
  console.log(`Vector1 ↔ Vector2: ${inner12.similarity.toFixed(4)}`);
  console.log(`Vector1 ↔ Vector3: ${inner13.similarity.toFixed(4)} (should be ~0)\n`);
}

async function setupVectorSearchData(client: SynapCores) {
  console.log('📋 SETTING UP VECTOR SEARCH DATA');
  console.log('=================================');

  // Create a table for vector search demonstrations
  try {
    await client.sql(`
      CREATE TABLE IF NOT EXISTS vector_search_demo (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        embedding VECTOR(384),
        metadata JSONB
      )
    `);

    // Generate sample embeddings that represent different categories
    const categories = ['technology', 'sports', 'cooking', 'travel', 'music'];
    const sampleData = [];

    for (let i = 0; i < 20; i++) {
      const category = categories[i % categories.length];
      const embedding = generateCategoryEmbedding(category, 384);

      sampleData.push({
        id: i + 1,
        name: `Item ${i + 1}`,
        category: category,
        embedding: embedding,
        metadata: {
          score: Math.random() * 100,
          tags: [category, `tag${i % 3}`],
          created_at: new Date().toISOString()
        }
      });
    }

    // Insert sample data
    for (const item of sampleData) {
      await client.sql(`
        INSERT OR REPLACE INTO vector_search_demo (id, name, category, embedding, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, {
        1: item.id,
        2: item.name,
        3: item.category,
        4: item.embedding,
        5: JSON.stringify(item.metadata)
      });
    }

    console.log(`✅ Inserted ${sampleData.length} sample items for vector search\n`);
    return sampleData;

  } catch (error) {
    console.error('❌ Failed to setup vector search data:', error);
    throw error;
  }
}

function generateCategoryEmbedding(category: string, dimensions: number): number[] {
  // Generate a deterministic embedding based on category
  // This creates clusters of similar vectors for each category
  const seed = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = seededRandom(seed);

  const embedding = new Array(dimensions);
  for (let i = 0; i < dimensions; i++) {
    embedding[i] = random() - 0.5; // Center around 0
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

function seededRandom(seed: number) {
  let x = Math.sin(seed) * 10000;
  return function() {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

async function vectorSearchDemo(client: SynapCores) {
  console.log('🔍 VECTOR SEARCH OPERATIONS');
  console.log('===========================');

  // Setup search data
  await setupVectorSearchData(client);

  // Generate a query vector similar to "technology" category
  const queryVector = generateCategoryEmbedding('technology', 384);

  // K-Nearest Neighbors Search
  console.log('🎯 K-Nearest Neighbors (KNN) Search:');
  const knnOptions: KNNSearchOptions = {
    queryVector: queryVector,
    k: 5,
    tableName: 'vector_search_demo',
    vectorColumn: 'embedding',
    metadataColumns: ['id', 'name', 'category'],
    filter: { category: { '$ne': 'music' } } // Exclude music category
  };

  try {
    const knnResults = await client.knnSearch(knnOptions);
    console.log(`Found ${knnResults.length} nearest neighbors:`);
    knnResults.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.metadata?.name} (${result.metadata?.category}) - similarity: ${result.similarity.toFixed(4)}`);
    });
    console.log();
  } catch (error) {
    console.log('⚠️  KNN search not available, using SQL fallback\n');
  }

  // Range-based Search
  console.log('📊 Range-based Similarity Search:');
  const rangeOptions: RangeSearchOptions = {
    queryVector: queryVector,
    threshold: 0.7, // Only return items with similarity > 0.7
    tableName: 'vector_search_demo',
    vectorColumn: 'embedding',
    metadataColumns: ['id', 'name', 'category'],
    maxResults: 10
  };

  try {
    const rangeResults = await client.rangeSearch(rangeOptions);
    console.log(`Found ${rangeResults.length} items above similarity threshold:`);
    rangeResults.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.metadata?.name} (${result.metadata?.category}) - similarity: ${result.similarity.toFixed(4)}`);
    });
    console.log();
  } catch (error) {
    console.log('⚠️  Range search not available, using SQL fallback\n');
  }

  // Hybrid Search (Vector + SQL filters)
  console.log('🔗 Hybrid Search (Vector + SQL):');
  const hybridOptions: HybridSearchOptions = {
    vector: queryVector,
    textQuery: 'technology computer',
    sqlFilter: "metadata->>'score' > 50",
    k: 3,
    threshold: 0.5,
    metric: 'cosine',
    weights: { vector: 0.8, text: 0.2 }
  };

  try {
    const hybridResults = await client.hybridSearch(hybridOptions);
    console.log(`Found ${hybridResults.length} hybrid search results:`);
    hybridResults.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.metadata?.name} (${result.metadata?.category}) - score: ${result.similarity.toFixed(4)}`);
    });
    console.log();
  } catch (error) {
    console.log('⚠️  Hybrid search not available, using SQL fallback\n');
  }

  // SQL-based vector similarity (fallback method)
  console.log('🔄 SQL-based Vector Similarity (fallback):');
  try {
    const sqlResult = await client.sql(`
      SELECT
        id,
        name,
        category,
        COSINE_SIMILARITY(embedding, $1) as similarity
      FROM vector_search_demo
      WHERE COSINE_SIMILARITY(embedding, $1) > 0.5
      ORDER BY similarity DESC
      LIMIT 5
    `, { 1: queryVector });

    console.log(`Found ${sqlResult.rowCount} similar items using SQL:`);
    sqlResult.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.name} (${row.category}) - similarity: ${row.similarity?.toFixed(4)}`);
    });
    console.log();
  } catch (error) {
    console.log('⚠️  SQL vector similarity not available\n');
  }
}

async function vectorPerformanceTest(client: SynapCores) {
  console.log('⚡ VECTOR PERFORMANCE TESTING');
  console.log('=============================');

  const dimensions = [128, 256, 512, 1024, 1536];

  for (const dim of dimensions) {
    console.log(`\n📊 Testing ${dim}-dimensional vectors:`);

    const vector1 = Array.from({ length: dim }, () => Math.random());
    const vector2 = Array.from({ length: dim }, () => Math.random());

    // Test vector operations
    const operations = [
      { name: 'Addition', fn: () => client.vectorAdd(vector1, vector2) },
      { name: 'Cosine Similarity', fn: () => client.cosineSimilarity(vector1, vector2) },
      { name: 'L2 Distance', fn: () => client.l2Distance(vector1, vector2) },
      { name: 'Dot Product', fn: () => client.vectorDotProduct(vector1, vector2) }
    ];

    for (const operation of operations) {
      try {
        const start = Date.now();
        const result = await operation.fn();
        const end = Date.now();
        console.log(`  ${operation.name}: ${end - start}ms`);
      } catch (error) {
        console.log(`  ${operation.name}: ERROR - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
}

async function mainVectorDemo() {
  const client = new SynapCores({
    host: 'localhost',
    port: 8080,
    apiKey: 'aidb_your_api_key_here', // Replace with your actual API key
    useHttps: false,
    timeout: 30000,
  });

  console.log('🚀 Vector Operations Demo Starting\n');

  try {
    await vectorArithmeticDemo(client);
    await vectorSimilarityDemo(client);
    await vectorSearchDemo(client);
    await vectorPerformanceTest(client);

    console.log('🎉 Vector Operations Demo Completed Successfully!');

  } catch (error) {
    console.error('❌ Vector demo failed:', error);

    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
      });
    }
  }
}

// Example usage patterns
async function vectorUsagePatterns() {
  const client = new SynapCores({
    host: 'localhost',
    port: 8080,
    apiKey: 'aidb_your_api_key_here',
  });

  console.log('\n📚 COMMON VECTOR USAGE PATTERNS');
  console.log('===============================');

  // Pattern 1: Document similarity
  console.log('📄 Pattern 1: Document Similarity');
  const doc1Embedding = await client.embed('Machine learning and artificial intelligence');
  const doc2Embedding = await client.embed('Deep learning neural networks');
  const doc3Embedding = await client.embed('Cooking recipes and kitchen tips');

  const sim12 = await client.cosineSimilarity(
    Array.isArray(doc1Embedding) ? doc1Embedding[0] : doc1Embedding,
    Array.isArray(doc2Embedding) ? doc2Embedding[0] : doc2Embedding
  );

  const sim13 = await client.cosineSimilarity(
    Array.isArray(doc1Embedding) ? doc1Embedding[0] : doc1Embedding,
    Array.isArray(doc3Embedding) ? doc3Embedding[0] : doc3Embedding
  );

  console.log(`AI docs similarity: ${sim12.similarity.toFixed(4)} (should be high)`);
  console.log(`AI vs Cooking similarity: ${sim13.similarity.toFixed(4)} (should be low)\n`);

  // Pattern 2: Recommendation system
  console.log('🎯 Pattern 2: Recommendation System');
  const userProfile = Array.from({ length: 384 }, () => Math.random());
  const productEmbeddings = Array.from({ length: 5 }, () =>
    Array.from({ length: 384 }, () => Math.random())
  );

  console.log('Top product recommendations:');
  const recommendations = [];
  for (let i = 0; i < productEmbeddings.length; i++) {
    const similarity = await client.cosineSimilarity(userProfile, productEmbeddings[i]);
    recommendations.push({ id: i + 1, similarity: similarity.similarity });
  }

  recommendations
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)
    .forEach((rec, i) => {
      console.log(`  ${i + 1}. Product ${rec.id} (score: ${rec.similarity.toFixed(4)})`);
    });

  console.log('\n✅ Usage patterns demonstration completed');
}

// Run the demo if this file is executed directly
if (require.main === module) {
  mainVectorDemo()
    .then(() => vectorUsagePatterns())
    .catch(console.error);
}

export {
  mainVectorDemo,
  vectorArithmeticDemo,
  vectorSimilarityDemo,
  vectorSearchDemo,
  vectorPerformanceTest,
  vectorUsagePatterns
};