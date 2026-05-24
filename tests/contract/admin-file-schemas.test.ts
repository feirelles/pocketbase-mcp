/**
 * Contract tests for Admin and File tool schemas.
 */

import { describe, it, expect } from 'vitest';
import {
  HealthCheckInputSchema,
  ListLogsInputSchema,
  GetLogInputSchema,
  LogStatsInputSchema,
  ListBackupsInputSchema,
  CreateBackupInputSchema,
  RestoreBackupInputSchema,
  DeleteBackupInputSchema,
} from '../../src/schemas/admin.js';
import { GetFileUrlInputSchema } from '../../src/schemas/files.js';

describe('Admin Schemas Contract Tests', () => {
  describe('HealthCheckInputSchema', () => {
    it('accepts an empty payload (format defaults to toml)', () => {
      const r = HealthCheckInputSchema.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.format).toBe('toml');
    });

    it('accepts an instance name', () => {
      const r = HealthCheckInputSchema.safeParse({ instance: 'local' });
      expect(r.success).toBe(true);
    });

    it('accepts an ad-hoc url', () => {
      const r = HealthCheckInputSchema.safeParse({ url: 'http://localhost:8090' });
      expect(r.success).toBe(true);
    });

    it('rejects an invalid url', () => {
      const r = HealthCheckInputSchema.safeParse({ url: 'not-a-url' });
      expect(r.success).toBe(false);
    });

    it('accepts json format', () => {
      const r = HealthCheckInputSchema.safeParse({ format: 'json' });
      expect(r.success).toBe(true);
    });
  });

  describe('ListLogsInputSchema', () => {
    it('accepts an empty payload with defaults', () => {
      const r = ListLogsInputSchema.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.page).toBe(1);
        expect(r.data.perPage).toBe(50);
      }
    });

    it('accepts filter and sort', () => {
      const r = ListLogsInputSchema.safeParse({ filter: 'level="error"', sort: '-created' });
      expect(r.success).toBe(true);
    });

    it('rejects perPage above the cap', () => {
      const r = ListLogsInputSchema.safeParse({ perPage: 999 });
      expect(r.success).toBe(false);
    });

    it('accepts an instance name', () => {
      const r = ListLogsInputSchema.safeParse({ instance: 'projA' });
      expect(r.success).toBe(true);
    });
  });

  describe('GetLogInputSchema', () => {
    it('accepts a valid id', () => {
      const r = GetLogInputSchema.safeParse({ id: 'abc123' });
      expect(r.success).toBe(true);
    });

    it('rejects an empty id', () => {
      const r = GetLogInputSchema.safeParse({ id: '' });
      expect(r.success).toBe(false);
    });

    it('requires id', () => {
      const r = GetLogInputSchema.safeParse({});
      expect(r.success).toBe(false);
    });

    it('accepts an instance name', () => {
      const r = GetLogInputSchema.safeParse({ id: 'abc123', instance: 'projA' });
      expect(r.success).toBe(true);
    });
  });

  describe('LogStatsInputSchema', () => {
    it('accepts an empty payload', () => {
      const r = LogStatsInputSchema.safeParse({});
      expect(r.success).toBe(true);
    });

    it('accepts a filter', () => {
      const r = LogStatsInputSchema.safeParse({ filter: 'level="error"' });
      expect(r.success).toBe(true);
    });

    it('accepts an instance name', () => {
      const r = LogStatsInputSchema.safeParse({ instance: 'projA' });
      expect(r.success).toBe(true);
    });
  });

  describe('ListBackupsInputSchema', () => {
    it('accepts an empty payload', () => {
      const r = ListBackupsInputSchema.safeParse({});
      expect(r.success).toBe(true);
    });

    it('accepts an instance name', () => {
      const r = ListBackupsInputSchema.safeParse({ instance: 'projA' });
      expect(r.success).toBe(true);
    });
  });

  describe('CreateBackupInputSchema', () => {
    it('accepts no name (auto-generated)', () => {
      const r = CreateBackupInputSchema.safeParse({});
      expect(r.success).toBe(true);
    });

    it('accepts a named backup', () => {
      const r = CreateBackupInputSchema.safeParse({ name: 'my-backup-2026.zip' });
      expect(r.success).toBe(true);
    });

    it('accepts an instance name', () => {
      const r = CreateBackupInputSchema.safeParse({ name: 'b.zip', instance: 'projA' });
      expect(r.success).toBe(true);
    });
  });

  describe('RestoreBackupInputSchema', () => {
    it('requires name', () => {
      const r = RestoreBackupInputSchema.safeParse({});
      expect(r.success).toBe(false);
    });

    it('rejects an empty name', () => {
      const r = RestoreBackupInputSchema.safeParse({ name: '' });
      expect(r.success).toBe(false);
    });

    it('accepts a valid name', () => {
      const r = RestoreBackupInputSchema.safeParse({ name: 'my-backup.zip' });
      expect(r.success).toBe(true);
    });

    it('accepts an instance name', () => {
      const r = RestoreBackupInputSchema.safeParse({ name: 'b.zip', instance: 'projA' });
      expect(r.success).toBe(true);
    });
  });

  describe('DeleteBackupInputSchema', () => {
    it('requires name', () => {
      const r = DeleteBackupInputSchema.safeParse({});
      expect(r.success).toBe(false);
    });

    it('accepts a valid name', () => {
      const r = DeleteBackupInputSchema.safeParse({ name: 'old-backup.zip' });
      expect(r.success).toBe(true);
    });

    it('accepts an instance name', () => {
      const r = DeleteBackupInputSchema.safeParse({ name: 'b.zip', instance: 'projA' });
      expect(r.success).toBe(true);
    });
  });
});

describe('File Schemas Contract Tests', () => {
  describe('GetFileUrlInputSchema', () => {
    it('accepts the minimum required fields', () => {
      const r = GetFileUrlInputSchema.safeParse({
        collection: 'posts',
        recordId: 'abc123',
        filename: 'photo.jpg',
      });
      expect(r.success).toBe(true);
    });

    it('accepts a thumbnail spec', () => {
      const r = GetFileUrlInputSchema.safeParse({
        collection: 'posts',
        recordId: 'abc123',
        filename: 'photo.jpg',
        thumb: '100x100',
      });
      expect(r.success).toBe(true);
    });

    it('accepts download=true', () => {
      const r = GetFileUrlInputSchema.safeParse({
        collection: 'posts',
        recordId: 'abc123',
        filename: 'file.zip',
        download: true,
      });
      expect(r.success).toBe(true);
    });

    it('rejects an empty collection name', () => {
      const r = GetFileUrlInputSchema.safeParse({
        collection: '',
        recordId: 'abc123',
        filename: 'photo.jpg',
      });
      expect(r.success).toBe(false);
    });

    it('accepts an instance name', () => {
      const r = GetFileUrlInputSchema.safeParse({
        collection: 'posts',
        recordId: 'abc123',
        filename: 'photo.jpg',
        instance: 'projA',
      });
      expect(r.success).toBe(true);
    });
  });
});
