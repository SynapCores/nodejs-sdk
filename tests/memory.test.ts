/**
 * Tests for MemoryClient.
 *
 * Unit tests use jest.mock('axios') matching tests/client.test.ts.
 * Live integration tests run only when `SYNAPCORES_LIVE_URL` is set
 * (e.g. http://localhost:8094) and are otherwise skipped.
 */

import axios from 'axios';
import {
  SynapCores,
  MemoryClient,
  MemoryError,
  MemoryRecord,
  NotFoundError,
} from '../src';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

interface MockHttpClient {
  post: jest.Mock;
  get: jest.Mock;
  delete: jest.Mock;
  patch: jest.Mock;
  request: jest.Mock;
  interceptors: { response: { use: jest.Mock } };
}

function makeMockHttpClient(): MockHttpClient {
  return {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    request: jest.fn(),
    interceptors: {
      response: {
        use: jest.fn(),
      },
    },
  };
}

describe('MemoryClient (unit, mocked transport)', () => {
  let client: SynapCores;
  let httpClient: MockHttpClient;

  beforeEach(() => {
    httpClient = makeMockHttpClient();
    mockedAxios.create = jest.fn().mockReturnValue(httpClient);
    client = new SynapCores({
      host: 'unit.test',
      port: 8080,
      apiKey: 'ak_test_key',
    });
  });

  it('exposes a MemoryClient on the SynapCores instance', () => {
    expect(client.memory).toBeInstanceOf(MemoryClient);
  });

  describe('namespace validation (no engine round-trip)', () => {
    it.each([
      '1bad',
      'has-dash',
      'has space',
      'has.dot',
      '',
      'na/me',
    ])('store rejects invalid namespace %p with MemoryError', async (ns) => {
      await expect(client.memory.store(ns, 'hello')).rejects.toBeInstanceOf(
        MemoryError,
      );
      expect(httpClient.post).not.toHaveBeenCalled();
    });

    it.each(['default', 'agent_1', '_private', 'Mixed_Case_42'])(
      'store accepts valid namespace %p',
      async (ns) => {
        httpClient.post.mockResolvedValueOnce({
          data: {
            columns: [{ name: 'id', data_type: 'TEXT', nullable: false }],
            rows: [['mem_1kv69sxfn_5ofzwK']],
            execution_time_ms: 1,
          },
        });
        await expect(client.memory.store(ns, 'hello')).resolves.toBe(
          'mem_1kv69sxfn_5ofzwK',
        );
      },
    );

    it('recall rejects invalid namespace without HTTP call', async () => {
      await expect(client.memory.recall('bad-ns', 'q')).rejects.toBeInstanceOf(
        MemoryError,
      );
      expect(httpClient.post).not.toHaveBeenCalled();
    });

    it('forget rejects invalid namespace without HTTP call', async () => {
      await expect(
        client.memory.forget('bad-ns', 'mem_xxx'),
      ).rejects.toBeInstanceOf(MemoryError);
      expect(httpClient.post).not.toHaveBeenCalled();
    });
  });

  describe('store', () => {
    it('issues 2-arg MEMORY_STORE when no metadata', async () => {
      httpClient.post.mockResolvedValueOnce({
        data: {
          columns: [{ name: 'id', data_type: 'TEXT', nullable: false }],
          rows: [['mem_abc_DEF']],
          execution_time_ms: 1,
        },
      });

      const id = await client.memory.store('default', 'I prefer Python');
      expect(id).toBe('mem_abc_DEF');

      expect(httpClient.post).toHaveBeenCalledWith(
        '/query/execute',
        expect.objectContaining({
          sql: 'SELECT MEMORY_STORE($1, $2) AS id',
          parameters: ['default', 'I prefer Python'],
        }),
      );
    });

    it('issues 3-arg MEMORY_STORE with JSON metadata when provided', async () => {
      httpClient.post.mockResolvedValueOnce({
        data: {
          columns: [{ name: 'id', data_type: 'TEXT', nullable: false }],
          rows: [['mem_xyz_ABC']],
          execution_time_ms: 1,
        },
      });

      const id = await client.memory.store(
        'default',
        'Customer renewed annual plan',
        { metadata: { importance: 0.9, source: 'crm' } },
      );
      expect(id).toBe('mem_xyz_ABC');

      expect(httpClient.post).toHaveBeenCalledWith(
        '/query/execute',
        expect.objectContaining({
          sql: 'SELECT MEMORY_STORE($1, $2, $3) AS id',
          parameters: [
            'default',
            'Customer renewed annual plan',
            JSON.stringify({ importance: 0.9, source: 'crm' }),
          ],
        }),
      );
    });

    it('throws MemoryError when engine returns no row', async () => {
      httpClient.post.mockResolvedValueOnce({
        data: { columns: [], rows: [], execution_time_ms: 1 },
      });
      await expect(
        client.memory.store('default', 'hi'),
      ).rejects.toBeInstanceOf(MemoryError);
    });
  });

  describe('recall', () => {
    it('builds the table-valued query with default topK = 10', async () => {
      httpClient.post.mockResolvedValueOnce({
        data: { columns: [], rows: [], execution_time_ms: 1 },
      });
      await client.memory.recall('default', 'what language do I like');
      expect(httpClient.post).toHaveBeenCalledWith(
        '/query/execute',
        expect.objectContaining({
          sql:
            'SELECT id, content, similarity, metadata, created_at ' +
            'FROM MEMORY_RECALL($1, $2, $3)',
          parameters: ['default', 'what language do I like', 10],
        }),
      );
    });

    it('honors a custom topK', async () => {
      httpClient.post.mockResolvedValueOnce({
        data: { columns: [], rows: [], execution_time_ms: 1 },
      });
      await client.memory.recall('default', 'q', { topK: 3 });
      const callArgs = httpClient.post.mock.calls[0]?.[1] as
        | { parameters: unknown[] }
        | undefined;
      expect(callArgs?.parameters).toEqual(['default', 'q', 3]);
    });

    it.each([0, -1, 101, 5.5, NaN])(
      'rejects invalid topK %p without HTTP call',
      async (topK) => {
        await expect(
          client.memory.recall('default', 'q', { topK }),
        ).rejects.toBeInstanceOf(MemoryError);
        expect(httpClient.post).not.toHaveBeenCalled();
      },
    );

    it('parses metadata JSON string into an object on the row', async () => {
      httpClient.post.mockResolvedValueOnce({
        data: {
          columns: [
            { name: 'id', data_type: 'TEXT', nullable: false },
            { name: 'content', data_type: 'TEXT', nullable: false },
            { name: 'similarity', data_type: 'REAL', nullable: false },
            { name: 'metadata', data_type: 'TEXT', nullable: true },
            {
              name: 'created_at',
              data_type: 'TIMESTAMP',
              nullable: false,
            },
          ],
          rows: [
            [
              'mem_a_1',
              'Customer renewed annual plan',
              0.92,
              '{"importance":0.9,"source":"crm"}',
              '2026-06-14 12:34:56',
            ],
          ],
          execution_time_ms: 4,
        },
      });

      const hits = await client.memory.recall('default', 'churn');
      expect(hits).toHaveLength(1);
      const hit = hits[0] as MemoryRecord;
      expect(hit.id).toBe('mem_a_1');
      expect(hit.content).toBe('Customer renewed annual plan');
      expect(hit.similarity).toBeCloseTo(0.92, 5);
      expect(hit.metadata).toEqual({ importance: 0.9, source: 'crm' });
      expect(hit.createdAt).toBeInstanceOf(Date);
      expect(Number.isNaN(hit.createdAt.getTime())).toBe(false);
    });

    it('handles null metadata gracefully', async () => {
      httpClient.post.mockResolvedValueOnce({
        data: {
          columns: [
            { name: 'id', data_type: 'TEXT', nullable: false },
            { name: 'content', data_type: 'TEXT', nullable: false },
            { name: 'similarity', data_type: 'REAL', nullable: false },
            { name: 'metadata', data_type: 'TEXT', nullable: true },
            {
              name: 'created_at',
              data_type: 'TIMESTAMP',
              nullable: false,
            },
          ],
          rows: [
            ['mem_b_2', 'plain note', 0.7, null, '2026-06-14T01:02:03Z'],
          ],
          execution_time_ms: 4,
        },
      });
      const [hit] = await client.memory.recall('default', 'q');
      expect(hit?.metadata).toBeNull();
    });

    it('returns [] when the engine reports a missing namespace', async () => {
      const errorInterceptor =
        httpClient.interceptors.response.use.mock.calls[0]?.[1];
      expect(errorInterceptor).toBeDefined();

      // Simulate the gateway returning 404 — interceptor throws NotFoundError.
      const notFoundFn = (): never =>
        errorInterceptor!({
          response: {
            status: 404,
            data: { message: 'namespace not found' },
          },
        });
      httpClient.post.mockImplementationOnce(notFoundFn);

      const hits = await client.memory.recall('virgin_ns', 'q');
      expect(hits).toEqual([]);
    });

    it('non-404 engine errors are surfaced as MemoryError', async () => {
      const errorInterceptor =
        httpClient.interceptors.response.use.mock.calls[0]?.[1];
      const fiveHundred = (): never =>
        errorInterceptor!({
          response: {
            status: 500,
            data: { error: { message: 'boom', code: 'SERVER_ERROR' } },
          },
        });
      httpClient.post.mockImplementationOnce(fiveHundred);

      await expect(
        client.memory.recall('default', 'q'),
      ).rejects.toBeInstanceOf(MemoryError);
    });
  });

  describe('forget', () => {
    it('issues MEMORY_FORGET and unwraps true', async () => {
      httpClient.post.mockResolvedValueOnce({
        data: {
          columns: [
            { name: 'deleted', data_type: 'BOOLEAN', nullable: false },
          ],
          rows: [[true]],
          execution_time_ms: 1,
        },
      });
      const ok = await client.memory.forget('default', 'mem_a_1');
      expect(ok).toBe(true);
      expect(httpClient.post).toHaveBeenCalledWith(
        '/query/execute',
        expect.objectContaining({
          sql: 'SELECT MEMORY_FORGET($1, $2) AS deleted',
          parameters: ['default', 'mem_a_1'],
        }),
      );
    });

    it('coerces 0 / "false" to false', async () => {
      httpClient.post
        .mockResolvedValueOnce({
          data: {
            columns: [
              { name: 'deleted', data_type: 'BOOLEAN', nullable: false },
            ],
            rows: [[0]],
            execution_time_ms: 1,
          },
        })
        .mockResolvedValueOnce({
          data: {
            columns: [
              { name: 'deleted', data_type: 'BOOLEAN', nullable: false },
            ],
            rows: [['false']],
            execution_time_ms: 1,
          },
        });

      await expect(
        client.memory.forget('default', 'mem_missing'),
      ).resolves.toBe(false);
      await expect(
        client.memory.forget('default', 'mem_missing'),
      ).resolves.toBe(false);
    });

    it('rejects empty id without HTTP call', async () => {
      await expect(
        client.memory.forget('default', ''),
      ).rejects.toBeInstanceOf(MemoryError);
      expect(httpClient.post).not.toHaveBeenCalled();
    });

    it('returns false when engine reports missing namespace', async () => {
      const errorInterceptor =
        httpClient.interceptors.response.use.mock.calls[0]?.[1];
      const notFoundFn = (): never =>
        errorInterceptor!({
          response: {
            status: 404,
            data: { message: 'namespace does not exist' },
          },
        });
      httpClient.post.mockImplementationOnce(notFoundFn);

      await expect(
        client.memory.forget('virgin_ns', 'mem_a_1'),
      ).resolves.toBe(false);
    });
  });

  it('NotFoundError surfaces through error interceptor for non-memory paths', () => {
    // Sanity check — confirms the existing error mapping is wired so that
    // our isMissingNamespaceError() branch fires for 404 responses.
    const errorInterceptor =
      httpClient.interceptors.response.use.mock.calls[0]?.[1];
    expect(() =>
      errorInterceptor!({
        response: { status: 404, data: { message: 'x' } },
      }),
    ).toThrow(NotFoundError);
  });
});

// ----------------------------------------------------------------------
// Live integration tests
// ----------------------------------------------------------------------
//
// These exercise the full wire surface against a running v1.8.5+ engine.
// To run them locally:
//
//   SYNAPCORES_LIVE_URL=http://localhost:8094 \
//   SYNAPCORES_API_KEY=ak_test_xxx \
//   npm test -- memory
//
// If SYNAPCORES_LIVE_URL is unset, the suite is skipped — preserving the
// "tests pass on a fresh clone with no engine" contract.

const LIVE_URL = process.env['SYNAPCORES_LIVE_URL'];
const LIVE_API_KEY = process.env['SYNAPCORES_API_KEY'] ?? '';

function parseUrl(url: string): { host: string; port: number; useHttps: boolean } {
  const u = new URL(url);
  const useHttps = u.protocol === 'https:';
  return {
    host: u.hostname,
    port: Number(u.port) || (useHttps ? 443 : 80),
    useHttps,
  };
}

const describeLive = LIVE_URL ? describe : describe.skip;

describeLive('MemoryClient (live, requires SYNAPCORES_LIVE_URL)', () => {
  // Reset the axios mock so the SDK uses the real transport here.
  let live: SynapCores;
  const ns = `sdk_test_${Date.now().toString(36)}`;

  beforeAll(() => {
    // Restore the real axios.create — the unit-test mock above is module-scoped.
    jest.unmock('axios');
    jest.resetModules();
    /* eslint-disable @typescript-eslint/no-require-imports */
    const realAxios = jest.requireActual<typeof import('axios')>('axios');
    const { SynapCores: RealSynapCores } = jest.requireActual<
      typeof import('../src')
    >('../src');
    /* eslint-enable @typescript-eslint/no-require-imports */
    // Inject real axios.create back onto the mocked module so subsequent
    // SDK construction goes through the real HTTP stack.
    (mockedAxios as unknown as { create: typeof realAxios.create }).create =
      realAxios.create.bind(realAxios);
    const { host, port, useHttps } = parseUrl(LIVE_URL as string);
    live = new RealSynapCores({ host, port, useHttps, apiKey: LIVE_API_KEY });
  });

  it('store returns a string id matching the engine pattern', async () => {
    const id = await live.memory.store(ns, 'I prefer Python over Java');
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^mem_[a-z0-9]+_[a-zA-Z0-9]+$/);
  });

  it('recall of similar text returns sim > 0.5', async () => {
    await live.memory.store(ns, 'My favorite programming language is Python');
    const hits = await live.memory.recall(
      ns,
      'what language do I like',
      { topK: 5 },
    );
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.similarity).toBeGreaterThan(0.5);
  });

  it('store with metadata then recall returns parsed object', async () => {
    await live.memory.store(ns, 'Customer renewed annual plan', {
      metadata: { importance: 0.9, source: 'crm' },
    });
    const hits = await live.memory.recall(ns, 'customer renewal', {
      topK: 5,
    });
    const meta = hits.find((h) =>
      h.content.toLowerCase().includes('renewed'),
    )?.metadata;
    expect(meta).toEqual(
      expect.objectContaining({ importance: 0.9, source: 'crm' }),
    );
  });

  it('recall on an empty namespace returns []', async () => {
    const emptyNs = `${ns}_empty`;
    const hits = await live.memory.recall(emptyNs, 'anything');
    expect(hits).toEqual([]);
  });

  it('forget returns true for existing id, false for missing', async () => {
    const id = await live.memory.store(ns, 'transient memory to forget');
    await expect(live.memory.forget(ns, id)).resolves.toBe(true);
    await expect(live.memory.forget(ns, id)).resolves.toBe(false);
    await expect(
      live.memory.forget(ns, 'mem_does_not_exist'),
    ).resolves.toBe(false);
  });

  it('recall after forget does not return the deleted row', async () => {
    const id = await live.memory.store(
      ns,
      'I love trail running in the mornings',
    );
    const hitsBefore = await live.memory.recall(ns, 'morning trail run', {
      topK: 10,
    });
    expect(hitsBefore.some((h) => h.id === id)).toBe(true);

    await live.memory.forget(ns, id);

    const hitsAfter = await live.memory.recall(ns, 'morning trail run', {
      topK: 10,
    });
    expect(hitsAfter.some((h) => h.id === id)).toBe(false);
  });

  it('invalid namespace throws MemoryError without hitting the engine', async () => {
    await expect(
      live.memory.store('1bad-namespace', 'x'),
    ).rejects.toBeInstanceOf(MemoryError);
  });
});
