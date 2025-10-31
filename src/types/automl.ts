/**
 * Type definitions for AutoML
 */

export interface ModelInfo {
  id: string;
  name: string;
  task: 'regression' | 'classification' | 'clustering';
  status: 'training' | 'ready' | 'failed';
  accuracy?: number;
  createdAt: Date;
  updatedAt?: Date;
  config: Record<string, any>;
}

export interface TrainOptions {
  collection: string;
  target: string;
  features?: string[];
  task?: 'auto' | 'regression' | 'classification';
  name?: string;
  config?: Record<string, any>;
  validationSplit?: number;
  maxTrials?: number;
  timeoutMinutes?: number;
}

export interface PredictResult {
  predictions: any[];
  confidence?: number[];
}

export interface EvaluationResult {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  mse?: number;
  rmse?: number;
  mae?: number;
  r2?: number;
  confusionMatrix?: number[][];
}

export interface AsyncTrainOptions extends TrainOptions {
  /** Enable async training */
  async?: boolean;

  /** Callback URL for completion notification */
  callback_url?: string;

  /** Webhook for progress updates */
  webhook_url?: string;
}

export interface TrainingJob {
  /** Job ID */
  id: string;

  /** Model name */
  name: string;

  /** Training status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  /** Progress percentage (0-100) */
  progress: number;

  /** Current phase */
  phase?: string;

  /** Model task type */
  task: 'regression' | 'classification' | 'clustering' | 'auto';

  /** Current trial number */
  current_trial?: number;

  /** Total trials */
  total_trials?: number;

  /** Best accuracy so far */
  best_accuracy?: number;

  /** Estimated time remaining (ms) */
  eta_ms?: number;

  /** Error message if failed */
  error?: string;

  /** Started timestamp */
  started_at: Date;

  /** Completed timestamp */
  completed_at?: Date;

  /** Model ID (when completed) */
  model_id?: string;
}

export interface TrainingMetrics {
  /** Trial number */
  trial: number;

  /** Accuracy */
  accuracy?: number;

  /** Loss */
  loss?: number;

  /** Additional metrics */
  metrics?: Record<string, number>;

  /** Timestamp */
  timestamp: Date;
}

export interface ListTrainingJobsOptions {
  /** Filter by status */
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  /** Page number */
  page?: number;

  /** Page size */
  page_size?: number;
}