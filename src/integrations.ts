/**
 * Integration Management Client for SynapCores SDK
 */

import { SynapCores } from './client';
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
   * Create a new integration
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
   * List integrations with optional filters
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

    const { data } = await this.synapCores._getHttpClient().get(
      `/integrations?${params.toString()}`
    );

    return (data.integrations || data).map((integration: any) =>
      this.mapIntegration(integration)
    );
  }

  /**
   * Get a specific integration by ID
   */
  async get(id: string): Promise<Integration> {
    const { data } = await this.synapCores._getHttpClient().get(`/integrations/${id}`);
    return this.mapIntegration(data);
  }

  /**
   * Update an existing integration
   */
  async update(
    id: string,
    updates: Partial<CreateIntegrationOptions>
  ): Promise<Integration> {
    const { data } = await this.synapCores._getHttpClient().put(
      `/integrations/${id}`,
      updates
    );
    return this.mapIntegration(data);
  }

  /**
   * Delete an integration
   */
  async delete(id: string): Promise<void> {
    await this.synapCores._getHttpClient().delete(`/integrations/${id}`);
  }

  /**
   * Activate an integration
   */
  async activate(id: string): Promise<Integration> {
    const { data } = await this.synapCores._getHttpClient().post(
      `/integrations/${id}/activate`
    );
    return this.mapIntegration(data);
  }

  /**
   * Deactivate an integration
   */
  async deactivate(id: string): Promise<Integration> {
    const { data } = await this.synapCores._getHttpClient().post(
      `/integrations/${id}/deactivate`
    );
    return this.mapIntegration(data);
  }

  /**
   * Execute an integration
   */
  async execute(options: ExecuteIntegrationOptions): Promise<IntegrationExecutionResult> {
    const { data } = await this.synapCores._getHttpClient().post(
      `/integrations/${options.integration}/execute`,
      {
        payload: options.payload,
        config_override: options.config_override,
        sync: options.sync !== false,
      }
    );

    return {
      id: data.id || data.execution_id,
      success: data.success,
      response: data.response,
      status_code: data.status_code,
      error: data.error,
      execution_time_ms: data.execution_time_ms || data.took_ms || 0,
      retry_count: data.retry_count || 0,
      executed_at: data.executed_at ? new Date(data.executed_at) : new Date(),
    };
  }

  /**
   * Test an integration without executing
   */
  async test(options: TestIntegrationOptions): Promise<TestIntegrationResult> {
    const { data } = await this.synapCores._getHttpClient().post(
      `/integrations/${options.integration}/test`,
      {
        payload: options.payload,
        validate_only: options.validate_only || false,
      }
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
   * Get integration execution history
   */
  async getExecutionHistory(
    integrationId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<IntegrationExecutionResult[]> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const { data } = await this.synapCores._getHttpClient().get(
      `/integrations/${integrationId}/executions?${params.toString()}`
    );

    return (data.executions || data).map((exec: any) => ({
      id: exec.id || exec.execution_id,
      success: exec.success,
      response: exec.response,
      status_code: exec.status_code,
      error: exec.error,
      execution_time_ms: exec.execution_time_ms || exec.took_ms || 0,
      retry_count: exec.retry_count || 0,
      executed_at: exec.executed_at ? new Date(exec.executed_at) : new Date(),
    }));
  }

  /**
   * Get integration statistics
   */
  async getStats(integrationId: string): Promise<IntegrationStats> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/integrations/${integrationId}/stats`
    );

    return {
      integration_id: integrationId,
      total_executions: data.total_executions || 0,
      successful_executions: data.successful_executions || 0,
      failed_executions: data.failed_executions || 0,
      avg_execution_time_ms: data.avg_execution_time_ms || 0,
      executions_24h: data.executions_24h || 0,
      uptime_percentage: data.uptime_percentage || 0,
      last_success_at: data.last_success_at ? new Date(data.last_success_at) : undefined,
      last_error_at: data.last_error_at ? new Date(data.last_error_at) : undefined,
    };
  }

  /**
   * Create a webhook for an integration
   */
  async createWebhook(options: CreateWebhookOptions): Promise<IntegrationWebhook> {
    const { data } = await this.synapCores._getHttpClient().post('/integrations/webhooks', {
      integration_id: options.integration_id,
      event: options.event,
      url: options.url,
      secret: options.secret,
      activate: options.activate !== false,
    });

    return {
      id: data.id,
      integration_id: data.integration_id,
      event: data.event,
      url: data.url,
      active: data.active,
      secret: data.secret,
      created_at: new Date(data.created_at),
    };
  }

  /**
   * List webhooks for an integration
   */
  async listWebhooks(integrationId: string): Promise<IntegrationWebhook[]> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/integrations/${integrationId}/webhooks`
    );

    return (data.webhooks || data).map((webhook: any) => ({
      id: webhook.id,
      integration_id: webhook.integration_id,
      event: webhook.event,
      url: webhook.url,
      active: webhook.active,
      secret: webhook.secret,
      created_at: new Date(webhook.created_at),
    }));
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.synapCores._getHttpClient().delete(`/integrations/webhooks/${webhookId}`);
  }

  /**
   * Get integration events
   */
  async getEvents(
    integrationId: string,
    options: { limit?: number; status?: string } = {}
  ): Promise<IntegrationEvent[]> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.status) params.append('status', options.status);

    const { data } = await this.synapCores._getHttpClient().get(
      `/integrations/${integrationId}/events?${params.toString()}`
    );

    return (data.events || data).map((event: any) => ({
      id: event.id,
      integration_id: event.integration_id,
      event: event.event,
      data: event.data,
      timestamp: new Date(event.timestamp),
      status: event.status,
      error: event.error,
    }));
  }

  /**
   * Get integration logs
   */
  async getLogs(
    integrationId: string,
    options: { limit?: number; level?: string } = {}
  ): Promise<IntegrationLog[]> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.level) params.append('level', options.level);

    const { data } = await this.synapCores._getHttpClient().get(
      `/integrations/${integrationId}/logs?${params.toString()}`
    );

    return (data.logs || data).map((log: any) => ({
      id: log.id,
      integration_id: log.integration_id,
      level: log.level,
      message: log.message,
      data: log.data,
      timestamp: new Date(log.timestamp),
    }));
  }

  /**
   * Retry a failed execution
   */
  async retryExecution(executionId: string): Promise<IntegrationExecutionResult> {
    const { data } = await this.synapCores._getHttpClient().post(
      `/integrations/executions/${executionId}/retry`
    );

    return {
      id: data.id || data.execution_id,
      success: data.success,
      response: data.response,
      status_code: data.status_code,
      error: data.error,
      execution_time_ms: data.execution_time_ms || data.took_ms || 0,
      retry_count: data.retry_count || 0,
      executed_at: data.executed_at ? new Date(data.executed_at) : new Date(),
    };
  }

  /**
   * Map raw integration data to Integration type
   */
  private mapIntegration(data: any): Integration {
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      status: data.status,
      config: data.config,
      description: data.description,
      tags: data.tags || [],
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      last_success_at: data.last_success_at ? new Date(data.last_success_at) : undefined,
      last_error: data.last_error,
      execution_count: data.execution_count,
    };
  }
}
