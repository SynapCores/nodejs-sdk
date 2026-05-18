/**
 * Model Context Protocol (MCP) client for SynapCores SDK (v1.5.0-ce).
 *
 * Wraps:
 *   POST /v1/mcp        - single JSON-RPC style invocation
 *   POST /v1/mcp/batch  - array of invocations in one round-trip
 *   GET  /v1/mcp/info   - server-side discovery
 */

import { SynapCores } from './client';
import { McpRequest, McpResponse, McpInfo } from './types/mcp';

let mcpRequestCounter = 0;

function withId(req: McpRequest): McpRequest {
  if (req.id !== undefined && req.id !== null) return req;
  mcpRequestCounter += 1;
  return { ...req, id: `mcp-${Date.now()}-${mcpRequestCounter}` };
}

export class McpClient {
  constructor(private readonly synapCores: SynapCores) {}

  /**
   * Invoke a single MCP method.
   */
  async invoke<T = any>(req: McpRequest): Promise<McpResponse<T>> {
    const body = withId(req);
    const { data } = await this.synapCores._getHttpClient().post('/mcp', body);
    return {
      id: data.id ?? body.id,
      result: data.result,
      error: data.error,
      raw: data,
    };
  }

  /**
   * Send an array of MCP invocations and resolve to the matching array
   * of responses (in the order returned by the gateway).
   */
  async batch<T = any>(reqs: McpRequest[]): Promise<Array<McpResponse<T>>> {
    const body = reqs.map(withId);
    const { data } = await this.synapCores._getHttpClient().post('/mcp/batch', body);
    const arr = Array.isArray(data) ? data : data.responses ?? data.results ?? [];
    return arr.map((r: any) => ({
      id: r.id,
      result: r.result,
      error: r.error,
      raw: r,
    }));
  }

  /**
   * Discover the server's MCP capabilities and tools.
   */
  async info(): Promise<McpInfo> {
    const { data } = await this.synapCores._getHttpClient().get('/mcp/info');
    return {
      version: data.version ?? data.mcp_version ?? '0',
      capabilities: data.capabilities,
      tools: data.tools,
      meta: data.meta ?? data.metadata,
    };
  }
}
