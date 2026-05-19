/**
 * VectorCollection — thin wrapper around the gateway's
 * `/v1/vectors/collections/{name}/...` API.
 *
 * v0.4.0: introduced so users have an explicit, typed handle for the
 * **vector subsystem** (separate from `/v1/collections/{name}`, the
 * document-store world that `Collection` wraps). Mirror of the Python
 * SDK's `synapcores.vector_collection.VectorCollection`.
 *
 * Get one via `client.vectorCollection(name)` for an existing collection,
 * or `client.createVectorCollection({name, dimensions, distance_metric})`
 * to provision a new one.
 */
import { SynapCores } from './client';

export type VectorDistanceMetric = 'cosine' | 'l2' | 'dot' | 'euclidean' | 'dot_product';

/** Wire shape of a single vector going into the gateway. */
export interface VectorRecord {
  id: string;
  /** Embedding values. Length must match the collection's `dimensions`. */
  values: number[];
  /** Optional per-vector metadata returned on search hits. */
  metadata?: Record<string, any>;
}

/** Options for `VectorCollection.search()`. */
export interface VectorCollectionSearchOptions {
  vector: number[];
  /** Number of nearest neighbours. */
  k?: number;
  /** Alias for `k` (parity with the document-store API). */
  topK?: number;
  /** Optional metadata filter forwarded as `filter` on the wire. */
  filter?: Record<string, any>;
  /** Whether the gateway should include metadata in each hit (default: true). */
  includeMetadata?: boolean;
}

/** One match returned from `VectorCollection.search()`. */
export interface VectorHit {
  id: string;
  /** Cosine distance (lower = closer) for cosine metric; raw distance otherwise. */
  score?: number;
  distance?: number;
  values?: number[];
  metadata?: Record<string, any>;
  [key: string]: any;
}

/** Shape returned by `VectorCollection.info()`. */
export interface VectorCollectionInfo {
  name: string;
  dimensions: number;
  vector_count?: number;
  distance_metric?: string;
  index_type?: string;
  [key: string]: any;
}

/** Shape returned by `client.createVectorCollection()`. */
export interface CreateVectorCollectionOptions {
  name: string;
  dimensions: number;
  /** Distance metric. `cosine` is the gateway default. */
  distance_metric?: VectorDistanceMetric;
}

export class VectorCollection {
  constructor(
    private readonly client: SynapCores,
    public readonly name: string,
  ) {}

  private get basePath(): string {
    return `/vectors/collections/${encodeURIComponent(this.name)}`;
  }

  /**
   * Insert one or more vectors.
   *
   * Wire: `POST /v1/vectors/collections/{name}/vectors` with
   * `{ vectors: [{ id, values, metadata }] }`.
   *
   * Accepts either a single record or an array — the SDK always sends
   * the wrapped `{ vectors: [...] }` envelope the gateway expects.
   */
  async insert(records: VectorRecord | VectorRecord[]): Promise<any> {
    const vectors = Array.isArray(records) ? records : [records];
    const { data } = await this.client._getHttpClient().post(
      `${this.basePath}/vectors`,
      { vectors },
    );
    return data?.data ?? data;
  }

  /**
   * k-NN search over the vector collection.
   *
   * Wire: `POST /v1/vectors/collections/{name}/search` with
   * `{ vector, k, include_metadata, filter? }`.
   *
   * Returns the bare array of hits — gateway envelope (`{data: [...]}`) is
   * unwrapped automatically for parity with `Collection.vectorSearch`.
   */
  async search(options: VectorCollectionSearchOptions): Promise<VectorHit[]> {
    const k = options.k ?? options.topK ?? 10;
    const body: Record<string, any> = {
      vector: options.vector,
      k,
      include_metadata: options.includeMetadata !== false,
    };
    if (options.filter !== undefined) body.filter = options.filter;
    const { data } = await this.client._getHttpClient().post(
      `${this.basePath}/search`,
      body,
    );
    const inner = data?.data ?? data;
    if (Array.isArray(inner)) return inner as VectorHit[];
    return (inner?.matches ?? inner?.results ?? inner?.hits ?? []) as VectorHit[];
  }

  /**
   * Fetch a single vector by id.
   *
   * Wire: `GET /v1/vectors/collections/{name}/vectors/{id}`. Returns the
   * gateway payload `{ id, values, metadata }` (envelope unwrapped) or
   * `null` on 404.
   */
  async get(id: string): Promise<VectorHit | null> {
    try {
      const { data } = await this.client._getHttpClient().get(
        `${this.basePath}/vectors/${encodeURIComponent(id)}`,
      );
      return (data?.data ?? data) as VectorHit;
    } catch (err: any) {
      if (err?.code === 'NOT_FOUND' || err?.status === 404) return null;
      throw err;
    }
  }

  /**
   * Delete one or more vectors by id.
   *
   * Single-id wire: `DELETE /v1/vectors/collections/{name}/vectors/{id}`.
   * Bulk wire: `DELETE /v1/vectors/collections/{name}/vectors` with
   * `{ ids: [...] }` body.
   */
  async delete(ids: string | string[]): Promise<any> {
    if (typeof ids === 'string') {
      const { data } = await this.client._getHttpClient().delete(
        `${this.basePath}/vectors/${encodeURIComponent(ids)}`,
      );
      return data?.data ?? data;
    }
    const { data } = await this.client._getHttpClient().request({
      method: 'DELETE',
      url: `${this.basePath}/vectors`,
      data: { ids },
    });
    return data?.data ?? data;
  }

  /**
   * Vector count.
   *
   * Wire: `GET /v1/vectors/collections/{name}/count` if the gateway
   * exposes it, otherwise falls back to `info().vector_count`.
   */
  async count(): Promise<number> {
    try {
      const { data } = await this.client._getHttpClient().get(`${this.basePath}/count`);
      const inner = data?.data ?? data;
      const n = typeof inner === 'number' ? inner : inner?.count ?? inner?.vector_count;
      if (typeof n === 'number') return n;
    } catch {
      // fall through to info()
    }
    const info = await this.info();
    return typeof info?.vector_count === 'number' ? info.vector_count : 0;
  }

  /**
   * Collection metadata.
   *
   * Wire: `GET /v1/vectors/collections/{name}` returning
   * `{ name, dimensions, vector_count, distance_metric, index_type }`.
   */
  async info(): Promise<VectorCollectionInfo> {
    const { data } = await this.client._getHttpClient().get(this.basePath);
    return (data?.data ?? data) as VectorCollectionInfo;
  }
}
