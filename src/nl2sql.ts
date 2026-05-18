/**
 * Natural-language-to-SQL client for SynapCores SDK (v1.5.0-ce).
 */

import { SynapCores } from './client';
import {
  Nl2SqlAskOptions,
  Nl2SqlAskResult,
  Nl2SqlSchemaContext,
  Nl2SqlHistoryEntry,
  Nl2SqlValidateResult,
} from './types/nl2sql';

export class NL2SqlClient {
  constructor(private readonly synapCores: SynapCores) {}

  /**
   * Ask a question in natural language. The gateway returns the
   * generated SQL and optionally the executed result set when
   * `execute=true`.
   */
  async ask(question: string, opts: Nl2SqlAskOptions = {}): Promise<Nl2SqlAskResult> {
    const { data } = await this.synapCores._getHttpClient().post('/nl2sql/query', {
      question,
      ...opts,
    });
    return {
      sql: data.sql ?? data.generated_sql ?? '',
      confidence: data.confidence,
      rows: data.rows ?? data.data,
      columns: data.columns,
      execution_time_ms: data.execution_time_ms ?? data.took_ms,
      trace: data.trace ?? data.plan,
      question,
    };
  }

  /**
   * Push schema context the model should use for subsequent ask() calls.
   */
  async updateSchemaContext(payload: Nl2SqlSchemaContext): Promise<{ accepted: boolean; raw: any }> {
    const { data } = await this.synapCores._getHttpClient().post(
      '/nl2sql/schema/context',
      payload,
    );
    return { accepted: data.accepted ?? data.success ?? true, raw: data };
  }

  /**
   * Retrieve recent NL2SQL history for the current authenticated user.
   */
  async history(opts: { limit?: number; session_id?: string } = {}): Promise<Nl2SqlHistoryEntry[]> {
    const params = new URLSearchParams();
    if (opts.limit) params.append('limit', String(opts.limit));
    if (opts.session_id) params.append('session_id', opts.session_id);
    const qs = params.toString();
    const { data } = await this.synapCores._getHttpClient().get(
      `/nl2sql/history${qs ? `?${qs}` : ''}`,
    );
    return (data.history ?? data.entries ?? data ?? []).map((row: any) => ({
      id: String(row.id ?? row.entry_id ?? ''),
      question: row.question ?? row.prompt ?? '',
      sql: row.sql ?? row.generated_sql ?? '',
      created_at: new Date(row.created_at ?? row.timestamp ?? Date.now()),
      executed: row.executed,
      success: row.success,
    }));
  }

  /**
   * Validate a SQL string against the current schema and policies.
   */
  async validate(sql: string): Promise<Nl2SqlValidateResult> {
    const { data } = await this.synapCores._getHttpClient().post('/nl2sql/validate', {
      sql,
    });
    return {
      is_valid: data.is_valid ?? data.valid ?? false,
      errors: data.errors ?? [],
      warnings: data.warnings ?? [],
      rewritten_sql: data.rewritten_sql ?? data.sql,
    };
  }
}
