# SynapCores Node.js/TypeScript SDK

> **Questions or feedback?** Join the [SynapCores community discussions](https://github.com/SynapCores/synapcores-docs/discussions) — single hub for the engine, both SDKs, OpenClaw plugin, and demos.


Official Node.js/TypeScript SDK for SynapCores AI-Native Database Management System - A SQL 2026-compliant database with native tenant isolation, AI/ML functions, and multimedia support.

## Features

- 🚀 **Full TypeScript Support**: Complete type definitions for excellent IDE experience
- 🔐 **Dual Authentication**: Support for both JWT tokens and API keys
- 👤 **User Management**: Registration, login, and token refresh
- 🔑 **API Key Management**: Create, list, monitor, and revoke API keys
- 🤖 **AI-Native Operations**: Built-in embeddings, vector search, and semantic analysis
- 📊 **SQL 2026 Compliance**: Enhanced SQL syntax with AI operations
- 📁 **Multimedia Support**: Upload and manage images, videos, audio, and documents
- 🔄 **Real-time Subscriptions**: WebSocket support for live data updates
- 🧠 **AutoML Integration**: Train and deploy ML models automatically
- 🏢 **Multi-tenant**: Automatic tenant isolation for SaaS applications
- ⚡ **High Performance**: Async/await support with connection pooling

## Installation

```bash
npm install @synapcores/sdk
# or
yarn add @synapcores/sdk
# or
pnpm add @synapcores/sdk
```

## Quick Start

### Using API Key Authentication

```typescript
import { SynapCores } from '@synapcores/sdk';

// Initialize client with API key authentication
// API keys can be created from your AIDB dashboard or programmatically
const client = new SynapCores({
  host: 'localhost',
  port: 8080,
  apiKey: 'ak_prod_your_api_key_here', // API keys start with 'ak_' or 'aidb_'
  useHttps: false, // Set to true in production
});

// Execute a query
const result = await client.executeQuery({
  sql: 'SELECT * FROM products WHERE category = $1 LIMIT 10',
  parameters: ['electronics'],
  max_rows: 1000,
  timeout_secs: 300,
});

console.log('Columns:', result.columns);
console.log('Rows:', result.rows);
```

### Using JWT Token Authentication

```typescript
import { SynapCores } from '@synapcores/sdk';

// Step 1: Register a new user (or login if already registered)
const client = new SynapCores({
  host: 'localhost',
  port: 8080,
});

// Register new user
const user = await client.registerUser({
  username: 'my_username',
  email: 'user@example.com',
  password: 'SecurePass123!',
});

console.log('Registered user:', user.id);
console.log('Active:', user.is_active);

// Step 2: Login to get JWT token
const loginResponse = await client.login({
  username: 'my_username',
  password: 'SecurePass123!',
});

// Token is automatically stored in client
// Or manually set it:
client.setJWTToken(loginResponse.access_token);

// Now authenticated - all subsequent requests use JWT
const collections = await client.listCollectionsDetailed();
```

## Authentication

### API Key Authentication

API keys are suitable for server-to-server integrations and programmatic access.

```typescript
const client = new SynapCores({
  host: 'localhost',
  port: 8080,
  apiKey: 'ak_prod_xyz789abc123...', // Use X-API-Key header
});
```

**API Key Formats:**
- Production keys: `ak_prod_...`
- Development keys: `ak_dev_...`
- Legacy format: `aidb_...` (also supported)

### JWT Token Authentication

JWT tokens are suitable for user sessions in web applications.

```typescript
// Initialize without auth
const client = new SynapCores({
  host: 'localhost',
  port: 8080,
});

// Login to get token
const { access_token } = await client.login({
  username: 'username',
  password: 'password',
});

// Token is automatically set, or manually:
client.setJWTToken(access_token);
```

**Refresh Token:**
```typescript
// Refresh before expiration
const refreshResponse = await client.refreshToken();
console.log('New token expires in:', refreshResponse.expires_in, 'seconds');
```

**Logout:**
```typescript
client.logout(); // Clears authentication
```

## User Registration & Management

### Register New User

```typescript
const user = await client.registerUser({
  username: 'acme_admin',
  email: 'admin@acme.com',
  password: 'SecurePass123!',
});

// Check if user is active or waitlisted
if (!user.is_active) {
  console.log('User added to waitlist');
} else {
  console.log('User created and active:', user.id);
}
```

**Validation Rules:**
- `username`: 3-64 characters, alphanumeric + underscores/hyphens
- `email`: Valid email format
- `password`: Min 8 chars, must contain uppercase, lowercase, and number

## API Key Management

### Create API Key

```typescript
const result = await client.createAPIKey({
  name: 'Production API',
  permission: 'ReadOnly', // or 'FullAccess'
  expires_in_days: 90, // Optional, omit for no expiration
});

console.log('⚠️ SAVE THIS KEY - shown only once:', result.raw_key);
console.log('Key ID:', result.api_key.id);
console.log('Key Preview:', result.api_key.key_preview);
```

**⚠️ Important:** The `raw_key` is shown **only once**. Store it securely immediately!

### List API Keys

```typescript
const { keys, total } = await client.listAPIKeys();

keys.forEach(key => {
  console.log(`${key.name}: ${key.key_preview}`);
  console.log(`  Permission: ${key.permission}`);
  console.log(`  Usage: ${key.usage_count} requests`);
  console.log(`  Last used: ${key.last_used || 'Never'}`);
});
```

### Get API Key Statistics

```typescript
const stats = await client.getAPIKeyStats('key_xyz789');

console.log(`Total requests: ${stats.total_requests}`);
console.log(`Last 24h: ${stats.requests_last_24h}`);
console.log(`Last 7 days: ${stats.requests_last_7d}`);

stats.most_used_endpoints.forEach(endpoint => {
  console.log(`${endpoint.endpoint} (${endpoint.method}): ${endpoint.count} (${endpoint.percentage}%)`);
});
```

### Revoke API Key

```typescript
await client.revokeAPIKey('key_xyz789');
console.log('API key revoked');
```

## SQL Query Execution

### Execute Query

Execute SQL queries with full SQL 2026 compliance and AI/ML extensions.

```typescript
const result = await client.executeQuery({
  sql: 'SELECT * FROM products WHERE category = $1 LIMIT 10',
  parameters: ['electronics'],
  max_rows: 1000,
  timeout_secs: 300,
});

// Access results
result.columns.forEach(col => {
  console.log(`${col.name}: ${col.data_type} (nullable: ${col.nullable})`);
});

result.rows.forEach(row => {
  // row is an array matching column order
  console.log('Product:', row[0], 'Price:', row[1]);
});
```

**Query Result Format:**
```typescript
interface QueryResult {
  columns: Array<{
    name: string;
    data_type: string;
    nullable: boolean;
  }>;
  rows: any[][]; // Array of arrays (not objects)
  rows_affected?: number;
  execution_time_ms: number;
  queryPlan?: Record<string, any>;
}
```

### Parameterized Queries

Always use parameters to prevent SQL injection:

```typescript
// ✅ SAFE - using parameters
const result = await client.executeQuery({
  sql: 'SELECT * FROM users WHERE email = $1',
  parameters: [userEmail],
});

// ❌ UNSAFE - vulnerable to SQL injection
const result = await client.executeQuery({
  sql: `SELECT * FROM users WHERE email = '${userEmail}'`,
  parameters: [],
});
```

### Batch Query Execution

Execute multiple queries in a single request:

```typescript
const batchResult = await client.executeBatchQueries({
  queries: [
    {
      sql: 'SELECT COUNT(*) FROM products',
      parameters: [],
    },
    {
      sql: 'SELECT AVG(price) FROM products WHERE category = $1',
      parameters: ['electronics'],
    },
    {
      sql: 'INSERT INTO audit_log (action, timestamp) VALUES ($1, $2)',
      parameters: ['batch_query', new Date().toISOString()],
    },
  ],
  transactional: false, // Set to true for transaction
});

batchResult.results.forEach((result, idx) => {
  if (result.type === 'success') {
    console.log(`Query ${idx + 1} succeeded:`, result.data?.rows);
  } else {
    console.error(`Query ${idx + 1} failed:`, result.error?.message);
  }
});
```

### AI/ML Query Functions

Use built-in AI functions in SQL queries:

```typescript
// Generate embeddings
const embedResult = await client.executeQuery({
  sql: "SELECT EMBED('search query text', 'minilm') as embedding",
  parameters: [],
});

// Semantic similarity search
const searchResult = await client.executeQuery({
  sql: `
    SELECT
      id,
      title,
      COSINE_SIMILARITY(
        embedding,
        EMBED($1, 'minilm')
      ) as similarity
    FROM documents
    ORDER BY similarity DESC
    LIMIT 10
  `,
  parameters: ['artificial intelligence'],
});
```

**Available AI Functions:**
- `EMBED(text, model)` - Generate embedding vector
- `COSINE_SIMILARITY(vec1, vec2)` - Cosine similarity
- `EXTRACT_TEXT(multimedia_id)` - Extract text from images/PDFs
- `EXTRACT_FRAMES(multimedia_id, count)` - Extract video frames
- `DURATION(multimedia_id)` - Get media duration
- `VECTOR_ADD(vec1, vec2)` - Vector addition
- `VECTOR_DOT(vec1, vec2)` - Dot product
- `VECTOR_NORMALIZE(vec)` - Normalize vector

### Legacy SQL Method

The `sql()` method is still available for backward compatibility:

```typescript
// Legacy method (deprecated - use executeQuery instead)
const result = await client.sql('SELECT * FROM products LIMIT 10');
```

## Collection Management

### Create Collection with Schema

Create collections with structured schemas matching the database integration guide:

```typescript
const collection = await client.createCollectionWithSchema({
  name: 'customer_profiles',
  description: 'Customer data with structured schema',
  schema: {
    fields: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'Unique customer ID',
      },
      {
        name: 'name',
        type: 'string',
        required: true,
      },
      {
        name: 'email',
        type: 'string',
        required: true,
      },
      {
        name: 'age',
        type: 'number',
        required: false,
      },
      {
        name: 'profile_image',
        type: 'image',
        required: false,
      },
      {
        name: 'preferences',
        type: 'object',
        required: false,
      },
      {
        name: 'tags',
        type: 'array',
        required: false,
      },
      {
        name: 'embedding',
        type: 'vector',
        required: false,
      },
      {
        name: 'created_at',
        type: 'date',
        required: true,
      },
    ],
    indexes: [
      {
        name: 'email_idx',
        fields: ['email'],
        type: 'btree',
        unique: true,
      },
      {
        name: 'vector_idx',
        fields: ['embedding'],
        type: 'vector',
      },
    ],
  },
});
```

**Supported Field Types:**
- `string` - Text data
- `number` - Integer or decimal
- `boolean` - True/false
- `date` - Date and time
- `object` - Nested objects
- `array` - Lists
- `vector` - AI embeddings
- `image` - Image file reference
- `audio` - Audio file reference
- `video` - Video file reference

**Index Types:**
- `btree` - Range queries, sorting (general purpose)
- `hash` - Exact matches (fast equality)
- `vector` - Similarity search (AI/ML queries)
- `text` - Full-text search

### List Collections

```typescript
// Simple list (backward compatible)
const collectionNames = await client.listCollections();

// Detailed list with pagination and filtering
const result = await client.listCollectionsDetailed({
  page: 1,
  pageSize: 20,
  search: 'customer', // Optional search filter
  sortBy: 'name',
  sortOrder: 'asc',
});

result.collections.forEach(collection => {
  console.log(`${collection.name}: ${collection.documentCount} documents`);
});
```

### Get Collection

```typescript
const collection = await client.getCollection('products');
console.log('Schema:', collection.schema);
```

### Delete Collection

```typescript
// ⚠️ Warning: Deletes all documents and multimedia in the collection!
await client.deleteCollection('products');
```

## Multimedia File Uploads

Upload and manage images, videos, audio, and documents with automatic processing.

### Upload Multimedia

```typescript
import * as fs from 'fs';

// Upload file to a document
const fileBuffer = fs.readFileSync('path/to/image.jpg');

const multimedia = await client.uploadMultimedia(
  'products',           // collection name
  'prod_123',          // document ID
  fileBuffer,          // File, Blob, or Buffer
  {
    description: 'Product photo',
    tags: ['product', 'catalog'],
    custom_field: 'value',
  }
);

console.log('Uploaded:', multimedia.id);
console.log('File:', multimedia.file_name);
console.log('Size:', multimedia.file_size, 'bytes');
console.log('Thumbnail:', client.getMultimediaThumbnailUrl(
  'products',
  'prod_123',
  multimedia.id
));
```

**Supported File Types:**
- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Videos**: MP4, WebM, AVI, MOV
- **Audio**: MP3, WAV, OGG, M4A
- **Documents**: PDF

**File Size Limit:** 100MB per file (default, configurable)

### List Multimedia

```typescript
const result = await client.listMultimedia(
  'products',
  'prod_123',
  50,  // limit
  0    // offset
);

result.items.forEach(item => {
  console.log(`${item.file_name} (${item.file_size} bytes)`);
});
```

### Get Multimedia Information

```typescript
const multimedia = await client.getMultimedia(
  'products',
  'prod_123',
  'media_xyz789'
);

console.log('File:', multimedia.file_name);
console.log('Type:', multimedia.content_type);
console.log('Extracted text:', multimedia.extracted_text);
```

### Get Multimedia URLs

```typescript
// View URL (for display in browser)
const viewUrl = client.getMultimediaUrl(
  'products',
  'prod_123',
  'media_xyz789'
);

// Download URL (forces download)
const downloadUrl = client.getMultimediaUrl(
  'products',
  'prod_123',
  'media_xyz789',
  true // download flag
);

// Thumbnail URL (for images/videos)
const thumbnailUrl = client.getMultimediaThumbnailUrl(
  'products',
  'prod_123',
  'media_xyz789'
);
```

### Delete Multimedia

```typescript
await client.deleteMultimedia(
  'products',
  'prod_123',
  'media_xyz789'
);
```

## Advanced Features

### Vector Operations

```typescript
// Generate embeddings
const embedding = await client.embed('High-quality mechanical keyboard');
// or batch
const embeddings = await client.embed([
  'Laptop computer',
  'Wireless mouse',
  'Mechanical keyboard',
]);

// Vector similarity
const similarity = await client.cosineSimilarity(
  embedding1,
  embedding2
);

// Vector arithmetic
const sum = await client.vectorAdd(vec1, vec2);
const normalized = await client.normalizeVector(vec);
```

### Vector Search

```typescript
// K-nearest neighbors search
const knnResults = await client.knnSearch({
  queryVector: embedding,
  k: 10,
  tableName: 'products',
  vectorColumn: 'embedding',
  metadataColumns: ['name', 'price'],
  filter: { category: 'electronics' },
});

// Range search
const rangeResults = await client.rangeSearch({
  queryVector: embedding,
  threshold: 0.8,
  tableName: 'products',
  vectorColumn: 'embedding',
  maxResults: 100,
});
```

### Collection Operations

```typescript
// Get collection reference
const products = await client.getCollection('products');

// Insert documents
await products.insert({
  name: 'Laptop',
  price: 1299.99,
  category: 'Electronics',
});

// Search
const results = await products.search({
  filter: { category: 'Electronics' },
  topK: 10,
  offset: 0,
});

// Vector search
const vectorResults = await products.vectorSearch({
  vector: embedding,
  topK: 5,
  filter: { price: { $lt: 500 } },
});
```

### AutoML

```typescript
// Train a model
const model = await client.automl.train({
  collection: 'sales_data',
  target: 'revenue',
  features: ['product_category', 'season', 'price'],
  task: 'regression',
});

// Make predictions
const predictions = await model.predict({
  product_category: 'electronics',
  season: 'holiday',
  price: 299.99,
});
```

### NLP Analysis

```typescript
// Analyze text
const analysis = await client.nlp.analyze({
  text: 'This product exceeded my expectations. Highly recommend!',
  tasks: ['sentiment', 'entities', 'summary'],
});

console.log(`Sentiment: ${analysis.sentiment.label}`);
console.log(`Entities:`, analysis.entities);
```

### Agent Memory

The memory client wraps the engine-side `MEMORY_STORE`, `MEMORY_RECALL`,
and `MEMORY_FORGET` SQL functions — namespaced semantic memory for AI
agents. The backing table is auto-created on first write; content is
embedded via the configured embedding model.

```typescript
// Store text in a namespace
const id = await client.memory.store('default', 'User prefers Python');

// Store with structured metadata
await client.memory.store(
  'default',
  'Customer renewed annual plan',
  { metadata: { importance: 0.9, source: 'crm' } },
);

// Semantic retrieval — returns the top-K nearest memories
const hits = await client.memory.recall(
  'default',
  'preferred programming language',
  { topK: 3 },
);
for (const hit of hits) {
  console.log(hit.similarity.toFixed(2), hit.content, hit.metadata);
}

// Forget a memory by id
const deleted = await client.memory.forget('default', id);
```

Namespaces must match `/^[A-Za-z_][A-Za-z0-9_]*$/`. Invalid namespaces
throw a `MemoryError` client-side without hitting the engine. Recalling
from an unwritten namespace returns `[]` rather than raising.

### Real-time Subscriptions

```typescript
// Subscribe to collection changes
const subscription = await products.subscribe({
  filter: { price: { $lt: 100 } },
  onChange: (event) => {
    console.log(`${event.operation}: ${event.document.name}`);
  },
});

// Unsubscribe
await subscription.close();
```

## Error Handling

The SDK provides comprehensive error handling with specific error types:

```typescript
import {
  SynapCoresError,
  ConnectionError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  ServerError,
  RateLimitError,
  SQLError,
  VectorError,
} from '@synapcores/sdk';

try {
  const result = await client.executeQuery({
    sql: 'SELECT * FROM products',
    parameters: [],
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
    // Try refreshing token or re-login
    await client.refreshToken();
  } else if (error instanceof ValidationError) {
    console.error('Validation error:', error.message);
    console.error('Details:', error.details);
  } else if (error instanceof NotFoundError) {
    console.error('Resource not found:', error.message);
  } else if (error instanceof RateLimitError) {
    console.error('Rate limited. Retry after:', error.retryAfter, 'seconds');
  } else if (error instanceof ConnectionError) {
    console.error('Connection failed:', error.message);
  } else if (error instanceof ServerError) {
    console.error('Server error:', error.message);
  } else if (error instanceof SynapCoresError) {
    console.error('SynapCores error:', error.message);
    console.error('Code:', error.code);
  }
}
```

**Error Format (matching database integration guide):**
```typescript
{
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid email format",
    details: {
      field: "email",
      received: "invalid-email"
    },
    timestamp: "2025-10-31T10:00:00Z",
    requestId: "req_xyz789"
  }
}
```

## Configuration

### Full Configuration Options

```typescript
const client = new SynapCores({
  host: 'localhost',              // Server host (default: 'localhost')
  port: 8080,                     // Server port (default: 8080)
  apiKey: 'ak_prod_...',         // API key (optional, use with X-API-Key header)
  jwtToken: 'eyJhbGc...',        // JWT token (optional, use with Bearer header)
  useHttps: false,               // Use HTTPS (default: false)
  timeout: 30000,                // Request timeout in ms (default: 30000)
  maxRetries: 3,                  // Max retry attempts (default: 3)
  rejectUnauthorized: true,        // Reject unauthorized SSL certs (default: true)
});
```

## Complete Example: Document Management SaaS

Here's a complete example demonstrating a document management workflow:

```typescript
import { SynapCores } from '@synapcores/sdk';
import * as fs from 'fs';

async function documentManagementExample() {
  // 1. Initialize client
  const client = new SynapCores({
    host: 'localhost',
    port: 8080,
  });

  // 2. Register and login
  const user = await client.registerUser({
    username: 'acme_admin',
    email: 'admin@acme.com',
    password: 'SecurePass123!',
  });

  if (user.is_active) {
    await client.login({
      username: 'acme_admin',
      password: 'SecurePass123!',
    });
  }

  // 3. Create API key for programmatic access
  const apiKeyResult = await client.createAPIKey({
    name: 'Production Integration',
    permission: 'FullAccess',
    expires_in_days: 90,
  });
  console.log('⚠️ Save API key:', apiKeyResult.raw_key);

  // 4. Create document collection
  const collection = await client.createCollectionWithSchema({
    name: 'customer_documents',
    description: 'Customer documents with AI-powered search',
    schema: {
      fields: [
        { name: 'customer_id', type: 'string', required: true },
        { name: 'document_name', type: 'string', required: true },
        { name: 'document_type', type: 'string', required: true },
        { name: 'content_text', type: 'string', required: false },
        { name: 'embedding', type: 'vector', required: false },
        { name: 'uploaded_at', type: 'date', required: true },
        { name: 'processed', type: 'boolean', required: true },
      ],
      indexes: [
        { name: 'customer_idx', fields: ['customer_id'], type: 'btree' },
        { name: 'vector_idx', fields: ['embedding'], type: 'vector' },
      ],
    },
  });

  // 5. Create document record
  const docResult = await client.executeQuery({
    sql: `
      INSERT INTO customer_documents
      (customer_id, document_name, document_type, uploaded_at, processed)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    parameters: [
      'cust_123',
      'contract.pdf',
      'pdf',
      new Date().toISOString(),
      false,
    ],
  });
  const documentId = docResult.rows[0][0];

  // 6. Upload PDF file
  const pdfBuffer = fs.readFileSync('contract.pdf');
  const multimedia = await client.uploadMultimedia(
    'customer_documents',
    documentId,
    pdfBuffer,
    {
      customer_id: 'cust_123',
      uploaded_by: 'admin',
      document_type: 'pdf',
    }
  );

  // 7. Extract text and generate embedding
  await client.executeQuery({
    sql: `
      UPDATE customer_documents
      SET
        content_text = EXTRACT_TEXT($1),
        embedding = EMBED(EXTRACT_TEXT($1), 'minilm'),
        processed = true
      WHERE id = $2
    `,
    parameters: [multimedia.id, documentId],
  });

  // 8. Semantic search
  const searchResult = await client.executeQuery({
    sql: `
      SELECT
        id,
        customer_id,
        document_name,
        content_text,
        COSINE_SIMILARITY(
          embedding,
          EMBED($1, 'minilm')
        ) as relevance
      FROM customer_documents
      WHERE embedding IS NOT NULL
        AND processed = true
      ORDER BY relevance DESC
      LIMIT 10
    `,
    parameters: ['contract payment terms'],
  });

  console.log('Search results:', searchResult.rows);
}

documentManagementExample().catch(console.error);
```

## TypeScript Support

This SDK is written in TypeScript and provides complete type definitions:

```typescript
import {
  SynapCores,
  Collection,
  Document,
  SearchResult,
  QueryResult,
  RegisterRequest,
  LoginRequest,
  CreateAPIKeyRequest,
  CreateCollectionRequest,
  MultimediaInfo,
} from '@synapcores/sdk';

// All methods are fully typed
const createUser = async (
  client: SynapCores,
  request: RegisterRequest
): Promise<void> => {
  const user = await client.registerUser(request);
  console.log('User created:', user.id);
};
```

## Best Practices

### Security

1. **Never expose API keys** in client-side code or public repositories
2. **Use HTTPS** in production (never HTTP)
3. **Store tokens in sessionStorage** (not localStorage) for web apps
4. **Set API key expiration** for time-limited access
5. **Use ReadOnly permission** unless write access is required
6. **Monitor API key usage** regularly
7. **Revoke compromised keys** immediately

### Performance

1. **Use batch queries** for multiple operations
2. **Limit result sets** with `max_rows` parameter
3. **Create indexes** on frequently queried fields
4. **Use vector indexes** for similarity search
5. **Compress large files** before upload
6. **Implement pagination** for large datasets

### Error Handling

1. **Always handle errors** with try-catch
2. **Implement retry logic** for transient failures
3. **Use exponential backoff** for rate limits
4. **Handle network errors** gracefully
5. **Display loading states** during async operations

## Migration Guide

### From Legacy Methods to New Methods

```typescript
// OLD (still works but deprecated)
const result = await client.sql('SELECT * FROM products');

// NEW (recommended)
const result = await client.executeQuery({
  sql: 'SELECT * FROM products',
  parameters: [],
});
```

```typescript
// OLD
const collections = await client.listCollections(); // Returns string[]

// NEW
const result = await client.listCollectionsDetailed(); // Returns detailed info
```

## Documentation

For detailed API documentation and the complete integration guide, visit:
- **Database Integration Guide**: See `databaseintegrationguide.md`
- **API Documentation**: [https://docs.synapcores.ai](https://docs.synapcores.ai)

## License

MIT License - see LICENSE file for details.

