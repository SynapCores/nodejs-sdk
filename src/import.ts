/**
 * Data Import Client for SynapCores SDK.
 *
 * v0.2.0: gateway v1.5.0-ce only exposes one-shot multipart uploads at
 *   POST /v1/data/import/csv
 *   POST /v1/data/import/json
 * The legacy /import, /export and job-tracking endpoints no longer exist
 * — for exports, recommend going through `client.executeQuery` with
 * `COPY ... TO STDOUT` style SQL.
 */

import { SynapCores } from './client';
import { ValidationError } from './errors';
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

const NOT_SUPPORTED_MSG =
  'not supported in v1.5.0-ce — use SynapCores.executeQuery with COPY ... or process locally';

export class ImportExportClient {
  constructor(private readonly synapCores: SynapCores) {}

  /**
   * Import data into a table.
   *
   * Routes to /v1/data/import/csv or /v1/data/import/json based on
   * `options.format`. NDJSON falls under the JSON endpoint.
   */
  async import(options: ImportOptions): Promise<ImportResult> {
    const fmt = options.format;
    if (fmt !== 'csv' && fmt !== 'json' && fmt !== 'ndjson') {
      throw new ValidationError(
        `Unsupported import format '${fmt}' — gateway v1.5.0-ce only accepts csv or json`,
      );
    }
    const path = fmt === 'csv' ? '/data/import/csv' : '/data/import/json';

    // form-data is bundled (Node-side); browser FormData is the fallback.
    let FormDataClass: any;
    try {
      FormDataClass = require('form-data');
    } catch {
      FormDataClass = (globalThis as any).FormData;
    }

    const formData = new FormDataClass();
    formData.append('table', options.table);
    if (options.mode) formData.append('mode', options.mode);
    if (options.column_mapping) {
      formData.append('column_mapping', JSON.stringify(options.column_mapping));
    }
    if (options.skip_header !== undefined) {
      formData.append('skip_header', options.skip_header.toString());
    }
    if (options.delimiter) formData.append('delimiter', options.delimiter);
    if (options.batch_size) {
      formData.append('batch_size', options.batch_size.toString());
    }
    if (options.continue_on_error !== undefined) {
      formData.append('continue_on_error', options.continue_on_error.toString());
    }
    if (options.primary_keys) {
      formData.append('primary_keys', JSON.stringify(options.primary_keys));
    }

    if (Buffer.isBuffer(options.data)) {
      // Node form-data accepts a Buffer with a {filename} option.
      formData.append('file', options.data, { filename: `data.${fmt}` });
    } else {
      // string content
      formData.append('file', Buffer.from(String(options.data)), {
        filename: `data.${fmt}`,
      });
    }

    const headers: Record<string, string> = {};
    if (typeof formData.getHeaders === 'function') {
      Object.assign(headers, formData.getHeaders());
    } else {
      headers['Content-Type'] = 'multipart/form-data';
    }

    const { data } = await this.synapCores._getHttpClient().post(path, formData, {
      headers,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    return {
      id: data.id ?? data.job_id ?? '',
      success: data.success ?? true,
      rows_processed: data.rows_processed ?? 0,
      rows_imported: data.rows_imported ?? data.rows_processed ?? 0,
      rows_failed: data.rows_failed ?? 0,
      duration_ms: data.duration_ms ?? data.took_ms ?? 0,
      errors: data.errors ?? [],
      warnings: data.warnings ?? [],
    };
  }

  // ---------------------------------------------------------------------
  // Removed methods: every export route, every job-tracking route, bulk
  // import, validate, template — none of those endpoints exist in the
  // v1.5.0-ce gateway. We keep the shape so old callers get a clear error
  // instead of a silent 404.
  // ---------------------------------------------------------------------

  async export(_options: ExportOptions): Promise<ExportResult> {
    throw new ValidationError(`export() ${NOT_SUPPORTED_MSG}`);
  }

  async getImportStatus(_jobId: string): Promise<ImportJobStatus> {
    throw new ValidationError(`getImportStatus() ${NOT_SUPPORTED_MSG}`);
  }

  async getExportStatus(_jobId: string): Promise<ExportJobStatus> {
    throw new ValidationError(`getExportStatus() ${NOT_SUPPORTED_MSG}`);
  }

  async cancelImport(_jobId: string): Promise<void> {
    throw new ValidationError(`cancelImport() ${NOT_SUPPORTED_MSG}`);
  }

  async cancelExport(_jobId: string): Promise<void> {
    throw new ValidationError(`cancelExport() ${NOT_SUPPORTED_MSG}`);
  }

  async bulkImport(_options: BulkImportOptions): Promise<BulkImportResult> {
    throw new ValidationError(`bulkImport() ${NOT_SUPPORTED_MSG}`);
  }

  async validateData(_options: DataValidationOptions): Promise<DataValidationResult> {
    throw new ValidationError(`validateData() ${NOT_SUPPORTED_MSG}`);
  }

  async getImportTemplate(
    _tableName: string,
    _format: 'csv' | 'json' = 'csv',
  ): Promise<string> {
    throw new ValidationError(`getImportTemplate() ${NOT_SUPPORTED_MSG}`);
  }

  async listJobs(_options: {
    type?: 'import' | 'export';
    status?: string;
    limit?: number;
  } = {}): Promise<Array<ImportJobStatus | ExportJobStatus>> {
    throw new ValidationError(`listJobs() ${NOT_SUPPORTED_MSG}`);
  }

  async downloadExport(_jobId: string): Promise<Buffer> {
    throw new ValidationError(`downloadExport() ${NOT_SUPPORTED_MSG}`);
  }

  async streamImport(
    options: ImportOptions,
    _onProgress?: (progress: ImportJobStatus) => void,
  ): Promise<ImportResult> {
    // The gateway runs imports synchronously, so streaming progress no
    // longer applies. Just delegate to the one-shot import.
    return this.import(options);
  }

  async streamExport(
    _options: ExportOptions,
    _onProgress?: (progress: ExportJobStatus) => void,
  ): Promise<ExportResult> {
    throw new ValidationError(`streamExport() ${NOT_SUPPORTED_MSG}`);
  }
}
