/**
 * Multimodal client for SynapCores SDK (v1.5.0-ce).
 *
 * Wraps:
 *   POST /v1/multimodal/similarity
 *   POST /v1/multimodal/search
 *   POST /v1/multimodal/join
 *   POST /v1/multimodal/embed
 */

import { SynapCores } from './client';
import {
  MultimodalInput,
  MultimodalSimilarityOptions,
  MultimodalSimilarityResult,
  MultimodalSearchOptions,
  MultimodalSearchHit,
  MultimodalJoinOptions,
  MultimodalJoinResult,
  MultimodalEmbedResult,
} from './types/multimodal';

export class MultimodalClient {
  constructor(private readonly synapCores: SynapCores) {}

  async similarity(
    a: MultimodalInput | string,
    b: MultimodalInput | string,
    opts: MultimodalSimilarityOptions = {},
  ): Promise<MultimodalSimilarityResult> {
    const { data } = await this.synapCores._getHttpClient().post('/multimodal/similarity', {
      a: typeof a === 'string' ? { type: 'text', text: a } : a,
      b: typeof b === 'string' ? { type: 'text', text: b } : b,
      ...opts,
    });
    return {
      similarity: data.similarity ?? data.score ?? 0,
      metric: data.metric ?? opts.metric,
      raw: data,
    };
  }

  async search(
    query: MultimodalInput | string,
    opts: MultimodalSearchOptions = {},
  ): Promise<MultimodalSearchHit[]> {
    const { data } = await this.synapCores._getHttpClient().post('/multimodal/search', {
      query: typeof query === 'string' ? { type: 'text', text: query } : query,
      ...opts,
    });
    return (data.results ?? data.hits ?? data ?? []).map((r: any) => ({
      id: String(r.id ?? r.document_id ?? ''),
      score: r.score ?? r.similarity ?? 0,
      modality: r.modality,
      metadata: r.metadata,
    }));
  }

  async join(
    left: Array<MultimodalInput | string> | { collection: string },
    right: Array<MultimodalInput | string> | { collection: string },
    opts: MultimodalJoinOptions = {},
  ): Promise<MultimodalJoinResult> {
    const normalize = (
      side: Array<MultimodalInput | string> | { collection: string },
    ) =>
      Array.isArray(side)
        ? side.map((s) => (typeof s === 'string' ? { type: 'text', text: s } : s))
        : side;

    const { data } = await this.synapCores._getHttpClient().post('/multimodal/join', {
      left: normalize(left),
      right: normalize(right),
      ...opts,
    });
    return {
      pairs: (data.pairs ?? data.results ?? []).map((p: any) => ({
        left: p.left,
        right: p.right,
        score: p.score ?? p.similarity ?? 0,
      })),
    };
  }

  async embed(
    input: MultimodalInput | string,
    model?: string,
  ): Promise<MultimodalEmbedResult> {
    const { data } = await this.synapCores._getHttpClient().post('/multimodal/embed', {
      input: typeof input === 'string' ? { type: 'text', text: input } : input,
      model,
    });
    const embedding = data.embedding ?? data.vector ?? [];
    return {
      embedding,
      modality: data.modality,
      model: data.model ?? model,
      dimensions: data.dimensions ?? embedding.length,
    };
  }
}
