/**
 * NLP client for SynapCores SDK
 */

import { SynapCores } from './client';
import {
  NLPAnalysis,
  Sentiment,
  Entity,
  AnalyzeOptions,
  SummarizeOptions,
  ClassifyOptions,
} from './types/nlp';

export class NLPClient {
  constructor(private readonly synapCores: SynapCores) {}

  async analyze(options: AnalyzeOptions): Promise<NLPAnalysis | NLPAnalysis[]> {
    const isBatch = Array.isArray(options.text);
    const texts = isBatch ? options.text : [options.text];

    const { data } = await this.synapCores._getHttpClient().post('/ai/analyze', {
      texts,
      tasks: options.tasks || ['sentiment', 'entities', 'keywords'],
      language: options.language,
    });

    const results = data.results.map((r: any) => ({
      sentiment: r.sentiment
        ? {
            label: r.sentiment.label,
            score: r.sentiment.score,
            confidence: r.sentiment.confidence,
          }
        : undefined,
      entities: r.entities
        ? r.entities.map((e: any) => ({
            text: e.text,
            type: e.type,
            start: e.start,
            end: e.end,
            score: e.score,
          }))
        : undefined,
      summary: r.summary,
      keywords: r.keywords,
      language: r.language,
    }));

    return isBatch ? results : results[0];
  }

  async summarize(options: SummarizeOptions): Promise<string> {
    const { data } = await this.synapCores._getHttpClient().post('/ai/summarize', {
      text: options.text,
      max_length: options.maxLength || 150,
      min_length: options.minLength || 30,
    });

    return data.summary;
  }

  async extractEntities(
    text: string,
    entityTypes?: string[],
  ): Promise<Entity[]> {
    const { data } = await this.synapCores._getHttpClient().post('/ai/entities', {
      text,
      entity_types: entityTypes,
    });

    return data.entities.map((e: any) => ({
      text: e.text,
      type: e.type,
      start: e.start,
      end: e.end,
      score: e.score,
    }));
  }

  async sentiment(text: string | string[]): Promise<Sentiment | Sentiment[]> {
    const isBatch = Array.isArray(text);
    const texts = isBatch ? text : [text];

    const { data } = await this.synapCores._getHttpClient().post('/ai/sentiment', {
      texts,
    });

    const results = data.sentiments.map((s: any) => ({
      label: s.label,
      score: s.score,
      confidence: s.confidence,
    }));

    return isBatch ? results : results[0];
  }

  async classify(
    options: ClassifyOptions,
  ): Promise<Record<string, number> | Record<string, number>[]> {
    const isBatch = Array.isArray(options.text);
    const texts = isBatch ? options.text : [options.text];

    const { data } = await this.synapCores._getHttpClient().post('/ai/classify', {
      texts,
      categories: options.categories,
      multi_label: options.multiLabel || false,
    });

    return isBatch ? data.classifications : data.classifications[0];
  }
}