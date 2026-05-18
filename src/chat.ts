/**
 * AI chat client for SynapCores SDK (v1.5.0-ce).
 *
 * Wraps:
 *   /v1/ai/sessions, /v1/ai/sessions/:id, /v1/ai/sessions/:id/messages
 *   /v1/ai/chat, /v1/ai/chat/stream  (POST)
 *   /v1/ai/suggestions, /v1/ai/models, /v1/ai/system-prompts
 *   /v1/ai/tools, /v1/ai/tools/execute, /v1/ai/tools/sql
 *   /v1/ai/cache/stats, /v1/ai/cache/clear
 */

import { SynapCores } from './client';
import {
  ChatSession,
  CreateChatSessionOptions,
  ChatMessage,
  SendChatOptions,
  SendChatResult,
  ChatStreamChunk,
  ChatSuggestion,
  ChatSuggestionsOptions,
  ChatModelInfo,
  ChatSystemPrompt,
  ChatTool,
  ChatCacheStats,
} from './types/chat';

class ChatSessionsApi {
  constructor(private readonly synapCores: SynapCores) {}

  async create(opts: CreateChatSessionOptions = {}): Promise<ChatSession> {
    const { data } = await this.synapCores._getHttpClient().post('/ai/sessions', opts);
    return this.normalize(data);
  }

  async list(opts: { limit?: number; offset?: number } = {}): Promise<ChatSession[]> {
    const params = new URLSearchParams();
    if (opts.limit) params.append('limit', String(opts.limit));
    if (opts.offset) params.append('offset', String(opts.offset));
    const qs = params.toString();
    const { data } = await this.synapCores._getHttpClient().get(
      `/ai/sessions${qs ? `?${qs}` : ''}`,
    );
    return (data.sessions ?? data ?? []).map((s: any) => this.normalize(s));
  }

  async get(id: string): Promise<ChatSession> {
    const { data } = await this.synapCores._getHttpClient().get(`/ai/sessions/${id}`);
    return this.normalize(data);
  }

  async delete(id: string): Promise<void> {
    await this.synapCores._getHttpClient().delete(`/ai/sessions/${id}`);
  }

  async messages(id: string, opts: { limit?: number; offset?: number } = {}): Promise<ChatMessage[]> {
    const params = new URLSearchParams();
    if (opts.limit) params.append('limit', String(opts.limit));
    if (opts.offset) params.append('offset', String(opts.offset));
    const qs = params.toString();
    const { data } = await this.synapCores._getHttpClient().get(
      `/ai/sessions/${id}/messages${qs ? `?${qs}` : ''}`,
    );
    return (data.messages ?? data ?? []).map((m: any) => this.normalizeMessage(m, id));
  }

  private normalize(data: any): ChatSession {
    return {
      id: String(data.id ?? data.session_id ?? ''),
      title: data.title,
      model: data.model,
      system_prompt: data.system_prompt,
      created_at: new Date(data.created_at ?? Date.now()),
      updated_at: data.updated_at ? new Date(data.updated_at) : undefined,
      message_count: data.message_count ?? data.messages,
      metadata: data.metadata,
    };
  }

  private normalizeMessage(m: any, sessionId: string): ChatMessage {
    return {
      id: String(m.id ?? m.message_id ?? ''),
      session_id: m.session_id !== undefined ? String(m.session_id) : sessionId,
      role: m.role,
      content: m.content ?? m.text ?? '',
      created_at: new Date(m.created_at ?? Date.now()),
      metadata: m.metadata,
    };
  }
}

class ChatToolsApi {
  constructor(private readonly synapCores: SynapCores) {}

  async list(): Promise<ChatTool[]> {
    const { data } = await this.synapCores._getHttpClient().get('/ai/tools');
    return (data.tools ?? data ?? []).map((t: any) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters ?? t.schema,
    }));
  }

  async execute(name: string, args: Record<string, any> = {}): Promise<any> {
    const { data } = await this.synapCores._getHttpClient().post('/ai/tools/execute', {
      tool: name,
      arguments: args,
    });
    return data;
  }

  async sql(sql: string, params: any[] = []): Promise<any> {
    const { data } = await this.synapCores._getHttpClient().post('/ai/tools/sql', {
      sql,
      parameters: params,
    });
    return data;
  }
}

class ChatCacheApi {
  constructor(private readonly synapCores: SynapCores) {}

  async stats(): Promise<ChatCacheStats> {
    const { data } = await this.synapCores._getHttpClient().get('/ai/cache/stats');
    return {
      size_bytes: data.size_bytes ?? data.bytes,
      hit_count: data.hit_count ?? data.hits,
      miss_count: data.miss_count ?? data.misses,
      entries: data.entries ?? data.count,
      raw: data,
    };
  }

  async clear(): Promise<void> {
    await this.synapCores._getHttpClient().post('/ai/cache/clear', {});
  }
}

export class ChatClient {
  public readonly sessions: ChatSessionsApi;
  public readonly tools: ChatToolsApi;
  public readonly cache: ChatCacheApi;

  constructor(private readonly synapCores: SynapCores) {
    this.sessions = new ChatSessionsApi(synapCores);
    this.tools = new ChatToolsApi(synapCores);
    this.cache = new ChatCacheApi(synapCores);
  }

  /**
   * Send a one-shot chat message. The gateway accepts both /ai/chat and
   * the alias /ai/ — we use /ai/chat for clarity.
   */
  async send(sessionId: string, content: string, opts: SendChatOptions = {}): Promise<SendChatResult> {
    const { data } = await this.synapCores._getHttpClient().post('/ai/chat', {
      session_id: sessionId,
      content,
      ...opts,
    });

    const messageData = data.message ?? data;
    return {
      message: {
        id: String(messageData.id ?? messageData.message_id ?? ''),
        session_id: sessionId,
        role: messageData.role ?? 'assistant',
        content: messageData.content ?? messageData.text ?? '',
        created_at: new Date(messageData.created_at ?? Date.now()),
        metadata: messageData.metadata,
      },
      tool_calls: data.tool_calls,
      usage: data.usage,
    };
  }

  /**
   * Stream a chat completion. Returns an async iterator over SSE chunks.
   */
  async *stream(
    sessionId: string,
    content: string,
    opts: SendChatOptions = {},
  ): AsyncIterable<ChatStreamChunk> {
    const http = this.synapCores._getHttpClient();
    const response = await http.post(
      '/ai/chat/stream',
      {
        session_id: sessionId,
        content,
        ...opts,
      },
      { responseType: 'stream' },
    );

    // Node stream response — parse SSE-like `data: {...}\n\n` frames.
    const stream: NodeJS.ReadableStream = response.data;
    let buffer = '';
    for await (const chunk of stream as any) {
      buffer += chunk.toString();
      const frames = buffer.split(/\n\n/);
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const trimmed = frame.trim();
        if (!trimmed) continue;
        // Handle SSE "data: " prefix or raw JSON lines.
        const line = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
        if (line === '[DONE]') {
          yield { done: true };
          return;
        }
        try {
          const obj = JSON.parse(line);
          yield {
            delta:
              obj.delta ??
              obj.choices?.[0]?.delta?.content ??
              obj.text ??
              undefined,
            content: obj.content ?? obj.message?.content,
            type: obj.type ?? obj.event,
            done: obj.done ?? obj.finished,
            raw: obj,
          };
        } catch {
          // Treat as plain text delta if not JSON.
          yield { delta: line, raw: line };
        }
      }
    }
    if (buffer.trim()) {
      try {
        yield { raw: JSON.parse(buffer) };
      } catch {
        yield { delta: buffer };
      }
    }
  }

  /**
   * Get prompt suggestions, e.g. for an empty session UI.
   */
  async suggestions(opts: ChatSuggestionsOptions = {}): Promise<ChatSuggestion[]> {
    const { data } = await this.synapCores._getHttpClient().post('/ai/suggestions', opts);
    return (data.suggestions ?? data ?? []).map((s: any) => ({
      prompt: s.prompt ?? s.text ?? '',
      category: s.category,
      meta: s.meta ?? s.metadata,
    }));
  }

  /**
   * List configured chat models.
   */
  async models(): Promise<ChatModelInfo[]> {
    const { data } = await this.synapCores._getHttpClient().get('/ai/models');
    return (data.models ?? data ?? []).map((m: any) => ({
      id: m.id ?? m.name,
      name: m.name,
      provider: m.provider,
      context_window: m.context_window ?? m.max_context,
      capabilities: m.capabilities,
    }));
  }

  /**
   * List the available system prompts library.
   */
  async systemPrompts(): Promise<ChatSystemPrompt[]> {
    const { data } = await this.synapCores._getHttpClient().get('/ai/system-prompts');
    return (data.prompts ?? data.system_prompts ?? data ?? []).map((p: any) => ({
      id: String(p.id ?? p.name ?? ''),
      name: p.name,
      content: p.content ?? p.text ?? '',
      description: p.description,
      category: p.category,
    }));
  }
}
