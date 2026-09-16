import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Sprint 0 — Codebase Audit', () => {
  // === Rule 01: No Emoji Icons ===
  describe('Rule 01: No Emoji/Unicode Icons in Code', () => {
    const emojiPattern = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    function scanDir(dir: string, exts: string[]): string[] {
      const violations: string[] = [];
      if (!fs.existsSync(dir)) return violations;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
          violations.push(...scanDir(fullPath, exts));
        } else if (entry.isFile() && exts.some((e) => entry.name.endsWith(e))) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (emojiPattern.test(lines[i])) {
              violations.push(`${path.relative(ROOT, fullPath)}:${i + 1} → ${lines[i].trim().substring(0, 80)}`);
            }
          }
        }
      }
      return violations;
    }

    it('frontend src/ should have no emoji icons', () => {
      const srcDir = path.join(ROOT, 'frontend', 'src');
      const violations = scanDir(srcDir, ['.tsx', '.ts', '.css']);
      expect(violations).toEqual([]);
    });
  });

  // === Project Structure ===
  describe('Project Structure', () => {
    it('frontend should have all required directories', () => {
      const dirs = [
        'frontend/src/config',
        'frontend/src/types',
        'frontend/src/stores',
        'frontend/src/services',
        'frontend/src/components/ui',
        'frontend/src/components/layout',
        'frontend/src/pages',
        'frontend/src/styles',
        'frontend/src/utils'
      ];
      for (const dir of dirs) {
        expect(fs.existsSync(path.join(ROOT, dir)), `Missing: ${dir}`).toBe(true);
      }
    });

    it('backend should have all required directories', () => {
      const dirs = [
        'backend/src/middleware',
        'backend/src/routes',
        'backend/src/services',
        'backend/src/types',
        'backend/src/utils',
        'backend/migrations'
      ];
      for (const dir of dirs) {
        expect(fs.existsSync(path.join(ROOT, dir)), `Missing: ${dir}`).toBe(true);
      }
    });
  });

  // === Frontend Key Files ===
  describe('Frontend Key Files', () => {
    const requiredFiles = [
      'frontend/vite.config.ts',
      'frontend/tsconfig.app.json',
      'frontend/index.html',
      'frontend/src/main.tsx',
      'frontend/src/App.tsx',
      'frontend/src/styles/index.css',
      'frontend/src/styles/components.css',
      'frontend/src/styles/animations.css',
      'frontend/src/config/constants.ts',
      'frontend/src/config/api.ts',
      'frontend/src/types/index.ts',
      'frontend/src/types/api.ts',
      'frontend/src/types/bien-ban.ts',
      'frontend/src/types/nhan-vien.ts',
      'frontend/src/stores/auth-store.ts',
      'frontend/src/stores/camera-store.ts',
      'frontend/src/stores/upload-store.ts',
      'frontend/src/stores/config-store.ts',
      'frontend/src/services/api-client.ts',
      'frontend/src/services/idb-service.ts',
      'frontend/src/utils/cn.ts',
      'frontend/src/utils/format.ts',
      'frontend/src/components/ui/Button.tsx',
      'frontend/src/components/ui/Input.tsx',
      'frontend/src/components/ui/Modal.tsx',
      'frontend/src/components/ui/Toast.tsx',
      'frontend/src/components/ui/Badge.tsx',
      'frontend/src/components/ui/Spinner.tsx',
      'frontend/src/components/ui/ProgressBar.tsx',
      'frontend/src/components/ui/EmptyState.tsx',
      'frontend/src/components/layout/AppShell.tsx',
      'frontend/src/components/layout/Header.tsx',
      'frontend/src/components/layout/BottomNav.tsx',
      'frontend/src/pages/LoginPage.tsx',
      'frontend/src/pages/HomePage.tsx',
      'frontend/src/pages/QueuePage.tsx',
      'frontend/src/pages/HistoryPage.tsx',
      'frontend/src/pages/SettingsPage.tsx'
    ];

    for (const file of requiredFiles) {
      it(`should have ${path.basename(file)}`, () => {
        expect(fs.existsSync(path.join(ROOT, file)), `Missing: ${file}`).toBe(true);
      });
    }
  });

  // === Backend Key Files ===
  describe('Backend Key Files', () => {
    const requiredFiles = [
      'backend/wrangler.toml',
      'backend/tsconfig.json',
      'backend/src/index.ts',
      'backend/src/types/env.ts',
      'backend/src/types/schemas.ts',
      'backend/src/middleware/cors.ts',
      'backend/src/middleware/auth.ts',
      'backend/src/routes/auth.ts',
      'backend/src/routes/bien-ban.ts',
      'backend/src/routes/upload.ts',
      'backend/src/routes/dashboard.ts',
      'backend/src/routes/config.ts',
      'backend/src/routes/admin.ts',
      'backend/src/services/jwt-service.ts',
      'backend/src/services/drive-service.ts',
      'backend/src/services/sheet-service.ts',
      'backend/src/utils/hash.ts',
      'backend/src/utils/response.ts',
      'backend/migrations/0001_initial_schema.sql',
      'backend/migrations/0002_seed_data.sql'
    ];

    for (const file of requiredFiles) {
      it(`should have ${path.basename(file)}`, () => {
        expect(fs.existsSync(path.join(ROOT, file)), `Missing: ${file}`).toBe(true);
      });
    }
  });

  // === PWA Icons ===
  describe('PWA Assets', () => {
    it('should have icon-192.png', () => {
      expect(fs.existsSync(path.join(ROOT, 'frontend/public/icons/icon-192.png'))).toBe(true);
    });

    it('should have icon-512.png', () => {
      expect(fs.existsSync(path.join(ROOT, 'frontend/public/icons/icon-512.png'))).toBe(true);
    });

    it('should have icon-512-maskable.png', () => {
      expect(fs.existsSync(path.join(ROOT, 'frontend/public/icons/icon-512-maskable.png'))).toBe(true);
    });
  });

  // === Design Tokens ===
  describe('Design Tokens (index.css)', () => {
    const css = fs.readFileSync(path.join(ROOT, 'frontend/src/styles/index.css'), 'utf-8');

    it('should define primary colors', () => {
      expect(css).toContain('--color-primary-500');
      expect(css).toContain('--color-primary-600');
      expect(css).toContain('--color-primary-900');
    });

    it('should define accent colors', () => {
      expect(css).toContain('--color-accent-400');
      expect(css).toContain('--color-accent-500');
    });

    it('should define status colors', () => {
      expect(css).toContain('--color-success');
      expect(css).toContain('--color-warning');
      expect(css).toContain('--color-error');
      expect(css).toContain('--color-info');
    });

    it('should define dark theme neutrals', () => {
      expect(css).toContain('--color-bg-primary');
      expect(css).toContain('--color-bg-card');
      expect(css).toContain('--color-text-primary');
    });

    it('should define recording state color', () => {
      expect(css).toContain('--color-recording');
    });

    it('should define Inter font family', () => {
      expect(css).toContain("'Inter'");
    });

    it('should define touch target minimum 48px', () => {
      expect(css).toContain('--touch-target-min');
      expect(css).toContain('48px');
    });

    it('should define glassmorphism tokens', () => {
      expect(css).toContain('--glass-bg');
      expect(css).toContain('--glass-blur');
    });
  });

  // === Animations ===
  describe('CSS Animations', () => {
    const css = fs.readFileSync(path.join(ROOT, 'frontend/src/styles/animations.css'), 'utf-8');

    it('should define recordPulse animation', () => {
      expect(css).toContain('@keyframes recordPulse');
    });

    it('should define scanLaser animation', () => {
      expect(css).toContain('@keyframes scanLaser');
    });

    it('should define spin animation', () => {
      expect(css).toContain('@keyframes spin');
    });

    it('should define fadeInUp animation', () => {
      expect(css).toContain('@keyframes fadeInUp');
    });
  });

  // === HTML Meta Tags ===
  describe('index.html SEO & PWA Meta', () => {
    const html = fs.readFileSync(path.join(ROOT, 'frontend/index.html'), 'utf-8');

    it('should have lang="vi"', () => {
      expect(html).toContain('lang="vi"');
    });

    it('should have descriptive title', () => {
      expect(html).toContain('<title>');
      expect(html).not.toContain('<title>frontend</title>');
    });

    it('should have meta description', () => {
      expect(html).toContain('meta name="description"');
    });

    it('should have theme-color', () => {
      expect(html).toContain('theme-color');
      expect(html).toContain('#1a1a2e');
    });

    it('should have apple-mobile-web-app-capable', () => {
      expect(html).toContain('apple-mobile-web-app-capable');
    });

    it('should preconnect to Google Fonts', () => {
      expect(html).toContain('fonts.googleapis.com');
    });

    it('should load Inter font', () => {
      expect(html).toContain('Inter');
    });

    it('should have viewport with user-scalable=no', () => {
      expect(html).toContain('user-scalable=no');
    });
  });

  // === wrangler.toml ===
  describe('wrangler.toml Config', () => {
    const toml = fs.readFileSync(path.join(ROOT, 'backend/wrangler.toml'), 'utf-8');

    it('should define D1 database binding', () => {
      expect(toml).toContain('d1_databases');
      expect(toml).toContain('binding = "DB"');
    });

    it('should have ALLOWED_ORIGINS', () => {
      expect(toml).toContain('ALLOWED_ORIGINS');
      expect(toml).toContain('localhost:5173');
    });

    it('should have cron trigger', () => {
      expect(toml).toContain('[triggers]');
      expect(toml).toContain('crons');
    });
  });

  // === SQL Migrations ===
  describe('D1 Migrations', () => {
    const schema = fs.readFileSync(path.join(ROOT, 'backend/migrations/0001_initial_schema.sql'), 'utf-8');
    const seed = fs.readFileSync(path.join(ROOT, 'backend/migrations/0002_seed_data.sql'), 'utf-8');

    it('schema should create 5 tables', () => {
      const tableCount = (schema.match(/CREATE TABLE/g) || []).length;
      expect(tableCount).toBe(5);
    });

    it('schema should create indexes', () => {
      const indexCount = (schema.match(/CREATE INDEX/g) || []).length;
      expect(indexCount).toBeGreaterThanOrEqual(7);
    });

    it('schema should have CHECK constraints', () => {
      expect(schema).toContain("CHECK(vai_tro IN ('admin', 'nhan_vien'))");
      expect(schema).toContain("CHECK(loai_bien_ban IN ('dong_goi', 'khui_hang'))");
      expect(schema).toContain("CHECK(trang_thai IN ('cho_upload', 'dang_upload', 'da_upload', 'loi'))");
    });

    it('seed should insert ADMIN and NV001', () => {
      expect(seed).toContain("'ADMIN'");
      expect(seed).toContain("'NV001'");
    });

    it('seed should insert default config keys', () => {
      expect(seed).toContain("'drive_folder_id'");
      expect(seed).toContain("'bitrate_mbps'");
      expect(seed).toContain("'retention_thang'");
    });
  });
});
