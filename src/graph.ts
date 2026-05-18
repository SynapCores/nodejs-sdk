/**
 * Graph database client for SynapCores SDK (v1.5.0-ce).
 */

import { SynapCores } from './client';
import {
  GraphNode,
  GraphEdge,
  CypherResult,
  CypherProfileResult,
  GraphAlgorithmName,
  GraphAlgorithmRequest,
  GraphAlgorithmResult,
  GraphSummary,
  GraphExtractRequest,
  GraphExtractResult,
} from './types/graph';

class GraphNodeApi {
  constructor(private readonly synapCores: SynapCores) {}

  async create(label: string, props: Record<string, any> = {}): Promise<GraphNode> {
    const { data } = await this.synapCores._getHttpClient().post('/graph/nodes', {
      label,
      properties: props,
    });
    return this.normalize(data);
  }

  async get(id: string): Promise<GraphNode> {
    const { data } = await this.synapCores._getHttpClient().get(`/graph/nodes/${id}`);
    return this.normalize(data);
  }

  async update(id: string, patch: Record<string, any>): Promise<GraphNode> {
    const { data } = await this.synapCores._getHttpClient().patch(
      `/graph/nodes/${id}`,
      { properties: patch },
    );
    return this.normalize(data);
  }

  async delete(id: string): Promise<void> {
    await this.synapCores._getHttpClient().delete(`/graph/nodes/${id}`);
  }

  async neighbors(
    id: string,
    opts: { direction?: 'in' | 'out' | 'both'; limit?: number; type?: string } = {},
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const params = new URLSearchParams();
    if (opts.direction) params.append('direction', opts.direction);
    if (opts.limit !== undefined) params.append('limit', String(opts.limit));
    if (opts.type) params.append('type', opts.type);
    const qs = params.toString();
    const { data } = await this.synapCores._getHttpClient().get(
      `/graph/nodes/${id}/neighbors${qs ? `?${qs}` : ''}`,
    );
    return {
      nodes: (data.nodes ?? []).map((n: any) => this.normalize(n)),
      edges: (data.edges ?? []).map((e: any) => this.normalizeEdge(e)),
    };
  }

  private normalize(data: any): GraphNode {
    return {
      id: String(data.id ?? data.node_id ?? ''),
      label: data.label,
      labels: data.labels,
      properties: data.properties ?? data.props ?? {},
    };
  }

  private normalizeEdge(data: any): GraphEdge {
    return {
      id: data.id !== undefined ? String(data.id) : undefined,
      from: String(data.from ?? data.source ?? ''),
      to: String(data.to ?? data.target ?? ''),
      type: data.type ?? data.label ?? '',
      properties: data.properties ?? data.props ?? {},
    };
  }
}

class GraphEdgeApi {
  constructor(private readonly synapCores: SynapCores) {}

  async create(
    from: string,
    to: string,
    type: string,
    props: Record<string, any> = {},
  ): Promise<GraphEdge> {
    const { data } = await this.synapCores._getHttpClient().post('/graph/edges', {
      from,
      to,
      type,
      properties: props,
    });
    return {
      id: data.id !== undefined ? String(data.id) : undefined,
      from: String(data.from ?? from),
      to: String(data.to ?? to),
      type: data.type ?? type,
      properties: data.properties ?? props,
    };
  }
}

class GraphIndexesApi {
  constructor(private readonly synapCores: SynapCores) {}

  /**
   * Create a graph index (label/property index, fulltext, or vector
   * depending on the gateway's accepted DDL strings).
   */
  async create(stmt: string): Promise<{ name?: string; raw: any }> {
    const { data } = await this.synapCores._getHttpClient().post('/graph/indexes', {
      statement: stmt,
    });
    return { name: data.name ?? data.index_name, raw: data };
  }
}

class GraphAlgorithmsApi {
  constructor(private readonly synapCores: SynapCores) {}

  async run(
    name: GraphAlgorithmName,
    opts: GraphAlgorithmRequest = {},
  ): Promise<GraphAlgorithmResult> {
    const { data } = await this.synapCores._getHttpClient().post('/graph/algorithms', {
      algorithm: name,
      ...opts,
    });
    return {
      algorithm: name,
      results: data.results ?? data.result ?? data,
      stats: data.stats,
      execution_time_ms: data.execution_time_ms ?? data.took_ms,
    };
  }
}

class GraphsApi {
  constructor(private readonly synapCores: SynapCores) {}

  async list(): Promise<GraphSummary[]> {
    const { data } = await this.synapCores._getHttpClient().get('/graphs');
    return (data.graphs ?? data ?? []).map((g: any) => this.normalize(g));
  }

  async create(name: string, opts: { description?: string } = {}): Promise<GraphSummary> {
    const { data } = await this.synapCores._getHttpClient().post('/graphs', {
      name,
      description: opts.description,
    });
    return this.normalize(data);
  }

  async get(name: string): Promise<GraphSummary> {
    const { data } = await this.synapCores._getHttpClient().get(`/graphs/${name}`);
    return this.normalize(data);
  }

  async delete(name: string): Promise<void> {
    await this.synapCores._getHttpClient().delete(`/graphs/${name}`);
  }

  private normalize(data: any): GraphSummary {
    return {
      name: data.name,
      node_count: data.node_count ?? data.nodes,
      edge_count: data.edge_count ?? data.edges,
      created_at: data.created_at ? new Date(data.created_at) : undefined,
      description: data.description,
    };
  }
}

export class GraphClient {
  public readonly nodes: GraphNodeApi;
  public readonly edges: GraphEdgeApi;
  public readonly indexes: GraphIndexesApi;
  public readonly algorithms: GraphAlgorithmsApi;
  public readonly graphs: GraphsApi;

  constructor(private readonly synapCores: SynapCores) {
    this.nodes = new GraphNodeApi(synapCores);
    this.edges = new GraphEdgeApi(synapCores);
    this.indexes = new GraphIndexesApi(synapCores);
    this.algorithms = new GraphAlgorithmsApi(synapCores);
    this.graphs = new GraphsApi(synapCores);
  }

  /**
   * Run a Cypher / MATCH query.
   *
   * The gateway's MatchRequest expects `sql: String` (see
   * crates/aidb-gateway/src/routes/graph.rs MatchRequest); we keep the
   * SDK-facing parameter named `query` because every caller writes
   * Cypher, not SQL — the gateway's field name is a historical artifact.
   */
  async cypher(query: string, params: Record<string, any> = {}, graph?: string): Promise<CypherResult> {
    const { data } = await this.synapCores._getHttpClient().post('/graph/match', {
      sql: query,
      params,
      graph,
    });
    return this.normalizeCypher(data);
  }

  /**
   * Profile a Cypher / MATCH query (returns plan/profile metadata).
   */
  async cypherProfile(
    query: string,
    params: Record<string, any> = {},
    graph?: string,
  ): Promise<CypherProfileResult> {
    const { data } = await this.synapCores._getHttpClient().post('/graph/match/profile', {
      sql: query,
      params,
      graph,
    });
    return {
      ...this.normalizeCypher(data),
      plan: data.plan,
      profile: data.profile ?? data.profile_data,
    };
  }

  /**
   * Run LLM-based extraction over text into the given graph.
   */
  async extract(req: GraphExtractRequest | string, graphName?: string): Promise<GraphExtractResult> {
    const body = typeof req === 'string' ? { text: req, graph: graphName } : req;
    const { data } = await this.synapCores._getHttpClient().post('/graph/extract', body);
    return {
      nodes: (data.nodes ?? []).map((n: any) => ({
        id: String(n.id ?? ''),
        label: n.label,
        labels: n.labels,
        properties: n.properties ?? n.props ?? {},
      })),
      edges: (data.edges ?? []).map((e: any) => ({
        id: e.id !== undefined ? String(e.id) : undefined,
        from: String(e.from ?? e.source ?? ''),
        to: String(e.to ?? e.target ?? ''),
        type: e.type ?? e.label ?? '',
        properties: e.properties ?? e.props ?? {},
      })),
      spans: data.spans,
    };
  }

  private normalizeCypher(data: any): CypherResult {
    return {
      columns: data.columns ?? data.fields,
      rows: data.rows ?? data.values ?? [],
      records: data.records ?? data.results,
      stats: data.stats,
      execution_time_ms: data.execution_time_ms ?? data.took_ms,
    };
  }
}
