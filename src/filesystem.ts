/**
 * Filesystem-collections client for SynapCores SDK (v1.5.0-ce).
 *
 * Routes:
 *   GET/POST /v1/filesystem-collections
 *   GET/PATCH/DELETE /v1/filesystem-collections/:id
 *   GET /v1/filesystem-collections/:id/documents
 *   POST /v1/filesystem-collections/:id/reprocess
 *   WS  /ws/filesystem-collections/:id/progress?token=
 */

import WebSocket from 'ws';
import { SynapCores } from './client';
import {
  FsCollection,
  CreateFsCollectionOptions,
  FsDocument,
  FsProgressEvent,
} from './types/filesystem';

class FsCollectionsApi {
  constructor(private readonly synapCores: SynapCores) {}

  async create(opts: CreateFsCollectionOptions): Promise<FsCollection> {
    const { data } = await this.synapCores._getHttpClient().post(
      '/filesystem-collections',
      opts,
    );
    return this.normalize(data);
  }

  async list(): Promise<FsCollection[]> {
    const { data } = await this.synapCores._getHttpClient().get('/filesystem-collections');
    return (data.collections ?? data ?? []).map((c: any) => this.normalize(c));
  }

  async get(id: string): Promise<FsCollection> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/filesystem-collections/${id}`,
    );
    return this.normalize(data);
  }

  async patch(id: string, p: Partial<CreateFsCollectionOptions> & { config?: Record<string, any> }): Promise<FsCollection> {
    const { data } = await this.synapCores._getHttpClient().patch(
      `/filesystem-collections/${id}`,
      p,
    );
    return this.normalize(data);
  }

  async delete(id: string): Promise<void> {
    await this.synapCores._getHttpClient().delete(`/filesystem-collections/${id}`);
  }

  async documents(id: string, opts: { page?: number; page_size?: number } = {}): Promise<FsDocument[]> {
    const params = new URLSearchParams();
    if (opts.page) params.append('page', String(opts.page));
    if (opts.page_size) params.append('page_size', String(opts.page_size));
    const qs = params.toString();
    const { data } = await this.synapCores._getHttpClient().get(
      `/filesystem-collections/${id}/documents${qs ? `?${qs}` : ''}`,
    );
    return (data.documents ?? data ?? []).map((d: any) => ({
      id: String(d.id ?? d.document_id ?? ''),
      collection_id: d.collection_id !== undefined ? String(d.collection_id) : id,
      filename: d.filename ?? d.name,
      path: d.path,
      status: d.status,
      size_bytes: d.size_bytes,
      created_at: d.created_at ? new Date(d.created_at) : undefined,
      updated_at: d.updated_at ? new Date(d.updated_at) : undefined,
    }));
  }

  async reprocess(id: string, fileId?: string): Promise<{ accepted: boolean; raw: any }> {
    const body = fileId ? { document_id: fileId } : {};
    const { data } = await this.synapCores._getHttpClient().post(
      `/filesystem-collections/${id}/reprocess`,
      body,
    );
    return { accepted: data.accepted ?? data.success ?? true, raw: data };
  }

  /**
   * Stream progress events for an in-flight ingestion. Each tick maps to
   * a JSON payload broadcast by the gateway over the WS channel. The
   * iterator ends when the server closes the socket or the consumer
   * breaks out of the for-await loop.
   */
  async *subscribeProgress(id: string, opts: { signal?: AbortSignal } = {}): AsyncIterable<FsProgressEvent> {
    const { token } = await this.synapCores.createWsTicket();
    const wsBase = this.synapCores._getWsBaseUrl();
    const url = `${wsBase}/ws/filesystem-collections/${id}/progress?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(url);

    type Pending =
      | { kind: 'value'; value: FsProgressEvent }
      | { kind: 'error'; error: any }
      | { kind: 'done' };
    const queue: Pending[] = [];
    let resolver: ((p: Pending) => void) | null = null;

    const push = (p: Pending) => {
      if (resolver) {
        const r = resolver;
        resolver = null;
        r(p);
      } else {
        queue.push(p);
      }
    };

    ws.on('message', (raw) => {
      try {
        const obj = JSON.parse(raw.toString());
        push({
          kind: 'value',
          value: {
            type: obj.type ?? obj.event ?? 'progress',
            collection_id: obj.collection_id !== undefined ? String(obj.collection_id) : id,
            document_id: obj.document_id !== undefined ? String(obj.document_id) : undefined,
            filename: obj.filename ?? obj.path,
            status: obj.status,
            progress: obj.progress,
            message: obj.message,
            error: obj.error,
            timestamp: obj.timestamp ? new Date(obj.timestamp) : undefined,
            raw: obj,
          },
        });
      } catch (e) {
        push({ kind: 'error', error: e });
      }
    });
    ws.on('error', (err) => push({ kind: 'error', error: err }));
    ws.on('close', () => push({ kind: 'done' }));

    const onAbort = () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    };
    if (opts.signal) {
      if (opts.signal.aborted) onAbort();
      else opts.signal.addEventListener('abort', onAbort);
    }

    try {
      while (true) {
        const next: Pending = await new Promise((resolve) => {
          if (queue.length > 0) {
            resolve(queue.shift()!);
          } else {
            resolver = resolve;
          }
        });
        if (next.kind === 'value') yield next.value;
        else if (next.kind === 'error') throw next.error;
        else return;
      }
    } finally {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      if (opts.signal) opts.signal.removeEventListener('abort', onAbort);
    }
  }

  private normalize(data: any): FsCollection {
    return {
      id: String(data.id ?? data.collection_id ?? ''),
      name: data.name,
      description: data.description,
      path: data.path,
      status: data.status,
      document_count: data.document_count ?? data.documents,
      created_at: data.created_at ? new Date(data.created_at) : undefined,
      updated_at: data.updated_at ? new Date(data.updated_at) : undefined,
      config: data.config,
    };
  }
}

export class FilesystemCollectionsClient {
  public readonly collections: FsCollectionsApi;

  constructor(synapCores: SynapCores) {
    this.collections = new FsCollectionsApi(synapCores);
  }
}
