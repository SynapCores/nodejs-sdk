/**
 * AI chat session type definitions (v1.5.0-ce).
 */

export interface ChatSession {
  id: string;
  title?: string;
  model?: string;
  system_prompt?: string;
  created_at: Date;
  updated_at?: Date;
  message_count?: number;
  metadata?: Record<string, any>;
}

export interface CreateChatSessionOptions {
  title?: string;
  model?: string;
  system_prompt?: string;
  /** Tool names the assistant may call. */
  tools?: string[];
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  created_at: Date;
  metadata?: Record<string, any>;
}

export interface SendChatOptions {
  /** Override the session's model on this turn. */
  model?: string;
  temperature?: number;
  max_tokens?: number;
  /** Enable tool-use on this turn. */
  tools?: string[];
  /** Free-form attachments (image refs, file ids etc). */
  attachments?: any[];
  metadata?: Record<string, any>;
}

export interface SendChatResult {
  message: ChatMessage;
  /** Optional tool call trace returned by the gateway. */
  tool_calls?: any[];
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
}

export interface ChatStreamChunk {
  /** Text delta for the assistant message. */
  delta?: string;
  /** Whole message when the gateway sends consolidated chunks. */
  content?: string;
  type?: string;
  done?: boolean;
  raw?: any;
}

export interface ChatSuggestion {
  prompt: string;
  category?: string;
  /** Optional bag of metadata the gateway may attach. */
  meta?: Record<string, any>;
}

export interface ChatSuggestionsOptions {
  count?: number;
  context?: string;
  category?: string;
}

export interface ChatModelInfo {
  id: string;
  name?: string;
  provider?: string;
  context_window?: number;
  /** Capabilities flags from the gateway. */
  capabilities?: string[];
}

export interface ChatSystemPrompt {
  id: string;
  name: string;
  content: string;
  description?: string;
  category?: string;
}

export interface ChatTool {
  name: string;
  description?: string;
  parameters?: any;
}

export interface ChatCacheStats {
  size_bytes?: number;
  hit_count?: number;
  miss_count?: number;
  entries?: number;
  raw?: any;
}
