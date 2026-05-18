/**
 * Model Context Protocol type definitions (v1.5.0-ce).
 *
 * The gateway exposes a JSON-RPC-style MCP surface — payloads are
 * intentionally loose so the SDK does not have to track every server-side
 * tool schema.
 */

export interface McpRequest {
  /** Request id (jsonrpc-style). Generated client-side if omitted. */
  id?: string | number;
  method: string;
  params?: Record<string, any>;
  /** Optional MCP version pin. */
  version?: string;
}

export interface McpResponse<T = any> {
  id?: string | number;
  result?: T;
  error?: { code: number; message: string; data?: any };
  /** Raw payload for forward-compat. */
  raw?: any;
}

export interface McpInfo {
  version: string;
  capabilities?: string[];
  tools?: Array<{ name: string; description?: string }>;
  /** Forwarded server metadata. */
  meta?: Record<string, any>;
}
