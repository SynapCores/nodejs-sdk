/**
 * Quick start example for SynapCores Node.js/TypeScript SDK
 */

import { SynapCores } from '@synapcores/sdk';

async function main() {
  // Initialize client
  const client = new SynapCores({
    host: 'localhost',
    port: 8080,
    apiKey: 'your-api-key',
  });

  try {
    // Create a collection
    const products = await client.createCollection({
      name: 'products',
      schema: {
        name: 'string',
        description: 'text',
        price: 'float',
        category: 'string',
        embedding: 'vector[384]',
      },
    });

    console.log('✅ Collection created');

    // Insert some products
    const insertResult = await products.insert([
      {
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse with precision tracking',
        price: 29.99,
        category: 'Electronics',
      },
      {
        name: 'Mechanical Keyboard',
        description: 'RGB mechanical keyboard with Cherry MX switches',
        price: 129.99,
        category: 'Electronics',
      },
      {
        name: 'USB-C Hub',
        description: '7-in-1 USB-C hub with HDMI, USB 3.0, and SD card reader',
        price: 49.99,
        category: 'Electronics',
      },
    ]);

    console.log(`✅ Inserted ${insertResult.inserted} products`);

    // Semantic search
    console.log('\n🔍 Searching for computer peripherals...');
    const searchResults = await products.search({
      query: 'computer peripherals for gaming',
      topK: 5,
    });

    for (const doc of searchResults.documents) {
      console.log(
        `- ${doc.data.name} ($${doc.data.price}) - Score: ${doc.score?.toFixed(3)}`,
      );
    }

    // SQL query with AI extensions
    console.log('\n📊 Running SQL query with embeddings...');
    const queryResult = await client.sql(`
      SELECT name, price,
             similarity(embedding, embed('gaming accessories')) as relevance
      FROM products
      WHERE category = 'Electronics' AND price < 100
      ORDER BY relevance DESC
    `);

    console.table(queryResult.rows);

    // NLP analysis
    console.log('\n🧠 Analyzing product reviews...');
    const review =
      'This keyboard is amazing! The RGB lighting is beautiful and the switches feel great.';
    const analysis = await client.nlp.analyze({
      text: review,
      tasks: ['sentiment', 'keywords'],
    });

    if (analysis && !Array.isArray(analysis)) {
      console.log(
        `Sentiment: ${analysis.sentiment?.label} (${analysis.sentiment?.score.toFixed(3)})`,
      );
      console.log(`Keywords: ${analysis.keywords?.join(', ')}`);
    }

    // AutoML example
    console.log('\n🤖 Training a price prediction model...');
    const model = await client.automl.train({
      collection: 'products',
      target: 'price',
      features: ['category', 'name'],
      task: 'regression',
      name: 'price_predictor',
    });

    console.log(`Model trained! ID: ${model.id}`);

    // Real-time subscription
    console.log('\n📡 Subscribing to price changes...');
    const subscription = await products.subscribe({
      filter: { price: { $lt: 50 } },
      onChange: (event) => {
        console.log(
          `Price updated: ${event.document.data.name} - $${event.document.data.price}`,
        );
      },
    });

    // Keep subscription alive for demo
    setTimeout(async () => {
      await subscription.close();
      console.log('✅ Subscription closed');
    }, 10000);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
main().catch(console.error);