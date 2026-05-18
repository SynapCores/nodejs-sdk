/**
 * Multimodal search/retrieval type definitions (v1.5.0-ce).
 */

export type MultimodalInput =
  | { type: 'text'; text: string }
  | { type: 'image_url'; url: string }
  | { type: 'image_base64'; data: string; mime_type?: string }
  | { type: 'audio_url'; url: string }
  | { type: 'video_url'; url: string };

export interface MultimodalSimilarityOptions {
  metric?: 'cosine' | 'l2' | 'inner_product';
  model?: string;
}

export interface MultimodalSimilarityResult {
  similarity: number;
  metric?: string;
  /** Optional pair-wise debug payload. */
  raw?: any;
}

export interface MultimodalSearchOptions {
  collection?: string;
  limit?: number;
  modality?: 'text' | 'image' | 'audio' | 'video' | 'any';
  filter?: Record<string, any>;
  model?: string;
}

export interface MultimodalSearchHit {
  id: string;
  score: number;
  modality?: string;
  metadata?: Record<string, any>;
}

export interface MultimodalJoinOptions {
  left_modality?: string;
  right_modality?: string;
  threshold?: number;
  limit?: number;
  model?: string;
}

export interface MultimodalJoinResult {
  pairs: Array<{ left: any; right: any; score: number }>;
}

export interface MultimodalEmbedResult {
  embedding: number[];
  modality?: string;
  model?: string;
  dimensions?: number;
}
