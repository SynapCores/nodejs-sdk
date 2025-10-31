/**
 * Data Import/Export Client for SynapCores SDK
 */

import { SynapCores } from './client';
import {
  ImportOptions,
  ImportResult,
  ExportOptions,
  ExportResult,
  ImportJobStatus,
  ExportJobStatus,
  BulkImportOptions,
  BulkImportResult,
  DataValidationOptions,
  DataValidationResult,
} from './types/import';

export class ImportExportClient {
  constructor(private readonly synapCores: SynapCores) {}

  /**
   * Import data into a table
   */
  async import(options: ImportOptions): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('table', options.table);
    formData.append('format', options.format);

    if (options.mode) formData.append('mode', options.mode);
    if (options.column_mapping) {
      formData.append('column_mapping', JSON.stringify(options.column_mapping));
    }
    if (options.skip_header !== undefined) {
      formData.append('skip_header', options.skip_header.toString());
    }
    if (options.delimiter) formData.append('delimiter', options.delimiter);
    if (options.batch_size) formData.append('batch_size', options.batch_size.toString());
    if (options.continue_on_error !== undefined) {
      formData.append('continue_on_error', options.continue_on_error.toString());
    }
    if (options.primary_keys) {
      formData.append('primary_keys', JSON.stringify(options.primary_keys));
    }

    // Handle data as file or direct content
    if (Buffer.isBuffer(options.data)) {
      formData.append('file', new Blob([options.data]), 'data');
    } else {
      formData.append('data', options.data);
    }

    const { data } = await this.synapCores._getHttpClient().post('/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      id: data.id || data.job_id,
      success: data.success,
      rows_processed: data.rows_processed || 0,
      rows_imported: data.rows_imported || 0,
      rows_failed: data.rows_failed || 0,
      duration_ms: data.duration_ms || data.took_ms || 0,
      errors: data.errors || [],
      warnings: data.warnings || [],
    };
  }

  /**
   * Export data from a table or query
   */
  async export(options: ExportOptions): Promise<ExportResult> {
    const { data } = await this.synapCores._getHttpClient().post('/export', {
      source: options.source,
      format: options.format,
      destination: options.destination || 'response',
      columns: options.columns,
      filter: options.filter,
      order_by: options.order_by,
      limit: options.limit,
      include_header: options.include_header,
      delimiter: options.delimiter,
      compress: options.compress,
    });

    return {
      id: data.id || data.job_id,
      success: data.success,
      rows_exported: data.rows_exported || 0,
      duration_ms: data.duration_ms || data.took_ms || 0,
      file_path: data.file_path,
      data: data.data,
      size_bytes: data.size_bytes,
      download_url: data.download_url,
      expires_at: data.expires_at ? new Date(data.expires_at) : undefined,
    };
  }

  /**
   * Get import job status
   */
  async getImportStatus(jobId: string): Promise<ImportJobStatus> {
    const { data } = await this.synapCores._getHttpClient().get(`/import/${jobId}/status`);

    return {
      id: data.id || jobId,
      status: data.status,
      progress: data.progress || 0,
      phase: data.phase,
      rows_processed: data.rows_processed,
      eta_ms: data.eta_ms || data.estimated_time_remaining_ms,
      error: data.error,
      started_at: data.started_at ? new Date(data.started_at) : undefined,
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
    };
  }

  /**
   * Get export job status
   */
  async getExportStatus(jobId: string): Promise<ExportJobStatus> {
    const { data } = await this.synapCores._getHttpClient().get(`/export/${jobId}/status`);

    return {
      id: data.id || jobId,
      status: data.status,
      progress: data.progress || 0,
      phase: data.phase,
      rows_exported: data.rows_exported,
      eta_ms: data.eta_ms || data.estimated_time_remaining_ms,
      error: data.error,
      started_at: data.started_at ? new Date(data.started_at) : undefined,
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
    };
  }

  /**
   * Cancel an import job
   */
  async cancelImport(jobId: string): Promise<void> {
    await this.synapCores._getHttpClient().post(`/import/${jobId}/cancel`);
  }

  /**
   * Cancel an export job
   */
  async cancelExport(jobId: string): Promise<void> {
    await this.synapCores._getHttpClient().post(`/export/${jobId}/cancel`);
  }

  /**
   * Import data from multiple sources in bulk
   */
  async bulkImport(options: BulkImportOptions): Promise<BulkImportResult> {
    const { data } = await this.synapCores._getHttpClient().post('/import/bulk', {
      jobs: options.jobs,
      parallel: options.parallel || false,
      stop_on_error: options.stop_on_error || false,
    });

    return {
      id: data.id || data.bulk_id,
      success: data.success,
      results: data.results || [],
      total_rows_imported: data.total_rows_imported || 0,
      total_duration_ms: data.total_duration_ms || data.took_ms || 0,
    };
  }

  /**
   * Validate data before import
   */
  async validateData(options: DataValidationOptions): Promise<DataValidationResult> {
    const { data } = await this.synapCores._getHttpClient().post('/import/validate', {
      table: options.table,
      data: options.data,
      mode: options.mode || 'strict',
      check_foreign_keys: options.check_foreign_keys,
      check_unique: options.check_unique,
    });

    return {
      is_valid: data.is_valid || data.valid,
      errors: data.errors || [],
      warnings: data.warnings || [],
      rows_validated: data.rows_validated || options.data.length,
    };
  }

  /**
   * Get import template for a table
   */
  async getImportTemplate(
    tableName: string,
    format: 'csv' | 'json' = 'csv'
  ): Promise<string> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/import/template/${tableName}?format=${format}`
    );

    return data.template || data.content || data;
  }

  /**
   * List import/export jobs
   */
  async listJobs(options: {
    type?: 'import' | 'export';
    status?: string;
    limit?: number;
  } = {}): Promise<Array<ImportJobStatus | ExportJobStatus>> {
    const params = new URLSearchParams();
    if (options.type) params.append('type', options.type);
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit.toString());

    const { data } = await this.synapCores._getHttpClient().get(
      `/import/jobs?${params.toString()}`
    );

    return (data.jobs || data).map((job: any) => ({
      id: job.id,
      status: job.status,
      progress: job.progress || 0,
      phase: job.phase,
      rows_processed: job.rows_processed,
      rows_exported: job.rows_exported,
      eta_ms: job.eta_ms,
      error: job.error,
      started_at: job.started_at ? new Date(job.started_at) : undefined,
      completed_at: job.completed_at ? new Date(job.completed_at) : undefined,
    }));
  }

  /**
   * Download exported data
   */
  async downloadExport(jobId: string): Promise<Buffer> {
    const { data } = await this.synapCores._getHttpClient().get(`/export/${jobId}/download`, {
      responseType: 'arraybuffer',
    });

    return Buffer.from(data);
  }

  /**
   * Stream import data (for large files)
   */
  async streamImport(
    options: ImportOptions,
    onProgress?: (progress: ImportJobStatus) => void
  ): Promise<ImportResult> {
    // Start the import
    const result = await this.import(options);
    const jobId = result.id;

    // Poll for status if progress callback provided
    if (onProgress) {
      const pollInterval = setInterval(async () => {
        try {
          const status = await this.getImportStatus(jobId);
          onProgress(status);

          if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
            clearInterval(pollInterval);
          }
        } catch (error) {
          clearInterval(pollInterval);
        }
      }, 1000);
    }

    return result;
  }

  /**
   * Stream export data (for large datasets)
   */
  async streamExport(
    options: ExportOptions,
    onProgress?: (progress: ExportJobStatus) => void
  ): Promise<ExportResult> {
    // Start the export
    const result = await this.export(options);
    const jobId = result.id;

    // Poll for status if progress callback provided
    if (onProgress) {
      const pollInterval = setInterval(async () => {
        try {
          const status = await this.getExportStatus(jobId);
          onProgress(status);

          if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
            clearInterval(pollInterval);
          }
        } catch (error) {
          clearInterval(pollInterval);
        }
      }, 1000);
    }

    return result;
  }
}
