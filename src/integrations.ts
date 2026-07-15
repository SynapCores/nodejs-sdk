/**
 * Integration Management Client for SynapCores SDK
 *
 * Reconciled for gateway v2 (0.6.0). The served surface (routes/integrations.rs)
 * is a **type-keyed configuration** API — one stored config per integration
 * type — not the id-based execution/webhook engine older SDK builds assumed:
 *   GET    /integrations                    list
 *   GET    /integrations/:type              get
 *   POST   /integrations/:type              create or update (upsert)
 *   DELETE /integrations/:type              delete
 *   POST   /integrations/:type/test         test connection
 *   GET    /integrations/types              list available types (metadata)
 *   GET    /integrations/audit              audit log
 *
 * Consequently the `:id` in {@link get}/{@link update}/{@link delete}/
 * {@link test}/{@link execute} identifies an integration **type** (e.g.
 * "slack", "s3", "postgres"). Execution / webhook / event / log / stats /
 * retry surfaces have no v2 route and throw {@link NotImplementedError}.
 */

import { SynapCores } from './client';
import { NotImplementedError } from './errors';
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

export class IntegrationClient {
  constructor(private readonly synapCores: SynapCores) {}

  /**
   * Create or update the stored config for an integration type.
   * Gateway (v2): `POST /integrations/:type` (upsert). Config fields are
   * flattened into the request body (see routes/integrations.rs
   * `CreateIntegrationRequest`).
   */
  async create(options: CreateIntegrationOptions): Promise<Integration> {
    const body = {
      name: options.name,
      description: options.description,
      ...(options.config as Record<string, unknown>),
    };
    const { data } = await this.synapCores._getHttpClient().post(
      `/integrations/${options.type}`,
      body,
    );
    return this.mapIntegration(data);
  }

  /**
   * List configured integrations. Gateway (v2): `GET /integrations`.
   */
  async list(options: ListIntegrationsOptions = {}): Promise<Integration[]> {
    const params = new URLSearchParams();
    if (options.type) params.append('type', options.type);
    if (options.status) params.append('status', options.status);
    if (options.page) params.append('page', options.page.toString());
    if (options.page_size) params.append('page_size', options.page_size.toString());

    const qs = params.toString();
    const { data } = await this.synapCores._getHttpClient().get(
      `/integrations${qs ? `?${qs}` : ''}`,
    );
    return (data.integrations || data || []).map((i: any) => this.mapIntegration(i));
  }

  /**
   * Get one integration by **type**. Gateway (v2): `GET /integrations/:type`.
   * @param integrationType - the integration type key (e.g. "slack").
   */
  async get(integrationType: string): Promise<Integration> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/integrations/${integrationType}`,
    );
    return this.mapIntegration(data);
  }

  /**
   * Update the stored config for an integration type (upsert).
   * Gateway (v2): `POST /integrations/:type`.
   * @param integrationType - the integration type key.
   */
  async update(
    integrationType: string,
    updates: Partial<CreateIntegrationOptions>,
  ): Promise<Integration> {
    const body = {
      name: updates.name,
      description: updates.description,
      ...((updates.config as Record<string, unknown>) || {}),
    };
    const { data } = await this.synapCores._getHttpClient().post(
      `/integrations/${integrationType}`,
      body,
    );
    return this.mapIntegration(data);
  }

  /**
   * Delete an integration config by **type**.
   * Gateway (v2): `DELETE /integrations/:type`.
   */
  async delete(integrationType: string): Promise<void> {
    await this.synapCores._getHttpClient().delete(`/integrations/${integrationType}`);
  }

  /**
   * Test an integration connection. Gateway (v2):
   * `POST /integrations/:type/test`.
   * @param options.integration - the integration type key.
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
      success: data.success ?? data.test_status === 'success',
      validation_errors: data.validation_errors || [],
      response: data.response ?? data.test_message,
      error: data.error,
      latency_ms: data.latency_ms,
    };
  }

  // ------------------------------------------------------------------
  // Removed in gateway v2 — no equivalent route.
  // ------------------------------------------------------------------

  /** @deprecated No activate route; set the config's active flag via {@link update}. */
  async activate(_id: string): Promise<Integration> {
    throw new NotImplementedError(
      'client.integrations.activate is removed — gateway v2 has no activate ' +
        'route. Re-save the config via client.integrations.update() instead.',
    );
  }

  /** @deprecated No deactivate route; delete the config via {@link delete}. */
  async deactivate(_id: string): Promise<Integration> {
    throw new NotImplementedError(
      'client.integrations.deactivate is removed — gateway v2 has no ' +
        'deactivate route. Delete the config via client.integrations.delete().',
    );
  }

  /**
   * @deprecated Gateway v2 integrations store connection configs; they are not
   * an execution engine. There is no `/integrations/:id/execute` route.
   */
  async execute(_options: ExecuteIntegrationOptions): Promise<IntegrationExecutionResult> {
    throw new NotImplementedError(
      'client.integrations.execute is removed — gateway v2 integrations are ' +
        'connection configs, not an execution engine. Use client.integrations.test() ' +
        'to validate a connection.',
    );
  }

  /** @deprecated No execution-history route in gateway v2. */
  async getExecutionHistory(
    _integrationId: string,
    _options: { limit?: number; offset?: number } = {},
  ): Promise<IntegrationExecutionResult[]> {
    throw new NotImplementedError(
      'client.integrations.getExecutionHistory is removed — gateway v2 has no ' +
        'execution-history route. See client.integrations.list() and the audit log.',
    );
  }

  /** @deprecated No per-integration stats route in gateway v2. */
  async getStats(_integrationId: string): Promise<IntegrationStats> {
    throw new NotImplementedError(
      'client.integrations.getStats is removed — gateway v2 has no stats ' +
        'route. usage_count is included on client.integrations.get().',
    );
  }

  /** @deprecated No webhook routes in gateway v2. */
  async createWebhook(_options: CreateWebhookOptions): Promise<IntegrationWebhook> {
    throw new NotImplementedError(
      'client.integrations.createWebhook is removed — gateway v2 has no ' +
        'integration webhook routes.',
    );
  }

  /** @deprecated No webhook routes in gateway v2. */
  async listWebhooks(_integrationId: string): Promise<IntegrationWebhook[]> {
    throw new NotImplementedError(
      'client.integrations.listWebhooks is removed — gateway v2 has no ' +
        'integration webhook routes.',
    );
  }

  /** @deprecated No webhook routes in gateway v2. */
  async deleteWebhook(_webhookId: string): Promise<void> {
    throw new NotImplementedError(
      'client.integrations.deleteWebhook is removed — gateway v2 has no ' +
        'integration webhook routes.',
    );
  }

  /** @deprecated No per-integration events route in gateway v2. */
  async getEvents(
    _integrationId: string,
    _options: { limit?: number; status?: string } = {},
  ): Promise<IntegrationEvent[]> {
    throw new NotImplementedError(
      'client.integrations.getEvents is removed — gateway v2 has no events ' +
        'route. See the audit log at GET /integrations/audit.',
    );
  }

  /** @deprecated No per-integration logs route in gateway v2. */
  async getLogs(
    _integrationId: string,
    _options: { limit?: number; level?: string } = {},
  ): Promise<IntegrationLog[]> {
    throw new NotImplementedError(
      'client.integrations.getLogs is removed — gateway v2 has no logs route. ' +
        'See the audit log at GET /integrations/audit.',
    );
  }

  /** @deprecated No execution/retry route in gateway v2. */
  async retryExecution(_executionId: string): Promise<IntegrationExecutionResult> {
    throw new NotImplementedError(
      'client.integrations.retryExecution is removed — gateway v2 has no ' +
        'execution/retry route.',
    );
  }

  /**
   * Map a gateway IntegrationResponse to the SDK Integration type.
   */
  private mapIntegration(data: any): Integration {
    return {
      id: data.id,
      name: data.integration_name ?? data.name,
      type: data.integration_type ?? data.type,
      status: data.is_active === false ? 'inactive' : (data.status ?? 'active'),
      config: data.config,
      description: data.description,
      tags: data.tags || [],
      created_at: data.created_at ? new Date(data.created_at) : new Date(),
      updated_at: data.updated_at ? new Date(data.updated_at) : new Date(),
      last_success_at: data.last_used_at ? new Date(data.last_used_at) : undefined,
      last_error: data.last_error ?? data.test_message,
      execution_count: data.usage_count ?? data.execution_count,
    } as Integration;
  }
}
