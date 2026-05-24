/**
 * Admin Tools - Health, Logs, Backups, Settings
 */

import {
  resolveInstance,
  requireAdminAuth,
  handlePocketBaseError,
  createErrorResponse,
  createTransientClient,
} from '../services/pocketbase.js';
import { format } from '../formatters/index.js';
import { ErrorCodes } from '../constants.js';
import {
  HealthCheckInputSchema,
  ListLogsInputSchema,
  GetLogInputSchema,
  LogStatsInputSchema,
  ListBackupsInputSchema,
  CreateBackupInputSchema,
  RestoreBackupInputSchema,
  DeleteBackupInputSchema,
  type HealthCheckInput,
  type ListLogsInput,
  type GetLogInput,
  type LogStatsInput,
  type ListBackupsInput,
  type CreateBackupInput,
  type RestoreBackupInput,
  type DeleteBackupInput,
} from '../schemas/admin.js';
import type { OutputFormat } from '../types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Register all admin tools with the MCP server
 */
export function registerAdminTools(server: McpServer): void {
  // Health Check Tool
  server.tool(
    'pocketbase_health_check',
    `Check the health status of a PocketBase server.

No authentication required. Accepts either:
- instance=<name>: probe a registered connection (default behavior, like other tools)
- url=<base-url>: probe an ad-hoc URL without registering — useful to
  test reachability before pocketbase_connect

If neither is provided, falls back to the resolved connection (the only
registered one, or NO_CONNECTION if none).

Examples:
- Ad-hoc probe: url="http://localhost:8090"
- Named: instance="projA"
- Implicit (one registered): (no params)`,
    HealthCheckInputSchema.shape,
    async (params: HealthCheckInput) => {
      try {
        if (params.instance && params.url) {
          const err = createErrorResponse(
            ErrorCodes.VALIDATION_ERROR,
            'health_check: `instance` and `url` are mutually exclusive',
            'Pass exactly one (or neither, to use the resolved connection).'
          );
          return {
            content: [{ type: 'text', text: format(err, params.format as OutputFormat) }],
            isError: true,
          };
        }

        const pb = params.url
          ? createTransientClient(params.url)
          : resolveInstance(params.instance);

        const health = await pb.health.check();

        const output = {
          status: health.code === 200 ? 'healthy' : 'unhealthy',
          code: health.code,
          message: health.message,
          data: health.data,
          target: params.url ?? params.instance ?? '(resolved)',
        };

        const text = format(output, params.format as OutputFormat);

        return {
          content: [{ type: 'text', text }],
        };
      } catch (error) {
        const errorResponse = handlePocketBaseError(error, params.url);
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
        requireAdminAuth(params.instance);
        const pb = resolveInstance(params.instance);
        
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
        requireAdminAuth(params.instance);
        const pb = resolveInstance(params.instance);
        
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
        requireAdminAuth(params.instance);
        const pb = resolveInstance(params.instance);
        
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
        requireAdminAuth(params.instance);
        const pb = resolveInstance(params.instance);
        
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
        requireAdminAuth(params.instance);
        const pb = resolveInstance(params.instance);
        
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
        requireAdminAuth(params.instance);
        const pb = resolveInstance(params.instance);
        
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
        requireAdminAuth(params.instance);
        const pb = resolveInstance(params.instance);
        
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
