/**
 * NLP client for SynapCores SDK
 */

import { SynapCores } from './client';
import { NotImplementedError } from './errors';
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

  /**
   * Run several NLP tasks in one call.
   *
   * @deprecated The gateway v2 AI surface has no combined `/ai/analyze`
   * endpoint. Call the individual task methods instead —
   * {@link sentiment}, {@link extractEntities} and {@link summarize} —
   * each of which maps to a real gateway route.
   */
  async analyze(_options: AnalyzeOptions): Promise<NLPAnalysis | NLPAnalysis[]> {
    throw new NotImplementedError(
      'client.nlp.analyze is removed — the gateway v2 AI surface has no ' +
        'combined analyze endpoint. Call client.nlp.sentiment(text), ' +
        'client.nlp.extractEntities(text) and client.nlp.summarize({text}) ' +
        'individually instead.',
    );
  }

  async summarize(options: SummarizeOptions): Promise<string> {
    // Gateway (v2): POST /ai/summarize expects a single `text`.
    const body: Record<string, unknown> = {
      text: options.text,
      max_length: options.maxLength || 150,
    };
    const { data } = await this.synapCores._getHttpClient().post('/ai/summarize', body);

    return data.summary;
  }

  async extractEntities(
    text: string,
    entityTypes?: string[],
  ): Promise<Entity[]> {
    // Gateway (v2): POST /ai/entities → `{ entities: [{ text, entity_type,
    // start, end, confidence }] }`.
    const { data } = await this.synapCores._getHttpClient().post('/ai/entities', {
      text,
      entity_types: entityTypes,
    });

    return (data.entities || []).map((e: any) => ({
      text: e.text,
      type: e.entity_type ?? e.type,
      start: e.start,
      end: e.end,
      score: e.confidence ?? e.score,
    }));
  }

  async sentiment(text: string | string[]): Promise<Sentiment | Sentiment[]> {
    // Gateway (v2): POST /ai/sentiment expects a single `text` and returns
    // `{ sentiment, confidence, scores: { positive, negative, neutral } }`.
    // For array input we call once per string and collect the results.
    const analyzeOne = async (value: string): Promise<Sentiment> => {
      const { data } = await this.synapCores._getHttpClient().post('/ai/sentiment', {
        text: value,
      });
      return {
        label: data.sentiment,
        score: data.scores
          ? (data.scores.positive ?? 0) - (data.scores.negative ?? 0)
          : data.confidence,
        confidence: data.confidence,
      };
    };

    if (Array.isArray(text)) {
      const out: Sentiment[] = [];
      for (const value of text) {
        out.push(await analyzeOne(value));
      }
      return out;
    }
    return analyzeOne(text);
  }

  async classify(
    options: ClassifyOptions,
  ): Promise<Record<string, number> | Record<string, number>[]> {
    // Gateway (v2): POST /ai/classify expects a single `text` and returns
    // `{ classifications: [{ category, confidence }] }`. We normalize the
    // array into the SDK's `{ category: score }` map shape.
    const toMap = (classifications: any[]): Record<string, number> => {
      const map: Record<string, number> = {};
      for (const c of classifications || []) {
        map[c.category] = c.confidence ?? c.score;
      }
      return map;
    };

    const classifyOne = async (value: string): Promise<Record<string, number>> => {
      const { data } = await this.synapCores._getHttpClient().post('/ai/classify', {
        text: value,
        categories: options.categories,
        multi_label: options.multiLabel || false,
      });
      return toMap(data.classifications);
    };

    if (Array.isArray(options.text)) {
      const out: Record<string, number>[] = [];
      for (const value of options.text) {
        out.push(await classifyOne(value));
      }
      return out;
    }
    return classifyOne(options.text);
  }
}