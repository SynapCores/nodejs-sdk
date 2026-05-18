# Enhanced SynapCores Node.js SDK Features

This document outlines the comprehensive SQL and vector operation features added to the SynapCores Node.js SDK.

## 🚀 New Features Overview

### 1. Complete SQL Support

#### Table Management Operations
- **CREATE TABLE** with all column types and constraints
- **ALTER TABLE** (ADD/DROP/MODIFY columns)
- **DROP TABLE** with CASCADE options
- **DESCRIBE TABLE** for schema inspection
- **SHOW TABLES** with pattern filtering

#### Index Management
- **CREATE INDEX** with single and composite columns
- **DROP INDEX** with IF EXISTS support
- **SHOW INDEXES** for performance analysis

#### Transaction Support
- **BEGIN TRANSACTION** with isolation levels
- **COMMIT** and **ROLLBACK** operations
- Automatic timeout handling
- Transaction context tracking

#### Batch Operations
- **Batch INSERT** with conflict resolution
- **Batch UPDATE** with multiple conditions
- **Batch DELETE** with bulk operations
- Configurable batch sizes and error handling

#### Advanced SQL Features
- **Prepared Statements** for performance
- **Common Table Expressions (CTEs)** for complex queries
- **Window Functions** with partitioning and ordering
- **JSON Operations** for JSONB column manipulation

### 2. Vector Operations

#### Vector Arithmetic
- Vector addition and subtraction
- Scalar multiplication
- Dot product calculation
- Vector magnitude and normalization

#### Similarity Functions
- Cosine similarity
- L2 (Euclidean) distance
- Inner product

#### Vector Search
- K-nearest neighbors (KNN) search
- Range-based similarity search
- Hybrid search (vector + SQL filters)

### 3. Enhanced Error Handling

#### Specialized Error Types
- `SQLError` with severity levels and position information
- `VectorError` with dimension mismatch details
- `TransactionError` with transaction state tracking
- `BatchOperationError` with failed item details

## 📋 Installation and Setup

```bash
npm install @synapcores/nodejs-sdk
```

## 🔧 Basic Usage

### Initialize the Client

```typescript
import { SynapCores } from '@synapcores/nodejs-sdk';

const client = new SynapCores({
  host: 'localhost',
  port: 8080,
  apiKey: 'aidb_your_api_key_here',
  useHttps: false,
  timeout: 30000,
});
```

### Table Management

```typescript
import { ColumnDefinition, CreateTableOptions } from '@synapcores/nodejs-sdk';

// Define table schema
const columns: ColumnDefinition[] = [
  {
    name: 'id',
    dataType: 'INTEGER',
    constraints: [{ type: 'PRIMARY_KEY' }]
  },
  {
    name: 'name',
    dataType: 'VARCHAR(255)',
    constraints: [{ type: 'NOT_NULL' }]
  },
  {
    name: 'embedding',
    dataType: 'VECTOR(1536)'
  }
];

// Create table
const options: CreateTableOptions = {
  ifNotExists: true,
  constraints: [
    {
      type: 'CHECK',
      columns: ['name'],
      expression: \"name != ''\"
    }
  ]
};

await client.createTable('products', columns, options);
```

### Transaction Management

```typescript
import { TransactionOptions } from '@synapcores/nodejs-sdk';

const transactionOptions: TransactionOptions = {
  isolationLevel: 'READ_COMMITTED',
  readOnly: false,
  timeout: 10000
};

const transaction = await client.beginTransaction(transactionOptions);

try {
  // Perform multiple operations
  await client.sql('INSERT INTO products (name) VALUES (?)', ['Product 1']);
  await client.sql('INSERT INTO products (name) VALUES (?)', ['Product 2']);
  
  await client.commitTransaction();
} catch (error) {
  await client.rollbackTransaction();
  throw error;
}
```

### Batch Operations

```typescript
import { BatchInsertOptions } from '@synapcores/nodejs-sdk';

const batchOptions: BatchInsertOptions = {
  tableName: 'products',
  columns: ['id', 'name', 'price'],
  rows: [
    { id: 1, name: 'Product 1', price: 99.99 },
    { id: 2, name: 'Product 2', price: 149.99 },
    { id: 3, name: 'Product 3', price: 199.99 }
  ],
  onConflict: 'REPLACE',
  batchSize: 1000
};

const result = await client.batchInsert(batchOptions);
console.log(`Processed: ${result.successful}/${result.totalProcessed}`);
```

### Vector Operations

```typescript
// Vector arithmetic
const vector1 = [1.0, 2.0, 3.0, 4.0];
const vector2 = [0.5, 1.5, 2.5, 3.5];

const addResult = await client.vectorAdd(vector1, vector2);
const dotProduct = await client.vectorDotProduct(vector1, vector2);

// Vector similarity
const similarity = await client.cosineSimilarity(vector1, vector2);
const distance = await client.l2Distance(vector1, vector2);

// Vector search
import { KNNSearchOptions } from '@synapcores/nodejs-sdk';

const searchOptions: KNNSearchOptions = {
  queryVector: [1.0, 2.0, 3.0, /* ... */],
  k: 5,
  tableName: 'products',
  vectorColumn: 'embedding',
  metadataColumns: ['id', 'name', 'price'],
  filter: { price: { '$lte': 200 } }
};

const results = await client.knnSearch(searchOptions);
```

### Advanced SQL Features

```typescript
// Common Table Expressions
import { CTEDefinition } from '@synapcores/nodejs-sdk';

const ctes: CTEDefinition[] = [
  {
    name: 'high_value_products',
    query: 'SELECT * FROM products WHERE price > 100'
  },
  {
    name: 'product_stats',
    query: 'SELECT COUNT(*) as count, AVG(price) as avg_price FROM high_value_products'
  }
];

const result = await client.queryWithCTEs(
  ctes,
  'SELECT * FROM product_stats'
);

// Prepared Statements
const stmt = await client.prepareStatement(
  'SELECT * FROM products WHERE price > ? AND category = ?',
  { name: 'find_products_by_price_category' }
);

const products = await client.executePrepared(stmt.id, [100, 'electronics']);

// JSON Operations
await client.jsonQuery(
  'products',
  'metadata',
  'update',
  'last_updated',
  new Date().toISOString(),
  \"id = 1\"
);
```

## 📊 Examples

### Complete Demo
See `examples/complete-sql-vector-demo.ts` for a comprehensive demonstration of all features.

### SQL-Focused Demo
See `examples/sql-operations-demo.ts` for detailed SQL operation examples.

### Vector-Focused Demo
See `examples/vector-operations-demo.ts` for comprehensive vector operation examples.

## 🔍 API Reference

### Table Management Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `createTable()` | Creates a new table | `tableName`, `columns`, `options?` |
| `alterTable()` | Modifies table structure | `tableName`, `alterOptions` |
| `dropTable()` | Drops a table | `tableName`, `options?` |
| `describeTable()` | Gets table information | `tableName` |
| `showTables()` | Lists all tables | `pattern?` |

### Index Management Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `createIndex()` | Creates an index | `indexDefinition` |
| `dropIndex()` | Drops an index | `indexName`, `options?` |
| `showIndexes()` | Lists indexes | `tableName?` |

### Transaction Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `beginTransaction()` | Starts a transaction | `options?` |
| `commitTransaction()` | Commits current transaction | - |
| `rollbackTransaction()` | Rolls back current transaction | - |
| `getCurrentTransaction()` | Gets transaction context | - |

### Batch Operation Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `batchInsert()` | Batch insert operations | `options` |
| `batchUpdate()` | Batch update operations | `options` |
| `batchDelete()` | Batch delete operations | `options` |

### Vector Operation Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `vectorAdd()` | Vector addition | `vector1`, `vector2` |
| `vectorSubtract()` | Vector subtraction | `vector1`, `vector2` |
| `vectorScalarMultiply()` | Scalar multiplication | `vector`, `scalar` |
| `vectorDotProduct()` | Dot product | `vector1`, `vector2` |
| `cosineSimilarity()` | Cosine similarity | `vector1`, `vector2` |
| `l2Distance()` | L2 distance | `vector1`, `vector2` |
| `innerProduct()` | Inner product | `vector1`, `vector2` |
| `knnSearch()` | K-nearest neighbors | `options` |
| `rangeSearch()` | Range-based search | `options` |
| `hybridSearch()` | Hybrid search | `options` |
| `normalizeVector()` | Vector normalization | `vector` |
| `vectorMagnitude()` | Vector magnitude | `vector` |

### Advanced SQL Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `prepareStatement()` | Prepares a statement | `sql`, `options?` |
| `executePrepared()` | Executes prepared statement | `statementId`, `params?` |
| `deallocatePrepared()` | Deallocates statement | `statementId` |
| `queryWithCTEs()` | Executes CTE query | `ctes`, `mainQuery`, `params?` |
| `queryWithWindowFunctions()` | Window function query | `selectQuery`, `windowFunctions`, `params?` |
| `jsonQuery()` | JSON operations | `tableName`, `jsonColumn`, `operation`, `path`, `value?`, `whereClause?` |

## 🚨 Error Handling

### Error Types

```typescript
import {
  SQLError,
  VectorError,
  TransactionError,
  BatchOperationError
} from '@synapcores/nodejs-sdk';

try {
  await client.vectorAdd([1, 2, 3], [1, 2]); // Dimension mismatch
} catch (error) {
  if (error instanceof VectorError) {
    console.log(`Vector error: ${error.message}`);
    console.log(`Expected dimensions: ${error.expectedDimensions}`);
    console.log(`Actual dimensions: ${error.vectorDimensions}`);
  }
}

try {
  await client.sql('INVALID SQL SYNTAX');
} catch (error) {
  if (error instanceof SQLError) {
    console.log(`SQL error: ${error.message}`);
    console.log(`Severity: ${error.severity}`);
    console.log(`Position: ${error.position}`);
    console.log(`Hint: ${error.hint}`);
  }
}
```

## ⚡ Performance Considerations

### Vector Operations
- Vector operations scale efficiently up to 10M vectors
- Use batch operations for bulk vector processing
- Consider vector normalization for better similarity results

### SQL Operations
- Use prepared statements for repeated queries
- Leverage indexes for query performance
- Use transactions for data consistency
- Batch operations are optimized for large datasets

### Best Practices

1. **Connection Management**
   - Reuse client instances
   - Set appropriate timeouts
   - Handle connection errors gracefully

2. **Transaction Management**
   - Keep transactions short
   - Always handle rollbacks
   - Use appropriate isolation levels

3. **Vector Operations**
   - Normalize vectors when appropriate
   - Use appropriate similarity metrics
   - Filter results with SQL for hybrid search

4. **Error Handling**
   - Catch specific error types
   - Implement retry logic for transient errors
   - Log errors for debugging

## 🔗 Integration with AIDB Features

This SDK integrates seamlessly with AIDB's advanced features:

- **AI/ML Functions**: Use `embed()`, `classify()`, `predict()` with your data
- **Natural Language**: Convert text to SQL with built-in NL2SQL
- **Multimedia**: Store and process images, audio, video with specialized types
- **AutoML**: Train and deploy models directly from your data

## 📚 Additional Resources

- [AIDB SQL Manual](../../AIDB_SQL_MANUAL.md)
- [AIDB Technical Manual](../../AIDB_SQL_TECHNICAL_MANUAL_V2.md)
- [Complete API Documentation](./docs/api.md)
- [Performance Tuning Guide](./docs/performance.md)

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any improvements.

## 📄 License

This SDK is licensed under the MIT License. See LICENSE file for details."