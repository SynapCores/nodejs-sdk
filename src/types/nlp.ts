/**
 * Type definitions for NLP operations
 */

export interface Sentiment {
  label: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
}

export interface Entity {
  text: string;
  type: string;
  start: number;
  end: number;
  score: number;
}

export interface NLPAnalysis {
  sentiment?: Sentiment;
  entities?: Entity[];
  summary?: string;
  keywords?: string[];
  language?: string;
}

export interface AnalyzeOptions {
  text: string | string[];
  tasks?: Array<'sentiment' | 'entities' | 'summary' | 'keywords'>;
  language?: string;
}

export interface SummarizeOptions {
  text: string;
  maxLength?: number;
  minLength?: number;
}

export interface ClassifyOptions {
  text: string | string[];
  categories: string[];
  multiLabel?: boolean;
}