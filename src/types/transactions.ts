/**
 * Server-side transactions type definitions (v1.5.0-ce).
 */

export interface BeginTransactionOptions {
  isolation_level?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  read_only?: boolean;
  timeout_secs?: number;
  database?: string;
}

export interface TxQueryResult {
  columns: Array<{ name: string; data_type?: string }>;
  rows: any[][];
  rows_affected?: number;
  execution_time_ms?: number;
}

export interface TxHistoryEntry {
  id: string;
  status: 'committed' | 'rolled_back' | 'aborted' | string;
  started_at: Date;
  completed_at?: Date;
  isolation_level?: string;
  read_only?: boolean;
  statement_count?: number;
  /** Optional bag of server-reported metrics. */
  metrics?: Record<string, any>;
}
