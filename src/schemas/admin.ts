/**
 * Admin Tool Zod Schemas (health, logs, backups)
 */

import { z } from 'zod';
import { formatParam, paginationParams } from './common.js';

export const HealthCheckInputSchema = z.object({
  format: formatParam,
}).strict();

export type HealthCheckInput = z.infer<typeof HealthCheckInputSchema>;

export const ListLogsInputSchema = z.object({
  ...paginationParams,
  filter: z.string().optional().describe('Filter expression (e.g., level="error")'),
  sort: z.string().optional().describe('Sort field(s), prefix with - for descending'),
  format: formatParam,
}).strict();

export type ListLogsInput = z.infer<typeof ListLogsInputSchema>;

export const GetLogInputSchema = z.object({
  id: z.string().min(1).describe('Log entry ID'),
  format: formatParam,
}).strict();

export type GetLogInput = z.infer<typeof GetLogInputSchema>;

export const LogStatsInputSchema = z.object({
  filter: z.string().optional().describe('Filter expression for stats'),
  format: formatParam,
}).strict();

export type LogStatsInput = z.infer<typeof LogStatsInputSchema>;

export const ListBackupsInputSchema = z.object({
  format: formatParam,
}).strict();

export type ListBackupsInput = z.infer<typeof ListBackupsInputSchema>;

export const CreateBackupInputSchema = z.object({
  name: z.string().optional()
    .describe('Backup file name (optional, auto-generated if not provided). Must be in format [a-z0-9_-].zip'),
  format: formatParam,
}).strict();

export type CreateBackupInput = z.infer<typeof CreateBackupInputSchema>;

export const RestoreBackupInputSchema = z.object({
  name: z.string().min(1).describe('Backup file name to restore'),
  format: formatParam,
}).strict();

export type RestoreBackupInput = z.infer<typeof RestoreBackupInputSchema>;

export const DeleteBackupInputSchema = z.object({
  name: z.string().min(1).describe('Backup file name to delete'),
  format: formatParam,
}).strict();

export type DeleteBackupInput = z.infer<typeof DeleteBackupInputSchema>;
