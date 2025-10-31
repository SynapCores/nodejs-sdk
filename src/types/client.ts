/**
 * Type definitions for SynapCores client
 */

export interface SynapCoresConfig {
  host?: string;
  port?: number;
  apiKey?: string;
  jwtToken?: string;
  useHttps?: boolean;
  timeout?: number;
  maxRetries?: number;
  rejectUnauthorized?: boolean;
}

export interface QueryColumn {
  name: string;
  data_type: string;
  nullable: boolean;
}

export interface QueryResult {
  columns: QueryColumn[];
  rows: any[][];
  rows_affected?: number;
  execution_time_ms: number;
  queryPlan?: Record<string, any>;
}

export interface EmbedOptions {
  model?: string;
}

export interface EmbedResult {
  embedding: number[];
  model: string;
  dimensions: number;
}

// SQL Table Management Types
export interface ColumnDefinition {
  name: string;
  dataType: string;
  constraints?: ColumnConstraint[];
  defaultValue?: any;
}

export interface ColumnConstraint {
  type: 'PRIMARY_KEY' | 'UNIQUE' | 'NOT_NULL' | 'CHECK' | 'FOREIGN_KEY' | 'DEFAULT';
  expression?: string;
  referencedTable?: string;
  referencedColumn?: string;
}

export interface TableConstraint {
  type: 'PRIMARY_KEY' | 'UNIQUE' | 'CHECK' | 'FOREIGN_KEY';
  columns: string[];
  expression?: string;
  referencedTable?: string;
  referencedColumns?: string[];
}

export interface CreateTableOptions {
  ifNotExists?: boolean;
  constraints?: TableConstraint[];
  partitionBy?: {
    type: 'RANGE' | 'LIST' | 'HASH';
    column: string;
  };
}

export interface AlterTableOptions {
  action: 'ADD_COLUMN' | 'DROP_COLUMN' | 'RENAME_COLUMN' | 'ALTER_COLUMN' | 'ADD_CONSTRAINT' | 'DROP_CONSTRAINT';
  columnName?: string;
  newColumnName?: string;
  columnDefinition?: ColumnDefinition;
  newDataType?: string;
  constraint?: TableConstraint;
  constraintName?: string;
}

export interface IndexDefinition {
  name: string;
  tableName: string;
  columns: Array<{
    name: string;
    order?: 'ASC' | 'DESC';
  }>;
  unique?: boolean;
  ifNotExists?: boolean;
}

export interface TableInfo {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    defaultValue?: any;
    isPrimaryKey: boolean;
    isUnique: boolean;
  }>;
  constraints: TableConstraint[];
  indexes: Array<{
    name: string;
    columns: string[];
    unique: boolean;
  }>;
}

// Transaction Types
export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  readOnly?: boolean;
  timeout?: number;
}

export interface TransactionContext {
  id: string;
  startTime: Date;
  isolationLevel: string;
  readOnly: boolean;
}

// Batch Operation Types
export interface BatchInsertOptions {
  tableName: string;
  columns?: string[];
  rows: Record<string, any>[];
  onConflict?: 'IGNORE' | 'REPLACE' | 'UPDATE';
  batchSize?: number;
}

export interface BatchUpdateOptions {
  tableName: string;
  updates: Array<{
    set: Record<string, any>;
    where: Record<string, any>;
  }>;
  batchSize?: number;
}

export interface BatchDeleteOptions {
  tableName: string;
  whereConditions: Record<string, any>[];
  batchSize?: number;
}

export interface BatchResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
  tookMs: number;
}

// Advanced SQL Types
export interface PreparedStatement {
  id: string;
  sql: string;
  parameterCount: number;
}

export interface PreparedStatementOptions {
  name?: string;
  parameterTypes?: string[];
}

export interface CTEDefinition {
  name: string;
  columns?: string[];
  query: string;
}

export interface WindowFunctionOptions {
  partitionBy?: string[];
  orderBy?: Array<{
    column: string;
    direction: 'ASC' | 'DESC';
  }>;
  frame?: {
    type: 'ROWS' | 'RANGE';
    start: string;
    end?: string;
  };
}

// Vector Operation Types
export interface Vector {
  values: number[];
  dimensions: number;
}

export interface VectorArithmeticResult {
  result: Vector;
  operation: string;
  tookMs: number;
}

export interface VectorSimilarityResult {
  similarity: number;
  distance?: number;
  function: 'cosine' | 'euclidean' | 'inner_product' | 'l2';
  tookMs: number;
}

export interface VectorSearchOptions {
  vector: number[];
  k?: number;
  threshold?: number;
  metric?: 'cosine' | 'euclidean' | 'inner_product' | 'l2';
  filter?: Record<string, any>;
}

export interface VectorSearchResult {
  id: string;
  vector: number[];
  similarity: number;
  distance: number;
  metadata?: Record<string, any>;
}

export interface HybridSearchOptions extends VectorSearchOptions {
  textQuery?: string;
  sqlFilter?: string;
  weights?: {
    vector: number;
    text: number;
  };
}

export interface KNNSearchOptions {
  queryVector: number[];
  k: number;
  tableName: string;
  vectorColumn: string;
  metadataColumns?: string[];
  filter?: Record<string, any>;
}

export interface RangeSearchOptions {
  queryVector: number[];
  threshold: number;
  tableName: string;
  vectorColumn: string;
  metadataColumns?: string[];
  filter?: Record<string, any>;
  maxResults?: number;
}

// Enhanced Error Types
export interface SQLError extends Error {
  code: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  position?: number;
  hint?: string;
  detail?: string;
}

export interface VectorError extends Error {
  code: string;
  vectorDimensions?: number;
  expectedDimensions?: number;
  operation?: string;
}

// Performance and Monitoring Types
export interface QueryPerformance {
  queryId: string;
  sql: string;
  executionTimeMs: number;
  rowsAffected: number;
  memoryUsageMB: number;
  indexesUsed: string[];
  partitionsPruned?: number;
}

export interface ConnectionPool {
  active: number;
  idle: number;
  total: number;
  maxConnections: number;
  waitingRequests: number;
}

// Authentication Types
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  roles: string[];
  created_at: string;
  last_login: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// API Key Management Types
export interface CreateAPIKeyRequest {
  name: string;
  permission: 'ReadOnly' | 'FullAccess';
  expires_in_days?: number;
}

export interface APIKeyInfo {
  id: string;
  name: string;
  key_preview: string;
  permission: 'ReadOnly' | 'FullAccess';
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  last_used: string | null;
  usage_count: number;
}

export interface CreateAPIKeyResponse {
  api_key: APIKeyInfo;
  raw_key: string;
}

export interface ListAPIKeysResponse {
  keys: APIKeyInfo[];
  total: number;
}

export interface APIKeyStats {
  total_requests: number;
  requests_last_24h: number;
  requests_last_7d: number;
  requests_last_30d: number;
  last_request_at: string | null;
  most_used_endpoints: Array<{
    endpoint: string;
    method: string;
    count: number;
    percentage: number;
  }>;
}

// Query Execution Types
export interface ExecuteQueryRequest {
  sql: string;
  parameters?: any[];
  max_rows?: number;
  timeout_secs?: number;
}

export interface BatchQueryRequest {
  queries: Array<{
    sql: string;
    parameters?: any[];
  }>;
  transactional?: boolean;
}

export interface BatchQueryResult {
  type: 'success' | 'error';
  data?: QueryResult;
  error?: {
    message: string;
    code: string;
  };
}

export interface BatchQueryResponse {
  results: BatchQueryResult[];
  total_execution_time_ms: number;
}

// Collection Management Types (matching guide format)
export interface CollectionFieldDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array' | 'vector' | 'image' | 'audio' | 'video';
  required: boolean;
  description?: string;
}

export interface CollectionIndexDefinition {
  name: string;
  fields: string[];
  type: 'btree' | 'hash' | 'vector' | 'text';
  unique?: boolean;
}

export interface CollectionSchemaDefinition {
  fields: CollectionFieldDefinition[];
  indexes?: CollectionIndexDefinition[];
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
  schema?: CollectionSchemaDefinition;
}

export interface CollectionInfo {
  id: string;
  name: string;
  description?: string;
  schema?: CollectionSchemaDefinition;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionResponse {
  collection: CollectionInfo;
}

export interface ListCollectionsResponse {
  collections: CollectionInfo[];
  total: number;
  page: number;
  pageSize: number;
}

// Multimedia Types
export interface UploadMultimediaRequest {
  file: File | Blob | Buffer;
  metadata?: Record<string, any>;
}

export interface MultimediaInfo {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  content_type: string;
  document_id: string;
  collection: string;
  storage_path: string;
  uploaded_at: string;
  metadata?: Record<string, any>;
  extracted_text?: string | null;
  thumbnail_url?: string;
}

export interface ListMultimediaResponse {
  items: Array<{
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    uploaded_at: string;
  }>;
  total: number;
  limit: number;
  offset: number;
}