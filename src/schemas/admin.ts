/**
 * Admin Tool Zod Schemas (health, logs, backups)
 */

import { z } from 'zod';
import { formatParam, instanceParam, paginationParams } from './common.js';

/**
 * Health check accepts EITHER a registered `instance` name OR an ad-hoc
 * `url` (probes without registering). If both are provided the handler
 * returns a VALIDATION_ERROR; if neither, it falls back to the standard
 * resolveInstance behavior (uses the only registered connection, or
 * errors with NO_CONNECTION).
 */
export const HealthCheckInputSchema = z.object({
  instance: instanceParam,
  url: z.string().url().optional()
    .describe('Ad-hoc PocketBase base URL to probe without registering a connection. Mutually exclusive with `instance`.'),
  format: formatParam,
}).strict();

export type HealthCheckInput = z.infer<typeof HealthCheckInputSchema>;

export const ListLogsInputSchema = z.object({
  ...paginationParams,
  filter: z.string().optional().describe('Filter expression (e.g., level="error")'),
  sort: z.string().optional().describe('Sort field(s), prefix with - for descending'),
  format: formatParam,
  instance: instanceParam,
}).strict();

export type ListLogsInput = z.infer<typeof ListLogsInputSchema>;

export const GetLogInputSchema = z.object({
  id: z.string().min(1).describe('Log entry ID'),
  format: formatParam,
  instance: instanceParam,
}).strict();

export type GetLogInput = z.infer<typeof GetLogInputSchema>;

export const LogStatsInputSchema = z.object({
  filter: z.string().optional().describe('Filter expression for stats'),
  format: formatParam,
  instance: instanceParam,
}).strict();

export type LogStatsInput = z.infer<typeof LogStatsInputSchema>;

export const ListBackupsInputSchema = z.object({
  format: formatParam,
  instance: instanceParam,
}).strict();

export type ListBackupsInput = z.infer<typeof ListBackupsInputSchema>;

export const CreateBackupInputSchema = z.object({
  name: z.string().optional()
    .describe('Backup file name (optional, auto-generated if not provided). Must be in format [a-z0-9_-].zip'),
  format: formatParam,
  instance: instanceParam,
}).strict();

export type CreateBackupInput = z.infer<typeof CreateBackupInputSchema>;

export const RestoreBackupInputSchema = z.object({
  name: z.string().min(1).describe('Backup file name to restore'),
  format: formatParam,
  instance: instanceParam,
}).strict();

export type RestoreBackupInput = z.infer<typeof RestoreBackupInputSchema>;

export const DeleteBackupInputSchema = z.object({
  name: z.string().min(1).describe('Backup file name to delete'),
  format: formatParam,
  instance: instanceParam,
}).strict();

export type DeleteBackupInput = z.infer<typeof DeleteBackupInputSchema>;
