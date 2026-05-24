/**
 * Connection-management tool Zod schemas.
 */

import { z } from 'zod';
import { formatParam } from './common.js';

export const ConnectInputSchema = z.object({
  name: z.string()
    .min(1, 'Connection name required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Name must contain only letters, digits, _ and -')
    .describe('Short identifier used to refer to this connection in later tool calls (e.g., "local", "projA", "staging")'),
  url: z.string().url().describe('Full PocketBase base URL, e.g., http://localhost:8090'),
  format: formatParam,
}).strict();

export type ConnectInput = z.infer<typeof ConnectInputSchema>;

export const DisconnectInputSchema = z.object({
  name: z.string().min(1).describe('Connection name to remove'),
  format: formatParam,
}).strict();

export type DisconnectInput = z.infer<typeof DisconnectInputSchema>;

export const ListConnectionsInputSchema = z.object({
  format: formatParam,
}).strict();

export type ListConnectionsInput = z.infer<typeof ListConnectionsInputSchema>;
