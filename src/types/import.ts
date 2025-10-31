/**
 * Data Import/Export Types
 */

export interface ImportOptions {
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

export interface ImportResult {
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

export interface ImportError {
  /** Row number (1-based) */
  row: number;

  /** Error message */
  message: string;

  /** Raw row data */
  data?: any;
}

export interface ExportOptions {
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

export interface ExportResult {
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

export interface ImportJobStatus {
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

export interface ExportJobStatus {
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

export interface BulkImportOptions {
  /** Import jobs to execute */
  jobs: ImportOptions[];

  /** Execute jobs in parallel */
  parallel?: boolean;

  /** Stop all on first error */
  stop_on_error?: boolean;
}

export interface BulkImportResult {
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

export interface DataValidationOptions {
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

export interface DataValidationResult {
  /** Whether data is valid */
  is_valid: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Validation warnings */
  warnings: ValidationWarning[];

  /** Number of rows validated */
  rows_validated: number;
}

export interface ValidationError {
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

export interface ValidationWarning {
  /** Row number */
  row: number;

  /** Column name */
  column?: string;

  /** Warning type */
  type: string;

  /** Warning message */
  message: string;
}
