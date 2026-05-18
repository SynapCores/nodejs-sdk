/**
 * System / admin type definitions (v1.5.0-ce).
 */

export interface VisionConfig {
  provider?: string;
  model?: string;
  api_key?: string;
  endpoint?: string;
  /** Free-form provider-specific options. */
  options?: Record<string, any>;
}

export interface VisionTestResult {
  success: boolean;
  latency_ms?: number;
  /** Sample echoed back from provider when applicable. */
  response?: any;
  error?: string;
}
