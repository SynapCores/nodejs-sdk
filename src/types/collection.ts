/**
 * Type definitions for collections
 */

export interface Document {
  id?: string;
  data: Record<string, any>;
  score?: number;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  documents: Document[];
  total: number;
  tookMs: number;
  nextOffset?: number;
}

export interface SearchOptions {
  query?: string;
  topK?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  offset?: number;
}

export interface VectorSearchOptions {
  vector: number[];
  field?: string;
  topK?: number;
  filter?: Record<string, any>;
  distanceMetric?: 'cosine' | 'euclidean' | 'dot_product';
  includeMetadata?: boolean;
}

export interface QueryOptions {
  filter?: Record<string, any>;
  limit?: number;
  offset?: number;
  sort?: Array<{ field: string; order: 'asc' | 'desc' }>;
  projection?: string[];
}

export interface InsertResult {
  ids: string[];
  inserted: number;
}

export interface UpdateOptions {
  merge?: boolean;
}

export type FieldType = 
  | 'string'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'json'
  | 'vector'
  | 'text'
  | 'binary';

export interface SchemaField {
  name: string;
  type: FieldType | `vector[${number}]`;
  indexed?: boolean;
  required?: boolean;
  unique?: boolean;
  default?: any;
  description?: string;
}

export interface CollectionSchema {
  fields: SchemaField[];
  primaryKey?: string;
  vectorFields?: string[];
}

export interface CollectionStats {
  name: string;
  documentCount: number;
  sizeBytes: number;
  indexCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IndexOptions {
  field: string;
  type?: 'btree' | 'hash' | 'vector';
  options?: Record<string, any>;
}