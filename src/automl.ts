/**
 * AutoML client for SynapCores SDK
 */

import { SynapCores } from './client';
import { NotImplementedError } from './errors';
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

    // Gateway (v2): POST /automl/models/:id/predict — model id is in the
    // path; body is `{ inputs: [ {col: val}, ... ] }`.
    const response = await this.client.synapCores._getHttpClient().post(
      `/automl/models/${this.id}/predict`,
      {
        inputs,
      },
    );

    const predictions = response.data.predictions;
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

    // Gateway (v2): POST /automl/models/:id/evaluate.
    const { data } = await this.client.synapCores._getHttpClient().post(
      `/automl/models/${this.id}/evaluate`,
      payload,
    );

    return data;
  }

  async delete(): Promise<void> {
    // Gateway (v2): DELETE /automl/models/:id.
    await this.client.synapCores._getHttpClient().delete(
      `/automl/models/${this.id}`,
    );
  }
}

export class AutoMLClient {
  constructor(public readonly synapCores: SynapCores) {}

  async train(options: TrainOptions): Promise<AutoMLModel> {
    // Gateway (v2): POST /automl/train.
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
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      config: data.config,
    };

    return new AutoMLModel(this, modelInfo);
  }

  async getModel(modelId: string): Promise<AutoMLModel> {
    // Gateway (v2): GET /automl/models/:id.
    const { data } = await this.synapCores._getHttpClient().get(
      `/automl/models/${modelId}`,
    );

    const modelInfo: ModelInfo = {
      id: data.id,
      name: data.name,
      task: data.task,
      status: data.status,
      accuracy: data.accuracy,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      config: data.config,
    };

    return new AutoMLModel(this, modelInfo);
  }

  async listModels(filters?: {
    task?: string;
    status?: string;
  }): Promise<ModelInfo[]> {
    // Gateway (v2): GET /automl/models.
    const { data } = await this.synapCores._getHttpClient().get('/automl/models', {
      params: filters,
    });

    // Gateway (v2) returns a bare array; tolerate `{ models: [...] }` too.
    return (data.models || data || []).map((model: any) => ({
      id: model.id,
      name: model.name,
      task: model.task,
      status: model.status,
      accuracy: model.accuracy,
      createdAt: new Date(model.created_at),
      updatedAt: model.updated_at ? new Date(model.updated_at) : undefined,
      config: model.config,
    }));
  }

  /**
   * Start async training job
   */
  async trainAsync(options: AsyncTrainOptions): Promise<TrainingJob> {
    // Gateway (v2): POST /automl/train with `async_mode: true` — the same
    // training endpoint returns a job handle instead of blocking.
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
      async_mode: true,
      callback_url: options.callback_url,
      webhook_url: options.webhook_url,
    });

    return {
      id: data.id || data.job_id,
      name: data.name,
      status: data.status,
      progress: data.progress || 0,
      phase: data.phase,
      task: data.task,
      current_trial: data.current_trial,
      total_trials: data.total_trials || options.maxTrials || 10,
      best_accuracy: data.best_accuracy,
      eta_ms: data.eta_ms || data.estimated_time_remaining_ms,
      error: data.error,
      started_at: new Date(data.started_at || Date.now()),
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
      model_id: data.model_id,
    };
  }

  /**
   * Get training job status
   */
  async getTrainingJob(jobId: string): Promise<TrainingJob> {
    // Gateway (v2): GET /automl/jobs/:id.
    const { data } = await this.synapCores._getHttpClient().get(
      `/automl/jobs/${jobId}`
    );

    return {
      id: data.id || jobId,
      name: data.name,
      status: data.status,
      progress: data.progress || 0,
      phase: data.phase,
      task: data.task,
      current_trial: data.current_trial,
      total_trials: data.total_trials,
      best_accuracy: data.best_accuracy,
      eta_ms: data.eta_ms || data.estimated_time_remaining_ms,
      error: data.error,
      started_at: new Date(data.started_at),
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
      model_id: data.model_id,
    };
  }

  /**
   * List training jobs
   */
  async listTrainingJobs(
    options: ListTrainingJobsOptions = {}
  ): Promise<TrainingJob[]> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.page) params.append('page', options.page.toString());
    if (options.page_size) params.append('page_size', options.page_size.toString());

    // Gateway (v2): GET /automl/jobs.
    const { data } = await this.synapCores._getHttpClient().get(
      `/automl/jobs?${params.toString()}`
    );

    return (data.jobs || data).map((job: any) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      progress: job.progress || 0,
      phase: job.phase,
      task: job.task,
      current_trial: job.current_trial,
      total_trials: job.total_trials,
      best_accuracy: job.best_accuracy,
      eta_ms: job.eta_ms || job.estimated_time_remaining_ms,
      error: job.error,
      started_at: new Date(job.started_at),
      completed_at: job.completed_at ? new Date(job.completed_at) : undefined,
      model_id: job.model_id,
    }));
  }

  /**
   * Cancel a training job
   */
  async cancelTrainingJob(jobId: string): Promise<void> {
    // Gateway (v2): POST /automl/jobs/:id/stop.
    await this.synapCores._getHttpClient().post(`/automl/jobs/${jobId}/stop`);
  }

  /**
   * Get training metrics for a job.
   *
   * @deprecated The gateway v2 AutoML surface does not expose a per-job
   * metrics timeline. Read the final metrics from the completed job via
   * {@link getTrainingJob} (`job.best_accuracy`) or from the trained model
   * via {@link getModel} instead.
   */
  async getTrainingMetrics(_jobId: string): Promise<TrainingMetrics[]> {
    throw new NotImplementedError(
      'client.automl.getTrainingMetrics is removed — the gateway v2 AutoML ' +
        'surface has no per-job metrics timeline. Use ' +
        'client.automl.getTrainingJob(jobId) for the final accuracy, or ' +
        'client.automl.getModel(modelId) for the trained model metrics.',
    );
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
    } = {}
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
}