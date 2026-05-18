/**
 * NLP client for SynapCores SDK.
 *
 * v0.2.0: replaced /ai/analyze (which never existed in v1.5.0-ce) with a
 * client-side fan-out to /ai/sentiment + /ai/entities + /ai/summarize.
 * Added qa() for question-answering against the new /ai/qa route.
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

  /**
   * Run multiple NLP tasks in parallel and stitch them into a single
   * NLPAnalysis (or array of them, matching the input shape).
   */
  async analyze(options: AnalyzeOptions): Promise<NLPAnalysis | NLPAnalysis[]> {
    const isBatch = Array.isArray(options.text);
    const texts = (isBatch ? options.text : [options.text]) as string[];
    const tasks = options.tasks || ['sentiment', 'entities', 'summarize'];
    const http = this.synapCores._getHttpClient();

    const wantSentiment = tasks.includes('sentiment');
    const wantEntities = tasks.includes('entities');
    const wantSummarize = tasks.includes('summarize') || tasks.includes('summary');
    const wantKeywords = tasks.includes('keywords');

    const results: NLPAnalysis[] = await Promise.all(
      texts.map(async (text) => {
        const out: NLPAnalysis = {};
        const calls: Array<Promise<void>> = [];

        if (wantSentiment) {
          calls.push(
            http.post('/ai/sentiment', { texts: [text], language: options.language })
              .then(({ data }) => {
                const s = (data.sentiments ?? [])[0] ?? data.sentiment ?? data;
                if (s) {
                  out.sentiment = {
                    label: s.label,
                    score: s.score,
                    confidence: s.confidence,
                  };
                }
              })
              .catch(() => undefined),
          );
        }

        if (wantEntities) {
          calls.push(
            http.post('/ai/entities', { text, language: options.language })
              .then(({ data }) => {
                const arr = data.entities ?? [];
                out.entities = arr.map((e: any) => ({
                  text: e.text,
                  type: e.type,
                  start: e.start,
                  end: e.end,
                  score: e.score,
                }));
              })
              .catch(() => undefined),
          );
        }

        if (wantSummarize) {
          calls.push(
            http.post('/ai/summarize', { text })
              .then(({ data }) => {
                out.summary = data.summary;
              })
              .catch(() => undefined),
          );
        }

        if (wantKeywords) {
          // No dedicated keywords endpoint in v1.5.0-ce — leave the field
          // unset so callers can detect lack of support without throwing.
          out.keywords = undefined;
        }

        await Promise.all(calls);
        return out;
      }),
    );

    if (isBatch) return results;
    return results[0] ?? {};
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

    return (data.entities ?? []).map((e: any) => ({
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

    const results = (data.sentiments ?? []).map((s: any) => ({
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

  /**
   * Question-answering against an optional context window.
   */
  async qa(
    question: string,
    context?: string,
    opts: { maxAnswerTokens?: number } = {},
  ): Promise<{ answer: string; score?: number; start?: number; end?: number }> {
    const { data } = await this.synapCores._getHttpClient().post('/ai/qa', {
      question,
      context,
      max_answer_tokens: opts.maxAnswerTokens,
    });
    return {
      answer: data.answer ?? data.text ?? '',
      score: data.score ?? data.confidence,
      start: data.start,
      end: data.end,
    };
  }
}
