/**
 * SynapCores Node.js/TypeScript SDK
 * 
 * Official SDK for SynapCores AI-Native Database Management System.
 */

export { SynapCores } from './client';
export { Collection } from './collection';
export { AutoMLClient, AutoMLModel } from './automl';
export { NLPClient } from './nlp';
export { RecipeClient } from './recipes';
export { SchemaClient } from './schema';
export { ImportExportClient } from './import';
export { IntegrationClient } from './integrations';
export { BackupClient } from './backup';
export { MemoryClient } from './memory';
export type {
  MemoryRecord,
  MemoryStoreOptions,
  MemoryRecallOptions,
} from './memory';
export { Subscription } from './subscription';

// Export types
export type {
  SynapCoresConfig,
  QueryResult,
  QueryColumn,
  EmbedOptions,
  // SQL Table Management Types
  ColumnDefinition,
  ColumnConstraint,
  TableConstraint,
  CreateTableOptions,
  AlterTableOptions,
  IndexDefinition,
  TableInfo,
  // Transaction Types
  TransactionOptions,
  TransactionContext,
  // Batch Operation Types
  BatchInsertOptions,
  BatchUpdateOptions,
  BatchDeleteOptions,
  BatchResult,
  // Advanced SQL Types
  PreparedStatement,
  PreparedStatementOptions,
  CTEDefinition,
  WindowFunctionOptions,
  // Vector Operation Types
  Vector,
  VectorArithmeticResult,
  VectorSimilarityResult,
  VectorSearchOptions,
  VectorSearchResult,
  HybridSearchOptions,
  KNNSearchOptions,
  RangeSearchOptions,
  // Performance and Monitoring Types
  QueryPerformance,
  ConnectionPool,
  // Authentication Types
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  // API Key Management Types
  CreateAPIKeyRequest,
  CreateAPIKeyResponse,
  ListAPIKeysResponse,
  APIKeyInfo,
  APIKeyStats,
  // Query Execution Types
  ExecuteQueryRequest,
  BatchQueryRequest,
  BatchQueryResponse,
  BatchQueryResult,
  // Collection Management Types
  CreateCollectionRequest,
  CreateCollectionResponse,
  ListCollectionsResponse,
  CollectionInfo,
  CollectionFieldDefinition,
  CollectionIndexDefinition,
  CollectionSchemaDefinition,
  // Multimedia Types
  UploadMultimediaRequest,
  MultimediaInfo,
  ListMultimediaResponse,
} from './types/client';

export type {
  Document,
  SearchResult,
  SearchOptions,
  QueryOptions,
  InsertResult,
  UpdateOptions,
  CollectionSchema,
  CollectionStats,
} from './types/collection';

export type {
  ModelInfo,
  TrainOptions,
  PredictResult,
  EvaluationResult,
  AsyncTrainOptions,
  TrainingJob,
  TrainingMetrics,
  ListTrainingJobsOptions,
} from './types/automl';

export type {
  NLPAnalysis,
  Sentiment,
  Entity,
  AnalyzeOptions,
  SummarizeOptions,
} from './types/nlp';

export type {
  SubscriptionOptions,
  SubscriptionEvent,
  ChangeOperation,
} from './types/subscription';

export type {
  Recipe,
  RecipeInfo,
  CreateRecipeOptions,
  ListRecipesOptions,
  ExecuteRecipeOptions,
  RecipeExecutionResult,
  GenerateRecipeOptions,
  GeneratedRecipe,
  RecipeParameter,
} from './types/recipes';

export type {
  TableSchema,
  ColumnInfo,
  IndexInfo,
  RelationshipInfo,
  SchemaStatistics,
  ValidationResult,
  ForeignKeyReference,
  ConstraintInfo,
  ValidationError as SchemaValidationError,
  ValidationWarning,
} from './types/schema';

export type {
  ImportOptions,
  ImportResult,
  ExportOptions,
  ExportResult,
  ImportJobStatus,
  ExportJobStatus,
  BulkImportOptions,
  BulkImportResult,
  DataValidationOptions,
  DataValidationResult,
  ImportError,
  ValidationError as ImportValidationError,
  ValidationWarning as ImportValidationWarning,
} from './types/import';

export type {
  Integration,
  CreateIntegrationOptions,
  ListIntegrationsOptions,
  ExecuteIntegrationOptions,
  IntegrationExecutionResult,
  IntegrationWebhook,
  CreateWebhookOptions,
  IntegrationEvent,
  IntegrationLog,
  IntegrationStats,
  TestIntegrationOptions,
  TestIntegrationResult,
  IntegrationConfig,
  AuthConfig,
  OAuth2Config,
  RetryConfig,
} from './types/integrations';

export type {
  Backup,
  BackupOptions,
  RestoreOptions,
  RestoreResult,
  BackupStatus,
  RestoreStatus,
  ListBackupsOptions,
  BackupSchedule,
  CreateScheduleOptions,
  BackupVerificationResult,
  BackupMetrics,
  StorageConfig,
} from './types/backup';

// Export errors
export {
  SynapCoresError,
  ConnectionError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  NotImplementedError,
  ServerError,
  TimeoutError,
  RateLimitError,
  SQLError,
  VectorError,
  TransactionError,
  BatchOperationError,
  MemoryError,
} from './errors';

// Export utilities
export { z } from 'zod';

// Version
export const VERSION = '0.6.1';