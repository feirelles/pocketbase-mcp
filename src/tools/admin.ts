/**
 * Admin Tools - Health, Logs, Backups, Settings
 */

import { z } from 'zod';
import { getClient, requireAdminAuth, handlePocketBaseError } from '../services/pocketbase.js';
import { format } from '../formatters/index.js';
import type { OutputFormat } from '../types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Schemas for admin tools
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
  name: z.string().optional().describe('Backup file name (optional, auto-generated if not provided). Must be in format [a-z0-9_-].zip'),
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

type HealthCheckInput = z.infer<typeof HealthCheckInputSchema>;
type ListLogsInput = z.infer<typeof ListLogsInputSchema>;
type GetLogInput = z.infer<typeof GetLogInputSchema>;
type LogStatsInput = z.infer<typeof LogStatsInputSchema>;
type ListBackupsInput = z.infer<typeof ListBackupsInputSchema>;
type CreateBackupInput = z.infer<typeof CreateBackupInputSchema>;
type RestoreBackupInput = z.infer<typeof RestoreBackupInputSchema>;
type DeleteBackupInput = z.infer<typeof DeleteBackupInputSchema>;

/**
 * Register all admin tools with the MCP server
 */
export function registerAdminTools(server: McpServer): void {
  // Health Check Tool
  server.tool(
    'pocketbase_health_check',
    `Check the health status of the PocketBase server.

Returns server health information including version and status.
Does not require authentication.

Examples:
- Check health: (no params needed)`,
    HealthCheckInputSchema.shape,
    async (params: HealthCheckInput) => {
      try {
        const pb = getClient();
        const health = await pb.health.check();
        
        const output = {
          status: health.code === 200 ? 'healthy' : 'unhealthy',
          code: health.code,
          message: health.message,
          data: health.data,
        };
        
        const text = format(output, params.format as OutputFormat);
        
        return {
          content: [{ type: 'text', text }],
        };
      } catch (error) {
        const errorResponse = handlePocketBaseError(error);
        return {
          content: [{ type: 'text', text: format(errorResponse, params.format as OutputFormat) }],
          isError: true,
        };
      }
    }
  );

  // List Logs Tool
  server.tool(
    'pocketbase_list_logs',
    `List server logs with filtering and pagination.

**Requires admin authentication.**

Returns paginated list of log entries.
Supports filtering by level, date, and other fields.

Examples:
- List all: (no params needed)
- Filter errors: filter="level='error'"
- Sort by newest: sort="-created"`,
    ListLogsInputSchema.shape,
    async (params: ListLogsInput) => {
      try {
        requireAdminAuth();
        const pb = getClient();
        
        const options: Record<string, unknown> = {};
        if (params.filter) options.filter = params.filter;
        if (params.sort) options.sort = params.sort;
        
        const result = await pb.logs.getList(params.page, params.perPage, options);
        
        const output = {
          page: result.page,
          perPage: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
          items: result.items.map(log => ({
            id: log.id,
            level: log.level,
            message: log.message,
            data: log.data,
            created: log.created,
          })),
        };
        
        const text = format(output, params.format as OutputFormat);
        
        return {
          content: [{ type: 'text', text }],
        };
      } catch (error) {
        const errorResponse = handlePocketBaseError(error);
        return {
          content: [{ type: 'text', text: format(errorResponse, params.format as OutputFormat) }],
          isError: true,
        };
      }
    }
  );

  // Get Single Log Tool
  server.tool(
    'pocketbase_get_log',
    `Get a single log entry by ID.

**Requires admin authentication.**

Returns the full log entry with all details.

Examples:
- Get log: id="abc123"`,
    GetLogInputSchema.shape,
    async (params: GetLogInput) => {
      try {
        requireAdminAuth();
        const pb = getClient();
        
        const log = await pb.logs.getOne(params.id);
        
        const output = {
          id: log.id,
          level: log.level,
          message: log.message,
          data: log.data,
          created: log.created,
        };
        
        const text = format(output, params.format as OutputFormat);
        
        return {
          content: [{ type: 'text', text }],
        };
      } catch (error) {
        const errorResponse = handlePocketBaseError(error);
        return {
          content: [{ type: 'text', text: format(errorResponse, params.format as OutputFormat) }],
          isError: true,
        };
      }
    }
  );

  // Log Statistics Tool
  server.tool(
    'pocketbase_log_stats',
    `Get log statistics (hourly breakdown).

**Requires admin authentication.**

Returns hourly statistics of log entries.

Examples:
- Get stats: (no params needed)
- Filter stats: filter="level='error'"`,
    LogStatsInputSchema.shape,
    async (params: LogStatsInput) => {
      try {
        requireAdminAuth();
        const pb = getClient();
        
        const options: Record<string, unknown> = {};
        if (params.filter) options.filter = params.filter;
        
        const stats = await pb.logs.getStats(options);
        
        const output = {
          totalEntries: stats.length,
          stats: stats,
        };
        
        const text = format(output, params.format as OutputFormat);
        
        return {
          content: [{ type: 'text', text }],
        };
      } catch (error) {
        const errorResponse = handlePocketBaseError(error);
        return {
          content: [{ type: 'text', text: format(errorResponse, params.format as OutputFormat) }],
          isError: true,
        };
      }
    }
  );

  // List Backups Tool
  server.tool(
    'pocketbase_list_backups',
    `List all available backup files.

**Requires admin authentication.**

Returns list of backup files with their details.

Examples:
- List all: (no params needed)`,
    ListBackupsInputSchema.shape,
    async (params: ListBackupsInput) => {
      try {
        requireAdminAuth();
        const pb = getClient();
        
        const backups = await pb.backups.getFullList();
        
        const output = {
          totalBackups: backups.length,
          backups: backups.map(backup => ({
            key: backup.key,
            size: backup.size,
            modified: backup.modified,
          })),
        };
        
        const text = format(output, params.format as OutputFormat);
        
        return {
          content: [{ type: 'text', text }],
        };
      } catch (error) {
        const errorResponse = handlePocketBaseError(error);
        return {
          content: [{ type: 'text', text: format(errorResponse, params.format as OutputFormat) }],
          isError: true,
        };
      }
    }
  );

  // Create Backup Tool
  server.tool(
    'pocketbase_create_backup',
    `Create a new backup of the PocketBase database.

**Requires admin authentication.**

Creates a new backup file. If name is not provided, it will be auto-generated.
The backup includes all data and files.

Examples:
- Auto-named backup: (no params needed)
- Named backup: name="my-backup-2024.zip"`,
    CreateBackupInputSchema.shape,
    async (params: CreateBackupInput) => {
      try {
        requireAdminAuth();
        const pb = getClient();
        
        await pb.backups.create(params.name || '');
        
        const output = {
          success: true,
          name: params.name || '(auto-generated)',
          message: params.name 
            ? `Backup "${params.name}" created successfully`
            : 'Backup created successfully (auto-generated name)',
        };
        
        const text = format(output, params.format as OutputFormat);
        
        return {
          content: [{ type: 'text', text }],
        };
      } catch (error) {
        const errorResponse = handlePocketBaseError(error);
        return {
          content: [{ type: 'text', text: format(errorResponse, params.format as OutputFormat) }],
          isError: true,
        };
      }
    }
  );

  // Restore Backup Tool
  server.tool(
    'pocketbase_restore_backup',
    `Restore the database from a backup file.

**Requires admin authentication.**

⚠️ WARNING: This will replace all current data with the backup data.
This action cannot be undone.

Examples:
- Restore backup: name="my-backup-2024.zip"`,
    RestoreBackupInputSchema.shape,
    async (params: RestoreBackupInput) => {
      try {
        requireAdminAuth();
        const pb = getClient();
        
        await pb.backups.restore(params.name);
        
        const output = {
          success: true,
          name: params.name,
          message: `Backup "${params.name}" restored successfully. Server may restart.`,
        };
        
        const text = format(output, params.format as OutputFormat);
        
        return {
          content: [{ type: 'text', text }],
        };
      } catch (error) {
        const errorResponse = handlePocketBaseError(error);
        return {
          content: [{ type: 'text', text: format(errorResponse, params.format as OutputFormat) }],
          isError: true,
        };
      }
    }
  );

  // Delete Backup Tool
  server.tool(
    'pocketbase_delete_backup',
    `Delete a backup file.

**Requires admin authentication.**

Permanently deletes the specified backup file.
This action cannot be undone.

Examples:
- Delete backup: name="my-backup-2024.zip"`,
    DeleteBackupInputSchema.shape,
    async (params: DeleteBackupInput) => {
      try {
        requireAdminAuth();
        const pb = getClient();
        
        await pb.backups.delete(params.name);
        
        const output = {
          success: true,
          name: params.name,
          message: `Backup "${params.name}" deleted successfully`,
        };
        
        const text = format(output, params.format as OutputFormat);
        
        return {
          content: [{ type: 'text', text }],
        };
      } catch (error) {
        const errorResponse = handlePocketBaseError(error);
        return {
          content: [{ type: 'text', text: format(errorResponse, params.format as OutputFormat) }],
          isError: true,
        };
      }
    }
  );
}
