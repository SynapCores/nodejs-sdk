/**
 * Collection class for SynapCores SDK
 */

import { SynapCores } from './client';
import { Subscription } from './subscription';
import {
  Document,
  SearchResult,
  SearchOptions,
  VectorSearchOptions,
  QueryOptions,
  InsertResult,
  UpdateOptions,
  CollectionStats,
  IndexOptions,
} from './types/collection';
import { SubscriptionOptions } from './types/subscription';

export class Collection {
  constructor(
    private readonly client: SynapCores,
    public readonly name: string,
    public readonly schema?: Record<string, any>,
  ) {}

  private get basePath(): string {
    return `/collections/${this.name}`;
  }

  async insert(
    documents: Record<string, any> | Record<string, any>[],
    _autoEmbed = true,
  ): Promise<InsertResult> {
    const isSingle = !Array.isArray(documents);
    const docs = isSingle ? [documents] : documents;

    if (isSingle) {
      // Single document insert - use /documents endpoint
      const { data } = await this.client._getHttpClient().post(
        `${this.basePath}/documents`,
        documents, // Send the document directly as the body
      );
      return {
        ids: [data.id],
        inserted: 1,
      };
    } else {
      // Bulk insert - use /documents/bulk endpoint
      // Format documents for the bulk endpoint
      // Because of #[serde(flatten)], we need to spread the document fields at root level
      const formattedDocs = docs.map(doc => ({
        ...doc,  // Spread document fields at root level
        id: null // Optional ID field
      }));

      const bulkUrl = `${this.basePath}/documents/bulk`;
      console.log('Calling bulk insert endpoint:', bulkUrl);
      console.log('Payload:', JSON.stringify({ documents: formattedDocs }, null, 2));

      const { data } = await this.client._getHttpClient().post(
        bulkUrl,
        {
          documents: formattedDocs,
        },
      );

      return {
        ids: data.ids || [],
        inserted: data.inserted || docs.length,
      };
    }
  }

  async get(documentId: string): Promise<Document | null> {
    try {
      const { data } = await this.client._getHttpClient().get(
        `${this.basePath}/documents/${documentId}`,
      );
      return data;
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  async update(
    documentId: string,
    data: Record<string, any>,
    options: UpdateOptions = {},
  ): Promise<Document> {
    const response = await this.client._getHttpClient().patch(
      `${this.basePath}/documents/${documentId}`,
      {
        data,
        merge: options.merge !== false,
      },
    );
    return response.data;
  }

  async delete(documentId: string | string[]): Promise<{ deleted: number }> {
    const ids = Array.isArray(documentId) ? documentId : [documentId];
    
    const { data } = await this.client._getHttpClient().request({
      method: 'DELETE',
      url: `${this.basePath}/documents`,
      data: { ids },
    });

    return { deleted: data.deleted };
  }

  async search(options: SearchOptions): Promise<SearchResult> {
    // According to AIDB gateway, the search endpoint expects:
    // - query: JSON filter conditions
    // - limit: number of results
    // - offset: pagination offset
    const searchUrl = `${this.basePath}/search`;
    console.log('Calling search endpoint:', searchUrl);
    console.log('Request body:', {
      query: options.filter || {},
      limit: options.topK || 10,
      offset: options.offset || 0,
    });

    const { data } = await this.client._getHttpClient().post(
      searchUrl,
      {
        query: options.filter || {},  // Use filter as the query
        limit: options.topK || 10,
        offset: options.offset || 0,
      },
    );

    return {
      documents: data.documents || data,  // Handle different response formats
      total: data.total,
      tookMs: data.took_ms,
      nextOffset: data.next_offset,
    };
  }

  async vectorSearch(options: VectorSearchOptions): Promise<SearchResult> {
    const { data } = await this.client._getHttpClient().post(
      `${this.basePath}/vector_search`,
      {
        vector: options.vector,
        field: options.field || 'embedding',
        top_k: options.topK || 10,
        filter: options.filter,
        distance_metric: options.distanceMetric || 'cosine',
        include_metadata: options.includeMetadata,
      },
    );

    return {
      documents: data.documents,
      total: data.total,
      tookMs: data.took_ms,
    };
  }

  async query(options: QueryOptions = {}): Promise<SearchResult> {
    const { data } = await this.client._getHttpClient().post(
      `${this.basePath}/query`,
      {
        filter: options.filter || {},
        limit: options.limit || 100,
        offset: options.offset || 0,
        sort: options.sort,
        projection: options.projection,
      },
    );

    return {
      documents: data.documents,
      total: data.total,
      tookMs: data.took_ms,
      nextOffset: data.next_offset,
    };
  }

  async count(filter?: Record<string, any>): Promise<number> {
    const { data } = await this.client._getHttpClient().post(
      `${this.basePath}/count`,
      { filter: filter || {} },
    );
    return data.count;
  }

  async stats(): Promise<CollectionStats> {
    const { data } = await this.client._getHttpClient().get(
      `${this.basePath}/stats`,
    );

    return {
      name: data.name,
      documentCount: data.document_count,
      sizeBytes: data.size_bytes,
      indexCount: data.index_count,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async createIndex(options: IndexOptions): Promise<{ created: boolean }> {
    const { data } = await this.client._getHttpClient().post(
      `${this.basePath}/indexes`,
      {
        field: options.field,
        type: options.type || 'btree',
        options: options.options || {},
      },
    );
    return { created: data.created };
  }

  async dropIndex(field: string): Promise<{ dropped: boolean }> {
    const { data } = await this.client._getHttpClient().delete(
      `${this.basePath}/indexes/${field}`,
    );
    return { dropped: data.dropped };
  }

  async subscribe(options: SubscriptionOptions = {}): Promise<Subscription> {
    const subscription = new Subscription(this, options);
    await subscription.connect();
    return subscription;
  }
}