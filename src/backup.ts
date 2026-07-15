/**
 * Backup/Restore Client for SynapCores SDK
 *
 * Reconciled for gateway v2 (0.6.0). The served surface (routes/backup_v2.rs,
 * nested at `/backup`) is:
 *   POST   /backup/backups              create
 *   GET    /backup/backups              list
 *   GET    /backup/backups/:id          get
 *   DELETE /backup/backups/:id          delete
 *   GET    /backup/backups/:id/download download
 *   POST   /backup/restore              restore
 *   GET    /backup/restore/:id/status   restore status
 *   GET    /backup/schedules            list schedules
 *   POST   /backup/schedules            create schedule
 *   GET    /backup/schedules/:id        get schedule
 *   DELETE /backup/schedules/:id        delete schedule
 *
 * Cancel / verify / metrics / schedule-update / schedule-activate are not
 * part of the v2 surface and now throw {@link NotImplementedError}.
 */

import { SynapCores } from './client';
import { NotImplementedError } from './errors';
import {
  BackupOptions,
  Backup,
  RestoreOptions,
  RestoreResult,
  BackupStatus,
  RestoreStatus,
  ListBackupsOptions,
  BackupSchedule,
  CreateScheduleOptions,
  BackupVerificationResult,
  BackupMetrics,
} from './types/backup';

export class BackupClient {
  constructor(private readonly synapCores: SynapCores) {}

  /**
   * Create a new backup. Gateway (v2): `POST /backup/backups`.
   */
  async create(options: BackupOptions = {}): Promise<Backup> {
    const body: Record<string, unknown> = {
      name: options.name || `backup_${Date.now()}`,
      description: options.description,
      // v2 enum: "full" | "incremental"
      backup_type: (options.type || 'full').toLowerCase(),
      // v2 renamed `tables` → `collections`; omit (null) means all.
      collections: options.tables,
      encryption: options.encrypt || false,
    };
    // `compression` is an enum (none|gzip|zstd|lz4) in v2, not a level int —
    // only forward it when the caller passed a matching string.
    if (typeof (options as any).compression === 'string') {
      body.compression = (options as any).compression;
    }

    const { data } = await this.synapCores._getHttpClient().post('/backup/backups', body);
    return this.mapBackup(data);
  }

  /**
   * List backups. Gateway (v2): `GET /backup/backups`.
   */
  async list(options: ListBackupsOptions = {}): Promise<Backup[]> {
    const params = new URLSearchParams();
    if (options.type) params.append('type', options.type);
    if (options.status) params.append('status', options.status);
    if (options.page) params.append('page', options.page.toString());
    if (options.page_size) params.append('page_size', options.page_size.toString());

    const qs = params.toString();
    const { data } = await this.synapCores._getHttpClient().get(
      `/backup/backups${qs ? `?${qs}` : ''}`,
    );

    return (data.backups || data || []).map((backup: any) => this.mapBackup(backup));
  }

  /**
   * Get a specific backup by ID. Gateway (v2): `GET /backup/backups/:id`.
   */
  async get(id: string): Promise<Backup> {
    const { data } = await this.synapCores._getHttpClient().get(`/backup/backups/${id}`);
    return this.mapBackup(data);
  }

  /**
   * Delete a backup. Gateway (v2): `DELETE /backup/backups/:id`.
   */
  async delete(id: string): Promise<void> {
    await this.synapCores._getHttpClient().delete(`/backup/backups/${id}`);
  }

  /**
   * Restore from a backup. Gateway (v2): `POST /backup/restore`.
   */
  async restore(options: RestoreOptions): Promise<RestoreResult> {
    const { data } = await this.synapCores._getHttpClient().post('/backup/restore', {
      backup_id: options.backup_id,
      collections: options.tables,
      overwrite: options.overwrite || false,
      target_prefix: options.target_database,
    });

    return {
      id: data.restore_id || data.id,
      success: data.success ?? (data.status !== 'failed'),
      tables_restored: data.collections_restored || data.tables_restored || [],
      rows_restored: data.rows_restored || 0,
      duration_ms: data.duration_ms || data.took_ms || 0,
      error: data.error || data.error_message,
      warnings: data.warnings || [],
    };
  }

  /**
   * Get backup status. Gateway (v2) has no dedicated status route — the
   * backup record from `GET /backup/backups/:id` already carries `status`.
   */
  async getBackupStatus(backupId: string): Promise<BackupStatus> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/backup/backups/${backupId}`,
    );

    return {
      id: data.id || backupId,
      status: data.status,
      progress: data.progress || 0,
      phase: data.phase,
      tables_processed: data.tables_processed,
      total_tables: Array.isArray(data.collections) ? data.collections.length : data.total_tables,
      bytes_processed: data.size_bytes ?? data.bytes_processed,
      eta_ms: data.eta_ms,
      error: data.error || data.error_message,
      started_at: data.created_at ? new Date(data.created_at) : undefined,
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
    };
  }

  /**
   * Get restore status. Gateway (v2): `GET /backup/restore/:id/status`.
   */
  async getRestoreStatus(restoreId: string): Promise<RestoreStatus> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/backup/restore/${restoreId}/status`,
    );

    return {
      id: data.restore_id || data.id || restoreId,
      status: data.status,
      progress: data.progress || 0,
      phase: data.phase,
      tables_processed: data.tables_processed,
      total_tables: data.total_tables,
      rows_processed: data.rows_processed,
      eta_ms: data.eta_ms,
      error: data.error || data.error_message,
      started_at: data.started_at ? new Date(data.started_at) : undefined,
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
    };
  }

  /**
   * Download a backup file. Gateway (v2): `GET /backup/backups/:id/download`.
   */
  async download(backupId: string): Promise<Buffer> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/backup/backups/${backupId}/download`,
      { responseType: 'arraybuffer' },
    );
    return Buffer.from(data);
  }

  /**
   * Create a backup schedule. Gateway (v2): `POST /backup/schedules`.
   */
  async createSchedule(options: CreateScheduleOptions): Promise<BackupSchedule> {
    const bo: any = options.backup_options || {};
    const { data } = await this.synapCores._getHttpClient().post('/backup/schedules', {
      name: options.name,
      enabled: options.activate !== false,
      schedule: {
        expression: options.cron,
        timezone: (options as any).timezone || 'UTC',
      },
      backup_config: {
        backup_type: (bo.type || 'full').toLowerCase(),
        collections: bo.tables,
        compression: typeof bo.compression === 'string' ? bo.compression : 'zstd',
        encryption: bo.encrypt || false,
        retention_days: (options as any).retention_days || 30,
      },
    });

    return this.mapSchedule(data);
  }

  /**
   * List backup schedules. Gateway (v2): `GET /backup/schedules`.
   */
  async listSchedules(): Promise<BackupSchedule[]> {
    const { data } = await this.synapCores._getHttpClient().get('/backup/schedules');
    return (data.schedules || data || []).map((s: any) => this.mapSchedule(s));
  }

  /**
   * Get a specific schedule. Gateway (v2): `GET /backup/schedules/:id`.
   */
  async getSchedule(scheduleId: string): Promise<BackupSchedule> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/backup/schedules/${scheduleId}`,
    );
    return this.mapSchedule(data);
  }

  /**
   * Delete a backup schedule. Gateway (v2): `DELETE /backup/schedules/:id`.
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    await this.synapCores._getHttpClient().delete(`/backup/schedules/${scheduleId}`);
  }

  // ------------------------------------------------------------------
  // Removed in gateway v2 — no equivalent route.
  // ------------------------------------------------------------------

  /**
   * @deprecated No schedule-update route in gateway v2. Delete and recreate
   * the schedule via {@link deleteSchedule} + {@link createSchedule}.
   */
  async updateSchedule(
    _scheduleId: string,
    _updates: Partial<CreateScheduleOptions>,
  ): Promise<BackupSchedule> {
    throw new NotImplementedError(
      'client.backup.updateSchedule is removed — gateway v2 has no schedule ' +
        'update route. Delete and recreate via deleteSchedule() + createSchedule().',
    );
  }

  /** @deprecated No schedule-activate route in gateway v2. */
  async activateSchedule(_scheduleId: string): Promise<BackupSchedule> {
    throw new NotImplementedError(
      'client.backup.activateSchedule is removed — gateway v2 has no ' +
        'activate route. Recreate the schedule with enabled=true.',
    );
  }

  /** @deprecated No schedule-deactivate route in gateway v2. */
  async deactivateSchedule(_scheduleId: string): Promise<BackupSchedule> {
    throw new NotImplementedError(
      'client.backup.deactivateSchedule is removed — gateway v2 has no ' +
        'deactivate route. Delete the schedule via deleteSchedule().',
    );
  }

  /** @deprecated No backup-cancel route in gateway v2. */
  async cancelBackup(_backupId: string): Promise<void> {
    throw new NotImplementedError(
      'client.backup.cancelBackup is removed — gateway v2 has no cancel route.',
    );
  }

  /** @deprecated No restore-cancel route in gateway v2. */
  async cancelRestore(_restoreId: string): Promise<void> {
    throw new NotImplementedError(
      'client.backup.cancelRestore is removed — gateway v2 has no cancel route.',
    );
  }

  /** @deprecated No backup-verify route in gateway v2. */
  async verify(_backupId: string): Promise<BackupVerificationResult> {
    throw new NotImplementedError(
      'client.backup.verify is removed — gateway v2 has no verify route.',
    );
  }

  /** @deprecated No backup-metrics route in gateway v2. */
  async getMetrics(): Promise<BackupMetrics> {
    throw new NotImplementedError(
      'client.backup.getMetrics is removed — gateway v2 has no metrics route. ' +
        'Aggregate client.backup.list() client-side instead.',
    );
  }

  // ------------------------------------------------------------------
  // Mappers
  // ------------------------------------------------------------------

  private mapBackup(data: any): Backup {
    const collections: string[] = Array.isArray(data.collections) ? data.collections : [];
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.backup_type || data.type,
      status: data.status,
      size_bytes: data.size_bytes,
      compressed_size_bytes: data.compressed_size_bytes,
      table_count: data.table_count ?? collections.length,
      created_at: data.created_at ? new Date(data.created_at) : new Date(),
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
      duration_ms: data.duration_ms || data.took_ms,
      storage: data.storage,
      storage_path: data.storage_path,
      encrypted: data.encrypted ?? data.encryption ?? false,
      tags: data.tags || [],
      parent_backup_id: data.parent_backup_id,
      error: data.error || data.error_message,
    } as Backup;
  }

  private mapSchedule(data: any): BackupSchedule {
    return {
      id: data.id,
      name: data.name,
      cron: data.schedule?.expression ?? data.cron,
      backup_options: data.backup_config ?? data.backup_options,
      active: data.enabled ?? data.active,
      last_run_at: data.last_run ? new Date(data.last_run) : undefined,
      next_run_at: data.next_run ? new Date(data.next_run) : undefined,
      created_at: data.created_at ? new Date(data.created_at) : new Date(),
      tags: data.tags || [],
    } as BackupSchedule;
  }
}
