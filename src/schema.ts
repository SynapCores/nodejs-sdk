/**
 * Schema Introspection Client for SynapCores SDK
 */

import { SynapCores } from './client';
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
   * Get all relationships in the database
   */
  async getRelationships(): Promise<RelationshipInfo[]> {
    const { data } = await this.synapCores._getHttpClient().get('/schema/relationships');

    return (data.relationships || data).map((rel: any) => ({
      type: rel.type,
      from_table: rel.from_table || rel.source_table,
      from_column: rel.from_column || rel.source_column,
      to_table: rel.to_table || rel.target_table,
      to_column: rel.to_column || rel.target_column,
      name: rel.name,
    }));
  }

  /**
   * Get schema statistics
   */
  async getStatistics(): Promise<SchemaStatistics> {
    const { data } = await this.synapCores._getHttpClient().get('/schema/statistics');

    return {
      table_count: data.table_count || 0,
      view_count: data.view_count || 0,
      index_count: data.index_count || 0,
      relationship_count: data.relationship_count || 0,
      total_size_bytes: data.total_size_bytes || 0,
      total_rows: data.total_rows || 0,
      version: data.version,
      analyzed_at: data.analyzed_at ? new Date(data.analyzed_at) : undefined,
    };
  }

  /**
   * Validate a schema definition
   */
  async validateSchema(schema: object): Promise<ValidationResult> {
    const { data } = await this.synapCores._getHttpClient().post('/schema/validate', {
      schema,
    });

    return {
      is_valid: data.is_valid || data.valid,
      errors: data.errors || [],
      warnings: data.warnings || [],
    };
  }

  /**
   * Compare two schemas
   */
  async compareSchemas(
    schema1: string | object,
    schema2: string | object
  ): Promise<{
    differences: any[];
    added: string[];
    removed: string[];
    modified: string[];
  }> {
    const { data } = await this.synapCores._getHttpClient().post('/schema/compare', {
      schema1,
      schema2,
    });

    return {
      differences: data.differences || [],
      added: data.added || [],
      removed: data.removed || [],
      modified: data.modified || [],
    };
  }

  /**
   * Generate SQL DDL for a table
   */
  async generateDDL(tableName: string): Promise<string> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/schema/tables/${tableName}/ddl`
    );

    return data.ddl || data.sql;
  }

  /**
   * Analyze table and update statistics
   */
  async analyzeTable(tableName: string): Promise<void> {
    await this.synapCores._getHttpClient().post(`/schema/tables/${tableName}/analyze`);
  }
}
