# AIDB Frontend Integration Guide

**Version**: 1.0.0
**Last Updated**: October 2025
**Target Audience**: Frontend Developers building SaaS solutions

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Registration](#1-user-registration)
4. [API Key Management](#2-api-key-management)
5. [SQL Query Execution](#3-sql-query-execution)
6. [Multimedia File Uploads](#4-multimedia-file-uploads)
7. [Collection Management](#5-collection-management)
8. [Authentication & Authorization](#6-authentication--authorization)
9. [Tenant Isolation](#7-tenant-isolation)
10. [Error Handling](#8-error-handling)
11. [Complete Integration Example](#9-complete-integration-example)
12. [Best Practices](#10-best-practices)

---

## Introduction

AIDB is a SQL 2026-compliant database with enhanced features including:

- **Native Tenant Isolation**: Automatic multi-tenant data separation
- **AI/ML Functions**: Built-in embeddings, semantic search, and vector operations
- **Multimedia Support**: Native handling of images, audio, video, and documents
- **RESTful API**: Complete HTTP API for all database operations
- **Programmatic Access**: API key authentication for SaaS integrations

This guide provides comprehensive documentation for integrating AIDB into frontend applications, with a focus on building multi-tenant SaaS solutions.

---

## Getting Started

### Prerequisites

- Node.js 18+ or modern browser with Fetch API
- AIDB backend instance running
- Basic understanding of REST APIs and SQL
- test 
### Base Configuration

All API requests use a base URL configured via environment variables:

```bash
# Development
VITE_API_URL=http://localhost:8080

# Production
VITE_API_URL=https://api.yourdomain.com
```

### Request Format

All requests use JSON:

```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer <token>' // or 'X-API-Key': '<api_key>'
}
```

---

## 1. User Registration

### Endpoint

```
POST /v1/auth/register
```

### Request Body

```json
{
  "username": "acme_admin",
  "email": "admin@acme.com",
  "password": "SecurePass123!"
}
```

### Validation Rules

| Field | Requirement |
|-------|------------|
| **username** | 3-64 characters, alphanumeric + underscores/hyphens |
| **email** | Valid email format |
| **password** | Min 8 chars, must contain uppercase, lowercase, and number |

### Response

```json
{
  "id": "usr_abc123",
  "username": "acme_admin",
  "email": "admin@acme.com",
  "is_active": true,
  "is_verified": false,
  "roles": ["user"],
  "created_at": "2025-10-31T10:00:00Z",
  "last_login": null
}
```

### Key Features

- **Automatic Tenant Assignment**: Each new user gets a unique tenant ID
- **Waitlist Support**: `is_active: false` indicates user is waitlisted
- **Password Strength Validation**: Client-side and server-side validation
- **Auto-login**: Active users are automatically logged in after registration

### Implementation Example

```javascript
// Vanilla JavaScript
async function registerUser(username, email, password) {
  const response = await fetch('http://localhost:8080/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  const user = await response.json();

  if (!user.is_active) {
    alert('You have been added to the waitlist');
    return null;
  }

  return user;
}

// Usage
try {
  const user = await registerUser('acme_admin', 'admin@acme.com', 'SecurePass123!');
  console.log('Registered user:', user.id);
} catch (error) {
  console.error('Registration failed:', error.message);
}
```

### React Example

```typescript
import { useState } from 'react';

function RegistrationForm() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error.message);
      }

      const user = await response.json();

      if (user.is_active) {
        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        setError('You have been added to the waitlist');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}

      <input
        type="text"
        placeholder="Username"
        value={formData.username}
        onChange={(e) => setFormData({...formData, username: e.target.value})}
        required
      />

      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({...formData, password: e.target.value})}
        minLength={8}
        required
      />

      <button type="submit">Register</button>
    </form>
  );
}
```

---

## 2. API Key Management

API keys enable programmatic access to AIDB without user sessions, essential for SaaS integrations.

### Create API Key

**Endpoint**: `POST /v1/api-keys`

**Request Body**:
```json
{
  "name": "Production API",
  "permission": "ReadOnly",
  "expires_in_days": 90
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Descriptive name for the key |
| `permission` | enum | Yes | `"ReadOnly"` or `"FullAccess"` |
| `expires_in_days` | number | No | 1-365 days, omit for no expiration |

**Response**:
```json
{
  "api_key": {
    "id": "key_xyz789",
    "name": "Production API",
    "key_preview": "ak_prod_xyz...abc",
    "permission": "ReadOnly",
    "is_active": true,
    "expires_at": "2026-01-29T10:00:00Z",
    "created_at": "2025-10-31T10:00:00Z",
    "last_used": null,
    "usage_count": 0
  },
  "raw_key": "ak_prod_xyz789abc123def456ghi789jkl012mno345pqr678stu901vwx234"
}
```

**CRITICAL**: `raw_key` is shown **only once**. Store it securely immediately!

### List API Keys

**Endpoint**: `GET /v1/api-keys`

**Response**:
```json
{
  "keys": [
    {
      "id": "key_xyz789",
      "name": "Production API",
      "key_preview": "ak_prod_xyz...abc",
      "permission": "ReadOnly",
      "is_active": true,
      "expires_at": "2026-01-29T10:00:00Z",
      "created_at": "2025-10-31T10:00:00Z",
      "last_used": "2025-10-31T15:30:00Z",
      "usage_count": 1247
    }
  ],
  "total": 1
}
```

### Get API Key Statistics

**Endpoint**: `GET /v1/api-keys/{keyId}/stats`

**Response**:
```json
{
  "total_requests": 1247,
  "requests_last_24h": 89,
  "requests_last_7d": 543,
  "requests_last_30d": 1247,
  "last_request_at": "2025-10-31T15:30:00Z",
  "most_used_endpoints": [
    {
      "endpoint": "/v1/query/execute",
      "method": "POST",
      "count": 892,
      "percentage": 71.5
    },
    {
      "endpoint": "/v1/collections",
      "method": "GET",
      "count": 234,
      "percentage": 18.8
    }
  ]
}
```

### Revoke API Key

**Endpoint**: `DELETE /v1/api-keys/{keyId}`

**Response**: `204 No Content`

### Implementation Example

```javascript
class APIKeyManager {
  constructor(baseUrl, authToken) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  async createAPIKey(name, permission, expiresInDays = null) {
    const response = await fetch(`${this.baseUrl}/v1/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        name,
        permission,
        ...(expiresInDays && { expires_in_days: expiresInDays })
      })
    });

    if (!response.ok) throw new Error('Failed to create API key');

    const data = await response.json();

    // IMPORTANT: Save raw_key immediately!
    console.warn('Save this key - it will not be shown again:', data.raw_key);

    return data;
  }

  async listAPIKeys() {
    const response = await fetch(`${this.baseUrl}/v1/api-keys`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    if (!response.ok) throw new Error('Failed to list API keys');

    return await response.json();
  }

  async getKeyStats(keyId) {
    const response = await fetch(`${this.baseUrl}/v1/api-keys/${keyId}/stats`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    if (!response.ok) throw new Error('Failed to get key stats');

    return await response.json();
  }

  async revokeAPIKey(keyId) {
    const response = await fetch(`${this.baseUrl}/v1/api-keys/${keyId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    if (!response.ok) throw new Error('Failed to revoke API key');

    return true;
  }
}

// Usage
const manager = new APIKeyManager('http://localhost:8080', 'your_jwt_token');

// Create a new API key
const result = await manager.createAPIKey('Production API', 'ReadOnly', 90);
alert(`Save this key: ${result.raw_key}`);

// List all keys
const { keys } = await manager.listAPIKeys();
console.log('Active API keys:', keys.length);

// Get usage stats
const stats = await manager.getKeyStats('key_xyz789');
console.log(`Total requests: ${stats.total_requests}`);
```

### Security Best Practices

1. **Never expose raw API keys** in client-side code or version control
2. **Store keys securely** in environment variables or secure vaults
3. **Use ReadOnly permission** unless write access is required
4. **Set expiration dates** for time-limited integrations
5. **Monitor usage** regularly via statistics endpoint
6. **Revoke immediately** if a key is compromised

---

## 3. SQL Query Execution

Execute SQL queries via REST API with full SQL 2026 compliance and AI/ML extensions.

### Execute Query

**Endpoint**: `POST /v1/query/execute`

**Request Body**:
```json
{
  "sql": "SELECT * FROM products WHERE category = 'electronics' LIMIT 10",
  "parameters": [],
  "max_rows": 1000,
  "timeout_secs": 300
}
```

**Parameters**:
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sql` | string | Yes | - | SQL query to execute |
| `parameters` | array | No | `[]` | Parameterized query values |
| `max_rows` | number | No | `1000` | Maximum rows to return |
| `timeout_secs` | number | No | `300` | Query timeout in seconds |

**Response**:
```json
{
  "columns": [
    {
      "name": "id",
      "data_type": "string",
      "nullable": false
    },
    {
      "name": "name",
      "data_type": "string",
      "nullable": false
    },
    {
      "name": "price",
      "data_type": "number",
      "nullable": true
    }
  ],
  "rows": [
    ["prod_001", "Laptop", 1299.99],
    ["prod_002", "Mouse", 29.99],
    ["prod_003", "Keyboard", 89.99]
  ],
  "rows_affected": 0,
  "execution_time_ms": 45
}
```

### Parameterized Queries

Use parameterized queries to prevent SQL injection:

```javascript
// UNSAFE - vulnerable to SQL injection
const query = `SELECT * FROM users WHERE email = '${userInput}'`;

// SAFE - using parameters
const query = 'SELECT * FROM users WHERE email = $1';
const parameters = [userInput];

const response = await fetch('/v1/query/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ sql: query, parameters })
});
```

### Batch Queries

Execute multiple queries in a single request:

**Endpoint**: `POST /v1/query/execute/batch`

**Request Body**:
```json
{
  "queries": [
    {
      "sql": "SELECT COUNT(*) FROM products",
      "parameters": []
    },
    {
      "sql": "SELECT AVG(price) FROM products WHERE category = $1",
      "parameters": ["electronics"]
    },
    {
      "sql": "INSERT INTO audit_log (action, timestamp) VALUES ($1, $2)",
      "parameters": ["batch_query", "2025-10-31T10:00:00Z"]
    }
  ],
  "transactional": false
}
```

**Response**:
```json
{
  "results": [
    {
      "type": "success",
      "data": {
        "columns": [{"name": "count", "data_type": "number", "nullable": false}],
        "rows": [[1547]],
        "execution_time_ms": 12
      }
    },
    {
      "type": "success",
      "data": {
        "columns": [{"name": "avg", "data_type": "number", "nullable": true}],
        "rows": [[342.56]],
        "execution_time_ms": 18
      }
    },
    {
      "type": "success",
      "data": {
        "rows_affected": 1,
        "execution_time_ms": 8
      }
    }
  ],
  "total_execution_time_ms": 38
}
```

### AI/ML Query Functions

AIDB includes built-in AI/ML functions:

#### Text Embeddings
```sql
-- Generate embedding vector
SELECT EMBED('search query text', 'minilm') as embedding;

-- Semantic similarity
SELECT
  id,
  title,
  COSINE_SIMILARITY(
    embedding,
    EMBED('search query', 'minilm')
  ) as similarity
FROM documents
ORDER BY similarity DESC
LIMIT 10;
```

#### Multimedia Functions
```sql
-- Extract text from image/PDF
SELECT EXTRACT_TEXT(multimedia_id) as text FROM documents;

-- Extract video frames
SELECT EXTRACT_FRAMES(multimedia_id, 5) as frames FROM videos;

-- Get media duration
SELECT DURATION(multimedia_id) as duration_seconds FROM videos;
```

#### Vector Operations
```sql
-- Vector math
SELECT VECTOR_ADD(embedding1, embedding2) as sum;
SELECT VECTOR_DOT(embedding1, embedding2) as dot_product;
SELECT VECTOR_NORMALIZE(embedding) as normalized;
```

### Implementation Example

```javascript
class QueryService {
  constructor(baseUrl, authToken) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  async executeQuery(sql, parameters = [], options = {}) {
    const response = await fetch(`${this.baseUrl}/v1/query/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        sql,
        parameters,
        max_rows: options.maxRows || 1000,
        timeout_secs: options.timeout || 300
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    return await response.json();
  }

  async executeBatch(queries, transactional = false) {
    const response = await fetch(`${this.baseUrl}/v1/query/execute/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({ queries, transactional })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    return await response.json();
  }

  // Helper: Convert rows to objects
  rowsToObjects(queryResult) {
    const { columns, rows } = queryResult;
    return rows.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col.name] = row[idx];
      });
      return obj;
    });
  }
}

// Usage examples
const qs = new QueryService('http://localhost:8080', 'your_jwt_token');

// Simple query
const result = await qs.executeQuery('SELECT * FROM products LIMIT 5');
console.log('Rows:', result.rows);
console.log('Execution time:', result.execution_time_ms, 'ms');

// Parameterized query
const userEmail = 'user@example.com';
const userResult = await qs.executeQuery(
  'SELECT * FROM users WHERE email = $1',
  [userEmail]
);

// Convert to objects
const users = qs.rowsToObjects(userResult);
console.log('Users:', users);

// Semantic search with AI
const searchResult = await qs.executeQuery(`
  SELECT
    id,
    title,
    content,
    COSINE_SIMILARITY(
      embedding,
      EMBED('artificial intelligence', 'minilm')
    ) as relevance
  FROM articles
  WHERE embedding IS NOT NULL
  ORDER BY relevance DESC
  LIMIT 10
`);

const articles = qs.rowsToObjects(searchResult);
console.log('Relevant articles:', articles);

// Batch execution
const batchResults = await qs.executeBatch([
  { sql: 'SELECT COUNT(*) as total FROM products' },
  { sql: 'SELECT AVG(price) as avg_price FROM products' },
  { sql: 'SELECT category, COUNT(*) as count FROM products GROUP BY category' }
]);

batchResults.results.forEach((result, idx) => {
  if (result.type === 'success') {
    console.log(`Query ${idx + 1}:`, result.data.rows);
  } else {
    console.error(`Query ${idx + 1} failed:`, result.data.message);
  }
});
```

---

## 4. Multimedia File Uploads

Upload and manage images, videos, audio, and documents with automatic processing and metadata extraction.

### Upload Multimedia to Existing Document

**Endpoint**: `POST /v1/multimedia/{collection}/documents/{documentId}/multimedia`

**Request**: `multipart/form-data`

**Form Fields**:
- `file`: The actual file (required)
- `metadata`: JSON string with additional metadata (optional)

**Example Request**:
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('metadata', JSON.stringify({
  description: 'Product photo',
  tags: ['product', 'catalog', 'photography'],
  custom_field: 'value'
}));

const response = await fetch(
  '/v1/multimedia/products/documents/prod_123/multimedia',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  }
);
```

**Response**:
```json
{
  "id": "media_xyz789",
  "file_name": "laptop-photo.jpg",
  "file_type": "image/jpeg",
  "file_size": 2457600,
  "content_type": "image/jpeg",
  "document_id": "prod_123",
  "collection": "products",
  "storage_path": "/uploads/tenant_abc/products/prod_123/media_xyz789.jpg",
  "uploaded_at": "2025-10-31T10:00:00Z",
  "metadata": {
    "description": "Product photo",
    "tags": ["product", "catalog", "photography"],
    "custom_field": "value"
  },
  "extracted_text": null,
  "thumbnail_url": "/v1/multimedia/products/documents/prod_123/multimedia/media_xyz789/thumbnail"
}
```

### Get Multimedia URL

**Endpoint**: `GET /v1/multimedia/{collection}/documents/{documentId}/multimedia/{multimediaId}`

Returns the file with appropriate `Content-Type` header for browser display/download.

### Download Multimedia

**Endpoint**: `GET /v1/multimedia/{collection}/documents/{documentId}/multimedia/{multimediaId}?download=true`

Forces download with `Content-Disposition: attachment` header.

### List Multimedia in Document

**Endpoint**: `GET /v1/multimedia/{collection}/documents/{documentId}/multimedia`

**Query Parameters**:
- `limit`: Number of items (default: 50)
- `offset`: Pagination offset (default: 0)

**Response**:
```json
{
  "items": [
    {
      "id": "media_xyz789",
      "file_name": "laptop-photo.jpg",
      "file_type": "image/jpeg",
      "file_size": 2457600,
      "uploaded_at": "2025-10-31T10:00:00Z"
    }
  ],
  "total": 5,
  "limit": 50,
  "offset": 0
}
```

### Delete Multimedia

**Endpoint**: `DELETE /v1/multimedia/{collection}/documents/{documentId}/multimedia/{multimediaId}`

**Response**: `204 No Content`

### Supported File Types

| Category | MIME Types | Extensions |
|----------|-----------|-----------|
| **Images** | image/jpeg, image/png, image/gif, image/webp, image/svg+xml | .jpg, .jpeg, .png, .gif, .webp, .svg |
| **Videos** | video/mp4, video/webm, video/x-msvideo, video/quicktime | .mp4, .webm, .avi, .mov |
| **Audio** | audio/mpeg, audio/wav, audio/ogg, audio/mp4 | .mp3, .wav, .ogg, .m4a |
| **Documents** | application/pdf | .pdf |

### File Size Limits

- Default maximum: **100MB per file**
- Configurable per deployment
- Exceeding limit returns `413 Payload Too Large`

### Implementation Example

```javascript
class MediaUploader {
  constructor(baseUrl, authToken) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  async uploadToDocument(collection, documentId, file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);

    if (Object.keys(metadata).length > 0) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await fetch(
      `${this.baseUrl}/v1/multimedia/${collection}/documents/${documentId}/multimedia`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    return await response.json();
  }

  async listDocumentMedia(collection, documentId, limit = 50, offset = 0) {
    const response = await fetch(
      `${this.baseUrl}/v1/multimedia/${collection}/documents/${documentId}/multimedia?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      }
    );

    if (!response.ok) throw new Error('Failed to list media');

    return await response.json();
  }

  getMediaUrl(collection, documentId, mediaId) {
    return `${this.baseUrl}/v1/multimedia/${collection}/documents/${documentId}/multimedia/${mediaId}`;
  }

  getDownloadUrl(collection, documentId, mediaId) {
    return `${this.baseUrl}/v1/multimedia/${collection}/documents/${documentId}/multimedia/${mediaId}?download=true`;
  }

  getThumbnailUrl(collection, documentId, mediaId) {
    return `${this.baseUrl}/v1/multimedia/${collection}/documents/${documentId}/multimedia/${mediaId}/thumbnail`;
  }

  async deleteMedia(collection, documentId, mediaId) {
    const response = await fetch(
      `${this.baseUrl}/v1/multimedia/${collection}/documents/${documentId}/multimedia/${mediaId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      }
    );

    if (!response.ok) throw new Error('Failed to delete media');

    return true;
  }
}

// React component example
function FileUploadComponent() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const uploader = new MediaUploader('http://localhost:8080', authToken);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size
    if (file.size > 100 * 1024 * 1024) {
      alert('File too large. Maximum size is 100MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Unsupported file type');
      return;
    }

    setUploading(true);

    try {
      const result = await uploader.uploadToDocument(
        'products',
        'prod_123',
        file,
        {
          description: file.name,
          uploaded_by: 'user_id',
          tags: ['product', 'media']
        }
      );

      console.log('Uploaded:', result.id);
      console.log('URL:', uploader.getMediaUrl('products', 'prod_123', result.id));

      alert('File uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
        accept="image/*,video/*,application/pdf"
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

### Media Gallery Example

```javascript
function MediaGallery({ collection, documentId }) {
  const [media, setMedia] = useState([]);
  const uploader = new MediaUploader('http://localhost:8080', authToken);

  useEffect(() => {
    loadMedia();
  }, [collection, documentId]);

  const loadMedia = async () => {
    const result = await uploader.listDocumentMedia(collection, documentId);
    setMedia(result.items);
  };

  const handleDelete = async (mediaId) => {
    if (!confirm('Delete this file?')) return;

    await uploader.deleteMedia(collection, documentId, mediaId);
    await loadMedia(); // Reload
  };

  return (
    <div className="media-gallery">
      {media.map(item => (
        <div key={item.id} className="media-item">
          {item.file_type.startsWith('image/') && (
            <img
              src={uploader.getThumbnailUrl(collection, documentId, item.id)}
              alt={item.file_name}
            />
          )}

          <div className="media-info">
            <p>{item.file_name}</p>
            <p>{(item.file_size / 1024).toFixed(2)} KB</p>
          </div>

          <div className="media-actions">
            <a
              href={uploader.getMediaUrl(collection, documentId, item.id)}
              target="_blank"
            >
              View
            </a>
            <a
              href={uploader.getDownloadUrl(collection, documentId, item.id)}
            >
              Download
            </a>
            <button onClick={() => handleDelete(item.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 5. Collection Management

Collections are containers for documents, similar to tables in traditional databases.

### Create Collection

**Endpoint**: `POST /v1/collections`

**Request Body**:
```json
{
  "name": "customer_profiles",
  "description": "Customer data with structured schema",
  "schema": {
    "fields": [
      {
        "name": "id",
        "type": "string",
        "required": true,
        "description": "Unique customer ID"
      },
      {
        "name": "name",
        "type": "string",
        "required": true
      },
      {
        "name": "email",
        "type": "string",
        "required": true
      },
      {
        "name": "age",
        "type": "number",
        "required": false
      },
      {
        "name": "profile_image",
        "type": "image",
        "required": false
      },
      {
        "name": "preferences",
        "type": "object",
        "required": false
      },
      {
        "name": "tags",
        "type": "array",
        "required": false
      },
      {
        "name": "created_at",
        "type": "date",
        "required": true
      }
    ],
    "indexes": [
      {
        "name": "email_idx",
        "fields": ["email"],
        "type": "btree",
        "unique": true
      }
    ]
  }
}
```

**Response**:
```json
{
  "collection": {
    "id": "coll_abc123",
    "name": "customer_profiles",
    "description": "Customer data with structured schema",
    "schema": { ... },
    "documentCount": 0,
    "createdAt": "2025-10-31T10:00:00Z",
    "updatedAt": "2025-10-31T10:00:00Z"
  }
}
```

### Collection Naming Rules

| Rule | Description |
|------|-------------|
| **Length** | 3-64 characters |
| **Characters** | Letters, numbers, underscores only |
| **Reserved** | Cannot use: `users`, `system`, `admin`, `tenants`, `metadata`, `config` |
| **Case** | Case-sensitive, lowercase recommended |

### Schema Field Types

| Type | SQL Equivalent | Description | Example |
|------|---------------|-------------|---------|
| `string` | VARCHAR | Text data | "John Doe" |
| `number` | NUMERIC | Integer or decimal | 42, 3.14 |
| `boolean` | BOOLEAN | True/false | true |
| `date` | TIMESTAMP | Date and time | "2025-10-31T10:00:00Z" |
| `object` | JSON | Nested objects | {"key": "value"} |
| `array` | JSON ARRAY | Lists | [1, 2, 3] |
| `vector` | VECTOR | AI embeddings | [0.1, 0.2, ...] |
| `image` | VARCHAR | Image file reference | "media_xyz" |
| `audio` | VARCHAR | Audio file reference | "media_abc" |
| `video` | VARCHAR | Video file reference | "media_def" |

### Index Types

| Type | Use Case | Performance |
|------|----------|-------------|
| `btree` | Range queries, sorting | General purpose |
| `hash` | Exact matches | Fast equality |
| `vector` | Similarity search | AI/ML queries |
| `text` | Full-text search | Text searching |

### List Collections

**Endpoint**: `GET /v1/collections`

**Query Parameters**:
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 20)
- `search`: Filter by name (optional)
- `sortBy`: Sort field (default: "name")
- `sortOrder`: "asc" or "desc" (default: "asc")

**Response**:
```json
{
  "collections": [
    {
      "id": "coll_abc123",
      "name": "customer_profiles",
      "description": "Customer data",
      "documentCount": 1547,
      "createdAt": "2025-10-31T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

### Get Collection

**Endpoint**: `GET /v1/collections/{name}`

**Response**: Same as creation response

### Update Collection

**Endpoint**: `PUT /v1/collections/{name}`

**Request Body**: Same as creation (can update description, add fields/indexes)

### Delete Collection

**Endpoint**: `DELETE /v1/collections/{name}`

**Response**: `204 No Content`

**Warning**: Deletes all documents and multimedia in the collection!

### Implementation Example

```javascript
class CollectionManager {
  constructor(baseUrl, authToken) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  async createCollection(name, description, schema = null) {
    const response = await fetch(`${this.baseUrl}/v1/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        name,
        description,
        ...(schema && { schema })
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    return await response.json();
  }

  async listCollections(options = {}) {
    const params = new URLSearchParams({
      page: options.page || 1,
      pageSize: options.pageSize || 20,
      sortBy: options.sortBy || 'name',
      sortOrder: options.sortOrder || 'asc',
      ...(options.search && { search: options.search })
    });

    const response = await fetch(
      `${this.baseUrl}/v1/collections?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      }
    );

    if (!response.ok) throw new Error('Failed to list collections');

    return await response.json();
  }

  async getCollection(name) {
    const response = await fetch(`${this.baseUrl}/v1/collections/${name}`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Collection '${name}' not found`);
      }
      throw new Error('Failed to get collection');
    }

    return await response.json();
  }

  async deleteCollection(name) {
    if (!confirm(`Delete collection '${name}' and ALL its data?`)) {
      return false;
    }

    const response = await fetch(`${this.baseUrl}/v1/collections/${name}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    if (!response.ok) throw new Error('Failed to delete collection');

    return true;
  }
}

// Usage examples
const cm = new CollectionManager('http://localhost:8080', 'your_jwt_token');

// Create flexible collection (no schema)
await cm.createCollection(
  'my_documents',
  'General document storage'
);

// Create structured collection with schema
await cm.createCollection(
  'products',
  'Product catalog with images and embeddings',
  {
    fields: [
      { name: 'sku', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'price', type: 'number', required: true },
      { name: 'category', type: 'string', required: true },
      { name: 'in_stock', type: 'boolean', required: true },
      { name: 'images', type: 'array', required: false },
      { name: 'embedding', type: 'vector', required: false },
      { name: 'created_at', type: 'date', required: true }
    ],
    indexes: [
      { name: 'sku_idx', fields: ['sku'], type: 'btree', unique: true },
      { name: 'category_idx', fields: ['category'], type: 'btree' },
      { name: 'vector_idx', fields: ['embedding'], type: 'vector' }
    ]
  }
);

// List all collections
const { collections, total } = await cm.listCollections();
console.log(`Found ${total} collections:`, collections);

// Search collections
const results = await cm.listCollections({ search: 'customer' });

// Get specific collection
const collection = await cm.getCollection('products');
console.log('Document count:', collection.documentCount);
```

---

## 6. Authentication & Authorization

### JWT Token Authentication

Used for user sessions in web applications.

#### Login

**Endpoint**: `POST /v1/auth/login`

**Request Body**:
```json
{
  "username": "acme_admin",
  "password": "SecurePass123!"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### Using JWT Tokens

```javascript
// Include in Authorization header
headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

#### Token Storage

**Best Practice**: Use `sessionStorage` (NOT `localStorage`)

```javascript
// After login
const { access_token } = await loginResponse.json();
sessionStorage.setItem('auth_token', access_token);

// For subsequent requests
const token = sessionStorage.getItem('auth_token');
```

**Benefits of sessionStorage**:
- Tab-specific isolation
- Automatic cleanup on tab close
- Better security than localStorage
- Supports multi-tab sessions

#### Token Refresh

**Endpoint**: `POST /v1/auth/refresh`

```javascript
async function refreshToken() {
  const response = await fetch('/v1/auth/refresh', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${currentToken}`
    }
  });

  const { access_token } = await response.json();
  sessionStorage.setItem('auth_token', access_token);
  return access_token;
}
```

### API Key Authentication

Used for programmatic/server-to-server access.

#### Using API Keys

```javascript
// Include in X-API-Key header
headers: {
  'X-API-Key': 'ak_prod_xyz789abc123def456ghi789jkl012mno345pqr678stu901vwx234'
}
```

**Example**:
```javascript
const response = await fetch('https://api.aidb.com/v1/query/execute', {
  method: 'POST',
  headers: {
    'X-API-Key': process.env.AIDB_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sql: 'SELECT * FROM products LIMIT 10'
  })
});
```

### Permission Levels

| Permission | Capabilities |
|-----------|-------------|
| **ReadOnly** | SELECT queries, GET endpoints only |
| **FullAccess** | All operations including INSERT, UPDATE, DELETE |

### Authentication Flow

```javascript
class AuthManager {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.tokenKey = 'auth_token';
  }

  async login(username, password) {
    const response = await fetch(`${this.baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) throw new Error('Login failed');

    const { access_token, expires_in } = await response.json();

    // Store token
    sessionStorage.setItem(this.tokenKey, access_token);

    // Set expiration reminder
    const expiresAt = Date.now() + (expires_in * 1000);
    sessionStorage.setItem('token_expires_at', expiresAt);

    return access_token;
  }

  async logout() {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem('token_expires_at');
  }

  getToken() {
    const token = sessionStorage.getItem(this.tokenKey);
    const expiresAt = sessionStorage.getItem('token_expires_at');

    if (!token) return null;

    // Check if expired
    if (expiresAt && Date.now() > parseInt(expiresAt)) {
      this.logout();
      return null;
    }

    return token;
  }

  isAuthenticated() {
    return this.getToken() !== null;
  }

  async refreshToken() {
    const currentToken = this.getToken();
    if (!currentToken) throw new Error('No token to refresh');

    const response = await fetch(`${this.baseUrl}/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`
      }
    });

    if (!response.ok) {
      this.logout();
      throw new Error('Token refresh failed');
    }

    const { access_token, expires_in } = await response.json();

    sessionStorage.setItem(this.tokenKey, access_token);
    sessionStorage.setItem('token_expires_at', Date.now() + (expires_in * 1000));

    return access_token;
  }
}

// Usage
const auth = new AuthManager('http://localhost:8080');

// Login
await auth.login('username', 'password');

// Check authentication
if (auth.isAuthenticated()) {
  const token = auth.getToken();
  // Use token for API calls
}

// Logout
auth.logout();
```

---

## 7. Tenant Isolation

AIDB provides **automatic multi-tenant data isolation** at the database level.

### How It Works

1. **Registration**: Each user is assigned a unique `tenant_id`
2. **JWT Claims**: `tenant_id` embedded in JWT token
3. **Automatic Filtering**: All queries automatically scoped to tenant
4. **Row-Level Security**: Database enforces isolation

### Frontend Considerations

**No manual tenant filtering required!**

```javascript
// ✅ Correct - backend handles tenant scoping
const collections = await apiClient.get('/v1/collections');
// Returns only collections for authenticated user's tenant

// ❌ Incorrect - don't manually add tenant_id
const collections = await apiClient.get('/v1/collections?tenant_id=xyz');
// Not needed - tenant_id extracted from JWT automatically
```

### Multi-User SaaS Requirements

For a SaaS to operate properly with multiple users:

1. **API Keys**: Create separate API keys for programmatic access
2. **User Management**: Each user registers individually
3. **Tenant Sharing**: Users within same organization share tenant_id
4. **Invitations**: Invite system assigns existing tenant_id to new users

### Tenant Isolation Guarantees

| Aspect | Isolation Level |
|--------|----------------|
| **Collections** | Per-tenant namespacing |
| **Documents** | Row-level security |
| **Multimedia** | Storage path isolation |
| **Queries** | Automatic WHERE clause injection |
| **API Keys** | Scoped to creating user's tenant |

### Implementation Notes

```javascript
// The backend automatically:
// 1. Extracts tenant_id from JWT
// 2. Adds WHERE tenant_id = <extracted_id> to queries
// 3. Prevents cross-tenant data access
// 4. Isolates file storage paths

// Frontend just makes normal requests:
const products = await queryService.executeQuery(
  'SELECT * FROM products WHERE category = $1',
  ['electronics']
);

// Backend transforms to:
// SELECT * FROM products
// WHERE category = 'electronics'
// AND tenant_id = 'tenant_abc123'  <-- Added automatically
```

---

## 8. Error Handling

### Standard Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "received": "invalid-email"
    },
    "timestamp": "2025-10-31T10:00:00Z",
    "requestId": "req_xyz789"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| **200** | Success | Query executed |
| **201** | Created | Collection created |
| **204** | No Content | Resource deleted |
| **400** | Bad Request | Invalid JSON |
| **401** | Unauthorized | Invalid/expired token |
| **403** | Forbidden | Insufficient permissions |
| **404** | Not Found | Collection doesn't exist |
| **409** | Conflict | Duplicate name |
| **413** | Payload Too Large | File exceeds 100MB |
| **422** | Validation Error | Invalid schema |
| **429** | Rate Limit Exceeded | Too many requests |
| **500** | Internal Server Error | Database error |
| **503** | Service Unavailable | Maintenance mode |

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|-----------|
| `AUTH_FAILED` | Authentication failed | Check credentials |
| `TOKEN_EXPIRED` | JWT token expired | Refresh token |
| `INVALID_API_KEY` | API key invalid | Check key value |
| `PERMISSION_DENIED` | Insufficient permissions | Upgrade API key permission |
| `VALIDATION_ERROR` | Input validation failed | Check request format |
| `RESOURCE_NOT_FOUND` | Resource doesn't exist | Verify resource name/ID |
| `DUPLICATE_RESOURCE` | Resource already exists | Use unique name |
| `QUERY_ERROR` | SQL execution failed | Check SQL syntax |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Implement backoff |
| `FILE_TOO_LARGE` | File exceeds limit | Compress or split file |

### Error Handling Patterns

```javascript
class APIClient {
  constructor(baseUrl, authManager) {
    this.baseUrl = baseUrl;
    this.authManager = authManager;
  }

  async request(endpoint, options = {}) {
    const token = this.authManager.getToken();

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);

      // Handle different status codes
      if (response.status === 401) {
        // Token expired - try refresh
        const newToken = await this.authManager.refreshToken();

        // Retry with new token
        config.headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, config);

        if (!retryResponse.ok) {
          throw new APIError(retryResponse.status, 'Authentication failed after refresh');
        }

        return await retryResponse.json();
      }

      if (response.status === 429) {
        // Rate limited - implement exponential backoff
        const retryAfter = response.headers.get('Retry-After') || 60;
        throw new RateLimitError(`Rate limited. Retry after ${retryAfter} seconds`);
      }

      if (!response.ok) {
        const error = await response.json();
        throw new APIError(
          response.status,
          error.error.message,
          error.error.code,
          error.error.details
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null;
      }

      return await response.json();

    } catch (error) {
      if (error instanceof APIError || error instanceof RateLimitError) {
        throw error;
      }

      // Network error
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new NetworkError('Network connection failed. Check your internet connection.');
      }

      // Unknown error
      throw new Error(`Unexpected error: ${error.message}`);
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Custom error classes
class APIError extends Error {
  constructor(status, message, code, details) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}

class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Usage with user feedback
async function executeQueryWithFeedback(sql) {
  try {
    const result = await apiClient.post('/v1/query/execute', { sql });
    console.log('Success:', result);
    return result;

  } catch (error) {
    if (error instanceof APIError) {
      switch (error.status) {
        case 400:
          alert(`Invalid request: ${error.message}`);
          break;
        case 401:
          alert('Your session has expired. Please log in again.');
          window.location.href = '/login';
          break;
        case 403:
          alert('You don\'t have permission to perform this action.');
          break;
        case 404:
          alert('Resource not found.');
          break;
        case 422:
          alert(`Validation error: ${error.message}`);
          console.log('Details:', error.details);
          break;
        case 500:
          alert('Server error. Please try again later.');
          break;
        default:
          alert(`Error: ${error.message}`);
      }
    } else if (error instanceof NetworkError) {
      alert('Network connection lost. Please check your internet.');
    } else if (error instanceof RateLimitError) {
      alert('Too many requests. Please wait a moment.');
    } else {
      alert('An unexpected error occurred.');
      console.error('Unexpected error:', error);
    }

    throw error;
  }
}
```

### Retry Logic with Exponential Backoff

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }

      if (response.ok) {
        return await response.json();
      }

      // Server error (5xx) - retry
      throw new Error(`Server error: ${response.status}`);

    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} retries: ${lastError.message}`);
}
```

---

## 9. Complete Integration Example

This section demonstrates a complete end-to-end SaaS application workflow.

### Scenario: Document Management SaaS

Build a SaaS application for document management with:
- User registration
- API key for external integrations
- Document collection with AI-powered search
- PDF upload with text extraction
- Semantic search across documents

### Complete Implementation

```javascript
// ============================================
// 1. Setup & Configuration
// ============================================

const AIDB_BASE_URL = 'https://api.aidb.com';

// ============================================
// 2. User Registration & Login
// ============================================

async function setupNewTenant() {
  // Register new user (creates tenant automatically)
  const registerResponse = await fetch(`${AIDB_BASE_URL}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'acme_admin',
      email: 'admin@acme.com',
      password: 'SecurePass123!'
    })
  });

  const user = await registerResponse.json();
  console.log('Created user:', user.id);

  // Login to get JWT token
  const loginResponse = await fetch(`${AIDB_BASE_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'acme_admin',
      password: 'SecurePass123!'
    })
  });

  const { access_token } = await loginResponse.json();
  sessionStorage.setItem('auth_token', access_token);

  return access_token;
}

// ============================================
// 3. Create API Key for Programmatic Access
// ============================================

async function createProductionAPIKey(authToken) {
  const response = await fetch(`${AIDB_BASE_URL}/v1/api-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: 'Production Integration',
      permission: 'FullAccess',
      expires_in_days: 90
    })
  });

  const result = await response.json();

  // CRITICAL: Save this key - shown only once!
  console.warn('⚠️ SAVE THIS API KEY:', result.raw_key);

  return result.raw_key;
}

// ============================================
// 4. Create Document Collection
// ============================================

async function createDocumentCollection(authToken) {
  const response = await fetch(`${AIDB_BASE_URL}/v1/collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: 'customer_documents',
      description: 'Customer documents with AI-powered search',
      schema: {
        fields: [
          { name: 'customer_id', type: 'string', required: true },
          { name: 'document_name', type: 'string', required: true },
          { name: 'document_type', type: 'string', required: true },
          { name: 'content_text', type: 'string', required: false },
          { name: 'embedding', type: 'vector', required: false },
          { name: 'tags', type: 'array', required: false },
          { name: 'uploaded_at', type: 'date', required: true },
          { name: 'processed', type: 'boolean', required: true }
        ],
        indexes: [
          { name: 'customer_idx', fields: ['customer_id'], type: 'btree' },
          { name: 'vector_idx', fields: ['embedding'], type: 'vector' },
          { name: 'uploaded_idx', fields: ['uploaded_at'], type: 'btree' }
        ]
      }
    })
  });

  const collection = await response.json();
  console.log('Created collection:', collection.name);

  return collection;
}

// ============================================
// 5. Upload PDF Document
// ============================================

async function uploadDocument(authToken, customerId, file) {
  // Step 1: Create document record
  const createDocResponse = await fetch(`${AIDB_BASE_URL}/v1/query/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      sql: `
        INSERT INTO customer_documents
        (customer_id, document_name, document_type, uploaded_at, processed)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      parameters: [
        customerId,
        file.name,
        'pdf',
        new Date().toISOString(),
        false
      ]
    })
  });

  const docResult = await createDocResponse.json();
  const documentId = docResult.rows[0][0];

  console.log('Created document:', documentId);

  // Step 2: Upload file
  const formData = new FormData();
  formData.append('file', file);
  formData.append('metadata', JSON.stringify({
    customer_id: customerId,
    uploaded_by: 'admin',
    document_type: 'pdf'
  }));

  const uploadResponse = await fetch(
    `${AIDB_BASE_URL}/v1/multimedia/customer_documents/documents/${documentId}/multimedia`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    }
  );

  const multimedia = await uploadResponse.json();
  console.log('Uploaded file:', multimedia.id);

  return { documentId, multimediaId: multimedia.id };
}

// ============================================
// 6. Process Document (Extract Text + Embedding)
// ============================================

async function processDocument(authToken, documentId, multimediaId) {
  // Step 1: Extract text from PDF
  const extractResponse = await fetch(`${AIDB_BASE_URL}/v1/query/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      sql: `
        UPDATE customer_documents
        SET content_text = EXTRACT_TEXT('${multimediaId}')
        WHERE id = $1
        RETURNING content_text
      `,
      parameters: [documentId]
    })
  });

  const extractResult = await extractResponse.json();
  const extractedText = extractResult.rows[0][0];

  console.log('Extracted text length:', extractedText.length);

  // Step 2: Generate and store embedding
  const embedResponse = await fetch(`${AIDB_BASE_URL}/v1/query/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      sql: `
        UPDATE customer_documents
        SET
          embedding = EMBED(content_text, 'minilm'),
          processed = true
        WHERE id = $1
      `,
      parameters: [documentId]
    })
  });

  await embedResponse.json();
  console.log('Generated embedding for document:', documentId);

  return true;
}

// ============================================
// 7. Semantic Search
// ============================================

async function searchDocuments(authToken, query, customerId = null, limit = 10) {
  const sql = `
    SELECT
      id,
      customer_id,
      document_name,
      content_text,
      tags,
      uploaded_at,
      COSINE_SIMILARITY(
        embedding,
        EMBED($1, 'minilm')
      ) as relevance
    FROM customer_documents
    WHERE
      embedding IS NOT NULL
      AND processed = true
      ${customerId ? 'AND customer_id = $2' : ''}
    ORDER BY relevance DESC
    LIMIT ${limit}
  `;

  const parameters = customerId ? [query, customerId] : [query];

  const response = await fetch(`${AIDB_BASE_URL}/v1/query/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ sql, parameters })
  });

  const result = await response.json();

  // Convert to objects
  const documents = result.rows.map(row => ({
    id: row[0],
    customer_id: row[1],
    document_name: row[2],
    content_text: row[3],
    tags: row[4],
    uploaded_at: row[5],
    relevance: row[6]
  }));

  return documents;
}

// ============================================
// 8. Complete Workflow
// ============================================

async function completeWorkflow() {
  try {
    console.log('🚀 Starting AIDB SaaS Integration...\n');

    // 1. Setup tenant
    console.log('1️⃣ Setting up tenant...');
    const authToken = await setupNewTenant();
    console.log('✅ Tenant created and logged in\n');

    // 2. Create API key
    console.log('2️⃣ Creating API key...');
    const apiKey = await createProductionAPIKey(authToken);
    console.log('✅ API key created:', apiKey.substring(0, 20) + '...\n');

    // 3. Create collection
    console.log('3️⃣ Creating collection...');
    await createDocumentCollection(authToken);
    console.log('✅ Collection created\n');

    // 4. Upload document
    console.log('4️⃣ Uploading document...');
    const file = document.getElementById('fileInput').files[0];
    const { documentId, multimediaId } = await uploadDocument(
      authToken,
      'cust_123',
      file
    );
    console.log('✅ Document uploaded\n');

    // 5. Process document
    console.log('5️⃣ Processing document (extract text + embedding)...');
    await processDocument(authToken, documentId, multimediaId);
    console.log('✅ Document processed\n');

    // 6. Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 7. Search documents
    console.log('6️⃣ Searching documents...');
    const results = await searchDocuments(
      authToken,
      'contract payment terms',
      'cust_123',
      5
    );
    console.log('✅ Found', results.length, 'relevant documents:');
    results.forEach((doc, idx) => {
      console.log(`  ${idx + 1}. ${doc.document_name} (${(doc.relevance * 100).toFixed(1)}% relevant)`);
    });

    console.log('\n🎉 Integration complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// ============================================
// 9. React Component Integration
// ============================================

function DocumentManagementApp() {
  const [authToken, setAuthToken] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Initialize on mount
  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      setAuthToken(token);
      loadDocuments(token);
    }
  }, []);

  const loadDocuments = async (token) => {
    const response = await fetch(`${AIDB_BASE_URL}/v1/query/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sql: 'SELECT * FROM customer_documents ORDER BY uploaded_at DESC LIMIT 50'
      })
    });

    const result = await response.json();
    // Convert to objects and set state
    setDocuments(result.rows);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const { documentId, multimediaId } = await uploadDocument(
        authToken,
        'cust_123',
        file
      );

      await processDocument(authToken, documentId, multimediaId);

      alert('Document uploaded and processed!');
      await loadDocuments(authToken);

    } catch (error) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    const results = await searchDocuments(authToken, searchQuery);
    setSearchResults(results);
  };

  return (
    <div className="app">
      <header>
        <h1>Document Management SaaS</h1>
      </header>

      <section className="upload">
        <h2>Upload Document</h2>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          disabled={uploading}
        />
        {uploading && <p>Uploading and processing...</p>}
      </section>

      <section className="search">
        <h2>Semantic Search</h2>
        <input
          type="text"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button onClick={handleSearch}>Search</button>

        <div className="results">
          {searchResults.map(doc => (
            <div key={doc.id} className="result">
              <h3>{doc.document_name}</h3>
              <p>Relevance: {(doc.relevance * 100).toFixed(1)}%</p>
              <p>{doc.content_text.substring(0, 200)}...</p>
            </div>
          ))}
        </div>
      </section>

      <section className="documents">
        <h2>All Documents ({documents.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Customer</th>
              <th>Uploaded</th>
              <th>Processed</th>
            </tr>
          </thead>
          <tbody>
            {documents.map(doc => (
              <tr key={doc[0]}>
                <td>{doc[2]}</td>
                <td>{doc[3]}</td>
                <td>{doc[1]}</td>
                <td>{new Date(doc[6]).toLocaleDateString()}</td>
                <td>{doc[7] ? '✅' : '⏳'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

---

## 10. Best Practices

### Security

1. **Never expose API keys** in client-side code or public repositories
2. **Use HTTPS** in production (never HTTP)
3. **Validate user input** before sending to API
4. **Use parameterized queries** to prevent SQL injection
5. **Store tokens in sessionStorage**, not localStorage
6. **Implement token refresh** before expiration
7. **Set API key expiration** for time-limited access
8. **Use ReadOnly permission** unless write access is required
9. **Monitor API key usage** regularly
10. **Revoke compromised keys** immediately

### Performance

1. **Use batch queries** for multiple operations
2. **Limit result sets** with `max_rows` parameter
3. **Create indexes** on frequently queried fields
4. **Cache query results** when appropriate
5. **Use vector indexes** for similarity search
6. **Compress large files** before upload
7. **Implement pagination** for large datasets
8. **Use connection pooling** for server-side integrations
9. **Monitor query execution time** and optimize slow queries
10. **Use Content Delivery Networks** (CDN) for multimedia files

### Error Handling

1. **Always handle errors** with try-catch
2. **Provide user-friendly messages** instead of technical errors
3. **Log errors** for debugging
4. **Implement retry logic** for transient failures
5. **Use exponential backoff** for rate limits
6. **Validate responses** before using data
7. **Handle network errors** gracefully
8. **Display loading states** during async operations
9. **Implement timeout handling** for long-running queries
10. **Track error rates** and alert on anomalies

### Data Management

1. **Validate data** before insertion
2. **Use schemas** for structured collections
3. **Tag multimedia** with meaningful metadata
4. **Clean up unused files** periodically
5. **Archive old data** to improve performance
6. **Backup critical collections** regularly
7. **Test queries** on sample data first
8. **Document your schema** for team members
9. **Version your data structures** as they evolve
10. **Monitor storage usage** and set limits

### Development Workflow

1. **Use environment variables** for configuration
2. **Test in development** before production deployment
3. **Version your API client** library
4. **Document API usage** for your team
5. **Create reusable components** for common operations
6. **Write unit tests** for critical functions
7. **Use TypeScript** for type safety
8. **Monitor API usage** and costs
9. **Implement feature flags** for gradual rollout
10. **Keep dependencies updated** regularly
