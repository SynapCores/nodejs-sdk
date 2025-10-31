/**
 * Backup/Restore Types
 */

export interface BackupOptions {
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

export interface StorageConfig {
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

export interface Backup {
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

export interface RestoreOptions {
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

export interface RestoreResult {
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

export interface BackupStatus {
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

export interface RestoreStatus {
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

export interface ListBackupsOptions {
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

export interface BackupSchedule {
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

export interface CreateScheduleOptions {
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

export interface BackupVerificationResult {
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

export interface BackupMetrics {
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
