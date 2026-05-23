/**
 * Main client for SynapCores SDK
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Collection } from './collection';
import {
  VectorCollection,
  CreateVectorCollectionOptions,
  VectorCollectionInfo,
} from './vector_collection';
import { AutoMLClient } from './automl';
import { NLPClient } from './nlp';
import { RecipeClient } from './recipes';
import { SchemaClient } from './schema';
import { ImportExportClient } from './import';
import { IntegrationClient } from './integrations';
import { BackupClient } from './backup';
import { GraphClient } from './graph';
import { NL2SqlClient } from './nl2sql';
import { FilesystemCollectionsClient } from './filesystem';
import { ChatClient } from './chat';
import { MultimodalClient } from './multimodal';
import { SystemClient } from './system';
import { TransactionsClient } from './transactions';
import { McpClient } from './mcp';
import {
  SynapCoresConfig,
  QueryResult,
  EmbedOptions,
  ColumnDefinition,
  CreateTableOptions,
  AlterTableOptions,
  IndexDefinition,
  TableInfo,
  TransactionOptions,
  TransactionContext,
  BatchInsertOptions,
  BatchUpdateOptions,
  BatchDeleteOptions,
  BatchResult,
  PreparedStatement,
  PreparedStatementOptions,
  CTEDefinition,
  WindowFunctionOptions,
  VectorArithmeticResult,
  VectorSimilarityResult,
  VectorSearchResult,
  HybridSearchOptions,
  KNNSearchOptions,
  RangeSearchOptions,
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  CreateAPIKeyRequest,
  CreateAPIKeyResponse,
  ListAPIKeysResponse,
  APIKeyStats,
  ExecuteQueryRequest,
  BatchQueryRequest,
  BatchQueryResponse,
  CreateCollectionRequest,
  CreateCollectionResponse,
  ListCollectionsResponse,
  MultimediaInfo,
  ListMultimediaResponse,
} from './types/client';
import {
  ConnectionError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  ServerError,
  RateLimitError,
  SynapCoresError,
  VectorError,
} from './errors';
import { Document } from './types/collection';

export class SynapCores {
  private readonly config: Required<SynapCoresConfig>;
  private readonly httpClient: AxiosInstance;
  private readonly collectionsCache = new Map<string, Collection>();
  private currentTransaction: TransactionContext | null = null;
  private preparedStatements = new Map<string, PreparedStatement>();

  public readonly automl: AutoMLClient;
  public readonly nlp: NLPClient;
  public readonly recipes: RecipeClient;
  public readonly schema: SchemaClient;
  public readonly import: ImportExportClient;
  public readonly integrations: IntegrationClient;
  public readonly backup: BackupClient;
  public readonly graph: GraphClient;
  public readonly nl2sql: NL2SqlClient;
  public readonly filesystem: FilesystemCollectionsClient;
  public readonly chat: ChatClient;
  public readonly multimodal: MultimodalClient;
  public readonly system: SystemClient;
  public readonly transactions: TransactionsClient;
  public readonly mcp: McpClient;

  constructor(config: SynapCoresConfig = {}) {
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 8080,
      apiKey: config.apiKey || '',
      jwtToken: config.jwtToken || '',
      useHttps: config.useHttps || false,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      rejectUnauthorized: config.rejectUnauthorized !== undefined ? config.rejectUnauthorized : true,
    };

    // Validate API key format if provided (accept both ak_prod_ and aidb_ formats)
    if (this.config.apiKey && !this.config.apiKey.startsWith('ak_') && !this.config.apiKey.startsWith('aidb_')) {
      throw new Error(
        "Invalid API key format. API keys should start with 'ak_' or 'aidb_' prefix. " +
        "Please create a valid API key from your AIDB dashboard."
      );
    }

    const protocol = this.config.useHttps ? 'https' : 'http';
    const baseURL = `${protocol}://${this.config.host}:${this.config.port}/v1`;

    // For development with self-signed certificates
    const httpsAgent = this.config.useHttps && !this.config.rejectUnauthorized
      ? new (require('https').Agent)({ rejectUnauthorized: false })
      : undefined;

    // Determine authentication header.
    //
    // v0.4.0: gateway v1.6.5.2-ce only honours `Authorization: Bearer <token>`
    // for both JWTs and AIDB-issued API keys (`aidb_*` / `ak_*`). The earlier
    // `X-API-Key` shim that 0.2.0/0.3.0 emitted was rejected with HTTP 401
    // `missing_authorization`, forcing every caller to manually promote
    // API keys into `jwtToken` (OpenClaw v0.1.0 shipped that workaround).
    // Sending Bearer for every credential type makes the SDK match the
    // gateway and lets `apiKey: 'aidb_...'` Just Work.
    const authHeader: Record<string, string> = {};
    if (this.config.jwtToken) {
      authHeader['Authorization'] = `Bearer ${this.config.jwtToken}`;
    } else if (this.config.apiKey) {
      authHeader['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    this.httpClient = axios.create({
      baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'synapcores-nodejs/0.4.2',
        ...authHeader,
      },
      ...(httpsAgent && { httpsAgent }),
    });

    // Response interceptor: unwrap the standard gateway envelope + error handling.
    //
    // The gateway wraps EVERY success payload in a uniform envelope:
    //   { data: <payload>, meta: { request_id, timestamp } }
    // Unwrapping it once here means every method (and sub-client) receives the
    // bare payload and never has to special-case the envelope — which is what
    // previously caused executeQuery/prepare/embeddings to read `data.columns`
    // off the envelope and get `undefined`. Anything that isn't the envelope
    // (streams, already-bare payloads, future shapes) passes through untouched.
    this.httpClient.interceptors.response.use(
      (response) => {
        const body = response.data;
        const isEnvelope =
          body &&
          typeof body === 'object' &&
          !Array.isArray(body) &&
          'data' in body &&
          ('meta' in body || Object.keys(body).length === 1);
        if (isEnvelope) {
          response.data = (body as Record<string, unknown>).data;
        }
        return response;
      },
      (error) => this.handleError(error),
    );

    // Initialize sub-clients
    this.automl = new AutoMLClient(this);
    this.nlp = new NLPClient(this);
    this.recipes = new RecipeClient(this);
    this.schema = new SchemaClient(this);
    this.import = new ImportExportClient(this);
    this.integrations = new IntegrationClient(this);
    this.backup = new BackupClient(this);
    this.graph = new GraphClient(this);
    this.nl2sql = new NL2SqlClient(this);
    this.filesystem = new FilesystemCollectionsClient(this);
    this.chat = new ChatClient(this);
    this.multimodal = new MultimodalClient(this);
    this.system = new SystemClient(this);
    this.transactions = new TransactionsClient(this);
    this.mcp = new McpClient(this);
  }

  /**
   * Build the WebSocket base URL (ws:// or wss://).
   */
  _getWsBaseUrl(): string {
    const protocol = this.config.useHttps ? 'wss' : 'ws';
    return `${protocol}://${this.config.host}:${this.config.port}`;
  }

  /**
   * Read-only access to the configured host/port for WS-clients.
   */
  _getConfig(): Required<SynapCoresConfig> {
    return this.config;
  }

  /**
   * Exchange the current credentials (JWT or API key) for a short-lived
   * WebSocket ticket. Use the returned token as the `?token=` query
   * param when opening any /ws endpoint.
   */
  async createWsTicket(): Promise<{ token: string; expiresAt: number }> {
    const { data } = await this.httpClient.post('/ws/ticket', {});
    const token = data.token ?? data.ticket;
    const expiresAt =
      typeof data.expiresAt === 'number'
        ? data.expiresAt
        : data.expires_at
        ? Date.parse(data.expires_at)
        : Date.now() + 60_000;
    return { token, expiresAt };
  }

  /**
   * Revoke a previously-issued ticket (best-effort).
   */
  async revokeWsTicket(token: string): Promise<void> {
    await this.httpClient.post('/ws/ticket/revoke', { token });
  }

  private handleError(error: AxiosError): never {
    if (!error.response) {
      const message = error.code === 'ECONNREFUSED'
        ? `Failed to connect to SynapCores server at ${error.config?.baseURL}. Connection refused.`
        : `Failed to connect to SynapCores server: ${error.message}`;
      throw new ConnectionError(message);
    }

    const { status, data } = error.response;
    
    // Handle error format from database integration guide
    // Format: { error: { code, message, details, timestamp, requestId } }
    const errorData = data as any;
    const errorInfo = errorData?.error || errorData;
    const errorCode = errorInfo?.code;
    const errorMessage = errorInfo?.message || errorData?.message || 'An error occurred';
    const errorDetails = errorInfo?.details || errorData?.details || errorData;

    switch (status) {
      case 400:
        throw new ValidationError(
          errorMessage,
          errorDetails,
        );
      case 401:
        throw new AuthenticationError(
          errorMessage,
          errorDetails,
        );
      case 403:
        throw new AuthenticationError(
          errorMessage,
          errorDetails,
        );
      case 404:
        throw new NotFoundError(
          errorMessage,
          errorDetails,
        );
      case 409:
        throw new ValidationError(
          errorMessage,
          errorDetails,
        );
      case 413:
        throw new ValidationError(
          errorMessage || 'Payload too large',
          errorDetails,
        );
      case 422:
        throw new ValidationError(
          errorMessage,
          errorDetails?.errors || errorDetails,
        );
      case 429:
        const retryAfter = error.response.headers['retry-after'];
        throw new RateLimitError(
          errorMessage,
          retryAfter ? parseInt(retryAfter) : undefined,
          errorDetails,
        );
      case 500:
        throw new ServerError(
          errorMessage || 'Internal server error',
          errorDetails,
        );
      case 503:
        throw new ServerError(
          errorMessage || 'Service unavailable',
          errorDetails,
        );
      default:
        if (status >= 500) {
          throw new ServerError(
            errorMessage || `Server error: ${status}`,
            errorDetails,
          );
        }
        throw new SynapCoresError(
          errorMessage || `Unexpected error: ${status}`,
          errorCode || 'UNEXPECTED_ERROR',
          errorDetails,
        );
    }
  }

  /**
   * Create collection (legacy method for backward compatibility)
   */
  async createCollection(options: {
    name: string;
    schema?: Record<string, any>;
    [key: string]: any;
  }): Promise<Collection> {
    const request: CreateCollectionRequest = {
      name: options.name,
      description: options.description,
      schema: options.schema as any,
    };
    return this.createCollectionWithSchema(request);
  }

  /**
   * Create collection matching the database integration guide format
   */
  async createCollectionWithSchema(request: CreateCollectionRequest): Promise<Collection> {
    const { data } = await this.httpClient.post<CreateCollectionResponse>('/collections', {
      name: request.name,
      description: request.description,
      schema: request.schema,
    });
    
    const collection = new Collection(this, request.name, data.collection.schema);
    this.collectionsCache.set(request.name, collection);
    
    return collection;
  }

  async getCollection(name: string): Promise<Collection> {
    if (this.collectionsCache.has(name)) {
      return this.collectionsCache.get(name)!;
    }

    const { data } = await this.httpClient.get(`/collections/${name}`);

    const collection = new Collection(this, name, data.schema);
    this.collectionsCache.set(name, collection);

    return collection;
  }

  /**
   * Synchronous accessor that returns a Collection handle without round-tripping
   * to the gateway. Use this when you already know the collection exists and just
   * want to issue a vectorSearch / search / insert against it.
   *
   * v0.3.0: added so `client.collection(name).vectorSearch(...)` works without
   * a preceding await on getCollection().
   */
  collection(name: string): Collection {
    if (this.collectionsCache.has(name)) {
      return this.collectionsCache.get(name)!;
    }
    const c = new Collection(this, name);
    this.collectionsCache.set(name, c);
    return c;
  }

  /**
   * List collections (legacy method for backward compatibility)
   */
  async listCollections(): Promise<string[]> {
    const result = await this.listCollectionsDetailed();
    return (result.collections ?? []).map(c => c.name);
  }

  /**
   * List collections with detailed information matching the database integration guide format
   *
   * v0.3.0: gateway returns an envelope { data: { items, total, page, page_size, ... }, meta }.
   * We normalise that into the SDK's { collections, total, page, pageSize } shape and also
   * accept legacy { collections: [...] } / bare arrays for forward-compat.
   */
  async listCollectionsDetailed(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListCollectionsResponse> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);

    const { data } = await this.httpClient.get<any>(
      `/collections${params.toString() ? `?${params.toString()}` : ''}`
    );

    // Unwrap envelope: gateway v1.6.5 returns { data: { items, ... }, meta }.
    const inner = data?.data ?? data;
    const items: any[] = Array.isArray(inner)
      ? inner
      : (inner?.items ?? inner?.collections ?? []);

    return {
      collections: items,
      total: inner?.total ?? items.length,
      page: inner?.page ?? 1,
      pageSize: inner?.page_size ?? inner?.pageSize ?? items.length,
    };
  }
  
  async getDocuments(collectionName: string, page: number, pageSize: number): Promise<Document[]> {
    const { data } = await this.httpClient.get(
      `/collections/${collectionName}/documents?page=${page}&pageSize=${pageSize}`
    );
    return data;
  }

  async deleteCollection(name: string): Promise<void> {
    await this.httpClient.delete(`/collections/${name}`);
    this.collectionsCache.delete(name);
  }

  // =================================================================
  // VECTOR COLLECTIONS — /v1/vectors/collections/{name}
  //
  // The gateway exposes two parallel "collection" worlds:
  //  (a) document-store collections under /v1/collections (above), and
  //  (b) vector collections under /v1/vectors/collections (below).
  //
  // v0.3.0 only wrapped (a) so vector-first users had to drop down to
  // `_getHttpClient()` to call (b) directly. v0.4.0 adds first-class
  // helpers — `createVectorCollection`, `vectorCollection(name)`,
  // `listVectorCollections`, `deleteVectorCollection` — that target (b)
  // and return a typed `VectorCollection` handle.
  // =================================================================

  private readonly vectorCollectionsCache = new Map<string, VectorCollection>();

  /**
   * Create a vector collection.
   *
   * Wire: `POST /v1/vectors/collections` with
   * `{ name, dimensions, distance_metric }`. Distinct from
   * `createCollection`, which targets the document-store subsystem.
   *
   * @example
   *   const coll = await client.createVectorCollection({
   *     name: 'memory_v1', dimensions: 1536, distance_metric: 'cosine',
   *   });
   *   await coll.insert({ id: 'v1', values: [...], metadata: { ... } });
   */
  async createVectorCollection(
    options: CreateVectorCollectionOptions,
  ): Promise<VectorCollection> {
    await this.httpClient.post('/vectors/collections', {
      name: options.name,
      dimensions: options.dimensions,
      distance_metric: options.distance_metric ?? 'cosine',
    });
    const coll = new VectorCollection(this, options.name);
    this.vectorCollectionsCache.set(options.name, coll);
    return coll;
  }

  /**
   * Synchronous accessor for an existing vector collection. Does not
   * round-trip to the gateway — use `createVectorCollection` if you
   * need to provision the collection first, or `listVectorCollections`
   * to confirm existence.
   *
   * v0.4.0 split: this targets the **vector subsystem**
   * (`/v1/vectors/collections/{name}`). `client.collection(name)` still
   * returns a document-store `Collection` for the legacy subsystem.
   */
  vectorCollection(name: string): VectorCollection {
    const cached = this.vectorCollectionsCache.get(name);
    if (cached) return cached;
    const coll = new VectorCollection(this, name);
    this.vectorCollectionsCache.set(name, coll);
    return coll;
  }

  /**
   * List vector collections.
   *
   * Wire: `GET /v1/vectors/collections`. Returns the bare array of
   * collection-info objects (envelope unwrapped).
   */
  async listVectorCollections(): Promise<VectorCollectionInfo[]> {
    const { data } = await this.httpClient.get('/vectors/collections');
    const inner = data?.data ?? data;
    if (Array.isArray(inner)) return inner as VectorCollectionInfo[];
    return (inner?.items ?? inner?.collections ?? []) as VectorCollectionInfo[];
  }

  /**
   * Delete a vector collection.
   *
   * Wire: `DELETE /v1/vectors/collections/{name}`.
   */
  async deleteVectorCollection(name: string): Promise<void> {
    await this.httpClient.delete(`/vectors/collections/${encodeURIComponent(name)}`);
    this.vectorCollectionsCache.delete(name);
  }

  /**
   * Execute SQL query (legacy method for backward compatibility)
   * @deprecated Use executeQuery for new code
   */
  async sql(query: string, params?: Record<string, any>): Promise<QueryResult> {
    return this.executeQuery({
      sql: query,
      parameters: params ? Object.values(params) : [],
    });
  }

  /**
   * Execute SQL query matching the database integration guide format
   */
  async executeQuery(request: ExecuteQueryRequest): Promise<QueryResult> {
    const { data } = await this.httpClient.post('/query/execute', {
      sql: request.sql,
      parameters: request.parameters || [],
      max_rows: request.max_rows || 1000,
      timeout_secs: request.timeout_secs || 300,
    });

    return {
      columns: data.columns || [],
      rows: data.rows || [],
      rows_affected: data.rows_affected,
      execution_time_ms: data.execution_time_ms || 0,
      queryPlan: data.query_plan,
    };
  }

  /**
   * Execute batch queries
   */
  async executeBatchQueries(request: BatchQueryRequest): Promise<BatchQueryResponse> {
    const { data } = await this.httpClient.post('/query/execute/batch', {
      queries: request.queries,
      transactional: request.transactional || false,
    });

    return {
      results: data.results || [],
      total_execution_time_ms: data.total_execution_time_ms || 0,
    };
  }

  async embed(
    text: string | string[],
    options: EmbedOptions = {},
  ): Promise<number[] | number[][]> {
    const isBatch = Array.isArray(text);
    const texts = isBatch ? text : [text];

    // v0.2.0: gateway endpoint renamed from /ai/embed to /ai/embeddings
    // (and /ai/embeddings/batch when len > 1).
    const path = isBatch ? '/ai/embeddings/batch' : '/ai/embeddings';
    const body = isBatch ? { texts, model: options.model } : { text: texts[0], model: options.model };
    const { data } = await this.httpClient.post(path, body);
    if (isBatch) return data.embeddings ?? data;
    return data.embedding ?? data.embeddings?.[0] ?? data;
  }

  // Internal method for HTTP client access
  _getHttpClient(): AxiosInstance {
    return this.httpClient;
  }

  // =================================================================
  // TABLE MANAGEMENT OPERATIONS
  // =================================================================

  /**
   * Creates a new table with the specified columns and constraints
   * @param tableName - Name of the table to create
   * @param columns - Column definitions for the table
   * @param options - Additional table creation options
   * @returns Promise resolving to table creation result
   */
  async createTable(
    tableName: string,
    columns: ColumnDefinition[],
    options: CreateTableOptions = {}
  ): Promise<QueryResult> {
    let sql = `CREATE TABLE ${options.ifNotExists ? 'IF NOT EXISTS' : ''} ${tableName} (`;

    const columnDefs = columns.map(col => {
      let def = `${col.name} ${col.dataType}`;

      if (col.constraints) {
        for (const constraint of col.constraints) {
          switch (constraint.type) {
            case 'PRIMARY_KEY':
              def += ' PRIMARY KEY';
              break;
            case 'UNIQUE':
              def += ' UNIQUE';
              break;
            case 'NOT_NULL':
              def += ' NOT NULL';
              break;
            case 'CHECK':
              def += ` CHECK (${constraint.expression})`;
              break;
            case 'FOREIGN_KEY':
              def += ` REFERENCES ${constraint.referencedTable}(${constraint.referencedColumn})`;
              break;
            case 'DEFAULT':
              def += ` DEFAULT ${col.defaultValue}`;
              break;
          }
        }
      }

      return def;
    }).join(', ');

    sql += columnDefs;

    if (options.constraints) {
      const constraintDefs = options.constraints.map(constraint => {
        switch (constraint.type) {
          case 'PRIMARY_KEY':
            return `PRIMARY KEY (${constraint.columns.join(', ')})`;
          case 'UNIQUE':
            return `UNIQUE (${constraint.columns.join(', ')})`;
          case 'CHECK':
            return `CHECK (${constraint.expression})`;
          case 'FOREIGN_KEY':
            return `FOREIGN KEY (${constraint.columns.join(', ')}) REFERENCES ${constraint.referencedTable}(${constraint.referencedColumns?.join(', ')})`;
          default:
            return '';
        }
      }).filter(def => def);

      if (constraintDefs.length > 0) {
        sql += ', ' + constraintDefs.join(', ');
      }
    }

    sql += ')';

    if (options.partitionBy) {
      sql += ` PARTITION BY ${options.partitionBy.type} (${options.partitionBy.column})`;
    }

    return this.sql(sql);
  }

  /**
   * Alters an existing table structure
   * @param tableName - Name of the table to alter
   * @param alterOptions - Alteration options and parameters
   * @returns Promise resolving to alteration result
   */
  async alterTable(tableName: string, alterOptions: AlterTableOptions): Promise<QueryResult> {
    let sql = `ALTER TABLE ${tableName} `;

    switch (alterOptions.action) {
      case 'ADD_COLUMN':
        if (!alterOptions.columnDefinition) {
          throw new ValidationError('Column definition required for ADD_COLUMN');
        }
        sql += `ADD COLUMN ${alterOptions.columnDefinition.name} ${alterOptions.columnDefinition.dataType}`;
        break;
      case 'DROP_COLUMN':
        sql += `DROP COLUMN ${alterOptions.columnName}`;
        break;
      case 'RENAME_COLUMN':
        sql += `RENAME COLUMN ${alterOptions.columnName} TO ${alterOptions.newColumnName}`;
        break;
      case 'ALTER_COLUMN':
        sql += `ALTER COLUMN ${alterOptions.columnName} TYPE ${alterOptions.newDataType}`;
        break;
      case 'ADD_CONSTRAINT':
        if (!alterOptions.constraint) {
          throw new ValidationError('Constraint required for ADD_CONSTRAINT');
        }
        sql += `ADD CONSTRAINT ${alterOptions.constraint.type.toLowerCase()}_constraint`;
        break;
      case 'DROP_CONSTRAINT':
        sql += `DROP CONSTRAINT ${alterOptions.constraintName}`;
        break;
    }

    return this.sql(sql);
  }

  /**
   * Drops an existing table
   * @param tableName - Name of the table to drop
   * @param options - Drop options
   * @returns Promise resolving to drop result
   */
  async dropTable(tableName: string, options: { ifExists?: boolean; cascade?: boolean } = {}): Promise<QueryResult> {
    let sql = `DROP TABLE ${options.ifExists ? 'IF EXISTS' : ''} ${tableName}`;
    if (options.cascade) {
      sql += ' CASCADE';
    }
    return this.sql(sql);
  }

  /**
   * Describes a table structure including columns, constraints, and indexes
   * @param tableName - Name of the table to describe
   * @returns Promise resolving to table information
   */
  async describeTable(tableName: string): Promise<TableInfo> {
    // v0.2.0: gateway uses /schema/tables/:t (the /table/:t/info endpoint
    // never existed). Compose the full TableInfo from the columns +
    // indexes side-channel calls.
    const [tableRes, colsRes, idxRes] = await Promise.all([
      this.httpClient.get(`/schema/tables/${tableName}`),
      this.httpClient.get(`/schema/tables/${tableName}/columns`),
      this.httpClient.get(`/schema/tables/${tableName}/indexes`),
    ]);
    return {
      ...tableRes.data,
      columns: colsRes.data?.columns ?? colsRes.data ?? [],
      indexes: idxRes.data?.indexes ?? idxRes.data ?? [],
    } as TableInfo;
  }

  /**
   * Lists all tables in the current database
   * @param pattern - Optional pattern to filter table names
   * @returns Promise resolving to array of table names
   */
  async showTables(pattern?: string): Promise<string[]> {
    const sql = pattern ? `SHOW TABLES LIKE '${pattern}'` : 'SHOW TABLES';
    const result = await this.sql(sql);
    return result.rows.map(row => Object.values(row)[0] as string);
  }

  // =================================================================
  // INDEX MANAGEMENT OPERATIONS
  // =================================================================

  /**
   * Creates an index on a table
   * @param indexDef - Index definition with name, table, columns, and options
   * @returns Promise resolving to index creation result
   */
  async createIndex(indexDef: IndexDefinition): Promise<QueryResult> {
    const columns = indexDef.columns.map(col => `${col.name} ${col.order || 'ASC'}`).join(', ');
    const sql = `CREATE ${indexDef.unique ? 'UNIQUE' : ''} INDEX ${indexDef.ifNotExists ? 'IF NOT EXISTS' : ''} ${indexDef.name} ON ${indexDef.tableName} (${columns})`;
    return this.sql(sql);
  }

  /**
   * Drops an existing index
   * @param indexName - Name of the index to drop
   * @param options - Drop options
   * @returns Promise resolving to drop result
   */
  async dropIndex(indexName: string, options: { ifExists?: boolean } = {}): Promise<QueryResult> {
    const sql = `DROP INDEX ${options.ifExists ? 'IF EXISTS' : ''} ${indexName}`;
    return this.sql(sql);
  }

  /**
   * Lists all indexes, optionally filtered by table name
   * @param tableName - Optional table name to filter indexes
   * @returns Promise resolving to array of index information
   */
  async showIndexes(tableName?: string): Promise<Array<{ name: string; table: string; columns: string[]; unique: boolean }>> {
    const sql = tableName ? `SHOW INDEXES FROM ${tableName}` : 'SHOW INDEXES';
    const result = await this.sql(sql);
    
    // Convert array rows to objects using column names
    const indexNameIdx = result.columns.findIndex(c => c.name === 'index_name' || c.name === 'name');
    const tableNameIdx = result.columns.findIndex(c => c.name === 'table_name' || c.name === 'table');
    const columnsIdx = result.columns.findIndex(c => c.name === 'columns' || c.name === 'column');
    const uniqueIdx = result.columns.findIndex(c => c.name === 'is_unique' || c.name === 'unique');
    
    return result.rows.map(row => {
      const indexName = indexNameIdx >= 0 ? row[indexNameIdx] : '';
      const table = tableNameIdx >= 0 ? row[tableNameIdx] : '';
      const columnsStr = columnsIdx >= 0 ? row[columnsIdx] : '';
      const isUnique = uniqueIdx >= 0 ? row[uniqueIdx] : false;
      
      return {
        name: String(indexName),
        table: String(table),
        columns: typeof columnsStr === 'string' ? columnsStr.split(',') : [],
        unique: Boolean(isUnique)
      };
    });
  }

  // =================================================================
  // TRANSACTION SUPPORT
  // =================================================================

  /**
   * Begins a new transaction
   * @param options - Transaction options including isolation level
   * @returns Promise resolving to transaction context
   */
  async beginTransaction(options: TransactionOptions = {}): Promise<TransactionContext> {
    if (this.currentTransaction) {
      throw new Error('Transaction already in progress');
    }

    let sql = 'BEGIN TRANSACTION';
    if (options.isolationLevel) {
      sql += ` ISOLATION LEVEL ${options.isolationLevel}`;
    }
    if (options.readOnly) {
      sql += ' READ ONLY';
    }

    await this.sql(sql);

    this.currentTransaction = {
      id: Math.random().toString(36).substring(7),
      startTime: new Date(),
      isolationLevel: options.isolationLevel || 'READ_COMMITTED',
      readOnly: options.readOnly || false
    };

    if (options.timeout) {
      setTimeout(() => {
        if (this.currentTransaction) {
          this.rollbackTransaction().catch(console.error);
        }
      }, options.timeout);
    }

    return this.currentTransaction;
  }

  /**
   * Commits the current transaction
   * @returns Promise resolving when transaction is committed
   */
  async commitTransaction(): Promise<void> {
    if (!this.currentTransaction) {
      throw new Error('No transaction in progress');
    }

    await this.sql('COMMIT');
    this.currentTransaction = null;
  }

  /**
   * Rolls back the current transaction
   * @returns Promise resolving when transaction is rolled back
   */
  async rollbackTransaction(): Promise<void> {
    if (!this.currentTransaction) {
      throw new Error('No transaction in progress');
    }

    await this.sql('ROLLBACK');
    this.currentTransaction = null;
  }

  /**
   * Gets the current transaction context
   * @returns Current transaction context or null if no transaction
   */
  getCurrentTransaction(): TransactionContext | null {
    return this.currentTransaction;
  }

  // =================================================================
  // BATCH OPERATIONS
  // =================================================================

  /**
   * Performs batch insert operations
   * @param options - Batch insert options with table, columns, and rows
   * @returns Promise resolving to batch operation result
   */
  async batchInsert(options: BatchInsertOptions): Promise<BatchResult> {
    // v0.2.0: gateway never had /batch/{insert,update,delete}; batched
    // SQL goes through /query/execute/batch as a list of statements.
    // Rows can come in as arrays or as keyed records; normalise to
    // positional arrays aligned with `columns`.
    const cols: string[] = (options.columns ?? []) as string[];
    const queries = (options.rows as any[]).map((row: any) => {
      const values: any[] = Array.isArray(row) ? row : cols.map((c) => row[c]);
      return {
        sql: `INSERT INTO ${options.tableName} (${cols.join(', ')}) VALUES (${values.map((_, i) => '$' + (i + 1)).join(', ')})`,
        parameters: values,
      };
    });
    const { data } = await this.httpClient.post('/query/execute/batch', {
      queries,
      transactional: false,
    });
    const results = data.results ?? [];
    const successful = results.filter((r: any) => !r.error).length;
    return {
      totalProcessed: results.length,
      successful,
      failed: results.length - successful,
      errors: results.filter((r: any) => r.error).map((r: any) => r.error),
      tookMs: data.total_execution_time_ms ?? 0,
    };
  }

  /**
   * Performs batch update operations
   * @param options - Batch update options with table and update conditions
   * @returns Promise resolving to batch operation result
   */
  async batchUpdate(options: BatchUpdateOptions): Promise<BatchResult> {
    // Each update becomes its own UPDATE ... WHERE statement under
    // /query/execute/batch.
    const queries = options.updates.map((u: any) => {
      const setClause = Object.keys(u.set ?? {})
        .map((k, i) => `${k} = $${i + 1}`)
        .join(', ');
      const setVals = Object.values(u.set ?? {});
      const whereStr = u.where ?? '1=1';
      return {
        sql: `UPDATE ${options.tableName} SET ${setClause} WHERE ${whereStr}`,
        parameters: setVals,
      };
    });
    const { data } = await this.httpClient.post('/query/execute/batch', {
      queries,
      transactional: false,
    });
    const results = data.results ?? [];
    const successful = results.filter((r: any) => !r.error).length;
    return {
      totalProcessed: results.length,
      successful,
      failed: results.length - successful,
      errors: results.filter((r: any) => r.error).map((r: any) => r.error),
      tookMs: data.total_execution_time_ms ?? 0,
    };
  }

  /**
   * Performs batch delete operations
   * @param options - Batch delete options with table and where conditions
   * @returns Promise resolving to batch operation result
   */
  async batchDelete(options: BatchDeleteOptions): Promise<BatchResult> {
    const queries = ((options.whereConditions ?? []) as any[]).map((cond: any) => ({
      sql: `DELETE FROM ${options.tableName} WHERE ${typeof cond === 'string' ? cond : JSON.stringify(cond)}`,
      parameters: [] as any[],
    }));
    const { data } = await this.httpClient.post('/query/execute/batch', {
      queries,
      transactional: false,
    });
    const results = data.results ?? [];
    const successful = results.filter((r: any) => !r.error).length;
    return {
      totalProcessed: results.length,
      successful,
      failed: results.length - successful,
      errors: results.filter((r: any) => r.error).map((r: any) => r.error),
      tookMs: data.total_execution_time_ms ?? 0,
    };
  }

  // =================================================================
  // ADVANCED SQL FEATURES
  // =================================================================

  /**
   * Prepares a SQL statement for repeated execution
   * @param sql - SQL statement to prepare
   * @param options - Preparation options
   * @returns Promise resolving to prepared statement
   */
  async prepareStatement(sql: string, options: PreparedStatementOptions = {}): Promise<PreparedStatement> {
    // v0.2.0: gateway routes are /query/{prepare,exec,close} (POST only).
    const { data } = await this.httpClient.post('/query/prepare', {
      sql,
      name: options.name,
      parameter_types: options.parameterTypes
    });

    const prepared: PreparedStatement = {
      id: data.statement_id ?? data.id,
      sql: sql,
      parameterCount: data.parameter_count ?? data.parameters_count ?? 0,
    };

    if (options.name) {
      this.preparedStatements.set(options.name, prepared);
    }

    return prepared;
  }

  /**
   * Executes a prepared statement with parameters
   * @param statementId - ID of the prepared statement or statement name
   * @param params - Parameters for the prepared statement
   * @returns Promise resolving to query result
   */
  async executePrepared(statementId: string, params: any[] = []): Promise<QueryResult> {
    // Check if it's a named statement
    if (this.preparedStatements.has(statementId)) {
      statementId = this.preparedStatements.get(statementId)!.id;
    }

    const { data } = await this.httpClient.post('/query/exec', {
      statement_id: statementId,
      parameters: params
    });

    return {
      columns: data.columns || [],
      rows: data.rows || [],
      rows_affected: data.rows_affected,
      execution_time_ms: data.execution_time_ms || data.took_ms || 0,
      queryPlan: data.query_plan
    };
  }

  /**
   * Deallocates a prepared statement
   * @param statementId - ID of the prepared statement or statement name
   * @returns Promise resolving when statement is deallocated
   */
  async deallocatePrepared(statementId: string): Promise<void> {
    // v0.2.0: gateway uses POST /query/close, not DELETE /prepare/:id.
    if (this.preparedStatements.has(statementId)) {
      const prepared = this.preparedStatements.get(statementId)!;
      await this.httpClient.post('/query/close', { statement_id: prepared.id });
      this.preparedStatements.delete(statementId);
    } else {
      await this.httpClient.post('/query/close', { statement_id: statementId });
    }
  }

  /**
   * Executes a query with Common Table Expressions (CTEs)
   * @param ctes - Array of CTE definitions
   * @param mainQuery - Main query that uses the CTEs
   * @param params - Optional parameters for the query
   * @returns Promise resolving to query result
   */
  async queryWithCTEs(ctes: CTEDefinition[], mainQuery: string, params?: Record<string, any>): Promise<QueryResult> {
    const cteSQL = ctes.map(cte => {
      const columns = cte.columns ? `(${cte.columns.join(', ')})` : '';
      return `${cte.name}${columns} AS (${cte.query})`;
    }).join(', ');

    const sql = `WITH ${cteSQL} ${mainQuery}`;
    return this.sql(sql, params);
  }

  /**
   * Executes a query with window functions
   * @param selectQuery - Base SELECT query
   * @param windowFunctions - Array of window function definitions
   * @param params - Optional parameters for the query
   * @returns Promise resolving to query result
   */
  async queryWithWindowFunctions(
    selectQuery: string,
    windowFunctions: Array<{ alias: string; function: string; options: WindowFunctionOptions }>,
    params?: Record<string, any>
  ): Promise<QueryResult> {
    const windowClauses = windowFunctions.map(wf => {
      let clause = `${wf.function} OVER (`;

      if (wf.options.partitionBy) {
        clause += `PARTITION BY ${wf.options.partitionBy.join(', ')}`;
      }

      if (wf.options.orderBy) {
        const orderBy = wf.options.orderBy.map(order => `${order.column} ${order.direction}`).join(', ');
        clause += ` ORDER BY ${orderBy}`;
      }

      if (wf.options.frame) {
        clause += ` ${wf.options.frame.type} BETWEEN ${wf.options.frame.start}`;
        if (wf.options.frame.end) {
          clause += ` AND ${wf.options.frame.end}`;
        }
      }

      clause += `) AS ${wf.alias}`;
      return clause;
    }).join(', ');

    const sql = `${selectQuery}, ${windowClauses}`;
    return this.sql(sql, params);
  }

  /**
   * Performs JSON operations on JSON/JSONB columns
   * @param tableName - Table containing JSON data
   * @param jsonColumn - Name of the JSON column
   * @param operation - JSON operation to perform
   * @param path - JSON path for the operation
   * @param value - Value for update operations
   * @param whereClause - Optional WHERE clause
   * @returns Promise resolving to query result
   */
  async jsonQuery(
    tableName: string,
    jsonColumn: string,
    operation: 'extract' | 'update' | 'delete' | 'contains',
    path: string,
    value?: any,
    whereClause?: string
  ): Promise<QueryResult> {
    let sql: string;

    switch (operation) {
      case 'extract':
        sql = `SELECT ${jsonColumn}->>'${path}' as extracted_value FROM ${tableName}`;
        break;
      case 'update':
        sql = `UPDATE ${tableName} SET ${jsonColumn} = jsonb_set(${jsonColumn}, '{${path}}', '${JSON.stringify(value)}')`;
        break;
      case 'delete':
        sql = `UPDATE ${tableName} SET ${jsonColumn} = ${jsonColumn} - '${path}'`;
        break;
      case 'contains':
        sql = `SELECT * FROM ${tableName} WHERE ${jsonColumn} @> '{"${path}": ${JSON.stringify(value)}}'`;
        break;
    }

    if (whereClause && operation !== 'contains') {
      sql += ` WHERE ${whereClause}`;
    }

    return this.sql(sql);
  }

  // =================================================================
  // VECTOR OPERATIONS
  // =================================================================

  /**
   * Performs vector addition
   * @param vector1 - First vector
   * @param vector2 - Second vector
   * @returns Promise resolving to vector addition result
   */
  async vectorAdd(vector1: number[], vector2: number[]): Promise<VectorArithmeticResult> {
    if (vector1.length !== vector2.length) {
      throw new VectorError('Vector dimensions must match', 'DIMENSION_MISMATCH');
    }

    // v0.2.0: gateway exposes a single /vector-algebra/operation endpoint
    // with an `op` discriminator instead of one route per math op.
    const { data } = await this.httpClient.post('/vector-algebra/operation', {
      op: 'add', a: vector1, b: vector2,
    });
    const result = data.result ?? data.vector ?? [];
    return {
      result: { values: result, dimensions: result.length },
      operation: 'addition',
      tookMs: data.took_ms,
    };
  }

  /**
   * Performs vector subtraction
   */
  async vectorSubtract(vector1: number[], vector2: number[]): Promise<VectorArithmeticResult> {
    if (vector1.length !== vector2.length) {
      throw new VectorError('Vector dimensions must match', 'DIMENSION_MISMATCH');
    }
    const { data } = await this.httpClient.post('/vector-algebra/operation', {
      op: 'subtract', a: vector1, b: vector2,
    });
    const result = data.result ?? data.vector ?? [];
    return {
      result: { values: result, dimensions: result.length },
      operation: 'subtraction',
      tookMs: data.took_ms,
    };
  }

  /**
   * Performs scalar multiplication on a vector
   */
  async vectorScalarMultiply(vector: number[], scalar: number): Promise<VectorArithmeticResult> {
    const { data } = await this.httpClient.post('/vector-algebra/operation', {
      op: 'scalar_multiply', a: vector, scalar,
    });
    const result = data.result ?? data.vector ?? [];
    return {
      result: { values: result, dimensions: result.length },
      operation: 'scalar_multiplication',
      tookMs: data.took_ms,
    };
  }

  /**
   * Calculates the dot product of two vectors
   */
  async vectorDotProduct(vector1: number[], vector2: number[]): Promise<{ dotProduct: number; tookMs: number }> {
    if (vector1.length !== vector2.length) {
      throw new VectorError('Vector dimensions must match', 'DIMENSION_MISMATCH');
    }
    const { data } = await this.httpClient.post('/vector-algebra/operation', {
      op: 'dot_product', a: vector1, b: vector2,
    });
    return { dotProduct: data.scalar ?? data.dot_product ?? 0, tookMs: data.took_ms };
  }

  /**
   * Calculates cosine similarity between two vectors
   */
  async cosineSimilarity(vector1: number[], vector2: number[]): Promise<VectorSimilarityResult> {
    if (vector1.length !== vector2.length) {
      throw new VectorError('Vector dimensions must match', 'DIMENSION_MISMATCH');
    }
    const { data } = await this.httpClient.post('/vector-algebra/operation', {
      op: 'cosine_similarity', a: vector1, b: vector2,
    });
    return { similarity: data.scalar ?? data.similarity ?? 0, function: 'cosine', tookMs: data.took_ms };
  }

  /**
   * Calculates L2 (Euclidean) distance between two vectors
   */
  async l2Distance(vector1: number[], vector2: number[]): Promise<VectorSimilarityResult> {
    if (vector1.length !== vector2.length) {
      throw new VectorError('Vector dimensions must match', 'DIMENSION_MISMATCH');
    }
    const { data } = await this.httpClient.post('/vector-algebra/operation', {
      op: 'l2_distance', a: vector1, b: vector2,
    });
    const distance = data.scalar ?? data.distance ?? 0;
    return { distance, similarity: distance, function: 'l2', tookMs: data.took_ms };
  }

  /**
   * Calculates inner product between two vectors
   */
  async innerProduct(vector1: number[], vector2: number[]): Promise<VectorSimilarityResult> {
    if (vector1.length !== vector2.length) {
      throw new VectorError('Vector dimensions must match', 'DIMENSION_MISMATCH');
    }
    const { data } = await this.httpClient.post('/vector-algebra/operation', {
      op: 'inner_product', a: vector1, b: vector2,
    });
    return { similarity: data.scalar ?? data.inner_product ?? 0, function: 'inner_product', tookMs: data.took_ms };
  }

  /**
   * Performs K-nearest neighbors vector search.
   * v0.2.0: routes through /vectors/collections/:c/search with mode discriminator.
   */
  async knnSearch(options: KNNSearchOptions): Promise<VectorSearchResult[]> {
    const collection = (options as any).collectionName ?? options.tableName;
    const { data } = await this.httpClient.post(`/vectors/collections/${collection}/search`, {
      mode: 'knn',
      vector: options.queryVector,
      limit: options.k,
      filter: options.filter,
    });
    return (data.matches ?? data.results ?? []).map((r: any) => ({
      id: r.id, vector: r.vector, similarity: r.similarity, distance: r.distance, metadata: r.metadata,
    }));
  }

  /**
   * Performs range-based vector similarity search.
   */
  async rangeSearch(options: RangeSearchOptions): Promise<VectorSearchResult[]> {
    const collection = (options as any).collectionName ?? options.tableName;
    const { data } = await this.httpClient.post(`/vectors/collections/${collection}/search`, {
      mode: 'range',
      vector: options.queryVector,
      threshold: options.threshold,
      max_results: options.maxResults,
      filter: options.filter,
    });
    return (data.matches ?? data.results ?? []).map((r: any) => ({
      id: r.id, vector: r.vector, similarity: r.similarity, distance: r.distance, metadata: r.metadata,
    }));
  }

  /**
   * Performs hybrid search combining vector similarity and SQL filtering.
   */
  async hybridSearch(options: HybridSearchOptions): Promise<VectorSearchResult[]> {
    const collection = (options as any).collectionName ?? (options as any).tableName;
    const { data } = await this.httpClient.post(`/vectors/collections/${collection}/search`, {
      mode: 'hybrid',
      vector: options.vector,
      text_query: options.textQuery,
      sql_filter: options.sqlFilter,
      limit: options.k,
      threshold: options.threshold,
      metric: options.metric,
      filter: options.filter,
      weights: options.weights,
    });
    return (data.matches ?? data.results ?? []).map((r: any) => ({
      id: r.id, vector: r.vector, similarity: r.similarity, distance: r.distance, metadata: r.metadata,
    }));
  }

  /**
   * Normalizes a vector to unit length
   */
  async normalizeVector(vector: number[]): Promise<VectorArithmeticResult> {
    const { data } = await this.httpClient.post('/vector-algebra/operation', {
      op: 'normalize', a: vector,
    });
    const result = data.result ?? data.vector ?? [];
    return {
      result: { values: result, dimensions: result.length },
      operation: 'normalization',
      tookMs: data.took_ms,
    };
  }

  /**
   * Calculates the magnitude (length) of a vector
   */
  async vectorMagnitude(vector: number[]): Promise<{ magnitude: number; tookMs: number }> {
    const { data } = await this.httpClient.post('/vector-algebra/operation', {
      op: 'magnitude', a: vector,
    });
    return { magnitude: data.scalar ?? data.magnitude ?? 0, tookMs: data.took_ms };
  }

  // =================================================================
  // AUTHENTICATION & USER MANAGEMENT
  // =================================================================

  /**
   * Register a new user
   */
  async registerUser(request: RegisterRequest): Promise<RegisterResponse> {
    const { data } = await this.httpClient.post<RegisterResponse>('/auth/register', {
      username: request.username,
      email: request.email,
      password: request.password,
    });
    return data;
  }

  /**
   * Login with username and password
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const { data } = await this.httpClient.post<LoginResponse>('/auth/login', {
      username: request.username,
      password: request.password,
    });
    
    // Update JWT token in config if login successful
    if (data.access_token) {
      this.config.jwtToken = data.access_token;
      // Update HTTP client headers
      this.httpClient.defaults.headers['Authorization'] = `Bearer ${data.access_token}`;
      // Remove API key header if present
      delete this.httpClient.defaults.headers['X-API-Key'];
    }
    
    return data;
  }

  /**
   * Refresh JWT token.
   *
   * v0.2.0: the gateway does not currently expose a refresh endpoint —
   * this method now re-runs login() with the same credentials. Pass
   * the credentials in the call site (or supply them at SDK construction
   * time and we'll re-use the cached pair).
   */
  async refreshToken(credentials?: { username?: string; password?: string }): Promise<RefreshResponse> {
    if (credentials?.username && credentials?.password) {
      const login = await this.login({ username: credentials.username, password: credentials.password });
      return {
        access_token: login.access_token,
        refresh_token: '',
        token_type: 'Bearer',
        expires_in: login.expires_in,
      } as RefreshResponse;
    }
    throw new ValidationError(
      'refreshToken now requires credentials — the gateway has no /auth/refresh endpoint in v1.5.0-ce. Pass {username, password} or call login() again.'
    );
  }

  /**
   * Set JWT token manually (useful after login)
   */
  setJWTToken(token: string): void {
    this.config.jwtToken = token;
    this.httpClient.defaults.headers['Authorization'] = `Bearer ${token}`;
    delete this.httpClient.defaults.headers['X-API-Key'];
  }

  /**
   * Clear authentication (logout)
   */
  logout(): void {
    this.config.jwtToken = '';
    delete this.httpClient.defaults.headers['Authorization'];
    delete this.httpClient.defaults.headers['X-API-Key'];
  }

  // =================================================================
  // API KEY MANAGEMENT
  // =================================================================

  /**
   * Create a new API key
   */
  async createAPIKey(request: CreateAPIKeyRequest): Promise<CreateAPIKeyResponse> {
    const { data } = await this.httpClient.post<CreateAPIKeyResponse>('/api-keys', {
      name: request.name,
      permission: request.permission,
      expires_in_days: request.expires_in_days,
    });
    return data;
  }

  /**
   * List all API keys
   */
  async listAPIKeys(): Promise<ListAPIKeysResponse> {
    const { data } = await this.httpClient.get<ListAPIKeysResponse>('/api-keys');
    return data;
  }

  /**
   * Get API key statistics
   */
  async getAPIKeyStats(keyId: string): Promise<APIKeyStats> {
    const { data } = await this.httpClient.get<APIKeyStats>(`/api-keys/${keyId}/stats`);
    return data;
  }

  /**
   * Revoke (delete) an API key
   */
  async revokeAPIKey(keyId: string): Promise<void> {
    await this.httpClient.delete(`/api-keys/${keyId}`);
  }

  // =================================================================
  // MULTIMEDIA MANAGEMENT
  // =================================================================

  /**
   * Upload multimedia file to a document
   */
  async uploadMultimedia(
    collection: string,
    documentId: string,
    file: File | Blob | Buffer,
    metadata?: Record<string, any>
  ): Promise<MultimediaInfo> {
    // Dynamic import to handle both Node.js and browser environments
    let FormDataClass: any;
    try {
      // Try Node.js form-data first
      FormDataClass = require('form-data');
    } catch {
      // Fallback to browser FormData
      FormDataClass = FormData;
    }
    
    const formData = new FormDataClass();
    
    // Append file - handle Buffer for Node.js
    if (Buffer.isBuffer(file)) {
      formData.append('file', file, { filename: 'upload' });
    } else {
      formData.append('file', file);
    }
    
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const headers: Record<string, string> = {};
    // form-data has getHeaders() method in Node.js
    if (typeof formData.getHeaders === 'function') {
      Object.assign(headers, formData.getHeaders());
    }

    const { data } = await this.httpClient.post<MultimediaInfo>(
      `/multimedia/${collection}/documents/${documentId}/multimedia`,
      formData,
      {
        headers,
      }
    );
    return data;
  }

  /**
   * Get multimedia file URL (for viewing/downloading)
   */
  getMultimediaUrl(collection: string, documentId: string, multimediaId: string, download = false): string {
    const protocol = this.config.useHttps ? 'https' : 'http';
    const baseUrl = `${protocol}://${this.config.host}:${this.config.port}/v1`;
    return `${baseUrl}/multimedia/${collection}/documents/${documentId}/multimedia/${multimediaId}${download ? '?download=true' : ''}`;
  }

  /**
   * Get multimedia thumbnail URL
   */
  getMultimediaThumbnailUrl(collection: string, documentId: string, multimediaId: string): string {
    const protocol = this.config.useHttps ? 'https' : 'http';
    const baseUrl = `${protocol}://${this.config.host}:${this.config.port}/v1`;
    return `${baseUrl}/multimedia/${collection}/documents/${documentId}/multimedia/${multimediaId}/thumbnail`;
  }

  /**
   * List multimedia files in a document
   */
  async listMultimedia(
    collection: string,
    documentId: string,
    limit = 50,
    offset = 0
  ): Promise<ListMultimediaResponse> {
    const { data } = await this.httpClient.get<ListMultimediaResponse>(
      `/multimedia/${collection}/documents/${documentId}/multimedia?limit=${limit}&offset=${offset}`
    );
    return data;
  }

  /**
   * Get multimedia file information
   */
  async getMultimedia(
    collection: string,
    documentId: string,
    multimediaId: string
  ): Promise<MultimediaInfo> {
    const { data } = await this.httpClient.get<MultimediaInfo>(
      `/multimedia/${collection}/documents/${documentId}/multimedia/${multimediaId}`
    );
    return data;
  }

  /**
   * Delete multimedia file
   */
  async deleteMultimedia(collection: string, documentId: string, multimediaId: string): Promise<void> {
    await this.httpClient.delete(`/multimedia/${collection}/documents/${documentId}/multimedia/${multimediaId}`);
  }
}