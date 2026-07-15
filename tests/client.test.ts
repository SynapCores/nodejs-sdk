/**
 * Tests for SynapCores client (aligned with gateway v2 API + 0.6.0 route reconciliation).
 */

import axios from 'axios';
import {
  SynapCores,
  Collection,
  AuthenticationError,
  NotFoundError,
  NotImplementedError,
} from '../src';

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
      put: jest.fn(),
      request: jest.fn(),
    });

    mockedAxios.create = mockCreate;
    client = new SynapCores({
      host: 'test.host',
      port: 9090,
      apiKey: 'aidb_test_key',
      useHttps: true,
    });
  });

  describe('initialization', () => {
    it('should send the API key as an Authorization: Bearer header (gateway requires Bearer)', () => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://test.host:9090/v1',
          timeout: 30000,
          headers: expect.objectContaining({
            Authorization: 'Bearer aidb_test_key',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should reject an API key without an ak_/aidb_ prefix', () => {
      expect(() => new SynapCores({ apiKey: 'not-a-valid-key' })).toThrow(/Invalid API key format/);
    });

    it('should use default values when not provided', () => {
      mockedAxios.create = jest.fn().mockReturnValue({
        interceptors: { response: { use: jest.fn() } },
      });

      new SynapCores();

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:8080/v1',
          timeout: 30000,
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });
  });

  describe('createCollection', () => {
    it('should create a collection successfully via POST /collections', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.post.mockResolvedValue({
        data: { name: 'test_collection', schema: { field1: 'string' } },
      });

      const collection = await client.createCollection({
        name: 'test_collection',
        schema: { field1: 'string' },
      });

      expect(collection).toBeInstanceOf(Collection);
      expect(collection.name).toBe('test_collection');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/collections',
        expect.objectContaining({ name: 'test_collection', schema: { field1: 'string' } }),
      );
    });
  });

  describe('getCollection', () => {
    it('should get a collection from cache if available', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.post.mockResolvedValue({
        data: { name: 'cached_collection', schema: {} },
      });

      await client.createCollection({ name: 'cached_collection' });
      mockHttpClient.get.mockClear();

      const collection = await client.getCollection('cached_collection');

      expect(collection.name).toBe('cached_collection');
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('should fetch collection from server via GET /collections/:name if not cached', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.get.mockResolvedValue({
        data: { name: 'test_collection', schema: { field1: 'string' } },
      });

      const collection = await client.getCollection('test_collection');

      expect(collection).toBeInstanceOf(Collection);
      expect(collection.name).toBe('test_collection');
      expect(mockHttpClient.get).toHaveBeenCalledWith('/collections/test_collection');
    });
  });

  describe('executeQuery / sql', () => {
    it('should POST /query/execute with parameters and map the v2 result shape', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.post.mockResolvedValue({
        data: {
          columns: [
            { name: 'id', data_type: 'INTEGER' },
            { name: 'name', data_type: 'TEXT' },
          ],
          rows: [[1, 'test']],
          rows_affected: 1,
          execution_time_ms: 10.5,
        },
      });

      const result = await client.sql('SELECT * FROM test');

      expect(result).toEqual({
        columns: [
          { name: 'id', data_type: 'INTEGER' },
          { name: 'name', data_type: 'TEXT' },
        ],
        rows: [[1, 'test']],
        rows_affected: 1,
        execution_time_ms: 10.5,
      });
      expect(mockHttpClient.post).toHaveBeenCalledWith('/query/execute', {
        sql: 'SELECT * FROM test',
        parameters: [],
        max_rows: 1000,
        timeout_secs: 300,
      });
    });
  });

  describe('embed', () => {
    it('should POST /ai/embeddings with a single { text } and return number[]', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.post.mockResolvedValue({ data: { embeddings: [0.1, 0.2, 0.3] } });

      const embedding = await client.embed('test text');

      expect(embedding).toEqual([0.1, 0.2, 0.3]);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/ai/embeddings', { text: 'test text' });
    });

    it('should embed an array as one request per string and return number[][]', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.post
        .mockResolvedValueOnce({ data: { embeddings: [0.1, 0.2, 0.3] } })
        .mockResolvedValueOnce({ data: { embeddings: [0.4, 0.5, 0.6] } });

      const embeddings = await client.embed(['text1', 'text2']);

      expect(embeddings).toEqual([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ]);
      expect(mockHttpClient.post).toHaveBeenNthCalledWith(1, '/ai/embeddings', { text: 'text1' });
      expect(mockHttpClient.post).toHaveBeenNthCalledWith(2, '/ai/embeddings', { text: 'text2' });
    });
  });

  describe('error handling (response interceptor)', () => {
    it('should map 401 to AuthenticationError', () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      const errorInterceptor = mockHttpClient.interceptors.response.use.mock.calls[0][1];

      expect(() =>
        errorInterceptor({ response: { status: 401, data: { message: 'Invalid API key' } } }),
      ).toThrow(AuthenticationError);
    });

    it('should map 404 to NotFoundError', () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      const errorInterceptor = mockHttpClient.interceptors.response.use.mock.calls[0][1];

      expect(() =>
        errorInterceptor({ response: { status: 404, data: { message: 'Collection not found' } } }),
      ).toThrow(NotFoundError);
    });
  });

  describe('deprecated methods (removed in gateway v2)', () => {
    it('should throw NotImplementedError for vector-algebra helpers', async () => {
      await expect(client.cosineSimilarity([1, 2], [3, 4])).rejects.toThrow(NotImplementedError);
    });

    it('should throw NotImplementedError for per-op batchInsert', async () => {
      await expect(client.batchInsert('t', [{ a: 1 }])).rejects.toThrow(NotImplementedError);
    });
  });
});
