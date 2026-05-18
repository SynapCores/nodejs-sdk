/**
 * Graph database type definitions (v1.5.0-ce).
 */

export interface GraphNode {
  id: string;
  label?: string;
  labels?: string[];
  properties?: Record<string, any>;
}

export interface GraphEdge {
  id?: string;
  from: string;
  to: string;
  type: string;
  properties?: Record<string, any>;
}

export interface CypherResult {
  columns?: string[];
  rows: any[][];
  records?: Array<Record<string, any>>;
  stats?: Record<string, any>;
  /** Server-side execution time, when reported. */
  execution_time_ms?: number;
}

export interface CypherProfileResult extends CypherResult {
  plan?: any;
  profile?: any;
}

export type GraphAlgorithmName =
  | 'page_rank'
  | 'louvain'
  | 'label_propagation'
  | 'triangle_count';

export interface GraphAlgorithmRequest {
  graph?: string;
  /** Free-form algorithm parameters (max iterations, damping etc). */
  params?: Record<string, any>;
  /** Optional projection of subgraph to operate over. */
  node_filter?: string;
  edge_filter?: string;
}

export interface GraphAlgorithmResult {
  algorithm: GraphAlgorithmName;
  results: any;
  stats?: Record<string, any>;
  execution_time_ms?: number;
}

export interface GraphSummary {
  name: string;
  node_count?: number;
  edge_count?: number;
  created_at?: Date;
  description?: string;
}

export interface GraphExtractRequest {
  text: string;
  graph?: string;
  schema?: any;
  model?: string;
}

export interface GraphExtractResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Optional source-text spans used for provenance. */
  spans?: Array<{ start: number; end: number; text: string }>;
}
