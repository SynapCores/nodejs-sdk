/**
 * Tests for SynapCores client
 *
 * v0.3.0: rewrote the mocked assertions to match the gateway routes the SDK
 * actually targets in v1.6.x (the previous fixtures still asserted the v0.1
 * shapes — `/ai/embed`, `Bearer <api-key>`, etc — and had been silently
 * failing on the workspace since v0.2.0).
 */

import axios from 'axios';
import { SynapCores, Collection, AuthenticationError, NotFoundError } from '../src';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SynapCores Client', () => {
  let client: SynapCores;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    mockCreate = jest.fn().mockReturnValue({
      interceptors: {
        response: {
          use: jest.fn(),
        },
      },
      post: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      request: jest.fn(),
      defaults: { headers: {} },
    });

    mockedAxios.create = mockCreate;
    client = new SynapCores({
      host: 'test.host',
      port: 9090,
      apiKey: 'ak_test_key',
      useHttps: true,
    });
  });

  describe('initialization', () => {
    it('should initialize with correct config', () => {
      // v0.4.0: API keys (ak_* / aidb_*) are now sent as
      // `Authorization: Bearer <key>` instead of the old `X-API-Key`
      // header. Matches gateway v1.6.5.2-ce which only honours Bearer.
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        baseURL: 'https://test.host:9090/v1',
        timeout: 30000,
        headers: expect.objectContaining({
          'Authorization': 'Bearer ak_test_key',
          'Content-Type': 'application/json',
        }),
      }));
    });

    it('should use default values when not provided', () => {
      mockedAxios.create = jest.fn().mockReturnValue({
        interceptors: { response: { use: jest.fn() } },
        defaults: { headers: {} },
      });

      new SynapCores();

      expect(mockedAxios.create).toHaveBeenCalledWith(expect.objectContaining({
        baseURL: 'http://localhost:8080/v1',
        timeout: 30000,
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }));
    });
  });

  describe('createCollection', () => {
    it('should create a collection successfully', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.post.mockResolvedValue({
        data: {
          collection: {
            name: 'test_collection',
            schema: { field1: 'string' },
          },
        },
      });

      const collection = await client.createCollection({
        name: 'test_collection',
        schema: { field1: 'string' },
      });

      expect(collection).toBeInstanceOf(Collection);
      expect(collection.name).toBe('test_collection');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/collections', expect.objectContaining({
        name: 'test_collection',
      }));
    });
  });

  describe('getCollection', () => {
    it('should get a collection from cache if available', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.post.mockResolvedValue({
        data: {
          collection: { name: 'cached_collection', schema: {} },
        },
      });

      // First create the collection to cache it
      await client.createCollection({ name: 'cached_collection' });

      mockHttpClient.get.mockClear();

      // Get from cache
      const collection = await client.getCollection('cached_collection');

      expect(collection.name).toBe('cached_collection');
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('should fetch collection from server if not cached', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.get.mockResolvedValue({
        data: {
          name: 'test_collection',
          schema: { field1: 'string' },
        },
      });

      const collection = await client.getCollection('test_collection');

      expect(collection).toBeInstanceOf(Collection);
      expect(collection.name).toBe('test_collection');
      expect(mockHttpClient.get).toHaveBeenCalledWith('/collections/test_collection');
    });
  });

  describe('collection() sync accessor', () => {
    it('should return a Collection without a round-trip', () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      const coll = (client as any).collection('vector_coll');
      expect(coll).toBeInstanceOf(Collection);
      expect(coll.name).toBe('vector_coll');
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });
  });

  describe('listCollections', () => {
    it('should unwrap the v1.6.x { data: { items: [...] }, meta } envelope', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.get.mockResolvedValue({
        data: {
          data: {
            items: [{ name: 'alpha' }, { name: 'beta' }],
            total: 2,
            page: 1,
            page_size: 50,
          },
          meta: { request_id: 'x' },
        },
      });

      const names = await client.listCollections();
      expect(names).toEqual(['alpha', 'beta']);
    });
  });

  describe('sql', () => {
    it('should execute SQL query via /query/execute', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.post.mockResolvedValue({
        data: {
          rows: [{ id: 1, name: 'test' }],
          columns: [{ name: 'id' }, { name: 'name' }],
          execution_time_ms: 10.5,
        },
      });

      const result = await client.sql('SELECT * FROM test');

      expect(result.rows).toEqual([{ id: 1, name: 'test' }]);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/query/execute', expect.objectContaining({
        sql: 'SELECT * FROM test',
      }));
    });
  });

  describe('embed', () => {
    it('should call /ai/embeddings for single text', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.post.mockResolvedValue({
        data: { embedding: [0.1, 0.2, 0.3] },
      });

      const embedding = await client.embed('test text');

      expect(embedding).toEqual([0.1, 0.2, 0.3]);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/ai/embeddings', expect.objectContaining({
        text: 'test text',
      }));
    });

    it('should call /ai/embeddings/batch for batch', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.post.mockResolvedValue({
        data: { embeddings: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]] },
      });

      const embeddings = await client.embed(['text1', 'text2']);

      expect(embeddings).toEqual([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/ai/embeddings/batch', expect.objectContaining({
        texts: ['text1', 'text2'],
      }));
    });
  });

  describe('error handling', () => {
    it('should handle authentication errors', () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      const errorInterceptor = mockHttpClient.interceptors.response.use.mock.calls[0][1];

      const error = {
        response: { status: 401, data: { message: 'Invalid API key' } },
      };

      expect(() => errorInterceptor(error)).toThrow(AuthenticationError);
    });

    it('should handle not found errors', () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      const errorInterceptor = mockHttpClient.interceptors.response.use.mock.calls[0][1];

      const error = {
        response: { status: 404, data: { message: 'Collection not found' } },
      };

      expect(() => errorInterceptor(error)).toThrow(NotFoundError);
    });
  });
});
