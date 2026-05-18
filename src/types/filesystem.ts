/**
 * Filesystem-backed collection type definitions (v1.5.0-ce).
 */

export interface FsCollection {
  id: string;
  name: string;
  description?: string;
  path?: string;
  status?: string;
  document_count?: number;
  created_at?: Date;
  updated_at?: Date;
  config?: Record<string, any>;
}

export interface CreateFsCollectionOptions {
  name: string;
  path?: string;
  description?: string;
  config?: Record<string, any>;
  watch?: boolean;
  /** File extensions to ingest. */
  include_extensions?: string[];
}

export interface FsDocument {
  id: string;
  collection_id?: string;
  filename?: string;
  path?: string;
  status?: string;
  size_bytes?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface FsProgressEvent {
  type: string;
  collection_id?: string;
  document_id?: string;
  filename?: string;
  status?: string;
  progress?: number;
  message?: string;
  error?: string;
  timestamp?: Date;
  /** Raw payload for forward-compat. */
  raw?: any;
}
