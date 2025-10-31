/**
 * Main client for SynapCores SDK
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Collection } from './collection';
import { AutoMLClient } from './automl';
import { NLPClient } from './nlp';
import { RecipeClient } from './recipes';
import { SchemaClient } from './schema';
import { ImportExportClient } from './import';
import { IntegrationClient } from './integrations';
import { BackupClient } from './backup';
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

    // Determine authentication header
    const authHeader: Record<string, string> = {};
    if (this.config.jwtToken) {
      authHeader['Authorization'] = `Bearer ${this.config.jwtToken}`;
    } else if (this.config.apiKey) {
      // Use X-API-Key header for API keys (not Bearer)
      authHeader['X-API-Key'] = this.config.apiKey;
    }

    this.httpClient = axios.create({
      baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'synapcores-nodejs/0.1.0',
        ...authHeader,
      },
      ...(httpsAgent && { httpsAgent }),
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
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
   * List collections (legacy method for backward compatibility)
   */
  async listCollections(): Promise<string[]> {
    const result = await this.listCollectionsDetailed();
    return result.collections.map(c => c.name);
  }

  /**
   * List collections with detailed information matching the database integration guide format
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

    const { data } = await this.httpClient.get<ListCollectionsResponse>(
      `/collections${params.toString() ? `?${params.toString()}` : ''}`
    );
    return data;
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

    const { data } = await this.httpClient.post('/ai/embed', {
      texts,
      model: options.model || 'default',
    });

    return isBatch ? data.embeddings : data.embeddings[0];
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
    const { data } = await this.httpClient.get(`/table/${tableName}/info`);
    return data;
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
    const { data } = await this.httpClient.post('/batch/insert', {
      table_name: options.tableName,
      columns: options.columns,
      rows: options.rows,
      on_conflict: options.onConflict,
      batch_size: options.batchSize || 1000
    });

    return {
      totalProcessed: data.total_processed,
      successful: data.successful,
      failed: data.failed,
      errors: data.errors,
      tookMs: data.took_ms
    };
  }

  /**
   * Performs batch update operations
   * @param options - Batch update options with table and update conditions
   * @returns Promise resolving to batch operation result
   */
  async batchUpdate(options: BatchUpdateOptions): Promise<BatchResult> {
    const { data } = await this.httpClient.post('/batch/update', {
      table_name: options.tableName,
      updates: options.updates,
      batch_size: options.batchSize || 1000
    });

    return {
      totalProcessed: data.total_processed,
      successful: data.successful,
      failed: data.failed,
      errors: data.errors,
      tookMs: data.took_ms
    };
  }

  /**
   * Performs batch delete operations
   * @param options - Batch delete options with table and where conditions
   * @returns Promise resolving to batch operation result
   */
  async batchDelete(options: BatchDeleteOptions): Promise<BatchResult> {
    const { data } = await this.httpClient.post('/batch/delete', {
      table_name: options.tableName,
      where_conditions: options.whereConditions,
      batch_size: options.batchSize || 1000
    });

    return {
      totalProcessed: data.total_processed,
      successful: data.successful,
      failed: data.failed,
      errors: data.errors,
      tookMs: data.took_ms
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
    const { data } = await this.httpClient.post('/prepare', {
      sql,
      name: options.name,
      parameter_types: options.parameterTypes
    });

    const prepared: PreparedStatement = {
      id: data.statement_id,
      sql: sql,
      parameterCount: data.parameter_count
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

    const { data } = await this.httpClient.post('/execute-prepared', {
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
    if (this.preparedStatements.has(statementId)) {
      const prepared = this.preparedStatements.get(statementId)!;
      await this.httpClient.delete(`/prepare/${prepared.id}`);
      this.preparedStatements.delete(statementId);
    } else {
      await this.httpClient.delete(`/prepare/${statementId}`);
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

    const { data } = await this.httpClient.post('/vectors/add', {
      vector1,
      vector2
    });

    return {
      result: { values: data.result, dimensions: data.result.length },
      operation: 'addition',
      tookMs: data.took_ms
    };
  }

  /**
   * Performs vector subtraction
   * @param vector1 - First vector (minuend)
   * @param vector2 - Second vector (subtrahend)
   * @returns Promise resolving to vector subtraction result
   */
  async vectorSubtract(vector1: number[], vector2: number[]): Promise<VectorArithmeticResult> {
    if (vector1.length !== vector2.length) {
      throw new VectorError('Vector dimensions must match', 'DIMENSION_MISMATCH');
    }

    const { data } = await this.httpClient.post('/vectors/subtract', {
      vector1,
      vector2
    });

    return {
      result: { values: data.result, dimensions: data.result.length },
      operation: 'subtraction',
      tookMs: data.took_ms
    };
  }

  /**
   * Performs scalar multiplication on a vector
   * @param vector - Input vector
   * @param scalar - Scalar value to multiply by
   * @returns Promise resolving to scalar multiplication result
   */
  async vectorScalarMultiply(vector: number[], scalar: number): Promise<VectorArithmeticResult> {
    const { data } = await this.httpClient.post('/vectors/scalar-multiply', {
      vector,
      scalar
    });

    return {
      result: { values: data.result, dimensions: data.result.length },
      operation: 'scalar_multiplication',
      tookMs: data.took_ms
    };
  }

  /**
   * Calculates the dot product of two vectors
   * @param vector1 - First vector
   * @param vector2 - Second vector
   * @returns Promise resolving to dot product result
   */
  async vectorDotProduct(vector1: number[], vector2: number[]): Promise<{ dotProduct: number; tookMs: number }> {
    if (vector1.length !== vector2.length) {
      throw new VectorError('Vector dimensions must match', 'DIMENSION_MISMATCH');
    }

    const { data } = await this.httpClient.post('/vectors/dot-product', {
      vector1,
      vector2
    });

    return {
      dotProduct: data.dot_product,
      tookMs: data.took_ms
    };
  }

  /**
   * Calculates cosine similarity between two vectors
   * @param vector1 - First vector
   * @param vector2 - Second vector
   * @returns Promise resolving to cosine similarity result
   */
  async cosineSimilarity(vector1: number[], vector2: number[]): Promise<VectorSimilarityResult> {
    if (vector1.length !== vector2.length) {
      throw new VectorError('Vector dimensions must match', 'DIMENSION_MISMATCH');
    }

    const { data } = await this.httpClient.post('/vectors/cosine-similarity', {
      vector1,
      vector2
    });

    return {
      similarity: data.similarity,
      function: 'cosine',
      tookMs: data.took_ms
    };
  }

  /**
   * Calculates L2 (Euclidean) distance between two vectors
   * @param vector1 - First vector
   * @param vector2 - Second vector
   * @returns Promise resolving to L2 distance result
   */
  async l2Distance(vector1: number[], vector2: number[]): Promise<VectorSimilarityResult> {
    if (vector1.length !== vector2.length) {
      throw new VectorError('Vector dimensions must match', 'DIMENSION_MISMATCH');
    }

    const { data } = await this.httpClient.post('/vectors/l2-distance', {
      vector1,
      vector2
    });

    return {
      distance: data.distance,
      similarity: data.distance, // Include similarity for compatibility
      function: 'l2',
      tookMs: data.took_ms
    };
  }

  /**
   * Calculates inner product between two vectors
   * @param vector1 - First vector
   * @param vector2 - Second vector
   * @returns Promise resolving to inner product result
   */
  async innerProduct(vector1: number[], vector2: number[]): Promise<VectorSimilarityResult> {
    if (vector1.length !== vector2.length) {
      throw new VectorError('Vector dimensions must match', 'DIMENSION_MISMATCH');
    }

    const { data } = await this.httpClient.post('/vectors/inner-product', {
      vector1,
      vector2
    });

    return {
      similarity: data.inner_product,
      function: 'inner_product',
      tookMs: data.took_ms
    };
  }

  /**
   * Performs K-nearest neighbors vector search
   * @param options - KNN search options
   * @returns Promise resolving to KNN search results
   */
  async knnSearch(options: KNNSearchOptions): Promise<VectorSearchResult[]> {
    const { data } = await this.httpClient.post('/vectors/knn-search', {
      query_vector: options.queryVector,
      k: options.k,
      table_name: options.tableName,
      vector_column: options.vectorColumn,
      metadata_columns: options.metadataColumns,
      filter: options.filter
    });

    return data.results.map((result: any) => ({
      id: result.id,
      vector: result.vector,
      similarity: result.similarity,
      distance: result.distance,
      metadata: result.metadata
    }));
  }

  /**
   * Performs range-based vector similarity search
   * @param options - Range search options
   * @returns Promise resolving to range search results
   */
  async rangeSearch(options: RangeSearchOptions): Promise<VectorSearchResult[]> {
    const { data } = await this.httpClient.post('/vectors/range-search', {
      query_vector: options.queryVector,
      threshold: options.threshold,
      table_name: options.tableName,
      vector_column: options.vectorColumn,
      metadata_columns: options.metadataColumns,
      filter: options.filter,
      max_results: options.maxResults
    });

    return data.results.map((result: any) => ({
      id: result.id,
      vector: result.vector,
      similarity: result.similarity,
      distance: result.distance,
      metadata: result.metadata
    }));
  }

  /**
   * Performs hybrid search combining vector similarity and SQL filtering
   * @param options - Hybrid search options
   * @returns Promise resolving to hybrid search results
   */
  async hybridSearch(options: HybridSearchOptions): Promise<VectorSearchResult[]> {
    const { data } = await this.httpClient.post('/vectors/hybrid-search', {
      vector: options.vector,
      text_query: options.textQuery,
      sql_filter: options.sqlFilter,
      k: options.k,
      threshold: options.threshold,
      metric: options.metric,
      filter: options.filter,
      weights: options.weights
    });

    return data.results.map((result: any) => ({
      id: result.id,
      vector: result.vector,
      similarity: result.similarity,
      distance: result.distance,
      metadata: result.metadata
    }));
  }

  /**
   * Normalizes a vector to unit length
   * @param vector - Input vector to normalize
   * @returns Promise resolving to normalized vector
   */
  async normalizeVector(vector: number[]): Promise<VectorArithmeticResult> {
    const { data } = await this.httpClient.post('/vectors/normalize', {
      vector
    });

    return {
      result: { values: data.result, dimensions: data.result.length },
      operation: 'normalization',
      tookMs: data.took_ms
    };
  }

  /**
   * Calculates the magnitude (length) of a vector
   * @param vector - Input vector
   * @returns Promise resolving to vector magnitude
   */
  async vectorMagnitude(vector: number[]): Promise<{ magnitude: number; tookMs: number }> {
    const { data } = await this.httpClient.post('/vectors/magnitude', {
      vector
    });

    return {
      magnitude: data.magnitude,
      tookMs: data.took_ms
    };
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
   * Refresh JWT token
   */
  async refreshToken(): Promise<RefreshResponse> {
    const { data } = await this.httpClient.post<RefreshResponse>('/auth/refresh');
    
    // Update JWT token in config
    if (data.access_token) {
      this.config.jwtToken = data.access_token;
      this.httpClient.defaults.headers['Authorization'] = `Bearer ${data.access_token}`;
      delete this.httpClient.defaults.headers['X-API-Key'];
    }
    
    return data;
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