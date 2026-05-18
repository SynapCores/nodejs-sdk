/**
 * Schema Introspection Client for SynapCores SDK.
 *
 * v0.2.0: trimmed to match gateway v1.5.0-ce. Removed
 * getRelationships(), getStatistics(), validateSchema(), compareSchemas(),
 * analyzeTable() and generateDDL() — none of those endpoints exist in the
 * v1.5.0-ce gateway. Added listDatabases() and previewTable().
 */

import { SynapCores } from './client';
import { TableInfo, TableSchema, ColumnInfo, IndexInfo } from './types/schema';

export interface DatabaseInfo {
  name: string;
  table_count?: number;
  size_bytes?: number;
  is_default?: boolean;
}

export interface TableDataPreview {
  columns: Array<{ name: string; data_type?: string }>;
  rows: any[][];
  total_rows?: number;
}

export class SchemaClient {
  constructor(private readonly synapCores: SynapCores) {}

  /**
   * List all databases visible to the current authentication context.
   */
  async listDatabases(): Promise<DatabaseInfo[]> {
    const { data } = await this.synapCores._getHttpClient().get('/schema/databases');
    return (data.databases ?? data ?? []).map((db: any) => ({
      name: db.name,
      table_count: db.table_count,
      size_bytes: db.size_bytes,
      is_default: db.is_default,
    }));
  }

  /**
   * List all tables in the current database.
   */
  async listTables(options: { includeSystem?: boolean } = {}): Promise<TableInfo[]> {
    const params = new URLSearchParams();
    if (options.includeSystem) {
      params.append('include_system', 'true');
    }

    const qs = params.toString();
    const { data } = await this.synapCores._getHttpClient().get(
      `/schema/tables${qs ? `?${qs}` : ''}`,
    );

    return (data.tables || data || []).map((table: any) => ({
      name: table.name,
      type: table.type || 'table',
      column_count: table.column_count || 0,
      row_count: table.row_count,
      size_bytes: table.size_bytes,
      created_at: table.created_at ? new Date(table.created_at) : undefined,
      updated_at: table.updated_at ? new Date(table.updated_at) : undefined,
      comment: table.comment,
    }));
  }

  /**
   * Get complete schema for a specific table.
   *
   * Combines /schema/tables/:t with /schema/tables/:t/columns and
   * /schema/tables/:t/indexes side-channels because the table-only payload
   * does not always include columns and indexes inline.
   */
  async getTable(tableName: string): Promise<TableSchema> {
    const [tableRes, colsRes, idxRes] = await Promise.all([
      this.synapCores._getHttpClient().get(`/schema/tables/${tableName}`),
      this.synapCores._getHttpClient().get(`/schema/tables/${tableName}/columns`),
      this.synapCores._getHttpClient().get(`/schema/tables/${tableName}/indexes`),
    ]);

    const table = tableRes.data ?? {};
    const columns = colsRes.data?.columns ?? colsRes.data ?? [];
    const indexes = idxRes.data?.indexes ?? idxRes.data ?? [];

    return {
      table: {
        name: table.name ?? tableName,
        type: table.type || 'table',
        column_count: columns.length,
        row_count: table.row_count,
        size_bytes: table.size_bytes,
        created_at: table.created_at ? new Date(table.created_at) : undefined,
        updated_at: table.updated_at ? new Date(table.updated_at) : undefined,
        comment: table.comment,
      },
      columns: columns.map((col: any) => ({
        name: col.name,
        data_type: col.data_type || col.type,
        nullable: col.nullable !== false,
        default_value: col.default_value || col.default,
        is_primary_key: col.is_primary_key || col.primary_key,
        is_unique: col.is_unique || col.unique,
        is_indexed: col.is_indexed || col.indexed,
        foreign_key: col.foreign_key,
        comment: col.comment,
        ordinal_position: col.ordinal_position || col.position,
      })),
      indexes: indexes.map((idx: any) => ({
        name: idx.name,
        table: idx.table || tableName,
        type: idx.type || 'btree',
        columns: idx.columns || [],
        is_unique: idx.is_unique || idx.unique || false,
        is_primary: idx.is_primary || idx.primary || false,
        size_bytes: idx.size_bytes,
        created_at: idx.created_at ? new Date(idx.created_at) : undefined,
      })),
      constraints: table.constraints || [],
      relationships: (table.relationships || []).map((rel: any) => ({
        type: rel.type,
        from_table: rel.from_table || rel.source_table,
        from_column: rel.from_column || rel.source_column,
        to_table: rel.to_table || rel.target_table,
        to_column: rel.to_column || rel.target_column,
        name: rel.name,
      })),
    };
  }

  /**
   * Get columns for a specific table.
   */
  async getColumns(tableName: string): Promise<ColumnInfo[]> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/schema/tables/${tableName}/columns`,
    );
    const cols = data.columns ?? data ?? [];
    return cols.map((col: any) => ({
      name: col.name,
      data_type: col.data_type || col.type,
      nullable: col.nullable !== false,
      default_value: col.default_value || col.default,
      is_primary_key: col.is_primary_key || col.primary_key,
      is_unique: col.is_unique || col.unique,
      is_indexed: col.is_indexed || col.indexed,
      foreign_key: col.foreign_key,
      comment: col.comment,
      ordinal_position: col.ordinal_position || col.position,
    }));
  }

  /**
   * Get indexes for a specific table.
   */
  async getIndexes(tableName: string): Promise<IndexInfo[]> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/schema/tables/${tableName}/indexes`,
    );
    const idxs = data.indexes ?? data ?? [];
    return idxs.map((idx: any) => ({
      name: idx.name,
      table: idx.table || tableName,
      type: idx.type || 'btree',
      columns: idx.columns || [],
      is_unique: idx.is_unique || idx.unique || false,
      is_primary: idx.is_primary || idx.primary || false,
      size_bytes: idx.size_bytes,
      created_at: idx.created_at ? new Date(idx.created_at) : undefined,
    }));
  }

  /**
   * Preview rows from a table without writing SQL.
   *
   * GET /schema/tables/:t/data?limit=&offset=
   */
  async previewTable(
    tableName: string,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<TableDataPreview> {
    const params = new URLSearchParams();
    if (opts.limit !== undefined) params.append('limit', String(opts.limit));
    if (opts.offset !== undefined) params.append('offset', String(opts.offset));
    const qs = params.toString();
    const { data } = await this.synapCores._getHttpClient().get(
      `/schema/tables/${tableName}/data${qs ? `?${qs}` : ''}`,
    );
    return {
      columns: data.columns ?? [],
      rows: data.rows ?? data.data ?? [],
      total_rows: data.total_rows ?? data.total,
    };
  }
}
