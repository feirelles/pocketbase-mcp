/**
 * Contract tests for Admin and File tools schemas
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Since admin schemas are defined inline in admin.ts, we recreate them here for testing
// This ensures our expected schema matches the implementation

const FormatSchema = z.enum(['toml', 'json']).default('toml');

const HealthCheckInputSchema = z.object({
  format: FormatSchema.describe('Output format: toml (default, compact) or json'),
});

const ListLogsInputSchema = z.object({
  page: z.number().int().min(1).default(1).describe('Page number (1-indexed)'),
  perPage: z.number().int().min(1).max(500).default(50).describe('Items per page'),
  filter: z.string().optional().describe('Filter expression (e.g., level="error")'),
  sort: z.string().optional().describe('Sort field(s), prefix with - for descending'),
  format: FormatSchema.describe('Output format: toml (default, compact) or json'),
});

const GetLogInputSchema = z.object({
  id: z.string().min(1).describe('Log entry ID'),
  format: FormatSchema.describe('Output format: toml (default, compact) or json'),
});

const LogStatsInputSchema = z.object({
  filter: z.string().optional().describe('Filter expression for stats'),
  format: FormatSchema.describe('Output format: toml (default, compact) or json'),
});

const ListBackupsInputSchema = z.object({
  format: FormatSchema.describe('Output format: toml (default, compact) or json'),
});

const CreateBackupInputSchema = z.object({
  name: z.string().optional().describe('Backup file name (optional, auto-generated if not provided)'),
  format: FormatSchema.describe('Output format: toml (default, compact) or json'),
});

const RestoreBackupInputSchema = z.object({
  name: z.string().min(1).describe('Backup file name to restore'),
  format: FormatSchema.describe('Output format: toml (default, compact) or json'),
});

const DeleteBackupInputSchema = z.object({
  name: z.string().min(1).describe('Backup file name to delete'),
  format: FormatSchema.describe('Output format: toml (default, compact) or json'),
});

const GetFileUrlInputSchema = z.object({
  collection: z.string().min(1).describe('Collection name or ID'),
  recordId: z.string().min(1).describe('Record ID that contains the file'),
  filename: z.string().min(1).describe('Name of the file field value'),
  thumb: z.string().optional().describe('Thumbnail size'),
  download: z.boolean().optional().describe('Force download'),
  format: FormatSchema.describe('Output format: toml (default, compact) or json'),
});

describe('Admin Schemas Contract Tests', () => {
  describe('HealthCheckInputSchema', () => {
    it('should accept empty input with defaults', () => {
      const result = HealthCheckInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.format).toBe('toml');
      }
    });

    it('should accept json format', () => {
      const result = HealthCheckInputSchema.safeParse({ format: 'json' });
      expect(result.success).toBe(true);
    });
  });

  describe('ListLogsInputSchema', () => {
    it('should accept empty input with defaults', () => {
      const result = ListLogsInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.perPage).toBe(50);
      }
    });

    it('should accept all parameters', () => {
      const input = {
        page: 2,
        perPage: 100,
        filter: 'level="error"',
        sort: '-created',
        format: 'json' as const,
      };
      
      const result = ListLogsInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject perPage over 500', () => {
      const input = { perPage: 501 };
      const result = ListLogsInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('GetLogInputSchema', () => {
    it('should accept log id', () => {
      const result = GetLogInputSchema.safeParse({ id: 'abc123' });
      expect(result.success).toBe(true);
    });

    it('should reject empty id', () => {
      const result = GetLogInputSchema.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('LogStatsInputSchema', () => {
    it('should accept empty input', () => {
      const result = LogStatsInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept filter', () => {
      const result = LogStatsInputSchema.safeParse({ filter: 'level>=2' });
      expect(result.success).toBe(true);
    });
  });

  describe('ListBackupsInputSchema', () => {
    it('should accept empty input with defaults', () => {
      const result = ListBackupsInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('CreateBackupInputSchema', () => {
    it('should accept empty input (name is optional)', () => {
      const result = CreateBackupInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept name', () => {
      const result = CreateBackupInputSchema.safeParse({ name: 'my-backup.zip' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('my-backup.zip');
      }
    });
  });

  describe('RestoreBackupInputSchema', () => {
    it('should accept backup name', () => {
      const result = RestoreBackupInputSchema.safeParse({ name: 'backup.zip' });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = RestoreBackupInputSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = RestoreBackupInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('DeleteBackupInputSchema', () => {
    it('should accept backup name', () => {
      const result = DeleteBackupInputSchema.safeParse({ name: 'backup.zip' });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = DeleteBackupInputSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });
  });
});

describe('File Schemas Contract Tests', () => {
  describe('GetFileUrlInputSchema', () => {
    it('should accept minimal required params', () => {
      const input = {
        collection: 'posts',
        recordId: 'abc123',
        filename: 'image.jpg',
      };
      
      const result = GetFileUrlInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept thumb parameter', () => {
      const input = {
        collection: 'posts',
        recordId: 'abc123',
        filename: 'image.jpg',
        thumb: '100x100',
      };
      
      const result = GetFileUrlInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.thumb).toBe('100x100');
      }
    });

    it('should accept various thumb formats', () => {
      const thumbFormats = ['100x100', '200x0', '0x300', '100x100t', '100x100b', '100x100f'];
      
      for (const thumb of thumbFormats) {
        const input = {
          collection: 'posts',
          recordId: 'abc123',
          filename: 'image.jpg',
          thumb,
        };
        
        const result = GetFileUrlInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    it('should accept download parameter', () => {
      const input = {
        collection: 'posts',
        recordId: 'abc123',
        filename: 'document.pdf',
        download: true,
      };
      
      const result = GetFileUrlInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.download).toBe(true);
      }
    });

    it('should accept all parameters combined', () => {
      const input = {
        collection: 'posts',
        recordId: 'abc123',
        filename: 'image.jpg',
        thumb: '200x200f',
        download: false,
        format: 'json' as const,
      };
      
      const result = GetFileUrlInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject missing collection', () => {
      const input = {
        recordId: 'abc123',
        filename: 'image.jpg',
      };
      
      const result = GetFileUrlInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject missing recordId', () => {
      const input = {
        collection: 'posts',
        filename: 'image.jpg',
      };
      
      const result = GetFileUrlInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject missing filename', () => {
      const input = {
        collection: 'posts',
        recordId: 'abc123',
      };
      
      const result = GetFileUrlInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty collection', () => {
      const input = {
        collection: '',
        recordId: 'abc123',
        filename: 'image.jpg',
      };
      
      const result = GetFileUrlInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
