# Examples Directory

This directory contains example code demonstrating how to use the SynapCores Node.js SDK.

## Example Files

### Basic Examples

- **`api-key-auth.ts`** - Demonstrates API key authentication
  - ✅ Updated to support both `ak_` and `aidb_` API key formats
  - ✅ Uses new `executeQuery()` method
  - ✅ Uses new `createCollectionWithSchema()` method

- **`quickstart.ts`** - Quick start guide with basic operations
  - ✅ Updated to use new collection schema format
  - ✅ Uses new `executeQuery()` method with proper format

### Advanced Examples

- **`sql-operations-demo.ts`** - Comprehensive SQL operations demo
  - ⚠️ Uses legacy `sql()` method (still works for backward compatibility)
  - Consider updating to use `executeQuery()` for new code
  - Demonstrates: table management, indexes, transactions, batch operations, CTEs, window functions

- **`vector-operations-demo.ts`** - Vector operations and similarity search
  - ⚠️ Uses legacy `sql()` method in some places
  - Demonstrates: vector arithmetic, similarity functions, KNN search, range search, hybrid search

- **`complete-sql-vector-demo.ts`** - Complete feature demonstration
  - ⚠️ Uses legacy `sql()` method (backward compatible)
  - Shows all features: SQL operations, vector operations, analytics

- **`quick-validation.ts`** - Type checking and validation
  - ✅ Tests type definitions and method signatures
  - No API calls, safe to run without server

## Running Examples

```bash
# Install dependencies
npm install

# Run a specific example (requires AIDB server running)
npx ts-node examples/api-key-auth.ts

# Or compile first
npm run build
node dist/examples/api-key-auth.js
```

## Migration Notes

### Legacy `sql()` method

The legacy `sql()` method still works but is deprecated. For new code, use:

```typescript
// ❌ Legacy (deprecated but still works)
const result = await client.sql('SELECT * FROM products');

// ✅ New (recommended)
const result = await client.executeQuery({
  sql: 'SELECT * FROM products',
  parameters: [],
});
```

### Collection Schema Format

```typescript
// ❌ Legacy format (still works)
await client.createCollection({
  name: 'products',
  schema: {
    name: 'string',
    price: 'number',
  },
});

// ✅ New format (recommended, matches integration guide)
await client.createCollectionWithSchema({
  name: 'products',
  description: 'Product catalog',
  schema: {
    fields: [
      { name: 'name', type: 'string', required: true },
      { name: 'price', type: 'number', required: true },
    ],
    indexes: [
      { name: 'name_idx', fields: ['name'], type: 'btree' },
    ],
  },
});
```

### Query Result Format

The new `executeQuery()` method returns results in array format:

```typescript
// Result format:
{
  columns: [
    { name: 'id', data_type: 'string', nullable: false },
    { name: 'name', data_type: 'string', nullable: false },
  ],
  rows: [
    ['prod_001', 'Laptop'],
    ['prod_002', 'Mouse'],
  ],
  execution_time_ms: 45,
  rows_affected: 0,
}

// Convert to objects if needed:
const columnNames = result.columns.map(c => c.name);
const objects = result.rows.map(row => {
  const obj: Record<string, any> = {};
  columnNames.forEach((name, idx) => {
    obj[name] = row[idx];
  });
  return obj;
});
```

## Prerequisites

- Node.js 18+ or later
- AIDB server running (for examples that make API calls)
- Valid API key or JWT token

## Environment Variables

Set these before running examples:

```bash
export AIDB_API_KEY="ak_prod_your_key_here"
# or for JWT authentication:
export AIDB_JWT_TOKEN="your_jwt_token_here"
```

