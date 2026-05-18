/**
 * Integration Management Client for SynapCores SDK.
 *
 * v0.2.0: gateway v1.5.0-ce uses {integration_type} (a slug) as the path
 * parameter, not arbitrary IDs. Webhooks, stats, logs, events and
 * execution history routes do not exist on the gateway, so those methods
 * now throw a ValidationError. New methods: listTypes() and audit().
 */

import { SynapCores } from './client';
import { ValidationError } from './errors';
import {
  Integration,
  CreateIntegrationOptions,
  ListIntegrationsOptions,
  ExecuteIntegrationOptions,
  IntegrationExecutionResult,
  IntegrationWebhook,
  CreateWebhookOptions,
  IntegrationEvent,
  IntegrationLog,
  IntegrationStats,
  TestIntegrationOptions,
  TestIntegrationResult,
} from './types/integrations';

const NOT_SUPPORTED = 'not supported in v1.5.0-ce — see SynapCores integrations API';

export interface IntegrationTypeInfo {
  type: string;
  display_name?: string;
  description?: string;
  config_schema?: any;
}

export interface IntegrationAuditEntry {
  id?: string;
  type: string;
  action: string;
  user?: string;
  timestamp: Date;
  details?: any;
}

export class IntegrationClient {
  constructor(private readonly synapCores: SynapCores) {}

  /**
   * Create a new integration. Gateway v1.5.0-ce keys integrations by
   * `type` (slug). The body still carries the type so old call sites
   * remain backwards compatible.
   */
  async create(options: CreateIntegrationOptions): Promise<Integration> {
    const { data } = await this.synapCores._getHttpClient().post('/integrations', {
      name: options.name,
      type: options.type,
      config: options.config,
      description: options.description,
      tags: options.tags || [],
      activate: options.activate || false,
    });

    return this.mapIntegration(data);
  }

  /**
   * List integrations (optional filters).
   */
  async list(options: ListIntegrationsOptions = {}): Promise<Integration[]> {
    const params = new URLSearchParams();

    if (options.type) params.append('type', options.type);
    if (options.status) params.append('status', options.status);
    if (options.search) params.append('search', options.search);
    if (options.page) params.append('page', options.page.toString());
    if (options.page_size) params.append('page_size', options.page_size.toString());
    if (options.tags && options.tags.length > 0) {
      params.append('tags', options.tags.join(','));
    }

    const qs = params.toString();
    const { data } = await this.synapCores._getHttpClient().get(
      `/integrations${qs ? `?${qs}` : ''}`,
    );

    return (data.integrations || data || []).map((integration: any) =>
      this.mapIntegration(integration),
    );
  }

  /**
   * Get a specific integration by type-slug.
   */
  async get(type: string): Promise<Integration> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/integrations/${type}`,
    );
    return this.mapIntegration(data);
  }

  /**
   * Update an existing integration by type-slug.
   */
  async update(
    type: string,
    updates: Partial<CreateIntegrationOptions>,
  ): Promise<Integration> {
    const { data } = await this.synapCores._getHttpClient().put(
      `/integrations/${type}`,
      updates,
    );
    return this.mapIntegration(data);
  }

  /**
   * Delete an integration by type-slug.
   */
  async delete(type: string): Promise<void> {
    await this.synapCores._getHttpClient().delete(`/integrations/${type}`);
  }

  /**
   * Test an integration connection.
   */
  async test(options: TestIntegrationOptions): Promise<TestIntegrationResult> {
    const { data } = await this.synapCores._getHttpClient().post(
      `/integrations/${options.integration}/test`,
      {
        payload: options.payload,
        validate_only: options.validate_only || false,
      },
    );

    return {
      success: data.success,
      validation_errors: data.validation_errors || [],
      response: data.response,
      error: data.error,
      latency_ms: data.latency_ms,
    };
  }

  /**
   * List supported integration types and their config schemas.
   */
  async listTypes(): Promise<IntegrationTypeInfo[]> {
    const { data } = await this.synapCores._getHttpClient().get('/integrations/types');
    return (data.types ?? data ?? []).map((t: any) => ({
      type: t.type ?? t.name,
      display_name: t.display_name ?? t.label,
      description: t.description,
      config_schema: t.config_schema ?? t.schema,
    }));
  }

  /**
   * Get the integrations audit trail.
   */
  async audit(options: { limit?: number; type?: string } = {}): Promise<IntegrationAuditEntry[]> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.type) params.append('type', options.type);
    const qs = params.toString();
    const { data } = await this.synapCores._getHttpClient().get(
      `/integrations/audit${qs ? `?${qs}` : ''}`,
    );
    return (data.entries ?? data.audit ?? data ?? []).map((row: any) => ({
      id: row.id,
      type: row.type ?? row.integration_type,
      action: row.action ?? row.event,
      user: row.user ?? row.actor,
      timestamp: new Date(row.timestamp ?? row.created_at ?? Date.now()),
      details: row.details ?? row.data,
    }));
  }

  // -------------------------------------------------------------------
  // Methods removed from v1.5.0-ce (gateway has no matching route).
  // We keep the names for backwards-compat but throw a clear error.
  // -------------------------------------------------------------------

  async activate(_type: string): Promise<Integration> {
    throw new ValidationError(`integrations.activate() ${NOT_SUPPORTED} — use update() with {activate:true}`);
  }

  async deactivate(_type: string): Promise<Integration> {
    throw new ValidationError(`integrations.deactivate() ${NOT_SUPPORTED} — use update() with {activate:false}`);
  }

  async execute(_options: ExecuteIntegrationOptions): Promise<IntegrationExecutionResult> {
    throw new ValidationError(`integrations.execute() ${NOT_SUPPORTED}`);
  }

  async getExecutionHistory(
    _type: string,
    _options: { limit?: number; offset?: number } = {},
  ): Promise<IntegrationExecutionResult[]> {
    throw new ValidationError(`integrations.getExecutionHistory() ${NOT_SUPPORTED}`);
  }

  async getStats(_type: string): Promise<IntegrationStats> {
    throw new ValidationError(`integrations.getStats() ${NOT_SUPPORTED}`);
  }

  async createWebhook(_options: CreateWebhookOptions): Promise<IntegrationWebhook> {
    throw new ValidationError(`integrations.createWebhook() ${NOT_SUPPORTED}`);
  }

  async listWebhooks(_type: string): Promise<IntegrationWebhook[]> {
    throw new ValidationError(`integrations.listWebhooks() ${NOT_SUPPORTED}`);
  }

  async deleteWebhook(_webhookId: string): Promise<void> {
    throw new ValidationError(`integrations.deleteWebhook() ${NOT_SUPPORTED}`);
  }

  async getEvents(
    _type: string,
    _options: { limit?: number; status?: string } = {},
  ): Promise<IntegrationEvent[]> {
    throw new ValidationError(`integrations.getEvents() ${NOT_SUPPORTED}`);
  }

  async getLogs(
    _type: string,
    _options: { limit?: number; level?: string } = {},
  ): Promise<IntegrationLog[]> {
    throw new ValidationError(`integrations.getLogs() ${NOT_SUPPORTED}`);
  }

  async retryExecution(_executionId: string): Promise<IntegrationExecutionResult> {
    throw new ValidationError(`integrations.retryExecution() ${NOT_SUPPORTED}`);
  }

  /**
   * Map raw integration data to Integration type.
   */
  private mapIntegration(data: any): Integration {
    return {
      id: data.id ?? data.type,
      name: data.name ?? data.type,
      type: data.type,
      status: data.status ?? (data.active ? 'active' : 'inactive'),
      config: data.config ?? {},
      description: data.description,
      tags: data.tags || [],
      created_at: new Date(data.created_at ?? Date.now()),
      updated_at: new Date(data.updated_at ?? data.created_at ?? Date.now()),
      last_success_at: data.last_success_at ? new Date(data.last_success_at) : undefined,
      last_error: data.last_error,
      execution_count: data.execution_count,
    };
  }
}
