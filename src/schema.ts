/**
 * Schema Introspection Client for SynapCores SDK
 */

import { SynapCores } from './client';
import { NotImplementedError } from './errors';
import {
  TableInfo,
  TableSchema,
  ColumnInfo,
  IndexInfo,
  RelationshipInfo,
  SchemaStatistics,
  ValidationResult,
} from './types/schema';

export class SchemaClient {
  constructor(private readonly synapCores: SynapCores) {}

  /**
   * List all tables in the database
   */
  async listTables(options: { includeSystem?: boolean } = {}): Promise<TableInfo[]> {
    const params = new URLSearchParams();
    if (options.includeSystem) {
      params.append('include_system', 'true');
    }

    const { data } = await this.synapCores._getHttpClient().get(
      `/schema/tables?${params.toString()}`
    );

    return (data.tables || data).map((table: any) => ({
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
   * Get complete schema for a specific table
   */
  async getTable(tableName: string): Promise<TableSchema> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/schema/tables/${tableName}`
    );

    return {
      table: {
        name: data.name,
        type: data.type || 'table',
        column_count: data.columns?.length || 0,
        row_count: data.row_count,
        size_bytes: data.size_bytes,
        created_at: data.created_at ? new Date(data.created_at) : undefined,
        updated_at: data.updated_at ? new Date(data.updated_at) : undefined,
        comment: data.comment,
      },
      columns: (data.columns || []).map((col: any) => ({
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
      indexes: (data.indexes || []).map((idx: any) => ({
        name: idx.name,
        table: idx.table || tableName,
        type: idx.type || 'btree',
        columns: idx.columns || [],
        is_unique: idx.is_unique || idx.unique || false,
        is_primary: idx.is_primary || idx.primary || false,
        size_bytes: idx.size_bytes,
        created_at: idx.created_at ? new Date(idx.created_at) : undefined,
      })),
      constraints: data.constraints || [],
      relationships: (data.relationships || []).map((rel: any) => ({
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
   * Get columns for a specific table
   */
  async getColumns(tableName: string): Promise<ColumnInfo[]> {
    const schema = await this.getTable(tableName);
    return schema.columns;
  }

  /**
   * Get indexes for a specific table
   */
  async getIndexes(tableName: string): Promise<IndexInfo[]> {
    const schema = await this.getTable(tableName);
    return schema.indexes;
  }

  /**
   * Get all relationships in the database.
   *
   * @deprecated The gateway v2 schema surface exposes relationships only
   * per-table, inside {@link getTable} (`schema.relationships`). There is no
   * database-wide `/schema/relationships` route. Iterate {@link listTables}
   * and read each table's relationships instead.
   */
  async getRelationships(): Promise<RelationshipInfo[]> {
    throw new NotImplementedError(
      'client.schema.getRelationships is removed — the gateway v2 schema ' +
        'surface has no database-wide relationships route. Read per-table ' +
        'relationships from client.schema.getTable(name).relationships.',
    );
  }

  /**
   * Get schema statistics.
   *
   * @deprecated No `/schema/statistics` route exists in gateway v2. Derive
   * counts from {@link listTables}, or query the engine directly via
   * `client.executeQuery('SHOW TABLES')`.
   */
  async getStatistics(): Promise<SchemaStatistics> {
    throw new NotImplementedError(
      'client.schema.getStatistics is removed — no /schema/statistics route ' +
        'exists in gateway v2. Derive counts from client.schema.listTables() ' +
        "or client.executeQuery('SHOW TABLES').",
    );
  }

  /**
   * Validate a schema definition.
   *
   * @deprecated No `/schema/validate` route exists in gateway v2.
   */
  async validateSchema(_schema: object): Promise<ValidationResult> {
    throw new NotImplementedError(
      'client.schema.validateSchema is removed — no /schema/validate route ' +
        'exists in gateway v2. Attempt the DDL via client.createTable() / ' +
        'client.executeQuery() and handle the returned error instead.',
    );
  }

  /**
   * Compare two schemas.
   *
   * @deprecated No `/schema/compare` route exists in gateway v2.
   */
  async compareSchemas(
    _schema1: string | object,
    _schema2: string | object,
  ): Promise<{
    differences: any[];
    added: string[];
    removed: string[];
    modified: string[];
  }> {
    throw new NotImplementedError(
      'client.schema.compareSchemas is removed — no /schema/compare route ' +
        'exists in gateway v2. Diff two client.schema.getTable() results ' +
        'client-side instead.',
    );
  }

  /**
   * Generate SQL DDL for a table.
   *
   * @deprecated No `/schema/tables/:t/ddl` route exists in gateway v2.
   */
  async generateDDL(_tableName: string): Promise<string> {
    throw new NotImplementedError(
      'client.schema.generateDDL is removed — no DDL-generation route exists ' +
        "in gateway v2. Use client.executeQuery('SHOW CREATE TABLE <name>') " +
        'if supported by your engine build.',
    );
  }

  /**
   * Analyze table and update statistics.
   *
   * @deprecated No `/schema/tables/:t/analyze` route exists in gateway v2.
   */
  async analyzeTable(tableName: string): Promise<void> {
    throw new NotImplementedError(
      'client.schema.analyzeTable is removed — no analyze route exists in ' +
        `gateway v2. Run client.executeQuery('ANALYZE ${tableName}') if your ` +
        'engine build supports it.',
    );
  }
}
