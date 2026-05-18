/**
 * Natural-language-to-SQL type definitions (v1.5.0-ce).
 */

export interface Nl2SqlAskOptions {
  /** Optional database/tenant scope. */
  database?: string;
  /** Force a specific dialect when the gateway supports multiple. */
  dialect?: 'postgres' | 'mysql' | 'aidb';
  /** Whether to also execute the generated SQL. */
  execute?: boolean;
  /** Restrict tables the model is allowed to consider. */
  tables?: string[];
  /** Free-form context the model should consider. */
  context?: string;
  /** Stable session id for conversational refinement. */
  session_id?: string;
}

export interface Nl2SqlAskResult {
  sql: string;
  /** Confidence/score reported by the model when present. */
  confidence?: number;
  /** Server-side row results when execute=true. */
  rows?: any[][];
  columns?: Array<{ name: string; data_type?: string }>;
  /** Execution time when the SQL was run. */
  execution_time_ms?: number;
  /** Raw structured trace from the model (planner output etc). */
  trace?: any;
  /** Echo of the question for downstream logging. */
  question?: string;
}

export interface Nl2SqlSchemaContext {
  /** A flat description of the schema or a structured payload. */
  description?: string;
  tables?: Array<{
    name: string;
    columns: Array<{ name: string; data_type: string; description?: string }>;
    description?: string;
  }>;
  /** Free-form examples the model can reason over. */
  examples?: Array<{ question: string; sql: string }>;
}

export interface Nl2SqlHistoryEntry {
  id: string;
  question: string;
  sql: string;
  created_at: Date;
  executed?: boolean;
  success?: boolean;
}

export interface Nl2SqlValidateResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  /** Server-rewritten SQL when the validator made adjustments. */
  rewritten_sql?: string;
}
