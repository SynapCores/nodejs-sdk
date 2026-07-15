/**
 * Collection class for SynapCores SDK
 */

import { SynapCores } from './client';
import { NotImplementedError } from './errors';
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
      // Gateway (v2) collections_v2 has no /documents/bulk route — POST each
      // document to /:collection/documents and collect the ids. Sequential to
      // preserve ordering and surface the first failure clearly.
      const ids: string[] = [];
      for (const doc of docs) {
        const { data } = await this.client._getHttpClient().post(
          `${this.basePath}/documents`,
          doc,
        );
        ids.push(data.id);
      }
      return {
        ids,
        inserted: ids.length,
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
    // Gateway (v2) collections_v2 updates via PUT /:collection/documents/:id
    // (there is no PATCH handler).
    const response = await this.client._getHttpClient().put(
      `${this.basePath}/documents/${documentId}`,
      {
        data,
        merge: options.merge !== false,
      },
    );
    return response.data;
  }

  async delete(documentId: string | string[]): Promise<{ deleted: number }> {
    // Gateway (v2) collections_v2 deletes one document at a time via
    // DELETE /:collection/documents/:id (no bulk-by-ids body form). Loop for
    // array input and count the successes.
    const ids = Array.isArray(documentId) ? documentId : [documentId];
    let deleted = 0;
    for (const id of ids) {
      await this.client._getHttpClient().delete(
        `${this.basePath}/documents/${id}`,
      );
      deleted += 1;
    }
    return { deleted };
  }

  /**
   * @deprecated Gateway v2 collections_v2 has no per-collection `/search`
   * route. Query documents with SQL via
   * `client.executeQuery("SELECT * FROM <collection> WHERE ...")`, or list
   * documents via the raw `GET /collections/<name>/documents` endpoint.
   */
  async search(_options: SearchOptions): Promise<SearchResult> {
    throw new NotImplementedError(
      `collection.search is removed — gateway v2 has no /collections/${this.name}/search ` +
        'route. Use client.executeQuery("SELECT ... WHERE ...") against the collection instead.',
    );
  }

  /**
   * @deprecated Gateway v2 collections_v2 has no per-collection
   * `/vector_search` route. Use the dedicated vector-collection search
   * (`POST /vectors/collections/:c/search`) or an ORDER BY distance SQL
   * query via `client.executeQuery`.
   */
  async vectorSearch(_options: VectorSearchOptions): Promise<SearchResult> {
    throw new NotImplementedError(
      `collection.vectorSearch is removed — gateway v2 has no /collections/${this.name}/vector_search ` +
        'route. Use POST /vectors/collections/:c/search, or ' +
        'client.executeQuery("SELECT ... ORDER BY COSINE_SIMILARITY(embedding, $1) DESC LIMIT $2").',
    );
  }

  /**
   * @deprecated Gateway v2 collections_v2 has no per-collection `/query`
   * route. Use `client.executeQuery(...)` or the raw
   * `GET /collections/<name>/documents` listing.
   */
  async query(_options: QueryOptions = {}): Promise<SearchResult> {
    throw new NotImplementedError(
      `collection.query is removed — gateway v2 has no /collections/${this.name}/query ` +
        'route. Use client.executeQuery(...) or GET /collections/<name>/documents.',
    );
  }

  /**
   * @deprecated Gateway v2 collections_v2 has no `/count` route. Use
   * `client.executeQuery("SELECT COUNT(*) FROM <collection>")`.
   */
  async count(_filter?: Record<string, any>): Promise<number> {
    throw new NotImplementedError(
      `collection.count is removed — gateway v2 has no /collections/${this.name}/count ` +
        'route. Use client.executeQuery("SELECT COUNT(*) FROM <collection> WHERE ...").',
    );
  }

  /**
   * @deprecated Gateway v2 collections_v2 has no `/stats` route.
   */
  async stats(): Promise<CollectionStats> {
    throw new NotImplementedError(
      `collection.stats is removed — gateway v2 has no /collections/${this.name}/stats ` +
        'route. Use client.schema.getTable(name) or a COUNT(*) query for size metrics.',
    );
  }

  /**
   * @deprecated Gateway v2 collections_v2 has no `/indexes` route. Create
   * indexes with SQL via `client.createIndex(...)` /
   * `client.executeQuery("CREATE INDEX ...")`.
   */
  async createIndex(_options: IndexOptions): Promise<{ created: boolean }> {
    throw new NotImplementedError(
      `collection.createIndex is removed — gateway v2 has no /collections/${this.name}/indexes ` +
        'route. Use client.createIndex({...}) or client.executeQuery("CREATE INDEX ...").',
    );
  }

  /**
   * @deprecated Gateway v2 collections_v2 has no `/indexes` route. Drop
   * indexes with SQL via `client.dropIndex(...)`.
   */
  async dropIndex(_field: string): Promise<{ dropped: boolean }> {
    throw new NotImplementedError(
      `collection.dropIndex is removed — gateway v2 has no /collections/${this.name}/indexes ` +
        'route. Use client.dropIndex(name) or client.executeQuery("DROP INDEX ...").',
    );
  }

  async subscribe(options: SubscriptionOptions = {}): Promise<Subscription> {
    const subscription = new Subscription(this, options);
    await subscription.connect();
    return subscription;
  }
}