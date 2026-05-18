/**
 * Backup/Restore Client for SynapCores SDK
 */

import { SynapCores } from './client';
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
} from './types/backup';

export class BackupClient {
  constructor(private readonly synapCores: SynapCores) {}

  /**
   * Create a new backup
   */
  async create(options: BackupOptions = {}): Promise<Backup> {
    const { data } = await this.synapCores._getHttpClient().post('/backups', {
      name: options.name,
      description: options.description,
      type: options.type || 'full',
      tables: options.tables,
      include_indexes: options.include_indexes !== false,
      include_procedures: options.include_procedures !== false,
      compression: options.compression || 6,
      encrypt: options.encrypt || false,
      encryption_key: options.encryption_key,
      storage: options.storage || 'local',
      storage_config: options.storage_config,
      tags: options.tags || [],
    });

    return this.mapBackup(data);
  }

  /**
   * List backups with optional filters
   */
  async list(options: ListBackupsOptions = {}): Promise<Backup[]> {
    const params = new URLSearchParams();

    if (options.type) params.append('type', options.type);
    if (options.status) params.append('status', options.status);
    if (options.sort) params.append('sort', options.sort);
    if (options.order) params.append('order', options.order);
    if (options.page) params.append('page', options.page.toString());
    if (options.page_size) params.append('page_size', options.page_size.toString());
    if (options.tags && options.tags.length > 0) {
      params.append('tags', options.tags.join(','));
    }

    const { data } = await this.synapCores._getHttpClient().get(
      `/backups?${params.toString()}`
    );

    return (data.backups || data).map((backup: any) => this.mapBackup(backup));
  }

  /**
   * Get a specific backup by ID
   */
  async get(id: string): Promise<Backup> {
    const { data } = await this.synapCores._getHttpClient().get(`/backups/${id}`);
    return this.mapBackup(data);
  }

  /**
   * Delete a backup
   */
  async delete(id: string): Promise<void> {
    await this.synapCores._getHttpClient().delete(`/backups/${id}`);
  }

  /**
   * Restore from a backup
   */
  async restore(options: RestoreOptions): Promise<RestoreResult> {
    const { data } = await this.synapCores._getHttpClient().post('/backups/restore', {
      backup_id: options.backup_id,
      mode: options.mode || 'full',
      tables: options.tables,
      target_database: options.target_database,
      overwrite: options.overwrite || false,
      skip_indexes: options.skip_indexes || false,
      skip_procedures: options.skip_procedures || false,
      decryption_key: options.decryption_key,
      point_in_time: options.point_in_time?.toISOString(),
      dry_run: options.dry_run || false,
    });

    return {
      id: data.id || data.restore_id,
      success: data.success,
      tables_restored: data.tables_restored || [],
      rows_restored: data.rows_restored || 0,
      duration_ms: data.duration_ms || data.took_ms || 0,
      error: data.error,
      warnings: data.warnings || [],
    };
  }

  /**
   * Get backup status
   */
  async getBackupStatus(backupId: string): Promise<BackupStatus> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/backups/${backupId}/status`
    );

    return {
      id: data.id || backupId,
      status: data.status,
      progress: data.progress || 0,
      phase: data.phase,
      tables_processed: data.tables_processed,
      total_tables: data.total_tables,
      bytes_processed: data.bytes_processed,
      eta_ms: data.eta_ms || data.estimated_time_remaining_ms,
      error: data.error,
      started_at: data.started_at ? new Date(data.started_at) : undefined,
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
    };
  }

  /**
   * Get restore status
   */
  async getRestoreStatus(restoreId: string): Promise<RestoreStatus> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/backups/restore/${restoreId}/status`
    );

    return {
      id: data.id || restoreId,
      status: data.status,
      progress: data.progress || 0,
      phase: data.phase,
      tables_processed: data.tables_processed,
      total_tables: data.total_tables,
      rows_processed: data.rows_processed,
      eta_ms: data.eta_ms || data.estimated_time_remaining_ms,
      error: data.error,
      started_at: data.started_at ? new Date(data.started_at) : undefined,
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
    };
  }

  // cancelBackup() / cancelRestore() removed — gateway v1.5.0-ce has no
  // /backups/:id/cancel or /backups/restore/:id/cancel routes. Use
  // delete() to clean up an aborted backup record.

  /**
   * Download a backup file
   */
  async download(backupId: string): Promise<Buffer> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/backups/${backupId}/download`,
      {
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(data);
  }

  /**
   * Verify backup integrity
   */
  async verify(backupId: string): Promise<BackupVerificationResult> {
    const { data } = await this.synapCores._getHttpClient().post(
      `/backups/${backupId}/verify`
    );

    return {
      is_valid: data.is_valid || data.valid,
      integrity_ok: data.integrity_ok || data.integrity,
      checksum_match: data.checksum_match,
      tables_verified: data.tables_verified || 0,
      errors: data.errors || [],
      warnings: data.warnings || [],
      verified_at: data.verified_at ? new Date(data.verified_at) : new Date(),
    };
  }

  /**
   * Create a backup schedule
   */
  async createSchedule(options: CreateScheduleOptions): Promise<BackupSchedule> {
    const { data } = await this.synapCores._getHttpClient().post('/backups/schedules', {
      name: options.name,
      cron: options.cron,
      backup_options: options.backup_options,
      activate: options.activate !== false,
      tags: options.tags || [],
    });

    return {
      id: data.id,
      name: data.name,
      cron: data.cron,
      backup_options: data.backup_options,
      active: data.active,
      last_run_at: data.last_run_at ? new Date(data.last_run_at) : undefined,
      next_run_at: data.next_run_at ? new Date(data.next_run_at) : undefined,
      created_at: new Date(data.created_at),
      tags: data.tags || [],
    };
  }

  /**
   * List backup schedules
   */
  async listSchedules(): Promise<BackupSchedule[]> {
    const { data } = await this.synapCores._getHttpClient().get('/backups/schedules');

    return (data.schedules || data).map((schedule: any) => ({
      id: schedule.id,
      name: schedule.name,
      cron: schedule.cron,
      backup_options: schedule.backup_options,
      active: schedule.active,
      last_run_at: schedule.last_run_at ? new Date(schedule.last_run_at) : undefined,
      next_run_at: schedule.next_run_at ? new Date(schedule.next_run_at) : undefined,
      created_at: new Date(schedule.created_at),
      tags: schedule.tags || [],
    }));
  }

  /**
   * Get a specific schedule
   */
  async getSchedule(scheduleId: string): Promise<BackupSchedule> {
    const { data } = await this.synapCores._getHttpClient().get(
      `/backups/schedules/${scheduleId}`
    );

    return {
      id: data.id,
      name: data.name,
      cron: data.cron,
      backup_options: data.backup_options,
      active: data.active,
      last_run_at: data.last_run_at ? new Date(data.last_run_at) : undefined,
      next_run_at: data.next_run_at ? new Date(data.next_run_at) : undefined,
      created_at: new Date(data.created_at),
      tags: data.tags || [],
    };
  }

  /**
   * Update a backup schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<CreateScheduleOptions>
  ): Promise<BackupSchedule> {
    const { data } = await this.synapCores._getHttpClient().put(
      `/backups/schedules/${scheduleId}`,
      updates
    );

    return {
      id: data.id,
      name: data.name,
      cron: data.cron,
      backup_options: data.backup_options,
      active: data.active,
      last_run_at: data.last_run_at ? new Date(data.last_run_at) : undefined,
      next_run_at: data.next_run_at ? new Date(data.next_run_at) : undefined,
      created_at: new Date(data.created_at),
      tags: data.tags || [],
    };
  }

  /**
   * Delete a backup schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    await this.synapCores._getHttpClient().delete(`/backups/schedules/${scheduleId}`);
  }

  /**
   * Activate a schedule
   */
  async activateSchedule(scheduleId: string): Promise<BackupSchedule> {
    const { data } = await this.synapCores._getHttpClient().post(
      `/backups/schedules/${scheduleId}/activate`
    );

    return {
      id: data.id,
      name: data.name,
      cron: data.cron,
      backup_options: data.backup_options,
      active: data.active,
      last_run_at: data.last_run_at ? new Date(data.last_run_at) : undefined,
      next_run_at: data.next_run_at ? new Date(data.next_run_at) : undefined,
      created_at: new Date(data.created_at),
      tags: data.tags || [],
    };
  }

  /**
   * Deactivate a schedule
   */
  async deactivateSchedule(scheduleId: string): Promise<BackupSchedule> {
    const { data } = await this.synapCores._getHttpClient().post(
      `/backups/schedules/${scheduleId}/deactivate`
    );

    return {
      id: data.id,
      name: data.name,
      cron: data.cron,
      backup_options: data.backup_options,
      active: data.active,
      last_run_at: data.last_run_at ? new Date(data.last_run_at) : undefined,
      next_run_at: data.next_run_at ? new Date(data.next_run_at) : undefined,
      created_at: new Date(data.created_at),
      tags: data.tags || [],
    };
  }

  // getMetrics() removed — gateway v1.5.0-ce has no /backups/metrics route.
  // Aggregate metrics can be derived client-side from list().

  /**
   * Map raw backup data to Backup type
   */
  private mapBackup(data: any): Backup {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type,
      status: data.status,
      size_bytes: data.size_bytes,
      compressed_size_bytes: data.compressed_size_bytes,
      table_count: data.table_count,
      created_at: new Date(data.created_at),
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
      duration_ms: data.duration_ms || data.took_ms,
      storage: data.storage,
      storage_path: data.storage_path,
      encrypted: data.encrypted || false,
      tags: data.tags || [],
      parent_backup_id: data.parent_backup_id,
      error: data.error,
    };
  }
}
