import { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
export { z } from 'zod';

/**
 * Type definitions for collections
 */
interface Document {
    id?: string;
    data: Record<string, any>;
    score?: number;
    metadata?: Record<string, any>;
}
interface SearchResult {
    documents: Document[];
    total: number;
    tookMs: number;
    nextOffset?: number;
}
interface SearchOptions {
    query?: string;
    topK?: number;
    filter?: Record<string, any>;
    includeMetadata?: boolean;
    offset?: number;
}
interface VectorSearchOptions$1 {
    vector: number[];
    field?: string;
    topK?: number;
    filter?: Record<string, any>;
    distanceMetric?: 'cosine' | 'euclidean' | 'dot_product';
    includeMetadata?: boolean;
}
interface QueryOptions {
    filter?: Record<string, any>;
    limit?: number;
    offset?: number;
    sort?: Array<{
        field: string;
        order: 'asc' | 'desc';
    }>;
    projection?: string[];
}
interface InsertResult {
    ids: string[];
    inserted: number;
}
interface UpdateOptions {
    merge?: boolean;
}
type FieldType = 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'datetime' | 'json' | 'vector' | 'text' | 'binary';
interface SchemaField {
    name: string;
    type: FieldType | `vector[${number}]`;
    indexed?: boolean;
    required?: boolean;
    unique?: boolean;
    default?: any;
    description?: string;
}
interface CollectionSchema {
    fields: SchemaField[];
    primaryKey?: string;
    vectorFields?: string[];
}
interface CollectionStats {
    name: string;
    documentCount: number;
    sizeBytes: number;
    indexCount: number;
    createdAt: Date;
    updatedAt: Date;
}
interface IndexOptions {
    field: string;
    type?: 'btree' | 'hash' | 'vector';
    options?: Record<string, any>;
}

/**
 * Type definitions for real-time subscriptions
 */
type ChangeOperation = 'insert' | 'update' | 'delete';
interface SubscriptionEvent {
    operation: ChangeOperation;
    collection: string;
    document: Document;
    timestamp: Date;
    sequence: number;
}
interface SubscriptionOptions {
    filter?: Record<string, any>;
    onChange?: (event: SubscriptionEvent) => void | Promise<void>;
}

/**
 * Real-time subscription support for SynapCores SDK
 */

declare class Subscription extends EventEmitter {
    private readonly collection;
    private readonly options;
    private ws?;
    private running;
    private reconnectTimeout?;
    private reconnectAttempts;
    private readonly maxReconnectAttempts;
    private readonly reconnectDelay;
    constructor(collection: Collection, options?: SubscriptionOptions);
    connect(): Promise<void>;
    private createConnection;
    private subscribe;
    private handleMessage;
    private scheduleReconnect;
    close(): Promise<void>;
    [Symbol.asyncIterator](): AsyncIterator<SubscriptionEvent>;
}

/**
 * Collection class for SynapCores SDK
 */

declare class Collection {
    private readonly client;
    readonly name: string;
    readonly schema?: Record<string, any> | undefined;
    constructor(client: SynapCores, name: string, schema?: Record<string, any> | undefined);
    private get basePath();
    insert(documents: Record<string, any> | Record<string, any>[], _autoEmbed?: boolean): Promise<InsertResult>;
    get(documentId: string): Promise<Document | null>;
    update(documentId: string, data: Record<string, any>, options?: UpdateOptions): Promise<Document>;
    delete(documentId: string | string[]): Promise<{
        deleted: number;
    }>;
    /**
     * @deprecated Gateway v2 collections_v2 has no per-collection `/search`
     * route. Query documents with SQL via
     * `client.executeQuery("SELECT * FROM <collection> WHERE ...")`, or list
     * documents via the raw `GET /collections/<name>/documents` endpoint.
     */
    search(_options: SearchOptions): Promise<SearchResult>;
    /**
     * @deprecated Gateway v2 collections_v2 has no per-collection
     * `/vector_search` route. Use the dedicated vector-collection search
     * (`POST /vectors/collections/:c/search`) or an ORDER BY distance SQL
     * query via `client.executeQuery`.
     */
    vectorSearch(_options: VectorSearchOptions$1): Promise<SearchResult>;
    /**
     * @deprecated Gateway v2 collections_v2 has no per-collection `/query`
     * route. Use `client.executeQuery(...)` or the raw
     * `GET /collections/<name>/documents` listing.
     */
    query(_options?: QueryOptions): Promise<SearchResult>;
    /**
     * @deprecated Gateway v2 collections_v2 has no `/count` route. Use
     * `client.executeQuery("SELECT COUNT(*) FROM <collection>")`.
     */
    count(_filter?: Record<string, any>): Promise<number>;
    /**
     * @deprecated Gateway v2 collections_v2 has no `/stats` route.
     */
    stats(): Promise<CollectionStats>;
    /**
     * @deprecated Gateway v2 collections_v2 has no `/indexes` route. Create
     * indexes with SQL via `client.createIndex(...)` /
     * `client.executeQuery("CREATE INDEX ...")`.
     */
    createIndex(_options: IndexOptions): Promise<{
        created: boolean;
    }>;
    /**
     * @deprecated Gateway v2 collections_v2 has no `/indexes` route. Drop
     * indexes with SQL via `client.dropIndex(...)`.
     */
    dropIndex(_field: string): Promise<{
        dropped: boolean;
    }>;
    subscribe(options?: SubscriptionOptions): Promise<Subscription>;
}

/**
 * Type definitions for AutoML
 */
interface ModelInfo {
    id: string;
    name: string;
    task: 'regression' | 'classification' | 'clustering';
    status: 'training' | 'ready' | 'failed';
    accuracy?: number;
    createdAt: Date;
    updatedAt?: Date;
    config: Record<string, any>;
}
interface TrainOptions {
    collection: string;
    target: string;
    features?: string[];
    task?: 'auto' | 'regression' | 'classification';
    name?: string;
    config?: Record<string, any>;
    validationSplit?: number;
    maxTrials?: number;
    timeoutMinutes?: number;
}
interface PredictResult {
    predictions: any[];
    confidence?: number[];
}
interface EvaluationResult {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    mse?: number;
    rmse?: number;
    mae?: number;
    r2?: number;
    confusionMatrix?: number[][];
}
interface AsyncTrainOptions extends TrainOptions {
    /** Enable async training */
    async?: boolean;
    /** Callback URL for completion notification */
    callback_url?: string;
    /** Webhook for progress updates */
    webhook_url?: string;
}
interface TrainingJob {
    /** Job ID */
    id: string;
    /** Model name */
    name: string;
    /** Training status */
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    /** Progress percentage (0-100) */
    progress: number;
    /** Current phase */
    phase?: string;
    /** Model task type */
    task: 'regression' | 'classification' | 'clustering' | 'auto';
    /** Current trial number */
    current_trial?: number;
    /** Total trials */
    total_trials?: number;
    /** Best accuracy so far */
    best_accuracy?: number;
    /** Estimated time remaining (ms) */
    eta_ms?: number;
    /** Error message if failed */
    error?: string;
    /** Started timestamp */
    started_at: Date;
    /** Completed timestamp */
    completed_at?: Date;
    /** Model ID (when completed) */
    model_id?: string;
}
interface TrainingMetrics {
    /** Trial number */
    trial: number;
    /** Accuracy */
    accuracy?: number;
    /** Loss */
    loss?: number;
    /** Additional metrics */
    metrics?: Record<string, number>;
    /** Timestamp */
    timestamp: Date;
}
interface ListTrainingJobsOptions {
    /** Filter by status */
    status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    /** Page number */
    page?: number;
    /** Page size */
    page_size?: number;
}

/**
 * AutoML client for SynapCores SDK
 */

declare class AutoMLModel {
    private readonly client;
    readonly info: ModelInfo;
    constructor(client: AutoMLClient, info: ModelInfo);
    get id(): string;
    get name(): string;
    predict(data: Record<string, any> | Record<string, any>[]): Promise<any | any[]>;
    evaluate(testData: string | Record<string, any>[], target?: string): Promise<EvaluationResult>;
    delete(): Promise<void>;
}
declare class AutoMLClient {
    readonly synapCores: SynapCores;
    constructor(synapCores: SynapCores);
    train(options: TrainOptions): Promise<AutoMLModel>;
    getModel(modelId: string): Promise<AutoMLModel>;
    listModels(filters?: {
        task?: string;
        status?: string;
    }): Promise<ModelInfo[]>;
    /**
     * Start async training job
     */
    trainAsync(options: AsyncTrainOptions): Promise<TrainingJob>;
    /**
     * Get training job status
     */
    getTrainingJob(jobId: string): Promise<TrainingJob>;
    /**
     * List training jobs
     */
    listTrainingJobs(options?: ListTrainingJobsOptions): Promise<TrainingJob[]>;
    /**
     * Cancel a training job
     */
    cancelTrainingJob(jobId: string): Promise<void>;
    /**
     * Get training metrics for a job.
     *
     * @deprecated The gateway v2 AutoML surface does not expose a per-job
     * metrics timeline. Read the final metrics from the completed job via
     * {@link getTrainingJob} (`job.best_accuracy`) or from the trained model
     * via {@link getModel} instead.
     */
    getTrainingMetrics(_jobId: string): Promise<TrainingMetrics[]>;
    /**
     * Wait for training job to complete
     */
    waitForTrainingJob(jobId: string, options?: {
        pollInterval?: number;
        timeout?: number;
        onProgress?: (job: TrainingJob) => void;
    }): Promise<AutoMLModel>;
}

/**
 * Type definitions for NLP operations
 */
interface Sentiment {
    label: 'positive' | 'negative' | 'neutral';
    score: number;
    confidence: number;
}
interface Entity {
    text: string;
    type: string;
    start: number;
    end: number;
    score: number;
}
interface NLPAnalysis {
    sentiment?: Sentiment;
    entities?: Entity[];
    summary?: string;
    keywords?: string[];
    language?: string;
}
interface AnalyzeOptions {
    text: string | string[];
    tasks?: Array<'sentiment' | 'entities' | 'summary' | 'keywords'>;
    language?: string;
}
interface SummarizeOptions {
    text: string;
    maxLength?: number;
    minLength?: number;
}
interface ClassifyOptions {
    text: string | string[];
    categories: string[];
    multiLabel?: boolean;
}

/**
 * NLP client for SynapCores SDK
 */

declare class NLPClient {
    private readonly synapCores;
    constructor(synapCores: SynapCores);
    /**
     * Run several NLP tasks in one call.
     *
     * @deprecated The gateway v2 AI surface has no combined `/ai/analyze`
     * endpoint. Call the individual task methods instead —
     * {@link sentiment}, {@link extractEntities} and {@link summarize} —
     * each of which maps to a real gateway route.
     */
    analyze(_options: AnalyzeOptions): Promise<NLPAnalysis | NLPAnalysis[]>;
    summarize(options: SummarizeOptions): Promise<string>;
    extractEntities(text: string, entityTypes?: string[]): Promise<Entity[]>;
    sentiment(text: string | string[]): Promise<Sentiment | Sentiment[]>;
    classify(options: ClassifyOptions): Promise<Record<string, number> | Record<string, number>[]>;
}

/**
 * Recipe Management Types
 */
interface RecipeInfo {
    /** Recipe ID */
    id: string;
    /** Recipe name */
    name: string;
    /** Recipe description */
    description: string;
    /** Recipe category */
    category: string;
    /** Recipe tags */
    tags: string[];
    /** Creation timestamp */
    created_at: Date;
    /** Last update timestamp */
    updated_at: Date;
    /** Author/creator */
    author?: string;
    /** Execution count */
    execution_count?: number;
}
interface Recipe extends RecipeInfo {
    /** Recipe content (markdown) */
    content: string;
    /** Recipe parameters */
    parameters?: RecipeParameter[];
    /** Recipe version */
    version?: string;
}
interface RecipeParameter {
    /** Parameter name */
    name: string;
    /** Parameter type */
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    /** Parameter description */
    description?: string;
    /** Whether parameter is required */
    required?: boolean;
    /** Default value */
    default?: any;
    /** Validation pattern (for strings) */
    pattern?: string;
}
interface CreateRecipeOptions {
    /** Recipe name */
    name: string;
    /** Recipe description */
    description: string;
    /** Recipe category */
    category: string;
    /** Recipe content (markdown) */
    content: string;
    /** Recipe tags */
    tags?: string[];
    /** Recipe parameters */
    parameters?: RecipeParameter[];
}
interface ListRecipesOptions {
    /** Filter by category */
    category?: string;
    /** Filter by tags */
    tags?: string[];
    /** Search query */
    search?: string;
    /** Page number */
    page?: number;
    /** Page size */
    page_size?: number;
}
interface ExecuteRecipeOptions {
    /** Recipe ID or name */
    recipe: string;
    /** Recipe parameters */
    parameters?: Record<string, any>;
    /** Dry run (don't execute, just validate) */
    dry_run?: boolean;
}
interface RecipeExecutionResult {
    /** Execution ID */
    id: string;
    /** Whether execution succeeded */
    success: boolean;
    /** Results from SQL execution */
    results?: any[];
    /** Error message if failed */
    error?: string;
    /** Execution time in milliseconds */
    execution_time_ms: number;
    /** Number of statements executed */
    statements_executed: number;
}
interface GenerateRecipeOptions {
    /** User's intent/description */
    intent: string;
    /** Recipe category */
    category: string;
    /** Optional context about database schema */
    context?: string;
}
interface GeneratedRecipe {
    /** Generated recipe name */
    name: string;
    /** Generated recipe description */
    description: string;
    /** Generated recipe content (markdown) */
    content: string;
}

/**
 * Recipe Management Client for SynapCores SDK
 */

declare class RecipeClient {
    private readonly synapCores;
    constructor(synapCores: SynapCores);
    /**
     * Create a new recipe
     */
    create(options: CreateRecipeOptions): Promise<Recipe>;
    /**
     * List recipes with optional filters
     */
    list(options?: ListRecipesOptions): Promise<RecipeInfo[]>;
    /**
     * Get a specific recipe by ID
     */
    get(id: string): Promise<Recipe>;
    /**
     * Update an existing recipe
     */
    update(id: string, updates: Partial<CreateRecipeOptions>): Promise<Recipe>;
    /**
     * Delete a recipe
     */
    delete(id: string): Promise<void>;
    /**
     * Execute a recipe
     */
    execute(options: ExecuteRecipeOptions): Promise<RecipeExecutionResult>;
    /**
     * Generate a recipe using AI
     */
    generate(options: GenerateRecipeOptions): Promise<GeneratedRecipe>;
    /**
     * List available recipe categories
     */
    listCategories(): Promise<string[]>;
}

/**
 * Schema Introspection Types
 */
interface TableInfo$1 {
    /** Table name */
    name: string;
    /** Table type */
    type: 'table' | 'view' | 'system';
    /** Number of columns */
    column_count: number;
    /** Number of rows (approximate) */
    row_count?: number;
    /** Table size in bytes */
    size_bytes?: number;
    /** Creation timestamp */
    created_at?: Date;
    /** Last update timestamp */
    updated_at?: Date;
    /** Table comment/description */
    comment?: string;
}
interface ColumnInfo {
    /** Column name */
    name: string;
    /** Data type */
    data_type: string;
    /** Whether nullable */
    nullable: boolean;
    /** Default value */
    default_value?: any;
    /** Whether primary key */
    is_primary_key?: boolean;
    /** Whether unique */
    is_unique?: boolean;
    /** Whether indexed */
    is_indexed?: boolean;
    /** Foreign key reference */
    foreign_key?: ForeignKeyReference;
    /** Column comment/description */
    comment?: string;
    /** Column position */
    ordinal_position?: number;
}
interface ForeignKeyReference {
    /** Referenced table */
    table: string;
    /** Referenced column */
    column: string;
    /** On delete action */
    on_delete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    /** On update action */
    on_update?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}
interface IndexInfo {
    /** Index name */
    name: string;
    /** Table name */
    table: string;
    /** Index type */
    type: 'btree' | 'hash' | 'vector' | 'text';
    /** Indexed columns */
    columns: string[];
    /** Whether unique */
    is_unique: boolean;
    /** Whether primary key */
    is_primary: boolean;
    /** Index size in bytes */
    size_bytes?: number;
    /** Creation timestamp */
    created_at?: Date;
}
interface TableSchema {
    /** Table info */
    table: TableInfo$1;
    /** Column definitions */
    columns: ColumnInfo[];
    /** Indexes */
    indexes: IndexInfo[];
    /** Constraints */
    constraints: ConstraintInfo[];
    /** Relationships */
    relationships: RelationshipInfo[];
}
interface ConstraintInfo {
    /** Constraint name */
    name: string;
    /** Constraint type */
    type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'NOT NULL';
    /** Columns involved */
    columns: string[];
    /** Check expression (for CHECK constraints) */
    expression?: string;
    /** Referenced table (for FOREIGN KEY) */
    referenced_table?: string;
    /** Referenced columns (for FOREIGN KEY) */
    referenced_columns?: string[];
}
interface RelationshipInfo {
    /** Relationship type */
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    /** Source table */
    from_table: string;
    /** Source column */
    from_column: string;
    /** Target table */
    to_table: string;
    /** Target column */
    to_column: string;
    /** Relationship name */
    name?: string;
}
interface SchemaStatistics {
    /** Total number of tables */
    table_count: number;
    /** Total number of views */
    view_count: number;
    /** Total number of indexes */
    index_count: number;
    /** Total number of relationships */
    relationship_count: number;
    /** Total database size in bytes */
    total_size_bytes: number;
    /** Total row count across all tables */
    total_rows: number;
    /** Database version */
    version?: string;
    /** Last analyzed timestamp */
    analyzed_at?: Date;
}
interface ValidationResult {
    /** Whether valid */
    is_valid: boolean;
    /** Validation errors */
    errors: ValidationError$2[];
    /** Validation warnings */
    warnings: ValidationWarning$1[];
}
interface ValidationError$2 {
    /** Error type */
    type: string;
    /** Error message */
    message: string;
    /** Location (table.column) */
    location?: string;
}
interface ValidationWarning$1 {
    /** Warning type */
    type: string;
    /** Warning message */
    message: string;
    /** Location (table.column) */
    location?: string;
    /** Suggested fix */
    suggestion?: string;
}

/**
 * Schema Introspection Client for SynapCores SDK
 */

declare class SchemaClient {
    private readonly synapCores;
    constructor(synapCores: SynapCores);
    /**
     * List all tables in the database
     */
    listTables(options?: {
        includeSystem?: boolean;
    }): Promise<TableInfo$1[]>;
    /**
     * Get complete schema for a specific table
     */
    getTable(tableName: string): Promise<TableSchema>;
    /**
     * Get columns for a specific table
     */
    getColumns(tableName: string): Promise<ColumnInfo[]>;
    /**
     * Get indexes for a specific table
     */
    getIndexes(tableName: string): Promise<IndexInfo[]>;
    /**
     * Get all relationships in the database.
     *
     * @deprecated The gateway v2 schema surface exposes relationships only
     * per-table, inside {@link getTable} (`schema.relationships`). There is no
     * database-wide `/schema/relationships` route. Iterate {@link listTables}
     * and read each table's relationships instead.
     */
    getRelationships(): Promise<RelationshipInfo[]>;
    /**
     * Get schema statistics.
     *
     * @deprecated No `/schema/statistics` route exists in gateway v2. Derive
     * counts from {@link listTables}, or query the engine directly via
     * `client.executeQuery('SHOW TABLES')`.
     */
    getStatistics(): Promise<SchemaStatistics>;
    /**
     * Validate a schema definition.
     *
     * @deprecated No `/schema/validate` route exists in gateway v2.
     */
    validateSchema(_schema: object): Promise<ValidationResult>;
    /**
     * Compare two schemas.
     *
     * @deprecated No `/schema/compare` route exists in gateway v2.
     */
    compareSchemas(_schema1: string | object, _schema2: string | object): Promise<{
        differences: any[];
        added: string[];
        removed: string[];
        modified: string[];
    }>;
    /**
     * Generate SQL DDL for a table.
     *
     * @deprecated No `/schema/tables/:t/ddl` route exists in gateway v2.
     */
    generateDDL(_tableName: string): Promise<string>;
    /**
     * Analyze table and update statistics.
     *
     * @deprecated No `/schema/tables/:t/analyze` route exists in gateway v2.
     */
    analyzeTable(tableName: string): Promise<void>;
}

/**
 * Data Import/Export Types
 */
interface ImportOptions {
    /** Target table name */
    table: string;
    /** Data format */
    format: 'csv' | 'json' | 'ndjson';
    /** File path or data content */
    data: string | Buffer;
    /** Import mode */
    mode?: 'insert' | 'upsert' | 'replace';
    /** Column mapping (source -> target) */
    column_mapping?: Record<string, string>;
    /** Skip header row (CSV only) */
    skip_header?: boolean;
    /** CSV delimiter (default: comma) */
    delimiter?: string;
    /** Batch size for inserts */
    batch_size?: number;
    /** Continue on error */
    continue_on_error?: boolean;
    /** Primary key columns for upsert mode */
    primary_keys?: string[];
}
interface ImportResult {
    /** Import job ID */
    id: string;
    /** Whether import succeeded */
    success: boolean;
    /** Number of rows processed */
    rows_processed: number;
    /** Number of rows imported */
    rows_imported: number;
    /** Number of rows failed */
    rows_failed: number;
    /** Import duration in milliseconds */
    duration_ms: number;
    /** Errors encountered */
    errors?: ImportError[];
    /** Warnings */
    warnings?: string[];
}
interface ImportError {
    /** Row number (1-based) */
    row: number;
    /** Error message */
    message: string;
    /** Raw row data */
    data?: any;
}
interface ExportOptions {
    /** Source table or query */
    source: string;
    /** Export format */
    format: 'csv' | 'json' | 'ndjson';
    /** Output destination */
    destination?: 'file' | 'response';
    /** Columns to export (default: all) */
    columns?: string[];
    /** WHERE clause filter */
    filter?: string;
    /** ORDER BY clause */
    order_by?: string;
    /** Limit number of rows */
    limit?: number;
    /** Include header row (CSV only) */
    include_header?: boolean;
    /** CSV delimiter (default: comma) */
    delimiter?: string;
    /** Compression (gzip) */
    compress?: boolean;
}
interface ExportResult {
    /** Export job ID */
    id: string;
    /** Whether export succeeded */
    success: boolean;
    /** Number of rows exported */
    rows_exported: number;
    /** Export duration in milliseconds */
    duration_ms: number;
    /** File path (if destination=file) */
    file_path?: string;
    /** Exported data (if destination=response) */
    data?: string | Buffer;
    /** File size in bytes */
    size_bytes?: number;
    /** Download URL (if applicable) */
    download_url?: string;
    /** Expiration time for download URL */
    expires_at?: Date;
}
interface ImportJobStatus {
    /** Job ID */
    id: string;
    /** Job status */
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    /** Progress percentage (0-100) */
    progress: number;
    /** Current phase */
    phase?: string;
    /** Rows processed so far */
    rows_processed?: number;
    /** Estimated time remaining (ms) */
    eta_ms?: number;
    /** Error message if failed */
    error?: string;
    /** Started timestamp */
    started_at?: Date;
    /** Completed timestamp */
    completed_at?: Date;
}
interface ExportJobStatus {
    /** Job ID */
    id: string;
    /** Job status */
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    /** Progress percentage (0-100) */
    progress: number;
    /** Current phase */
    phase?: string;
    /** Rows exported so far */
    rows_exported?: number;
    /** Estimated time remaining (ms) */
    eta_ms?: number;
    /** Error message if failed */
    error?: string;
    /** Started timestamp */
    started_at?: Date;
    /** Completed timestamp */
    completed_at?: Date;
}
interface BulkImportOptions {
    /** Import jobs to execute */
    jobs: ImportOptions[];
    /** Execute jobs in parallel */
    parallel?: boolean;
    /** Stop all on first error */
    stop_on_error?: boolean;
}
interface BulkImportResult {
    /** Bulk operation ID */
    id: string;
    /** Whether all imports succeeded */
    success: boolean;
    /** Individual job results */
    results: ImportResult[];
    /** Total rows imported across all jobs */
    total_rows_imported: number;
    /** Total duration in milliseconds */
    total_duration_ms: number;
}
interface DataValidationOptions {
    /** Target table */
    table: string;
    /** Data to validate */
    data: any[];
    /** Validation mode */
    mode?: 'strict' | 'lenient';
    /** Check foreign keys */
    check_foreign_keys?: boolean;
    /** Check unique constraints */
    check_unique?: boolean;
}
interface DataValidationResult {
    /** Whether data is valid */
    is_valid: boolean;
    /** Validation errors */
    errors: ValidationError$1[];
    /** Validation warnings */
    warnings: ValidationWarning[];
    /** Number of rows validated */
    rows_validated: number;
}
interface ValidationError$1 {
    /** Row number */
    row: number;
    /** Column name */
    column?: string;
    /** Error type */
    type: 'type_mismatch' | 'constraint_violation' | 'foreign_key' | 'null_violation' | 'duplicate';
    /** Error message */
    message: string;
    /** Actual value */
    value?: any;
}
interface ValidationWarning {
    /** Row number */
    row: number;
    /** Column name */
    column?: string;
    /** Warning type */
    type: string;
    /** Warning message */
    message: string;
}

/**
 * Data Import/Export Client for SynapCores SDK
 *
 * Reconciled for gateway v2 (0.6.0): the served surface is a pair of
 * multipart file-upload endpoints — `POST /data/import/csv` and
 * `POST /data/import/json`. The batch job/export/validate/template surface
 * that older SDK builds assumed was never part of the v2 gateway; those
 * methods now throw {@link NotImplementedError} pointing at the supported
 * path.
 */

declare class ImportExportClient {
    private readonly synapCores;
    constructor(synapCores: SynapCores);
    /**
     * Import data into a table from a CSV or JSON payload.
     *
     * Gateway (v2): `POST /data/import/{csv|json}` (multipart/form-data). The
     * endpoint is chosen from `options.format`. The file/content is sent under
     * the `file` field; table + parsing hints map to the handler's field names
     * (`table` → `table_name`, `skip_header` → `has_headers`, `primary_keys`
     * → `primary_key`).
     */
    import(options: ImportOptions): Promise<ImportResult>;
    /**
     * Export data from a table or query.
     *
     * @deprecated The gateway v2 surface has no `/export` route. Export via
     * `client.executeQuery('SELECT ...')` and serialize the returned rows
     * client-side.
     */
    export(_options: ExportOptions): Promise<ExportResult>;
    /**
     * @deprecated Import is synchronous on gateway v2; there is no job-status
     * route. {@link import} returns the final result directly.
     */
    getImportStatus(_jobId: string): Promise<ImportJobStatus>;
    /**
     * @deprecated No `/export` route exists in gateway v2.
     */
    getExportStatus(_jobId: string): Promise<ExportJobStatus>;
    /**
     * @deprecated Imports are synchronous on gateway v2; nothing to cancel.
     */
    cancelImport(_jobId: string): Promise<void>;
    /**
     * @deprecated No `/export` route exists in gateway v2.
     */
    cancelExport(_jobId: string): Promise<void>;
    /**
     * @deprecated No bulk/multi-source import route exists in gateway v2. Call
     * {@link import} once per source.
     */
    bulkImport(_options: BulkImportOptions): Promise<BulkImportResult>;
    /**
     * @deprecated No `/import/validate` route exists in gateway v2. The
     * import endpoints validate on ingest and report row errors in the result.
     */
    validateData(_options: DataValidationOptions): Promise<DataValidationResult>;
    /**
     * @deprecated No import-template route exists in gateway v2. Derive the
     * column list from `client.schema.getTable(name)`.
     */
    getImportTemplate(_tableName: string, _format?: 'csv' | 'json'): Promise<string>;
    /**
     * @deprecated Imports are synchronous on gateway v2; there is no job list.
     */
    listJobs(_options?: {
        type?: 'import' | 'export';
        status?: string;
        limit?: number;
    }): Promise<Array<ImportJobStatus | ExportJobStatus>>;
    /**
     * @deprecated No `/export` route exists in gateway v2.
     */
    downloadExport(_jobId: string): Promise<Buffer>;
    /**
     * @deprecated Streaming import polling relied on job-status routes that do
     * not exist in gateway v2. Call {@link import} directly — it returns the
     * final result synchronously.
     */
    streamImport(_options: ImportOptions, _onProgress?: (progress: ImportJobStatus) => void): Promise<ImportResult>;
    /**
     * @deprecated No `/export` route exists in gateway v2.
     */
    streamExport(_options: ExportOptions, _onProgress?: (progress: ExportJobStatus) => void): Promise<ExportResult>;
}

/**
 * Integration Management Types
 */
interface Integration {
    /** Integration ID */
    id: string;
    /** Integration name */
    name: string;
    /** Integration type */
    type: 'webhook' | 'api' | 'database' | 'messaging' | 'storage' | 'custom';
    /** Integration status */
    status: 'active' | 'inactive' | 'error';
    /** Configuration */
    config: IntegrationConfig;
    /** Description */
    description?: string;
    /** Tags */
    tags?: string[];
    /** Creation timestamp */
    created_at: Date;
    /** Last update timestamp */
    updated_at: Date;
    /** Last successful execution */
    last_success_at?: Date;
    /** Last error */
    last_error?: string;
    /** Execution count */
    execution_count?: number;
}
interface IntegrationConfig {
    /** Endpoint URL (for webhook/api) */
    url?: string;
    /** HTTP method (for webhook/api) */
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    /** Headers */
    headers?: Record<string, string>;
    /** Authentication */
    auth?: AuthConfig;
    /** Connection string (for database) */
    connection_string?: string;
    /** Custom configuration */
    custom?: Record<string, any>;
    /** Retry configuration */
    retry?: RetryConfig;
    /** Timeout in milliseconds */
    timeout_ms?: number;
}
interface AuthConfig {
    /** Auth type */
    type: 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth2' | 'custom';
    /** Username (basic auth) */
    username?: string;
    /** Password (basic auth) */
    password?: string;
    /** Token (bearer auth) */
    token?: string;
    /** API key */
    api_key?: string;
    /** API key header name */
    api_key_header?: string;
    /** OAuth2 configuration */
    oauth2?: OAuth2Config;
    /** Custom auth data */
    custom?: Record<string, any>;
}
interface OAuth2Config {
    /** Client ID */
    client_id: string;
    /** Client secret */
    client_secret: string;
    /** Token URL */
    token_url: string;
    /** Scopes */
    scopes?: string[];
    /** Additional parameters */
    params?: Record<string, string>;
}
interface RetryConfig {
    /** Maximum retry attempts */
    max_attempts: number;
    /** Initial delay in milliseconds */
    initial_delay_ms: number;
    /** Maximum delay in milliseconds */
    max_delay_ms: number;
    /** Backoff multiplier */
    backoff_multiplier?: number;
    /** Retry on status codes */
    retry_on_status?: number[];
}
interface CreateIntegrationOptions {
    /** Integration name */
    name: string;
    /** Integration type */
    type: 'webhook' | 'api' | 'database' | 'messaging' | 'storage' | 'custom';
    /** Configuration */
    config: IntegrationConfig;
    /** Description */
    description?: string;
    /** Tags */
    tags?: string[];
    /** Auto-activate */
    activate?: boolean;
}
interface ListIntegrationsOptions {
    /** Filter by type */
    type?: string;
    /** Filter by status */
    status?: 'active' | 'inactive' | 'error';
    /** Filter by tags */
    tags?: string[];
    /** Search query */
    search?: string;
    /** Page number */
    page?: number;
    /** Page size */
    page_size?: number;
}
interface ExecuteIntegrationOptions {
    /** Integration ID or name */
    integration: string;
    /** Payload data */
    payload?: any;
    /** Override configuration */
    config_override?: Partial<IntegrationConfig>;
    /** Synchronous execution (wait for response) */
    sync?: boolean;
}
interface IntegrationExecutionResult {
    /** Execution ID */
    id: string;
    /** Whether execution succeeded */
    success: boolean;
    /** Response data */
    response?: any;
    /** HTTP status code (for webhooks/APIs) */
    status_code?: number;
    /** Error message if failed */
    error?: string;
    /** Execution time in milliseconds */
    execution_time_ms: number;
    /** Retry count */
    retry_count?: number;
    /** Executed timestamp */
    executed_at: Date;
}
interface IntegrationWebhook {
    /** Webhook ID */
    id: string;
    /** Integration ID */
    integration_id: string;
    /** Event type */
    event: string;
    /** Webhook URL */
    url: string;
    /** Active status */
    active: boolean;
    /** Secret for signature verification */
    secret?: string;
    /** Created timestamp */
    created_at: Date;
}
interface CreateWebhookOptions {
    /** Integration ID */
    integration_id: string;
    /** Event type to trigger on */
    event: string;
    /** Webhook URL */
    url: string;
    /** Secret for signature verification */
    secret?: string;
    /** Auto-activate */
    activate?: boolean;
}
interface IntegrationEvent {
    /** Event ID */
    id: string;
    /** Integration ID */
    integration_id: string;
    /** Event type */
    event: string;
    /** Event data */
    data: any;
    /** Event timestamp */
    timestamp: Date;
    /** Status */
    status: 'pending' | 'processing' | 'completed' | 'failed';
    /** Error message if failed */
    error?: string;
}
interface IntegrationLog {
    /** Log ID */
    id: string;
    /** Integration ID */
    integration_id: string;
    /** Log level */
    level: 'info' | 'warning' | 'error' | 'debug';
    /** Log message */
    message: string;
    /** Additional data */
    data?: any;
    /** Timestamp */
    timestamp: Date;
}
interface IntegrationStats {
    /** Integration ID */
    integration_id: string;
    /** Total executions */
    total_executions: number;
    /** Successful executions */
    successful_executions: number;
    /** Failed executions */
    failed_executions: number;
    /** Average execution time (ms) */
    avg_execution_time_ms: number;
    /** Last 24h executions */
    executions_24h: number;
    /** Uptime percentage */
    uptime_percentage: number;
    /** Last success timestamp */
    last_success_at?: Date;
    /** Last error timestamp */
    last_error_at?: Date;
}
interface TestIntegrationOptions {
    /** Integration ID or name */
    integration: string;
    /** Test payload */
    payload?: any;
    /** Validate only (don't execute) */
    validate_only?: boolean;
}
interface TestIntegrationResult {
    /** Whether test succeeded */
    success: boolean;
    /** Validation errors */
    validation_errors?: string[];
    /** Test response */
    response?: any;
    /** Error message */
    error?: string;
    /** Latency in milliseconds */
    latency_ms?: number;
}

/**
 * Integration Management Client for SynapCores SDK
 *
 * Reconciled for gateway v2 (0.6.0). The served surface (routes/integrations.rs)
 * is a **type-keyed configuration** API — one stored config per integration
 * type — not the id-based execution/webhook engine older SDK builds assumed:
 *   GET    /integrations                    list
 *   GET    /integrations/:type              get
 *   POST   /integrations/:type              create or update (upsert)
 *   DELETE /integrations/:type              delete
 *   POST   /integrations/:type/test         test connection
 *   GET    /integrations/types              list available types (metadata)
 *   GET    /integrations/audit              audit log
 *
 * Consequently the `:id` in {@link get}/{@link update}/{@link delete}/
 * {@link test}/{@link execute} identifies an integration **type** (e.g.
 * "slack", "s3", "postgres"). Execution / webhook / event / log / stats /
 * retry surfaces have no v2 route and throw {@link NotImplementedError}.
 */

declare class IntegrationClient {
    private readonly synapCores;
    constructor(synapCores: SynapCores);
    /**
     * Create or update the stored config for an integration type.
     * Gateway (v2): `POST /integrations/:type` (upsert). Config fields are
     * flattened into the request body (see routes/integrations.rs
     * `CreateIntegrationRequest`).
     */
    create(options: CreateIntegrationOptions): Promise<Integration>;
    /**
     * List configured integrations. Gateway (v2): `GET /integrations`.
     */
    list(options?: ListIntegrationsOptions): Promise<Integration[]>;
    /**
     * Get one integration by **type**. Gateway (v2): `GET /integrations/:type`.
     * @param integrationType - the integration type key (e.g. "slack").
     */
    get(integrationType: string): Promise<Integration>;
    /**
     * Update the stored config for an integration type (upsert).
     * Gateway (v2): `POST /integrations/:type`.
     * @param integrationType - the integration type key.
     */
    update(integrationType: string, updates: Partial<CreateIntegrationOptions>): Promise<Integration>;
    /**
     * Delete an integration config by **type**.
     * Gateway (v2): `DELETE /integrations/:type`.
     */
    delete(integrationType: string): Promise<void>;
    /**
     * Test an integration connection. Gateway (v2):
     * `POST /integrations/:type/test`.
     * @param options.integration - the integration type key.
     */
    test(options: TestIntegrationOptions): Promise<TestIntegrationResult>;
    /** @deprecated No activate route; set the config's active flag via {@link update}. */
    activate(_id: string): Promise<Integration>;
    /** @deprecated No deactivate route; delete the config via {@link delete}. */
    deactivate(_id: string): Promise<Integration>;
    /**
     * @deprecated Gateway v2 integrations store connection configs; they are not
     * an execution engine. There is no `/integrations/:id/execute` route.
     */
    execute(_options: ExecuteIntegrationOptions): Promise<IntegrationExecutionResult>;
    /** @deprecated No execution-history route in gateway v2. */
    getExecutionHistory(_integrationId: string, _options?: {
        limit?: number;
        offset?: number;
    }): Promise<IntegrationExecutionResult[]>;
    /** @deprecated No per-integration stats route in gateway v2. */
    getStats(_integrationId: string): Promise<IntegrationStats>;
    /** @deprecated No webhook routes in gateway v2. */
    createWebhook(_options: CreateWebhookOptions): Promise<IntegrationWebhook>;
    /** @deprecated No webhook routes in gateway v2. */
    listWebhooks(_integrationId: string): Promise<IntegrationWebhook[]>;
    /** @deprecated No webhook routes in gateway v2. */
    deleteWebhook(_webhookId: string): Promise<void>;
    /** @deprecated No per-integration events route in gateway v2. */
    getEvents(_integrationId: string, _options?: {
        limit?: number;
        status?: string;
    }): Promise<IntegrationEvent[]>;
    /** @deprecated No per-integration logs route in gateway v2. */
    getLogs(_integrationId: string, _options?: {
        limit?: number;
        level?: string;
    }): Promise<IntegrationLog[]>;
    /** @deprecated No execution/retry route in gateway v2. */
    retryExecution(_executionId: string): Promise<IntegrationExecutionResult>;
    /**
     * Map a gateway IntegrationResponse to the SDK Integration type.
     */
    private mapIntegration;
}

/**
 * Backup/Restore Types
 */
interface BackupOptions {
    /** Backup name */
    name?: string;
    /** Description */
    description?: string;
    /** Backup type */
    type?: 'full' | 'incremental' | 'differential';
    /** Tables to include (default: all) */
    tables?: string[];
    /** Include indexes */
    include_indexes?: boolean;
    /** Include procedures/triggers */
    include_procedures?: boolean;
    /** Compression level (0-9, default: 6) */
    compression?: number;
    /** Encryption enabled */
    encrypt?: boolean;
    /** Encryption key (if encrypt=true) */
    encryption_key?: string;
    /** Storage location */
    storage?: 'local' | 's3' | 'gcs' | 'azure';
    /** Storage configuration */
    storage_config?: StorageConfig;
    /** Tags */
    tags?: string[];
}
interface StorageConfig {
    /** S3 bucket name */
    bucket?: string;
    /** Storage region */
    region?: string;
    /** Access key ID */
    access_key_id?: string;
    /** Secret access key */
    secret_access_key?: string;
    /** Storage path prefix */
    path_prefix?: string;
    /** Custom endpoint URL */
    endpoint?: string;
    /** Additional configuration */
    custom?: Record<string, any>;
}
interface Backup {
    /** Backup ID */
    id: string;
    /** Backup name */
    name: string;
    /** Description */
    description?: string;
    /** Backup type */
    type: 'full' | 'incremental' | 'differential';
    /** Backup status */
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'deleted';
    /** Size in bytes */
    size_bytes?: number;
    /** Compressed size in bytes */
    compressed_size_bytes?: number;
    /** Number of tables backed up */
    table_count?: number;
    /** Creation timestamp */
    created_at: Date;
    /** Completion timestamp */
    completed_at?: Date;
    /** Duration in milliseconds */
    duration_ms?: number;
    /** Storage location */
    storage?: string;
    /** Storage path */
    storage_path?: string;
    /** Encrypted */
    encrypted: boolean;
    /** Tags */
    tags?: string[];
    /** Parent backup ID (for incremental) */
    parent_backup_id?: string;
    /** Error message if failed */
    error?: string;
}
interface RestoreOptions {
    /** Backup ID to restore from */
    backup_id: string;
    /** Restore mode */
    mode?: 'full' | 'partial';
    /** Tables to restore (for partial restore) */
    tables?: string[];
    /** Target database name (if different) */
    target_database?: string;
    /** Overwrite existing data */
    overwrite?: boolean;
    /** Skip indexes */
    skip_indexes?: boolean;
    /** Skip procedures/triggers */
    skip_procedures?: boolean;
    /** Decryption key (if backup is encrypted) */
    decryption_key?: string;
    /** Point-in-time restore timestamp */
    point_in_time?: Date;
    /** Dry run (validate only) */
    dry_run?: boolean;
}
interface RestoreResult {
    /** Restore job ID */
    id: string;
    /** Whether restore succeeded */
    success: boolean;
    /** Tables restored */
    tables_restored?: string[];
    /** Rows restored */
    rows_restored?: number;
    /** Duration in milliseconds */
    duration_ms: number;
    /** Error message if failed */
    error?: string;
    /** Warnings */
    warnings?: string[];
}
interface BackupStatus {
    /** Backup ID */
    id: string;
    /** Status */
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'deleted';
    /** Progress percentage (0-100) */
    progress: number;
    /** Current phase */
    phase?: string;
    /** Tables processed */
    tables_processed?: number;
    /** Total tables */
    total_tables?: number;
    /** Bytes processed */
    bytes_processed?: number;
    /** Estimated time remaining (ms) */
    eta_ms?: number;
    /** Error message if failed */
    error?: string;
    /** Started timestamp */
    started_at?: Date;
    /** Completed timestamp */
    completed_at?: Date;
}
interface RestoreStatus {
    /** Restore job ID */
    id: string;
    /** Status */
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
    /** Progress percentage (0-100) */
    progress: number;
    /** Current phase */
    phase?: string;
    /** Tables processed */
    tables_processed?: number;
    /** Total tables */
    total_tables?: number;
    /** Rows processed */
    rows_processed?: number;
    /** Estimated time remaining (ms) */
    eta_ms?: number;
    /** Error message if failed */
    error?: string;
    /** Started timestamp */
    started_at?: Date;
    /** Completed timestamp */
    completed_at?: Date;
}
interface ListBackupsOptions {
    /** Filter by type */
    type?: 'full' | 'incremental' | 'differential';
    /** Filter by status */
    status?: string;
    /** Filter by tags */
    tags?: string[];
    /** Sort order */
    sort?: 'created_at' | 'size' | 'name';
    /** Sort direction */
    order?: 'asc' | 'desc';
    /** Page number */
    page?: number;
    /** Page size */
    page_size?: number;
}
interface BackupSchedule {
    /** Schedule ID */
    id: string;
    /** Schedule name */
    name: string;
    /** Cron expression */
    cron: string;
    /** Backup options */
    backup_options: BackupOptions;
    /** Active status */
    active: boolean;
    /** Last run timestamp */
    last_run_at?: Date;
    /** Next run timestamp */
    next_run_at?: Date;
    /** Creation timestamp */
    created_at: Date;
    /** Tags */
    tags?: string[];
}
interface CreateScheduleOptions {
    /** Schedule name */
    name: string;
    /** Cron expression */
    cron: string;
    /** Backup options */
    backup_options: BackupOptions;
    /** Auto-activate */
    activate?: boolean;
    /** Tags */
    tags?: string[];
}
interface BackupVerificationResult {
    /** Whether backup is valid */
    is_valid: boolean;
    /** Integrity check passed */
    integrity_ok: boolean;
    /** Checksum match */
    checksum_match?: boolean;
    /** Tables verified */
    tables_verified?: number;
    /** Errors found */
    errors?: string[];
    /** Warnings */
    warnings?: string[];
    /** Verification timestamp */
    verified_at: Date;
}
interface BackupMetrics {
    /** Total backups */
    total_backups: number;
    /** Total size (bytes) */
    total_size_bytes: number;
    /** Successful backups */
    successful_backups: number;
    /** Failed backups */
    failed_backups: number;
    /** Average backup size (bytes) */
    avg_backup_size_bytes: number;
    /** Average backup duration (ms) */
    avg_duration_ms: number;
    /** Last backup timestamp */
    last_backup_at?: Date;
    /** Next scheduled backup */
    next_scheduled_at?: Date;
}

/**
 * Backup/Restore Client for SynapCores SDK
 *
 * Reconciled for gateway v2 (0.6.0). The served surface (routes/backup_v2.rs,
 * nested at `/backup`) is:
 *   POST   /backup/backups              create
 *   GET    /backup/backups              list
 *   GET    /backup/backups/:id          get
 *   DELETE /backup/backups/:id          delete
 *   GET    /backup/backups/:id/download download
 *   POST   /backup/restore              restore
 *   GET    /backup/restore/:id/status   restore status
 *   GET    /backup/schedules            list schedules
 *   POST   /backup/schedules            create schedule
 *   GET    /backup/schedules/:id        get schedule
 *   DELETE /backup/schedules/:id        delete schedule
 *
 * Cancel / verify / metrics / schedule-update / schedule-activate are not
 * part of the v2 surface and now throw {@link NotImplementedError}.
 */

declare class BackupClient {
    private readonly synapCores;
    constructor(synapCores: SynapCores);
    /**
     * Create a new backup. Gateway (v2): `POST /backup/backups`.
     */
    create(options?: BackupOptions): Promise<Backup>;
    /**
     * List backups. Gateway (v2): `GET /backup/backups`.
     */
    list(options?: ListBackupsOptions): Promise<Backup[]>;
    /**
     * Get a specific backup by ID. Gateway (v2): `GET /backup/backups/:id`.
     */
    get(id: string): Promise<Backup>;
    /**
     * Delete a backup. Gateway (v2): `DELETE /backup/backups/:id`.
     */
    delete(id: string): Promise<void>;
    /**
     * Restore from a backup. Gateway (v2): `POST /backup/restore`.
     */
    restore(options: RestoreOptions): Promise<RestoreResult>;
    /**
     * Get backup status. Gateway (v2) has no dedicated status route — the
     * backup record from `GET /backup/backups/:id` already carries `status`.
     */
    getBackupStatus(backupId: string): Promise<BackupStatus>;
    /**
     * Get restore status. Gateway (v2): `GET /backup/restore/:id/status`.
     */
    getRestoreStatus(restoreId: string): Promise<RestoreStatus>;
    /**
     * Download a backup file. Gateway (v2): `GET /backup/backups/:id/download`.
     */
    download(backupId: string): Promise<Buffer>;
    /**
     * Create a backup schedule. Gateway (v2): `POST /backup/schedules`.
     */
    createSchedule(options: CreateScheduleOptions): Promise<BackupSchedule>;
    /**
     * List backup schedules. Gateway (v2): `GET /backup/schedules`.
     */
    listSchedules(): Promise<BackupSchedule[]>;
    /**
     * Get a specific schedule. Gateway (v2): `GET /backup/schedules/:id`.
     */
    getSchedule(scheduleId: string): Promise<BackupSchedule>;
    /**
     * Delete a backup schedule. Gateway (v2): `DELETE /backup/schedules/:id`.
     */
    deleteSchedule(scheduleId: string): Promise<void>;
    /**
     * @deprecated No schedule-update route in gateway v2. Delete and recreate
     * the schedule via {@link deleteSchedule} + {@link createSchedule}.
     */
    updateSchedule(_scheduleId: string, _updates: Partial<CreateScheduleOptions>): Promise<BackupSchedule>;
    /** @deprecated No schedule-activate route in gateway v2. */
    activateSchedule(_scheduleId: string): Promise<BackupSchedule>;
    /** @deprecated No schedule-deactivate route in gateway v2. */
    deactivateSchedule(_scheduleId: string): Promise<BackupSchedule>;
    /** @deprecated No backup-cancel route in gateway v2. */
    cancelBackup(_backupId: string): Promise<void>;
    /** @deprecated No restore-cancel route in gateway v2. */
    cancelRestore(_restoreId: string): Promise<void>;
    /** @deprecated No backup-verify route in gateway v2. */
    verify(_backupId: string): Promise<BackupVerificationResult>;
    /** @deprecated No backup-metrics route in gateway v2. */
    getMetrics(): Promise<BackupMetrics>;
    private mapBackup;
    private mapSchedule;
}

/**
 * Agent Memory Client for SynapCores SDK.
 *
 * Wraps the engine-side `MEMORY_STORE` / `MEMORY_RECALL` / `MEMORY_FORGET`
 * SQL functions. The engine auto-creates the backing table on first call
 * and embeds content via the configured embedding model.
 */

/**
 * A single semantic memory record returned by {@link MemoryClient.recall}.
 */
interface MemoryRecord {
    /** Engine-assigned id (e.g. `mem_1kv69sxfn_5ofzwK`). */
    id: string;
    /** Original text that was stored. */
    content: string;
    /** Similarity to the query in `[0, 1]`. */
    similarity: number;
    /** Structured metadata that was attached on store, or `null` if none. */
    metadata: Record<string, unknown> | null;
    /** Timestamp at which the memory was written. */
    createdAt: Date;
}
/**
 * Options accepted by {@link MemoryClient.store}.
 */
interface MemoryStoreOptions {
    /**
     * Optional JSON-serializable metadata attached to the memory. Stored as a
     * JSON string on the engine side and parsed back to an object on recall.
     */
    metadata?: Record<string, unknown>;
}
/**
 * Options accepted by {@link MemoryClient.recall}.
 */
interface MemoryRecallOptions {
    /** Number of nearest memories to return. Defaults to 10, max 100. */
    topK?: number;
}
/**
 * Client for the agent-memory SQL surface.
 *
 * @example
 * ```ts
 * const id = await client.memory.store('default', 'User prefers Python');
 * const hits = await client.memory.recall('default', 'preferred language', { topK: 3 });
 * await client.memory.forget('default', id);
 * ```
 */
declare class MemoryClient {
    private readonly synapCores;
    constructor(synapCores: SynapCores);
    /**
     * Store text in the agent-memory namespace. The engine auto-creates
     * the backing table on first call. Content is embedded via the
     * configured embedding model.
     *
     * @param namespace - must match `/^[A-Za-z_][A-Za-z0-9_]*$/`
     * @param content - the text to remember
     * @param options - optional structured metadata (JSON-serializable)
     * @returns the generated memory id
     */
    store(namespace: string, content: string, options?: MemoryStoreOptions): Promise<string>;
    /**
     * Semantically retrieve the most-similar stored memories.
     * Returns an empty array if the namespace hasn't been written to yet.
     *
     * @param namespace - must match `/^[A-Za-z_][A-Za-z0-9_]*$/`
     * @param query - free text; auto-embedded by the engine
     * @param options - `topK` defaults to 10, max 100
     */
    recall(namespace: string, query: string, options?: MemoryRecallOptions): Promise<MemoryRecord[]>;
    /**
     * Remove a memory by id.
     *
     * @returns `true` if a row was deleted, `false` if the id did not exist.
     */
    forget(namespace: string, id: string): Promise<boolean>;
    private assertValidNamespace;
    private mapRows;
    private columnIndex;
    private parseMetadata;
    private parseTimestamp;
    private toNumber;
    private toBool;
    private isMissingNamespaceError;
    private mapEngineError;
}

/**
 * Type definitions for SynapCores client
 */
interface SynapCoresConfig {
    host?: string;
    port?: number;
    apiKey?: string;
    jwtToken?: string;
    useHttps?: boolean;
    timeout?: number;
    maxRetries?: number;
    rejectUnauthorized?: boolean;
}
interface QueryColumn {
    name: string;
    data_type: string;
    nullable: boolean;
}
interface QueryResult {
    columns: QueryColumn[];
    rows: any[][];
    rows_affected?: number;
    execution_time_ms: number;
    queryPlan?: Record<string, any>;
}
interface EmbedOptions {
    model?: string;
}
interface ColumnDefinition {
    name: string;
    dataType: string;
    constraints?: ColumnConstraint[];
    defaultValue?: any;
}
interface ColumnConstraint {
    type: 'PRIMARY_KEY' | 'UNIQUE' | 'NOT_NULL' | 'CHECK' | 'FOREIGN_KEY' | 'DEFAULT';
    expression?: string;
    referencedTable?: string;
    referencedColumn?: string;
}
interface TableConstraint {
    type: 'PRIMARY_KEY' | 'UNIQUE' | 'CHECK' | 'FOREIGN_KEY';
    columns: string[];
    expression?: string;
    referencedTable?: string;
    referencedColumns?: string[];
}
interface CreateTableOptions {
    ifNotExists?: boolean;
    constraints?: TableConstraint[];
    partitionBy?: {
        type: 'RANGE' | 'LIST' | 'HASH';
        column: string;
    };
}
interface AlterTableOptions {
    action: 'ADD_COLUMN' | 'DROP_COLUMN' | 'RENAME_COLUMN' | 'ALTER_COLUMN' | 'ADD_CONSTRAINT' | 'DROP_CONSTRAINT';
    columnName?: string;
    newColumnName?: string;
    columnDefinition?: ColumnDefinition;
    newDataType?: string;
    constraint?: TableConstraint;
    constraintName?: string;
}
interface IndexDefinition {
    name: string;
    tableName: string;
    columns: Array<{
        name: string;
        order?: 'ASC' | 'DESC';
    }>;
    unique?: boolean;
    ifNotExists?: boolean;
}
interface TableInfo {
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
interface TransactionOptions {
    isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
    readOnly?: boolean;
    timeout?: number;
}
interface TransactionContext {
    id: string;
    startTime: Date;
    isolationLevel: string;
    readOnly: boolean;
}
interface BatchInsertOptions {
    tableName: string;
    columns?: string[];
    rows: Record<string, any>[];
    onConflict?: 'IGNORE' | 'REPLACE' | 'UPDATE';
    batchSize?: number;
}
interface BatchUpdateOptions {
    tableName: string;
    updates: Array<{
        set: Record<string, any>;
        where: Record<string, any>;
    }>;
    batchSize?: number;
}
interface BatchDeleteOptions {
    tableName: string;
    whereConditions: Record<string, any>[];
    batchSize?: number;
}
interface BatchResult {
    totalProcessed: number;
    successful: number;
    failed: number;
    errors?: Array<{
        index: number;
        error: string;
    }>;
    tookMs: number;
}
interface PreparedStatement {
    id: string;
    sql: string;
    parameterCount: number;
}
interface PreparedStatementOptions {
    name?: string;
    parameterTypes?: string[];
}
interface CTEDefinition {
    name: string;
    columns?: string[];
    query: string;
}
interface WindowFunctionOptions {
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
interface Vector {
    values: number[];
    dimensions: number;
}
interface VectorArithmeticResult {
    result: Vector;
    operation: string;
    tookMs: number;
}
interface VectorSimilarityResult {
    similarity: number;
    distance?: number;
    function: 'cosine' | 'euclidean' | 'inner_product' | 'l2';
    tookMs: number;
}
interface VectorSearchOptions {
    vector: number[];
    k?: number;
    threshold?: number;
    metric?: 'cosine' | 'euclidean' | 'inner_product' | 'l2';
    filter?: Record<string, any>;
}
interface VectorSearchResult {
    id: string;
    vector: number[];
    similarity: number;
    distance: number;
    metadata?: Record<string, any>;
}
interface HybridSearchOptions extends VectorSearchOptions {
    textQuery?: string;
    sqlFilter?: string;
    weights?: {
        vector: number;
        text: number;
    };
}
interface KNNSearchOptions {
    queryVector: number[];
    k: number;
    tableName: string;
    vectorColumn: string;
    metadataColumns?: string[];
    filter?: Record<string, any>;
}
interface RangeSearchOptions {
    queryVector: number[];
    threshold: number;
    tableName: string;
    vectorColumn: string;
    metadataColumns?: string[];
    filter?: Record<string, any>;
    maxResults?: number;
}
interface QueryPerformance {
    queryId: string;
    sql: string;
    executionTimeMs: number;
    rowsAffected: number;
    memoryUsageMB: number;
    indexesUsed: string[];
    partitionsPruned?: number;
}
interface ConnectionPool {
    active: number;
    idle: number;
    total: number;
    maxConnections: number;
    waitingRequests: number;
}
interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}
interface RegisterResponse {
    id: string;
    username: string;
    email: string;
    is_active: boolean;
    is_verified: boolean;
    roles: string[];
    created_at: string;
    last_login: string | null;
}
interface LoginRequest {
    username: string;
    password: string;
}
interface LoginResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}
interface RefreshResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}
interface CreateAPIKeyRequest {
    name: string;
    permission: 'ReadOnly' | 'FullAccess';
    expires_in_days?: number;
}
interface APIKeyInfo {
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
interface CreateAPIKeyResponse {
    api_key: APIKeyInfo;
    raw_key: string;
}
interface ListAPIKeysResponse {
    keys: APIKeyInfo[];
    total: number;
}
interface APIKeyStats {
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
interface ExecuteQueryRequest {
    sql: string;
    parameters?: any[];
    max_rows?: number;
    timeout_secs?: number;
}
interface BatchQueryRequest {
    queries: Array<{
        sql: string;
        parameters?: any[];
    }>;
    transactional?: boolean;
}
interface BatchQueryResult {
    type: 'success' | 'error';
    data?: QueryResult;
    error?: {
        message: string;
        code: string;
    };
}
interface BatchQueryResponse {
    results: BatchQueryResult[];
    total_execution_time_ms: number;
}
interface CollectionFieldDefinition {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array' | 'vector' | 'image' | 'audio' | 'video';
    required: boolean;
    description?: string;
}
interface CollectionIndexDefinition {
    name: string;
    fields: string[];
    type: 'btree' | 'hash' | 'vector' | 'text';
    unique?: boolean;
}
interface CollectionSchemaDefinition {
    fields: CollectionFieldDefinition[];
    indexes?: CollectionIndexDefinition[];
}
interface CreateCollectionRequest {
    name: string;
    description?: string;
    schema?: CollectionSchemaDefinition;
}
interface CollectionInfo {
    id: string;
    name: string;
    description?: string;
    schema?: CollectionSchemaDefinition;
    documentCount: number;
    createdAt: string;
    updatedAt: string;
}
interface CreateCollectionResponse {
    collection: CollectionInfo;
}
interface ListCollectionsResponse {
    collections: CollectionInfo[];
    total: number;
    page: number;
    pageSize: number;
}
interface UploadMultimediaRequest {
    file: File | Blob | Buffer;
    metadata?: Record<string, any>;
}
interface MultimediaInfo {
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
interface ListMultimediaResponse {
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

/**
 * Main client for SynapCores SDK
 */

declare class SynapCores {
    private readonly config;
    private readonly httpClient;
    private readonly collectionsCache;
    private currentTransaction;
    private preparedStatements;
    readonly automl: AutoMLClient;
    readonly nlp: NLPClient;
    readonly recipes: RecipeClient;
    readonly schema: SchemaClient;
    readonly import: ImportExportClient;
    readonly integrations: IntegrationClient;
    readonly backup: BackupClient;
    readonly memory: MemoryClient;
    constructor(config?: SynapCoresConfig);
    private handleError;
    /**
     * Create collection (legacy method for backward compatibility)
     */
    createCollection(options: {
        name: string;
        schema?: Record<string, any>;
        [key: string]: any;
    }): Promise<Collection>;
    /**
     * Create collection matching the database integration guide format
     */
    createCollectionWithSchema(request: CreateCollectionRequest): Promise<Collection>;
    getCollection(name: string): Promise<Collection>;
    /**
     * List collections (legacy method for backward compatibility)
     */
    listCollections(): Promise<string[]>;
    /**
     * List collections with detailed information matching the database integration guide format
     */
    listCollectionsDetailed(options?: {
        page?: number;
        pageSize?: number;
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<ListCollectionsResponse>;
    getDocuments(collectionName: string, page: number, pageSize: number): Promise<Document[]>;
    deleteCollection(name: string): Promise<void>;
    /**
     * Execute SQL query (legacy method for backward compatibility)
     * @deprecated Use executeQuery for new code
     */
    sql(query: string, params?: Record<string, any>): Promise<QueryResult>;
    /**
     * Execute SQL query matching the database integration guide format
     */
    executeQuery(request: ExecuteQueryRequest): Promise<QueryResult>;
    /**
     * Execute batch queries
     */
    executeBatchQueries(request: BatchQueryRequest): Promise<BatchQueryResponse>;
    embed(text: string | string[], options?: EmbedOptions): Promise<number[] | number[][]>;
    _getHttpClient(): AxiosInstance;
    /**
     * Creates a new table with the specified columns and constraints
     * @param tableName - Name of the table to create
     * @param columns - Column definitions for the table
     * @param options - Additional table creation options
     * @returns Promise resolving to table creation result
     */
    createTable(tableName: string, columns: ColumnDefinition[], options?: CreateTableOptions): Promise<QueryResult>;
    /**
     * Alters an existing table structure
     * @param tableName - Name of the table to alter
     * @param alterOptions - Alteration options and parameters
     * @returns Promise resolving to alteration result
     */
    alterTable(tableName: string, alterOptions: AlterTableOptions): Promise<QueryResult>;
    /**
     * Drops an existing table
     * @param tableName - Name of the table to drop
     * @param options - Drop options
     * @returns Promise resolving to drop result
     */
    dropTable(tableName: string, options?: {
        ifExists?: boolean;
        cascade?: boolean;
    }): Promise<QueryResult>;
    /**
     * Describes a table structure including columns, constraints, and indexes
     * @param tableName - Name of the table to describe
     * @returns Promise resolving to table information
     */
    describeTable(tableName: string): Promise<TableInfo>;
    /**
     * Lists all tables in the current database
     * @param pattern - Optional pattern to filter table names
     * @returns Promise resolving to array of table names
     */
    showTables(pattern?: string): Promise<string[]>;
    /**
     * Creates an index on a table
     * @param indexDef - Index definition with name, table, columns, and options
     * @returns Promise resolving to index creation result
     */
    createIndex(indexDef: IndexDefinition): Promise<QueryResult>;
    /**
     * Drops an existing index
     * @param indexName - Name of the index to drop
     * @param options - Drop options
     * @returns Promise resolving to drop result
     */
    dropIndex(indexName: string, options?: {
        ifExists?: boolean;
    }): Promise<QueryResult>;
    /**
     * Lists all indexes, optionally filtered by table name
     * @param tableName - Optional table name to filter indexes
     * @returns Promise resolving to array of index information
     */
    showIndexes(tableName?: string): Promise<Array<{
        name: string;
        table: string;
        columns: string[];
        unique: boolean;
    }>>;
    /**
     * Begins a new transaction
     * @param options - Transaction options including isolation level
     * @returns Promise resolving to transaction context
     */
    beginTransaction(options?: TransactionOptions): Promise<TransactionContext>;
    /**
     * Commits the current transaction
     * @returns Promise resolving when transaction is committed
     */
    commitTransaction(): Promise<void>;
    /**
     * Rolls back the current transaction
     * @returns Promise resolving when transaction is rolled back
     */
    rollbackTransaction(): Promise<void>;
    /**
     * Gets the current transaction context
     * @returns Current transaction context or null if no transaction
     */
    getCurrentTransaction(): TransactionContext | null;
    /**
     * Performs batch insert operations
     * @param options - Batch insert options with table, columns, and rows
     * @returns Promise resolving to batch operation result
     */
    batchInsert(_options: BatchInsertOptions): Promise<BatchResult>;
    /**
     * Performs batch update operations.
     * @deprecated No `/batch/update` route in gateway v2.
     */
    batchUpdate(_options: BatchUpdateOptions): Promise<BatchResult>;
    /**
     * Performs batch delete operations.
     * @deprecated No `/batch/delete` route in gateway v2.
     */
    batchDelete(_options: BatchDeleteOptions): Promise<BatchResult>;
    /**
     * Prepares a SQL statement for repeated execution
     * @param sql - SQL statement to prepare
     * @param options - Preparation options
     * @returns Promise resolving to prepared statement
     */
    prepareStatement(sql: string, options?: PreparedStatementOptions): Promise<PreparedStatement>;
    /**
     * Executes a prepared statement with parameters
     * @param statementId - ID of the prepared statement or statement name
     * @param params - Parameters for the prepared statement
     * @returns Promise resolving to query result
     */
    executePrepared(statementId: string, params?: any[]): Promise<QueryResult>;
    /**
     * Deallocates a prepared statement
     * @param statementId - ID of the prepared statement or statement name
     * @returns Promise resolving when statement is deallocated
     */
    deallocatePrepared(statementId: string): Promise<void>;
    /**
     * Executes a query with Common Table Expressions (CTEs)
     * @param ctes - Array of CTE definitions
     * @param mainQuery - Main query that uses the CTEs
     * @param params - Optional parameters for the query
     * @returns Promise resolving to query result
     */
    queryWithCTEs(ctes: CTEDefinition[], mainQuery: string, params?: Record<string, any>): Promise<QueryResult>;
    /**
     * Executes a query with window functions
     * @param selectQuery - Base SELECT query
     * @param windowFunctions - Array of window function definitions
     * @param params - Optional parameters for the query
     * @returns Promise resolving to query result
     */
    queryWithWindowFunctions(selectQuery: string, windowFunctions: Array<{
        alias: string;
        function: string;
        options: WindowFunctionOptions;
    }>, params?: Record<string, any>): Promise<QueryResult>;
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
    jsonQuery(tableName: string, jsonColumn: string, operation: 'extract' | 'update' | 'delete' | 'contains', path: string, value?: any, whereClause?: string): Promise<QueryResult>;
    private static readonly VECTOR_ALGEBRA_HINT;
    /** @deprecated Use `executeQuery("SELECT VECTOR_ADD($1,$2)", …)`. */
    vectorAdd(_vector1: number[], _vector2: number[]): Promise<VectorArithmeticResult>;
    /** @deprecated Use `executeQuery("SELECT VECTOR_SUBTRACT($1,$2)", …)`. */
    vectorSubtract(_vector1: number[], _vector2: number[]): Promise<VectorArithmeticResult>;
    /** @deprecated Use `executeQuery("SELECT VECTOR_SCALAR_MULTIPLY($1,$2)", …)`. */
    vectorScalarMultiply(_vector: number[], _scalar: number): Promise<VectorArithmeticResult>;
    /** @deprecated Use `executeQuery("SELECT INNER_PRODUCT($1,$2)", …)`. */
    vectorDotProduct(_vector1: number[], _vector2: number[]): Promise<{
        dotProduct: number;
        tookMs: number;
    }>;
    /** @deprecated Use `executeQuery("SELECT COSINE_SIMILARITY($1,$2)", …)`. */
    cosineSimilarity(_vector1: number[], _vector2: number[]): Promise<VectorSimilarityResult>;
    /** @deprecated Use `executeQuery("SELECT L2_DISTANCE($1,$2)", …)`. */
    l2Distance(_vector1: number[], _vector2: number[]): Promise<VectorSimilarityResult>;
    /** @deprecated Use `executeQuery("SELECT INNER_PRODUCT($1,$2)", …)`. */
    innerProduct(_vector1: number[], _vector2: number[]): Promise<VectorSimilarityResult>;
    /**
     * @deprecated No `/vectors/knn-search` route on gateway v2. Use an ORDER BY
     * distance query, e.g.
     * `executeQuery("SELECT id FROM t ORDER BY L2_DISTANCE(embedding, $1) LIMIT $2", …)`,
     * or the collection-based vector search under /vectors/collections/:c/search.
     */
    knnSearch(_options: KNNSearchOptions): Promise<VectorSearchResult[]>;
    /** @deprecated No `/vectors/range-search` route on gateway v2 — use a WHERE + ORDER BY distance query. */
    rangeSearch(_options: RangeSearchOptions): Promise<VectorSearchResult[]>;
    /** @deprecated No `/vectors/hybrid-search` route on gateway v2 — combine WHERE + ORDER BY distance in one SQL query. */
    hybridSearch(_options: HybridSearchOptions): Promise<VectorSearchResult[]>;
    /** @deprecated Use `executeQuery("SELECT VECTOR_NORMALIZE($1)", …)`. */
    normalizeVector(_vector: number[]): Promise<VectorArithmeticResult>;
    /** @deprecated Use `executeQuery("SELECT VECTOR_MAGNITUDE($1)", …)`. */
    vectorMagnitude(_vector: number[]): Promise<{
        magnitude: number;
        tookMs: number;
    }>;
    /**
     * Register a new user
     */
    registerUser(request: RegisterRequest): Promise<RegisterResponse>;
    /**
     * Login with username and password
     */
    login(request: LoginRequest): Promise<LoginResponse>;
    /**
     * Refresh JWT token
     */
    refreshToken(): Promise<RefreshResponse>;
    /**
     * Set JWT token manually (useful after login)
     */
    setJWTToken(token: string): void;
    /**
     * Clear authentication (logout)
     */
    logout(): void;
    /**
     * Create a new API key
     */
    createAPIKey(request: CreateAPIKeyRequest): Promise<CreateAPIKeyResponse>;
    /**
     * List all API keys
     */
    listAPIKeys(): Promise<ListAPIKeysResponse>;
    /**
     * Get API key statistics
     */
    getAPIKeyStats(_keyId?: string): Promise<APIKeyStats>;
    /**
     * Revoke (delete) an API key
     */
    revokeAPIKey(keyId: string): Promise<void>;
    /**
     * Upload multimedia file to a document
     */
    uploadMultimedia(collection: string, documentId: string, file: File | Blob | Buffer, metadata?: Record<string, any>): Promise<MultimediaInfo>;
    /**
     * Get multimedia file URL (for viewing/downloading)
     */
    getMultimediaUrl(collection: string, documentId: string, multimediaId: string, download?: boolean): string;
    /**
     * Get multimedia thumbnail URL
     */
    getMultimediaThumbnailUrl(collection: string, documentId: string, multimediaId: string): string;
    /**
     * List multimedia files in a document
     */
    listMultimedia(collection: string, documentId: string, limit?: number, offset?: number): Promise<ListMultimediaResponse>;
    /**
     * Get multimedia file information
     */
    getMultimedia(collection: string, documentId: string, multimediaId: string): Promise<MultimediaInfo>;
    /**
     * Delete multimedia file
     */
    deleteMultimedia(collection: string, documentId: string, multimediaId: string): Promise<void>;
}

/**
 * Error classes for SynapCores SDK
 */
declare class SynapCoresError extends Error {
    readonly code?: string;
    readonly details?: Record<string, any>;
    constructor(message: string, code?: string, details?: Record<string, any>);
}
/**
 * Thrown by SDK methods whose corresponding gateway route was removed or
 * relocated in the v2 API surface (the default served at `/v1`). The message
 * always names the supported alternative so callers are never left with a
 * silent 404. See the 0.6.0 reconciliation in CHANGELOG.md.
 */
declare class NotImplementedError extends SynapCoresError {
    constructor(message: string, details?: Record<string, any>);
}
declare class ConnectionError extends SynapCoresError {
    constructor(message: string, details?: Record<string, any>);
}
declare class AuthenticationError extends SynapCoresError {
    constructor(message: string, details?: Record<string, any>);
}
declare class ValidationError extends SynapCoresError {
    constructor(message: string, details?: Record<string, any>);
}
declare class NotFoundError extends SynapCoresError {
    constructor(message: string, details?: Record<string, any>);
}
declare class ServerError extends SynapCoresError {
    constructor(message: string, details?: Record<string, any>);
}
declare class TimeoutError extends SynapCoresError {
    constructor(message: string, details?: Record<string, any>);
}
declare class RateLimitError extends SynapCoresError {
    readonly retryAfter?: number;
    constructor(message: string, retryAfter?: number, details?: Record<string, any>);
}
declare class SQLError extends SynapCoresError {
    readonly severity: 'ERROR' | 'WARNING' | 'INFO';
    readonly position?: number;
    readonly hint?: string;
    readonly detail?: string;
    constructor(message: string, code: string, severity?: 'ERROR' | 'WARNING' | 'INFO', position?: number, hint?: string, detail?: string, details?: Record<string, any>);
}
declare class VectorError extends SynapCoresError {
    readonly vectorDimensions?: number;
    readonly expectedDimensions?: number;
    readonly operation?: string;
    constructor(message: string, code: string, vectorDimensions?: number, expectedDimensions?: number, operation?: string, details?: Record<string, any>);
}
declare class TransactionError extends SynapCoresError {
    readonly transactionId?: string;
    readonly transactionState?: string;
    constructor(message: string, code: string, transactionId?: string, transactionState?: string, details?: Record<string, any>);
}
declare class MemoryError extends SynapCoresError {
    readonly namespace?: string;
    readonly operation?: string;
    constructor(message: string, code?: string, namespace?: string, operation?: string, details?: Record<string, any>);
}
declare class BatchOperationError extends SynapCoresError {
    readonly failedItems?: Array<{
        index: number;
        error: string;
    }>;
    readonly totalProcessed?: number;
    readonly successfulCount?: number;
    constructor(message: string, code: string, failedItems?: Array<{
        index: number;
        error: string;
    }>, totalProcessed?: number, successfulCount?: number, details?: Record<string, any>);
}

/**
 * SynapCores Node.js/TypeScript SDK
 *
 * Official SDK for SynapCores AI-Native Database Management System.
 */

declare const VERSION = "0.6.0";

export { type APIKeyInfo, type APIKeyStats, type AlterTableOptions, type AnalyzeOptions, type AsyncTrainOptions, type AuthConfig, AuthenticationError, AutoMLClient, AutoMLModel, type Backup, BackupClient, type BackupMetrics, type BackupOptions, type BackupSchedule, type BackupStatus, type BackupVerificationResult, type BatchDeleteOptions, type BatchInsertOptions, BatchOperationError, type BatchQueryRequest, type BatchQueryResponse, type BatchQueryResult, type BatchResult, type BatchUpdateOptions, type BulkImportOptions, type BulkImportResult, type CTEDefinition, type ChangeOperation, Collection, type CollectionFieldDefinition, type CollectionIndexDefinition, type CollectionInfo, type CollectionSchema, type CollectionSchemaDefinition, type CollectionStats, type ColumnConstraint, type ColumnDefinition, type ColumnInfo, ConnectionError, type ConnectionPool, type ConstraintInfo, type CreateAPIKeyRequest, type CreateAPIKeyResponse, type CreateCollectionRequest, type CreateCollectionResponse, type CreateIntegrationOptions, type CreateRecipeOptions, type CreateScheduleOptions, type CreateTableOptions, type CreateWebhookOptions, type DataValidationOptions, type DataValidationResult, type Document, type EmbedOptions, type Entity, type EvaluationResult, type ExecuteIntegrationOptions, type ExecuteQueryRequest, type ExecuteRecipeOptions, type ExportJobStatus, type ExportOptions, type ExportResult, type ForeignKeyReference, type GenerateRecipeOptions, type GeneratedRecipe, type HybridSearchOptions, type ImportError, ImportExportClient, type ImportJobStatus, type ImportOptions, type ImportResult, type ValidationError$1 as ImportValidationError, type ValidationWarning as ImportValidationWarning, type IndexDefinition, type IndexInfo, type InsertResult, type Integration, IntegrationClient, type IntegrationConfig, type IntegrationEvent, type IntegrationExecutionResult, type IntegrationLog, type IntegrationStats, type IntegrationWebhook, type KNNSearchOptions, type ListAPIKeysResponse, type ListBackupsOptions, type ListCollectionsResponse, type ListIntegrationsOptions, type ListMultimediaResponse, type ListRecipesOptions, type ListTrainingJobsOptions, type LoginRequest, type LoginResponse, MemoryClient, MemoryError, type MemoryRecallOptions, type MemoryRecord, type MemoryStoreOptions, type ModelInfo, type MultimediaInfo, type NLPAnalysis, NLPClient, NotFoundError, NotImplementedError, type OAuth2Config, type PredictResult, type PreparedStatement, type PreparedStatementOptions, type QueryColumn, type QueryOptions, type QueryPerformance, type QueryResult, type RangeSearchOptions, RateLimitError, type Recipe, RecipeClient, type RecipeExecutionResult, type RecipeInfo, type RecipeParameter, type RefreshResponse, type RegisterRequest, type RegisterResponse, type RelationshipInfo, type RestoreOptions, type RestoreResult, type RestoreStatus, type RetryConfig, SQLError, SchemaClient, type SchemaStatistics, type ValidationError$2 as SchemaValidationError, type SearchOptions, type SearchResult, type Sentiment, ServerError, type StorageConfig, Subscription, type SubscriptionEvent, type SubscriptionOptions, type SummarizeOptions, SynapCores, type SynapCoresConfig, SynapCoresError, type TableConstraint, type TableInfo, type TableSchema, type TestIntegrationOptions, type TestIntegrationResult, TimeoutError, type TrainOptions, type TrainingJob, type TrainingMetrics, type TransactionContext, TransactionError, type TransactionOptions, type UpdateOptions, type UploadMultimediaRequest, VERSION, ValidationError, type ValidationResult, type ValidationWarning$1 as ValidationWarning, type Vector, type VectorArithmeticResult, VectorError, type VectorSearchOptions, type VectorSearchResult, type VectorSimilarityResult, type WindowFunctionOptions };
