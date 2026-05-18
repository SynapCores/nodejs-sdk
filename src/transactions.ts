/**
 * Server-side transactions client for SynapCores SDK (v1.5.0-ce).
 *
 * Wraps:
 *   POST /v1/transactions
 *   GET  /v1/transactions/:id
 *   POST /v1/transactions/:id/{execute,commit,rollback,savepoint}
 *   POST /v1/transactions/:id/savepoint/:name/rollback
 *   GET  /v1/transactions/history
 *   GET  /v1/transactions/history/:id
 */

import { AxiosInstance } from 'axios';
import { SynapCores } from './client';
import {
  BeginTransactionOptions,
  TxQueryResult,
  TxHistoryEntry,
} from './types/transactions';

export class Tx {
  private active = true;

  constructor(
    private readonly http: AxiosInstance,
    public readonly id: string,
    public readonly options: BeginTransactionOptions,
  ) {}

  isActive(): boolean {
    return this.active;
  }

  async execute(sql: string, params: any[] = []): Promise<TxQueryResult> {
    this.assertActive();
    const { data } = await this.http.post(`/transactions/${this.id}/execute`, {
      sql,
      parameters: params,
    });
    return {
      columns: data.columns ?? [],
      rows: data.rows ?? [],
      rows_affected: data.rows_affected,
      execution_time_ms: data.execution_time_ms ?? data.took_ms,
    };
  }

  async commit(): Promise<void> {
    this.assertActive();
    await this.http.post(`/transactions/${this.id}/commit`, {});
    this.active = false;
  }

  async rollback(): Promise<void> {
    this.assertActive();
    await this.http.post(`/transactions/${this.id}/rollback`, {});
    this.active = false;
  }

  async savepoint(name: string): Promise<void> {
    this.assertActive();
    await this.http.post(`/transactions/${this.id}/savepoint`, { name });
  }

  async rollbackTo(name: string): Promise<void> {
    this.assertActive();
    await this.http.post(`/transactions/${this.id}/savepoint/${name}/rollback`, {});
  }

  private assertActive(): void {
    if (!this.active) {
      throw new Error(`Transaction ${this.id} has already been committed/rolled back`);
    }
  }
}

class TxHistoryApi {
  constructor(private readonly synapCores: SynapCores) {}

  async list(opts: { limit?: number; status?: string } = {}): Promise<TxHistoryEntry[]> {
    const params = new URLSearchParams();
    if (opts.limit) params.append('limit', String(opts.limit));
    if (opts.status) params.append('status', opts.status);
    const qs = params.toString();
    const { data } = await this.synapCores._getHttpClient().get(
      `/transactions/history${qs ? `?${qs}` : ''}`,
    );
    return (data.transactions ?? data.history ?? data ?? []).map((row: any) => ({
      id: String(row.id ?? row.transaction_id ?? ''),
      status: row.status ?? 'unknown',
      started_at: new Date(row.started_at ?? row.created_at ?? Date.now()),
      completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
      isolation_level: row.isolation_level,
      read_only: row.read_only,
      statement_count: row.statement_count ?? row.statements,
      metrics: row.metrics,
    }));
  }

  async get(id: string): Promise<TxHistoryEntry> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/transactions/history/${id}`,
    );
    return {
      id: String(data.id ?? id),
      status: data.status ?? 'unknown',
      started_at: new Date(data.started_at ?? data.created_at ?? Date.now()),
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
      isolation_level: data.isolation_level,
      read_only: data.read_only,
      statement_count: data.statement_count ?? data.statements,
      metrics: data.metrics,
    };
  }
}

export class TransactionsClient {
  public readonly history: TxHistoryApi;

  constructor(private readonly synapCores: SynapCores) {
    this.history = new TxHistoryApi(synapCores);
  }

  /**
   * Begin a new server-side transaction.
   */
  async begin(opts: BeginTransactionOptions = {}): Promise<Tx> {
    const { data } = await this.synapCores._getHttpClient().post('/transactions', opts);
    const id = String(data.id ?? data.transaction_id ?? '');
    if (!id) {
      throw new Error('begin(): server did not return a transaction id');
    }
    return new Tx(this.synapCores._getHttpClient(), id, opts);
  }
}
