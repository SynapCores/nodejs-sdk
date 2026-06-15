/**
 * Agent Memory Client for SynapCores SDK.
 *
 * Wraps the engine-side `MEMORY_STORE` / `MEMORY_RECALL` / `MEMORY_FORGET`
 * SQL functions. The engine auto-creates the backing table on first call
 * and embeds content via the configured embedding model.
 */

import { SynapCores } from './client';
import { MemoryError, SynapCoresError } from './errors';
import { QueryColumn, QueryResult } from './types/client';

/**
 * A single semantic memory record returned by {@link MemoryClient.recall}.
 */
export interface MemoryRecord {
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
export interface MemoryStoreOptions {
  /**
   * Optional JSON-serializable metadata attached to the memory. Stored as a
   * JSON string on the engine side and parsed back to an object on recall.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Options accepted by {@link MemoryClient.recall}.
 */
export interface MemoryRecallOptions {
  /** Number of nearest memories to return. Defaults to 10, max 100. */
  topK?: number;
}

const NAMESPACE_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const DEFAULT_TOP_K = 10;
const MAX_TOP_K = 100;

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
export class MemoryClient {
  constructor(private readonly synapCores: SynapCores) {}

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
  async store(
    namespace: string,
    content: string,
    options?: MemoryStoreOptions,
  ): Promise<string> {
    this.assertValidNamespace(namespace, 'store');
    if (typeof content !== 'string') {
      throw new MemoryError(
        'content must be a string',
        'INVALID_CONTENT',
        namespace,
        'store',
      );
    }

    let sql: string;
    let parameters: unknown[];
    if (options?.metadata !== undefined) {
      sql = 'SELECT MEMORY_STORE(?, ?, ?) AS id';
      parameters = [namespace, content, JSON.stringify(options.metadata)];
    } else {
      sql = 'SELECT MEMORY_STORE(?, ?) AS id';
      parameters = [namespace, content];
    }

    let result: QueryResult;
    try {
      result = await this.synapCores.executeQuery({ sql, parameters });
    } catch (err) {
      throw this.mapEngineError(err, namespace, 'store');
    }

    const firstRow = result.rows[0];
    if (!firstRow || firstRow[0] == null) {
      throw new MemoryError(
        'MEMORY_STORE returned no memory id',
        'MEMORY_STORE_EMPTY_RESULT',
        namespace,
        'store',
      );
    }
    return String(firstRow[0]);
  }

  /**
   * Semantically retrieve the most-similar stored memories.
   * Returns an empty array if the namespace hasn't been written to yet.
   *
   * @param namespace - must match `/^[A-Za-z_][A-Za-z0-9_]*$/`
   * @param query - free text; auto-embedded by the engine
   * @param options - `topK` defaults to 10, max 100
   */
  async recall(
    namespace: string,
    query: string,
    options?: MemoryRecallOptions,
  ): Promise<MemoryRecord[]> {
    this.assertValidNamespace(namespace, 'recall');
    if (typeof query !== 'string') {
      throw new MemoryError(
        'query must be a string',
        'INVALID_QUERY',
        namespace,
        'recall',
      );
    }
    const topK = options?.topK ?? DEFAULT_TOP_K;
    if (!Number.isInteger(topK) || topK < 1 || topK > MAX_TOP_K) {
      throw new MemoryError(
        `topK must be an integer in [1, ${MAX_TOP_K}], got ${String(topK)}`,
        'INVALID_TOP_K',
        namespace,
        'recall',
      );
    }

    const sql =
      'SELECT id, content, similarity, metadata, created_at ' +
      'FROM MEMORY_RECALL(?, ?, ?)';
    const parameters: unknown[] = [namespace, query, topK];

    let result: QueryResult;
    try {
      result = await this.synapCores.executeQuery({ sql, parameters });
    } catch (err) {
      // First-touch namespaces don't have a backing table yet.
      if (this.isMissingNamespaceError(err)) {
        return [];
      }
      throw this.mapEngineError(err, namespace, 'recall');
    }

    return this.mapRows(result);
  }

  /**
   * Remove a memory by id.
   *
   * @returns `true` if a row was deleted, `false` if the id did not exist.
   */
  async forget(namespace: string, id: string): Promise<boolean> {
    this.assertValidNamespace(namespace, 'forget');
    if (typeof id !== 'string' || id.length === 0) {
      throw new MemoryError(
        'id must be a non-empty string',
        'INVALID_ID',
        namespace,
        'forget',
      );
    }

    const sql = 'SELECT MEMORY_FORGET(?, ?) AS deleted';
    const parameters: unknown[] = [namespace, id];

    let result: QueryResult;
    try {
      result = await this.synapCores.executeQuery({ sql, parameters });
    } catch (err) {
      // Missing namespace == nothing to forget.
      if (this.isMissingNamespaceError(err)) {
        return false;
      }
      throw this.mapEngineError(err, namespace, 'forget');
    }

    const firstRow = result.rows[0];
    if (!firstRow) {
      return false;
    }
    return this.toBool(firstRow[0]);
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private assertValidNamespace(namespace: string, operation: string): void {
    if (typeof namespace !== 'string' || !NAMESPACE_REGEX.test(namespace)) {
      throw new MemoryError(
        `Invalid namespace '${String(namespace)}'. ` +
          'Must match /^[A-Za-z_][A-Za-z0-9_]*$/.',
        'INVALID_NAMESPACE',
        typeof namespace === 'string' ? namespace : undefined,
        operation,
      );
    }
  }

  private mapRows(result: QueryResult): MemoryRecord[] {
    const columns = result.columns ?? [];
    const idIdx = this.columnIndex(columns, 'id');
    const contentIdx = this.columnIndex(columns, 'content');
    const simIdx = this.columnIndex(columns, 'similarity');
    const metaIdx = this.columnIndex(columns, 'metadata');
    const createdIdx = this.columnIndex(columns, 'created_at');

    return result.rows.map((row) => {
      const idVal = idIdx >= 0 ? row[idIdx] : undefined;
      const contentVal = contentIdx >= 0 ? row[contentIdx] : undefined;
      const simVal = simIdx >= 0 ? row[simIdx] : undefined;
      const metaVal = metaIdx >= 0 ? row[metaIdx] : undefined;
      const createdVal = createdIdx >= 0 ? row[createdIdx] : undefined;

      return {
        id: idVal == null ? '' : String(idVal),
        content: contentVal == null ? '' : String(contentVal),
        similarity: this.toNumber(simVal),
        metadata: this.parseMetadata(metaVal),
        createdAt: this.parseTimestamp(createdVal),
      };
    });
  }

  private columnIndex(columns: QueryColumn[], name: string): number {
    return columns.findIndex((c) => c?.name === name);
  }

  private parseMetadata(value: unknown): Record<string, unknown> | null {
    if (value == null || value === '') {
      return null;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // Fall through to null below.
      }
    }
    return null;
  }

  private parseTimestamp(value: unknown): Date {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'number') {
      return new Date(value);
    }
    if (typeof value === 'string' && value.length > 0) {
      // ISO-8601 (with or without timezone) and engine "YYYY-MM-DD HH:MM:SS"
      // both parse via Date — for the space-separated form replace ' ' with 'T'.
      const candidate = value.includes('T') ? value : value.replace(' ', 'T');
      const d = new Date(candidate);
      if (!Number.isNaN(d.getTime())) {
        return d;
      }
    }
    return new Date(NaN);
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const n = Number(value);
      return Number.isFinite(n) ? n : NaN;
    }
    return NaN;
  }

  private toBool(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    if (typeof value === 'string') {
      const v = value.toLowerCase();
      return v === 'true' || v === 't' || v === '1';
    }
    return false;
  }

  private isMissingNamespaceError(err: unknown): boolean {
    if (!(err instanceof SynapCoresError)) {
      return false;
    }
    if (err.code === 'NOT_FOUND') {
      return true;
    }
    const msg = (err.message ?? '').toLowerCase();
    return (
      msg.includes('does not exist') ||
      msg.includes('no such table') ||
      msg.includes('unknown namespace') ||
      msg.includes('namespace not found')
    );
  }

  private mapEngineError(
    err: unknown,
    namespace: string,
    operation: string,
  ): MemoryError {
    if (err instanceof MemoryError) {
      return err;
    }
    if (err instanceof SynapCoresError) {
      return new MemoryError(
        `Memory ${operation} failed: ${err.message}`,
        err.code ?? 'MEMORY_ERROR',
        namespace,
        operation,
        err.details,
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return new MemoryError(
      `Memory ${operation} failed: ${message}`,
      'MEMORY_ERROR',
      namespace,
      operation,
    );
  }
}
