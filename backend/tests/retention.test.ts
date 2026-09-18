import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../src/index';
import { JwtService } from '../src/services/jwt-service';
import { Env } from '../src/types/env';
import {
  getRetentionConfig,
  getRetentionStatus,
  runRetentionCleanup
} from '../src/services/retention-service';

interface MockBienBan {
  id: string;
  ma_van_don: string;
  drive_file_id: string | null;
  trang_thai: string;
  thoi_gian_tao: string;
}

interface MockCauHinh {
  khoa: string;
  gia_tri: string;
}

function createMockEnv(initialConfigs: MockCauHinh[] = [], initialBienBans: MockBienBan[] = []) {
  const configs = [...initialConfigs];
  const bienBans = [...initialBienBans];
  const uploadLogs: Array<{ bien_ban_id: string; hanh_dong: string; chi_tiet: string }> = [];

  const mockDb = {
    prepare(sql: string) {
      const normalizedSql = sql.trim().replace(/\s+/g, ' ');

      return {
        bind(...params: (string | number)[]) {
          return {
            async first<T = unknown>(): Promise<T | null> {
              // Read single config
              if (normalizedSql.includes('SELECT gia_tri FROM cau_hinh WHERE khoa = ?')) {
                const khoa = String(params[0]);
                const found = configs.find(c => c.khoa === khoa);
                return (found ? { gia_tri: found.gia_tri } : null) as T;
              }

              // Pending archive count
              if (normalizedSql.includes("WHERE trang_thai = 'da_upload'") && normalizedSql.includes('COUNT(*) as cnt')) {
                const days = Number(params[0]);
                const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
                const count = bienBans.filter(b => b.trang_thai === 'da_upload' && b.thoi_gian_tao <= cutoff).length;
                return { cnt: count } as T;
              }

              // Pending delete count
              if (normalizedSql.includes("WHERE trang_thai IN ('da_upload', 'da_luu_tru')") && normalizedSql.includes('COUNT(*) as cnt')) {
                const days = Number(params[0]);
                const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
                const count = bienBans.filter(
                  b => (b.trang_thai === 'da_upload' || b.trang_thai === 'da_luu_tru') && b.thoi_gian_tao <= cutoff
                ).length;
                return { cnt: count } as T;
              }

              // Total archived count
              if (normalizedSql.includes("WHERE trang_thai = 'da_luu_tru'") && normalizedSql.includes('COUNT(*) as cnt')) {
                const count = bienBans.filter(b => b.trang_thai === 'da_luu_tru').length;
                return { cnt: count } as T;
              }

              // Total deleted count
              if (normalizedSql.includes("WHERE trang_thai = 'da_xoa'") && normalizedSql.includes('COUNT(*) as cnt')) {
                const count = bienBans.filter(b => b.trang_thai === 'da_xoa').length;
                return { cnt: count } as T;
              }

              return null;
            },

            async all<T = unknown>(): Promise<{ results: T[] }> {
              // getRetentionConfig query
              if (normalizedSql.includes("SELECT khoa, gia_tri FROM cau_hinh WHERE khoa IN ('retention_archive_days'")) {
                const targetKeys = ['retention_archive_days', 'retention_delete_days', 'retention_thang'];
                const matched = configs.filter(c => targetKeys.includes(c.khoa));
                return { results: matched as T[] };
              }

              // Query candidates to delete
              if (normalizedSql.includes("WHERE trang_thai IN ('da_upload', 'da_luu_tru')") && normalizedSql.includes('ORDER BY thoi_gian_tao ASC')) {
                const days = Number(params[0]);
                const limit = Number(params[1]) || 50;
                const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
                const matched = bienBans
                  .filter(b => (b.trang_thai === 'da_upload' || b.trang_thai === 'da_luu_tru') && b.thoi_gian_tao <= cutoff)
                  .slice(0, limit);
                return { results: matched as T[] };
              }

              // Query candidates to archive
              if (normalizedSql.includes("WHERE trang_thai = 'da_upload'") && normalizedSql.includes('ORDER BY thoi_gian_tao ASC')) {
                const days = Number(params[0]);
                const limit = Number(params[1]) || 50;
                const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
                const matched = bienBans
                  .filter(b => b.trang_thai === 'da_upload' && b.thoi_gian_tao <= cutoff)
                  .slice(0, limit);
                return { results: matched as T[] };
              }

              return { results: [] };
            },

            async run() {
              // Update bien_ban to da_xoa
              if (normalizedSql.includes("SET trang_thai = 'da_xoa'")) {
                const id = String(params[0]);
                const item = bienBans.find(b => b.id === id);
                if (item) {
                  item.trang_thai = 'da_xoa';
                  item.drive_file_id = null;
                }
                return { meta: { changes: 1 } };
              }

              // Update bien_ban to da_luu_tru
              if (normalizedSql.includes("SET trang_thai = 'da_luu_tru'")) {
                const id = String(params[0]);
                const item = bienBans.find(b => b.id === id);
                if (item) {
                  item.trang_thai = 'da_luu_tru';
                }
                return { meta: { changes: 1 } };
              }

              // Log
              if (normalizedSql.includes('INSERT INTO upload_log')) {
                uploadLogs.push({
                  bien_ban_id: String(params[0]),
                  hanh_dong: String(params[1]),
                  chi_tiet: String(params[2])
                });
                return { meta: { changes: 1 } };
              }

              return { meta: { changes: 0 } };
            }
          };
        },

        async first<T = unknown>(): Promise<T | null> {
          if (normalizedSql.includes("WHERE trang_thai = 'da_luu_tru'") && normalizedSql.includes('COUNT(*) as cnt')) {
            const count = bienBans.filter(b => b.trang_thai === 'da_luu_tru').length;
            return { cnt: count } as T;
          }
          if (normalizedSql.includes("WHERE trang_thai = 'da_xoa'") && normalizedSql.includes('COUNT(*) as cnt')) {
            const count = bienBans.filter(b => b.trang_thai === 'da_xoa').length;
            return { cnt: count } as T;
          }
          if (normalizedSql.includes("WHERE khoa = 'retention_last_run'")) {
            const found = configs.find(c => c.khoa === 'retention_last_run');
            return (found ? { gia_tri: found.gia_tri } : null) as T;
          }
          if (normalizedSql.includes("WHERE khoa = 'retention_thang'")) {
            const found = configs.find(c => c.khoa === 'retention_thang');
            return (found ? { gia_tri: found.gia_tri } : null) as T;
          }
          return null;
        },

        async all<T = unknown>(): Promise<{ results: T[] }> {
          if (normalizedSql.includes("SELECT khoa, gia_tri FROM cau_hinh WHERE khoa IN ('retention_archive_days'")) {
            const targetKeys = ['retention_archive_days', 'retention_delete_days', 'retention_thang'];
            const matched = configs.filter(c => targetKeys.includes(c.khoa));
            return { results: matched as T[] };
          }
          return { results: [] };
        },

        async run() {
          // Update retention_last_run
          if (normalizedSql.includes('retention_last_run')) {
            const idx = configs.findIndex(c => c.khoa === 'retention_last_run');
            const now = new Date().toISOString();
            if (idx >= 0) {
              configs[idx].gia_tri = now;
            } else {
              configs.push({ khoa: 'retention_last_run', gia_tri: now });
            }
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }
      };
    }
  };

  const env = {
    DB: mockDb as unknown as D1Database,
    JWT_SECRET: 'test-secret-at-least-32-characters-long-key',
    ALLOWED_ORIGINS: '*',
    UPLOAD_CHUNK_SIZE: '5242880',
    JWT_EXPIRES_IN: '86400'
  } as Env;

  return { env, configs, bienBans, uploadLogs };
}

describe('Data Retention & Video Lifecycle Policy', () => {
  it('should use default values: Archive = 30 days, Delete = 60 days', async () => {
    const { env } = createMockEnv([]);
    const config = await getRetentionConfig(env.DB);
    expect(config.archiveDays).toBe(30);
    expect(config.deleteDays).toBe(60);
  });

  it('should fallback from deprecated retention_thang when new keys are missing', async () => {
    const { env } = createMockEnv([
      { khoa: 'retention_thang', gia_tri: '3' }
    ]);
    const config = await getRetentionConfig(env.DB);
    expect(config.archiveDays).toBe(90); // 3 * 30
    expect(config.deleteDays).toBe(120); // 90 + 30
  });

  it('should prioritize retention_archive_days and retention_delete_days over retention_thang', async () => {
    const { env } = createMockEnv([
      { khoa: 'retention_thang', gia_tri: '6' },
      { khoa: 'retention_archive_days', gia_tri: '15' },
      { khoa: 'retention_delete_days', gia_tri: '45' }
    ]);
    const config = await getRetentionConfig(env.DB);
    expect(config.archiveDays).toBe(15);
    expect(config.deleteDays).toBe(45);
  });

  it('should report correct retention status', async () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const initialBienBans: MockBienBan[] = [
      { id: '1', ma_van_don: 'VN01', drive_file_id: 'f1', trang_thai: 'da_upload', thoi_gian_tao: new Date(now - 10 * day).toISOString() }, // < 30 days
      { id: '2', ma_van_don: 'VN02', drive_file_id: 'f2', trang_thai: 'da_upload', thoi_gian_tao: new Date(now - 35 * day).toISOString() }, // 35 days -> pending archive
      { id: '3', ma_van_don: 'VN03', drive_file_id: 'f3', trang_thai: 'da_luu_tru', thoi_gian_tao: new Date(now - 40 * day).toISOString() }, // already archived
      { id: '4', ma_van_don: 'VN04', drive_file_id: 'f4', trang_thai: 'da_upload', thoi_gian_tao: new Date(now - 70 * day).toISOString() }, // 70 days -> pending delete
      { id: '5', ma_van_don: 'VN05', drive_file_id: null, trang_thai: 'da_xoa', thoi_gian_tao: new Date(now - 100 * day).toISOString() }     // already deleted
    ];

    const { env } = createMockEnv([], initialBienBans);
    const status = await getRetentionStatus(env);

    expect(status.retention_archive_days).toBe(30);
    expect(status.retention_delete_days).toBe(60);
    expect(status.pending_archive_count).toBe(2); // VN02 (35 days), VN04 (70 days)
    expect(status.pending_delete_count).toBe(1);  // VN04 (70 days)
    expect(status.total_archived).toBe(1);        // VN03
    expect(status.total_deleted).toBe(1);         // VN05
  });

  it('should execute 2-phase cleanup: delete > 60 days, archive > 30 days, keep Drive file on archive', async () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const initialBienBans: MockBienBan[] = [
      { id: 'recent', ma_van_don: 'VN_RECENT', drive_file_id: 'file_recent', trang_thai: 'da_upload', thoi_gian_tao: new Date(now - 5 * day).toISOString() },
      { id: 'archive_me', ma_van_don: 'VN_ARCHIVE', drive_file_id: 'file_archive', trang_thai: 'da_upload', thoi_gian_tao: new Date(now - 35 * day).toISOString() },
      { id: 'delete_me', ma_van_don: 'VN_DELETE', drive_file_id: 'file_delete', trang_thai: 'da_luu_tru', thoi_gian_tao: new Date(now - 65 * day).toISOString() }
    ];

    const { env, bienBans, uploadLogs, configs } = createMockEnv([], initialBienBans);

    const result = await runRetentionCleanup(env);

    expect(result.deleted_count).toBe(1);
    expect(result.archived_count).toBe(1);
    expect(result.errors.length).toBe(0);

    // Recent item: untouched
    const recent = bienBans.find(b => b.id === 'recent');
    expect(recent?.trang_thai).toBe('da_upload');
    expect(recent?.drive_file_id).toBe('file_recent');

    // Archive item: status becomes da_luu_tru, file remains on Drive
    const archived = bienBans.find(b => b.id === 'archive_me');
    expect(archived?.trang_thai).toBe('da_luu_tru');
    expect(archived?.drive_file_id).toBe('file_archive');

    // Delete item: status becomes da_xoa, drive_file_id cleared
    const deleted = bienBans.find(b => b.id === 'delete_me');
    expect(deleted?.trang_thai).toBe('da_xoa');
    expect(deleted?.drive_file_id).toBeNull();

    // Verify last run config was updated
    const lastRun = configs.find(c => c.khoa === 'retention_last_run');
    expect(lastRun).toBeDefined();
    expect(lastRun?.gia_tri).toBeTruthy();

    // Verify logs
    expect(uploadLogs.some(l => l.bien_ban_id === 'archive_me' && l.chi_tiet.includes('da_luu_tru'))).toBe(true);
    expect(uploadLogs.some(l => l.bien_ban_id === 'delete_me' && l.chi_tiet.includes('da_xoa'))).toBe(true);
  });
});
