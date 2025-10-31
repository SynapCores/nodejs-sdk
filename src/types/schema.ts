/**
 * Schema Introspection Types
 */

export interface TableInfo {
  /** Table name */
  name: string;

  /** Table type */
  type: 'table' | 'view' | 'system';

  /** Number of columns */
  column_count: number;

  /** Number of rows (approximate) */
  row_count?: number;

  /** Table size in bytes */
  size_bytes?: number;

  /** Creation timestamp */
  created_at?: Date;

  /** Last update timestamp */
  updated_at?: Date;

  /** Table comment/description */
  comment?: string;
}

export interface ColumnInfo {
  /** Column name */
  name: string;

  /** Data type */
  data_type: string;

  /** Whether nullable */
  nullable: boolean;

  /** Default value */
  default_value?: any;

  /** Whether primary key */
  is_primary_key?: boolean;

  /** Whether unique */
  is_unique?: boolean;

  /** Whether indexed */
  is_indexed?: boolean;

  /** Foreign key reference */
  foreign_key?: ForeignKeyReference;

  /** Column comment/description */
  comment?: string;

  /** Column position */
  ordinal_position?: number;
}

export interface ForeignKeyReference {
  /** Referenced table */
  table: string;

  /** Referenced column */
  column: string;

  /** On delete action */
  on_delete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';

  /** On update action */
  on_update?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface IndexInfo {
  /** Index name */
  name: string;

  /** Table name */
  table: string;

  /** Index type */
  type: 'btree' | 'hash' | 'vector' | 'text';

  /** Indexed columns */
  columns: string[];

  /** Whether unique */
  is_unique: boolean;

  /** Whether primary key */
  is_primary: boolean;

  /** Index size in bytes */
  size_bytes?: number;

  /** Creation timestamp */
  created_at?: Date;
}

export interface TableSchema {
  /** Table info */
  table: TableInfo;

  /** Column definitions */
  columns: ColumnInfo[];

  /** Indexes */
  indexes: IndexInfo[];

  /** Constraints */
  constraints: ConstraintInfo[];

  /** Relationships */
  relationships: RelationshipInfo[];
}

export interface ConstraintInfo {
  /** Constraint name */
  name: string;

  /** Constraint type */
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'NOT NULL';

  /** Columns involved */
  columns: string[];

  /** Check expression (for CHECK constraints) */
  expression?: string;

  /** Referenced table (for FOREIGN KEY) */
  referenced_table?: string;

  /** Referenced columns (for FOREIGN KEY) */
  referenced_columns?: string[];
}

export interface RelationshipInfo {
  /** Relationship type */
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';

  /** Source table */
  from_table: string;

  /** Source column */
  from_column: string;

  /** Target table */
  to_table: string;

  /** Target column */
  to_column: string;

  /** Relationship name */
  name?: string;
}

export interface SchemaStatistics {
  /** Total number of tables */
  table_count: number;

  /** Total number of views */
  view_count: number;

  /** Total number of indexes */
  index_count: number;

  /** Total number of relationships */
  relationship_count: number;

  /** Total database size in bytes */
  total_size_bytes: number;

  /** Total row count across all tables */
  total_rows: number;

  /** Database version */
  version?: string;

  /** Last analyzed timestamp */
  analyzed_at?: Date;
}

export interface ValidationResult {
  /** Whether valid */
  is_valid: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Validation warnings */
  warnings: ValidationWarning[];
}

export interface ValidationError {
  /** Error type */
  type: string;

  /** Error message */
  message: string;

  /** Location (table.column) */
  location?: string;
}

export interface ValidationWarning {
  /** Warning type */
  type: string;

  /** Warning message */
  message: string;

  /** Location (table.column) */
  location?: string;

  /** Suggested fix */
  suggestion?: string;
}
