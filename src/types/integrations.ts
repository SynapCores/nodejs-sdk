/**
 * Integration Management Types
 */

export interface Integration {
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

export interface IntegrationConfig {
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

export interface AuthConfig {
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

export interface OAuth2Config {
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

export interface RetryConfig {
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

export interface CreateIntegrationOptions {
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

export interface ListIntegrationsOptions {
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

export interface ExecuteIntegrationOptions {
  /** Integration ID or name */
  integration: string;

  /** Payload data */
  payload?: any;

  /** Override configuration */
  config_override?: Partial<IntegrationConfig>;

  /** Synchronous execution (wait for response) */
  sync?: boolean;
}

export interface IntegrationExecutionResult {
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

export interface IntegrationWebhook {
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

export interface CreateWebhookOptions {
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

export interface IntegrationEvent {
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

export interface IntegrationLog {
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

export interface IntegrationStats {
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

export interface TestIntegrationOptions {
  /** Integration ID or name */
  integration: string;

  /** Test payload */
  payload?: any;

  /** Validate only (don't execute) */
  validate_only?: boolean;
}

export interface TestIntegrationResult {
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
