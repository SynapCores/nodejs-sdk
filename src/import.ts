/**
 * Data Import/Export Client for SynapCores SDK
 *
 * Reconciled for gateway v2 (0.6.0): the served surface is a pair of
 * multipart file-upload endpoints — `POST /data/import/csv` and
 * `POST /data/import/json`. The batch job/export/validate/template surface
 * that older SDK builds assumed was never part of the v2 gateway; those
 * methods now throw {@link NotImplementedError} pointing at the supported
 * path.
 */

import { SynapCores } from './client';
import { NotImplementedError } from './errors';
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
   * Import data into a table from a CSV or JSON payload.
   *
   * Gateway (v2): `POST /data/import/{csv|json}` (multipart/form-data). The
   * endpoint is chosen from `options.format`. The file/content is sent under
   * the `file` field; table + parsing hints map to the handler's field names
   * (`table` → `table_name`, `skip_header` → `has_headers`, `primary_keys`
   * → `primary_key`).
   */
  async import(options: ImportOptions): Promise<ImportResult> {
    const format = (options.format || 'csv').toLowerCase();
    if (format !== 'csv' && format !== 'json') {
      throw new NotImplementedError(
        `client.import.import only supports 'csv' and 'json' on gateway v2 ` +
          `(got '${options.format}'). Load other formats via ` +
          'client.executeQuery() INSERT statements.',
      );
    }

    // Dynamic import to support both Node.js and browser environments.
    let FormDataClass: any;
    try {
      FormDataClass = require('form-data');
    } catch {
      FormDataClass = FormData;
    }
    const formData = new FormDataClass();

    // Handler-side field names (see routes/data_import.rs).
    formData.append('table_name', options.table);
    if (options.mode === 'replace') {
      formData.append('drop_existing', 'true');
    }
    if (options.skip_header !== undefined) {
      formData.append('has_headers', options.skip_header.toString());
    }
    if (options.delimiter) formData.append('delimiter', options.delimiter);
    if (options.batch_size) formData.append('batch_size', options.batch_size.toString());
    if (options.primary_keys && options.primary_keys.length > 0) {
      formData.append('primary_key', options.primary_keys[0]);
    }

    // File content is always uploaded under the `file` field.
    if (Buffer.isBuffer(options.data)) {
      formData.append('file', options.data, { filename: `data.${format}` });
    } else {
      // Browser/string content — wrap as a Blob when available.
      if (typeof Blob !== 'undefined') {
        formData.append('file', new Blob([options.data as any]), `data.${format}`);
      } else {
        formData.append('file', Buffer.from(String(options.data)), {
          filename: `data.${format}`,
        });
      }
    }

    const headers: Record<string, string> = {};
    if (typeof formData.getHeaders === 'function') {
      Object.assign(headers, formData.getHeaders());
    } else {
      headers['Content-Type'] = 'multipart/form-data';
    }

    const { data } = await this.synapCores._getHttpClient().post(
      `/data/import/${format}`,
      formData,
      { headers },
    );

    return {
      id: data.id || data.job_id || '',
      success: data.success !== false,
      rows_processed: data.rows_processed ?? data.rows_imported ?? 0,
      rows_imported: data.rows_imported ?? 0,
      rows_failed: data.rows_failed ?? 0,
      duration_ms: data.duration_ms || data.took_ms || 0,
      errors: data.errors || [],
      warnings: data.warnings || [],
    };
  }

  /**
   * Export data from a table or query.
   *
   * @deprecated The gateway v2 surface has no `/export` route. Export via
   * `client.executeQuery('SELECT ...')` and serialize the returned rows
   * client-side.
   */
  async export(_options: ExportOptions): Promise<ExportResult> {
    throw new NotImplementedError(
      'client.import.export is removed — no /export route exists in gateway ' +
        "v2. Run client.executeQuery('SELECT ...') and serialize the rows.",
    );
  }

  /**
   * @deprecated Import is synchronous on gateway v2; there is no job-status
   * route. {@link import} returns the final result directly.
   */
  async getImportStatus(_jobId: string): Promise<ImportJobStatus> {
    throw new NotImplementedError(
      'client.import.getImportStatus is removed — imports are synchronous on ' +
        'gateway v2 and return their result directly from client.import.import().',
    );
  }

  /**
   * @deprecated No `/export` route exists in gateway v2.
   */
  async getExportStatus(_jobId: string): Promise<ExportJobStatus> {
    throw new NotImplementedError(
      'client.import.getExportStatus is removed — no /export route exists in ' +
        'gateway v2.',
    );
  }

  /**
   * @deprecated Imports are synchronous on gateway v2; nothing to cancel.
   */
  async cancelImport(_jobId: string): Promise<void> {
    throw new NotImplementedError(
      'client.import.cancelImport is removed — imports are synchronous on ' +
        'gateway v2 and cannot be cancelled mid-flight.',
    );
  }

  /**
   * @deprecated No `/export` route exists in gateway v2.
   */
  async cancelExport(_jobId: string): Promise<void> {
    throw new NotImplementedError(
      'client.import.cancelExport is removed — no /export route exists in ' +
        'gateway v2.',
    );
  }

  /**
   * @deprecated No bulk/multi-source import route exists in gateway v2. Call
   * {@link import} once per source.
   */
  async bulkImport(_options: BulkImportOptions): Promise<BulkImportResult> {
    throw new NotImplementedError(
      'client.import.bulkImport is removed — no bulk-import route exists in ' +
        'gateway v2. Call client.import.import() once per source instead.',
    );
  }

  /**
   * @deprecated No `/import/validate` route exists in gateway v2. The
   * import endpoints validate on ingest and report row errors in the result.
   */
  async validateData(_options: DataValidationOptions): Promise<DataValidationResult> {
    throw new NotImplementedError(
      'client.import.validateData is removed — no /import/validate route ' +
        'exists in gateway v2. client.import.import() validates on ingest and ' +
        'reports row errors in its result.',
    );
  }

  /**
   * @deprecated No import-template route exists in gateway v2. Derive the
   * column list from `client.schema.getTable(name)`.
   */
  async getImportTemplate(_tableName: string, _format: 'csv' | 'json' = 'csv'): Promise<string> {
    throw new NotImplementedError(
      'client.import.getImportTemplate is removed — no template route exists ' +
        'in gateway v2. Build a header row from ' +
        'client.schema.getTable(name).columns.',
    );
  }

  /**
   * @deprecated Imports are synchronous on gateway v2; there is no job list.
   */
  async listJobs(_options: {
    type?: 'import' | 'export';
    status?: string;
    limit?: number;
  } = {}): Promise<Array<ImportJobStatus | ExportJobStatus>> {
    throw new NotImplementedError(
      'client.import.listJobs is removed — imports are synchronous on gateway ' +
        'v2 and are not tracked as jobs.',
    );
  }

  /**
   * @deprecated No `/export` route exists in gateway v2.
   */
  async downloadExport(_jobId: string): Promise<Buffer> {
    throw new NotImplementedError(
      'client.import.downloadExport is removed — no /export route exists in ' +
        'gateway v2.',
    );
  }

  /**
   * @deprecated Streaming import polling relied on job-status routes that do
   * not exist in gateway v2. Call {@link import} directly — it returns the
   * final result synchronously.
   */
  async streamImport(
    _options: ImportOptions,
    _onProgress?: (progress: ImportJobStatus) => void,
  ): Promise<ImportResult> {
    throw new NotImplementedError(
      'client.import.streamImport is removed — gateway v2 imports are ' +
        'synchronous. Call client.import.import() directly.',
    );
  }

  /**
   * @deprecated No `/export` route exists in gateway v2.
   */
  async streamExport(
    _options: ExportOptions,
    _onProgress?: (progress: ExportJobStatus) => void,
  ): Promise<ExportResult> {
    throw new NotImplementedError(
      'client.import.streamExport is removed — no /export route exists in ' +
        'gateway v2.',
    );
  }
}
