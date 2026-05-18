/**
 * AutoML client for SynapCores SDK
 *
 * v0.2.0: paths migrated from /ai/* to /automl/* to match gateway
 * v1.5.0-ce. Async training is just /automl/train + polling /automl/jobs/:id.
 */

import { SynapCores } from './client';
import {
  ModelInfo,
  TrainOptions,
  EvaluationResult,
  AsyncTrainOptions,
  TrainingJob,
  TrainingMetrics,
  ListTrainingJobsOptions,
} from './types/automl';

export class AutoMLModel {
  constructor(
    private readonly client: AutoMLClient,
    public readonly info: ModelInfo,
  ) {}

  get id(): string {
    return this.info.id;
  }

  get name(): string {
    return this.info.name;
  }

  async predict(
    data: Record<string, any> | Record<string, any>[],
  ): Promise<any | any[]> {
    const isSingle = !Array.isArray(data);
    const inputs = isSingle ? [data] : data;

    const response = await this.client.synapCores._getHttpClient().post(
      `/automl/models/${this.id}/predict`,
      { inputs },
    );

    const predictions = response.data.predictions ?? response.data;
    return isSingle ? predictions[0] : predictions;
  }

  async evaluate(
    testData: string | Record<string, any>[],
    target?: string,
  ): Promise<EvaluationResult> {
    const payload: any = {};

    if (typeof testData === 'string') {
      payload.collection = testData;
    } else {
      payload.data = testData;
      if (target) {
        payload.target = target;
      }
    }

    const { data } = await this.client.synapCores._getHttpClient().post(
      `/automl/models/${this.id}/evaluate`,
      payload,
    );

    return data;
  }

  async delete(): Promise<void> {
    await this.client.synapCores._getHttpClient().delete(
      `/automl/models/${this.id}`,
    );
  }
}

export class AutoMLClient {
  constructor(public readonly synapCores: SynapCores) {}

  async train(options: TrainOptions): Promise<AutoMLModel> {
    const { data } = await this.synapCores._getHttpClient().post('/automl/train', {
      collection: options.collection,
      target: options.target,
      features: options.features,
      task: options.task || 'auto',
      name: options.name || `${options.collection}_${options.target}_model`,
      config: options.config || {},
      validation_split: options.validationSplit || 0.2,
      max_trials: options.maxTrials || 10,
      timeout_minutes: options.timeoutMinutes || 60,
    });

    const modelInfo: ModelInfo = {
      id: data.id,
      name: data.name,
      task: data.task,
      status: data.status,
      accuracy: data.accuracy,
      createdAt: new Date(data.created_at ?? Date.now()),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      config: data.config ?? {},
    };

    return new AutoMLModel(this, modelInfo);
  }

  async getModel(modelId: string): Promise<AutoMLModel> {
    // v0.3.0: GET /automl/models/:id can return 404 even when /predict works
    // (the gateway's model index doesn't always include models loaded via
    // the recipe / training pipeline). Fall back to a stub ModelInfo so the
    // caller can still invoke .predict() / .evaluate() against the id.
    try {
      const { data } = await this.synapCores._getHttpClient().get(
        `/automl/models/${modelId}`,
      );

      // Unwrap { data: {...}, meta } envelope if present.
      const m = data?.data ?? data;
      const modelInfo: ModelInfo = {
        id: m.id ?? modelId,
        name: m.name ?? modelId,
        task: m.task,
        status: m.status,
        accuracy: m.accuracy,
        createdAt: new Date(m.created_at ?? Date.now()),
        updatedAt: m.updated_at ? new Date(m.updated_at) : undefined,
        config: m.config ?? {},
      };
      return new AutoMLModel(this, modelInfo);
    } catch (err: any) {
      // Treat NotFoundError as "model exists at the predict endpoint but is
      // not listed" — return a stub. Re-raise anything else.
      const status = err?.statusCode ?? err?.response?.status;
      const code = err?.code;
      if (status === 404 || code === 'NOT_FOUND') {
        const modelInfo: ModelInfo = {
          id: modelId,
          name: modelId,
          task: undefined as any,
          status: 'unknown' as any,
          accuracy: undefined,
          createdAt: new Date(),
          updatedAt: undefined,
          config: {},
        };
        return new AutoMLModel(this, modelInfo);
      }
      throw err;
    }
  }

  async listModels(filters?: {
    task?: string;
    status?: string;
  }): Promise<ModelInfo[]> {
    const { data } = await this.synapCores._getHttpClient().get('/automl/models', {
      params: filters,
    });

    // v0.3.0: gateway returns { data: [...], meta: ... }. Older shapes may use
    // { models: [...] } or a bare array. Pick the first array we find.
    const list: any[] = Array.isArray(data)
      ? data
      : (Array.isArray(data?.data) ? data.data
        : (Array.isArray(data?.models) ? data.models
          : (Array.isArray(data?.data?.items) ? data.data.items
            : [])));

    return list.map((model: any) => ({
      id: model.id ?? model.name,
      name: model.name,
      task: model.task,
      status: model.status,
      accuracy: model.accuracy,
      createdAt: new Date(model.created_at ?? Date.now()),
      updatedAt: model.updated_at ? new Date(model.updated_at) : undefined,
      config: model.config ?? {},
    }));
  }

  /**
   * Start async training job.
   *
   * In v1.5.0-ce there is no separate /train/async endpoint — /automl/train
   * itself returns a job descriptor when the training is long-running.
   */
  async trainAsync(options: AsyncTrainOptions): Promise<TrainingJob> {
    const { data } = await this.synapCores._getHttpClient().post('/automl/train', {
      collection: options.collection,
      target: options.target,
      features: options.features,
      task: options.task || 'auto',
      name: options.name || `${options.collection}_${options.target}_model`,
      config: options.config || {},
      validation_split: options.validationSplit || 0.2,
      max_trials: options.maxTrials || 10,
      timeout_minutes: options.timeoutMinutes || 60,
      async: true,
      callback_url: options.callback_url,
      webhook_url: options.webhook_url,
    });

    return this.mapTrainingJob(data, options.maxTrials || 10);
  }

  /**
   * Get training job status
   */
  async getTrainingJob(jobId: string): Promise<TrainingJob> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/automl/jobs/${jobId}`,
    );

    return this.mapTrainingJob(data);
  }

  /**
   * List training jobs
   */
  async listTrainingJobs(
    options: ListTrainingJobsOptions = {},
  ): Promise<TrainingJob[]> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.page) params.append('page', options.page.toString());
    if (options.page_size) params.append('page_size', options.page_size.toString());

    const qs = params.toString();
    const { data } = await this.synapCores._getHttpClient().get(
      `/automl/jobs${qs ? `?${qs}` : ''}`,
    );

    return (data.jobs ?? data ?? []).map((job: any) => this.mapTrainingJob(job));
  }

  /**
   * Cancel/stop a training job
   */
  async cancelTrainingJob(jobId: string): Promise<void> {
    await this.synapCores._getHttpClient().post(`/automl/jobs/${jobId}/stop`);
  }

  /**
   * Get training metrics for a job.
   *
   * v1.5.0-ce: gateway no longer has a dedicated /metrics route — metrics
   * (when available) ship inside the /automl/jobs/:id payload as
   * `metrics` or `trial_metrics`. We just unwrap that field here.
   */
  async getTrainingMetrics(jobId: string): Promise<TrainingMetrics[]> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/automl/jobs/${jobId}`,
    );

    const metrics = data.metrics ?? data.trial_metrics ?? [];
    return metrics.map((metric: any) => ({
      trial: metric.trial,
      accuracy: metric.accuracy,
      loss: metric.loss,
      metrics: metric.metrics,
      timestamp: new Date(metric.timestamp ?? Date.now()),
    }));
  }

  /**
   * Wait for training job to complete
   */
  async waitForTrainingJob(
    jobId: string,
    options: {
      pollInterval?: number;
      timeout?: number;
      onProgress?: (job: TrainingJob) => void;
    } = {},
  ): Promise<AutoMLModel> {
    const pollInterval = options.pollInterval || 2000;
    const timeout = options.timeout || 3600000; // 1 hour default
    const startTime = Date.now();

    while (true) {
      const job = await this.getTrainingJob(jobId);

      if (options.onProgress) {
        options.onProgress(job);
      }

      if (job.status === 'completed') {
        if (!job.model_id) {
          throw new Error('Training completed but no model ID returned');
        }
        return await this.getModel(job.model_id);
      }

      if (job.status === 'failed') {
        throw new Error(`Training failed: ${job.error || 'Unknown error'}`);
      }

      if (job.status === 'cancelled') {
        throw new Error('Training was cancelled');
      }

      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for training job to complete');
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  private mapTrainingJob(data: any, fallbackMaxTrials?: number): TrainingJob {
    return {
      id: data.id ?? data.job_id,
      name: data.name,
      status: data.status,
      progress: data.progress ?? 0,
      phase: data.phase,
      task: data.task,
      current_trial: data.current_trial,
      total_trials: data.total_trials ?? fallbackMaxTrials,
      best_accuracy: data.best_accuracy,
      eta_ms: data.eta_ms ?? data.estimated_time_remaining_ms,
      error: data.error,
      started_at: new Date(data.started_at ?? Date.now()),
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
      model_id: data.model_id,
    };
  }
}
