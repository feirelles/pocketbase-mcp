/**
 * File Tool Zod Schemas
 */

import { z } from 'zod';
import { formatParam, instanceParam } from './common.js';

export const GetFileUrlInputSchema = z.object({
  collection: z.string().min(1).describe('Collection name or ID'),
  recordId: z.string().min(1).describe('Record ID that contains the file'),
  filename: z.string().min(1).describe('Name of the file field value (the stored filename)'),
  thumb: z.string().optional().describe(
    'Thumbnail size. Formats: WxH (crop center), WxHt (crop top), WxHb (crop bottom), WxHf (fit), 0xH (resize height), Wx0 (resize width). Example: "100x100", "200x0"'
  ),
  download: z.boolean().optional().describe('If true, returns URL with download header'),
  format: formatParam,
  instance: instanceParam,
}).strict();

export type GetFileUrlInput = z.infer<typeof GetFileUrlInputSchema>;
