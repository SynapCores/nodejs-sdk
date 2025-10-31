/**
 * Tests for SynapCores client
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
    });
    
    mockedAxios.create = mockCreate;
    client = new SynapCores({
      host: 'test.host',
      port: 9090,
      apiKey: 'test-key',
      useHttps: true,
    });
  });

  describe('initialization', () => {
    it('should initialize with correct config', () => {
      expect(mockCreate).toHaveBeenCalledWith({
        baseURL: 'https://test.host:9090/v1',
        timeout: 30000,
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
      });
    });

    it('should use default values when not provided', () => {
      mockedAxios.create = jest.fn().mockReturnValue({
        interceptors: {
          response: {
            use: jest.fn(),
          },
        },
      });
      
      const defaultClient = new SynapCores();
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:8080/v1',
        timeout: 30000,
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      });
    });
  });

  describe('createCollection', () => {
    it('should create a collection successfully', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.post.mockResolvedValue({
        data: {
          name: 'test_collection',
          schema: { field1: 'string' },
        },
      });

      const collection = await client.createCollection({
        name: 'test_collection',
        schema: { field1: 'string' },
      });

      expect(collection).toBeInstanceOf(Collection);
      expect(collection.name).toBe('test_collection');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/collections', {
        name: 'test_collection',
        schema: { field1: 'string' },
      });
    });
  });

  describe('getCollection', () => {
    it('should get a collection from cache if available', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.post.mockResolvedValue({
        data: {
          name: 'cached_collection',
          schema: {},
        },
      });

      // First create the collection to cache it
      await client.createCollection({ name: 'cached_collection' });
      
      // Reset mock
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

  describe('sql', () => {
    it('should execute SQL query', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.post.mockResolvedValue({
        data: {
          rows: [{ id: 1, name: 'test' }],
          columns: ['id', 'name'],
          row_count: 1,
          took_ms: 10.5,
        },
      });

      const result = await client.sql('SELECT * FROM test');

      expect(result).toEqual({
        rows: [{ id: 1, name: 'test' }],
        columns: ['id', 'name'],
        rowCount: 1,
        tookMs: 10.5,
      });
      expect(mockHttpClient.post).toHaveBeenCalledWith('/query', {
        query: 'SELECT * FROM test',
        params: {},
      });
    });
  });

  describe('embed', () => {
    it('should generate embedding for single text', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.post.mockResolvedValue({
        data: {
          embeddings: [[0.1, 0.2, 0.3]],
        },
      });

      const embedding = await client.embed('test text');

      expect(embedding).toEqual([0.1, 0.2, 0.3]);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/ai/embed', {
        texts: ['test text'],
        model: 'default',
      });
    });

    it('should generate embeddings for batch', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      mockHttpClient.post.mockResolvedValue({
        data: {
          embeddings: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
        },
      });

      const embeddings = await client.embed(['text1', 'text2']);

      expect(embeddings).toEqual([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]);
    });
  });

  describe('error handling', () => {
    it('should handle authentication errors', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      const errorInterceptor = mockHttpClient.interceptors.response.use.mock.calls[0][1];
      
      const error = {
        response: {
          status: 401,
          data: { message: 'Invalid API key' },
        },
      };

      expect(() => errorInterceptor(error)).toThrow(AuthenticationError);
    });

    it('should handle not found errors', async () => {
      const mockHttpClient = mockCreate.mock.results[0].value;
      const errorInterceptor = mockHttpClient.interceptors.response.use.mock.calls[0][1];
      
      const error = {
        response: {
          status: 404,
          data: { message: 'Collection not found' },
        },
      };

      expect(() => errorInterceptor(error)).toThrow(NotFoundError);
    });
  });
});