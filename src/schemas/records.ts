/**
 * Record Operation Zod Schemas
 */

import { z } from 'zod';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../constants.js';

/** Common output format parameter */
const formatParam = z.enum(['toml', 'json']).default('toml')
  .describe('Output format: toml (default, compact) or json');

/** Common pagination parameters */
const paginationParams = {
  page: z.number().int().min(1).default(1)
    .describe('Page number (1-indexed)'),
  perPage: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT)
    .describe(`Items per page (max ${MAX_LIMIT})`),
};

/** Common query parameters */
const queryParams = {
  filter: z.string().optional()
    .describe('PocketBase filter expression (e.g., status="published")'),
  sort: z.string().optional()
    .describe('Sort field(s), prefix with - for descending (e.g., -created)'),
  fields: z.string().optional()
    .describe('Comma-separated fields to return (e.g., id,title,created)'),
  expand: z.string().optional()
    .describe('Relations to expand (e.g., author,comments)'),
};

/**
 * Input schema for listing records
 */
export const ListRecordsInputSchema = z.object({
  collection: z.string().min(1, 'Collection name required')
    .describe('Collection name to query'),
  ...paginationParams,
  ...queryParams,
  format: formatParam,
}).strict();

export type ListRecordsInput = z.infer<typeof ListRecordsInputSchema>;

/**
 * Input schema for getting a single record
 */
export const GetRecordInputSchema = z.object({
  collection: z.string().min(1, 'Collection name required')
    .describe('Collection name'),
  id: z.string().min(1, 'Record ID required')
    .describe('Record ID to retrieve'),
  fields: z.string().optional()
    .describe('Comma-separated fields to return'),
  expand: z.string().optional()
    .describe('Relations to expand'),
  format: formatParam,
}).strict();

export type GetRecordInput = z.infer<typeof GetRecordInputSchema>;

/**
 * Input schema for creating a record
 */
export const CreateRecordInputSchema = z.object({
  collection: z.string().min(1, 'Collection name required')
    .describe('Collection name'),
  data: z.record(z.unknown())
    .describe('Record data as key-value pairs'),
  format: formatParam,
}).strict();

export type CreateRecordInput = z.infer<typeof CreateRecordInputSchema>;

/**
 * Input schema for updating a record
 */
export const UpdateRecordInputSchema = z.object({
  collection: z.string().min(1, 'Collection name required')
    .describe('Collection name'),
  id: z.string().min(1, 'Record ID required')
    .describe('Record ID to update'),
  data: z.record(z.unknown())
    .describe('Fields to update (partial update)'),
  format: formatParam,
}).strict();

export type UpdateRecordInput = z.infer<typeof UpdateRecordInputSchema>;

/**
 * Input schema for deleting a record
 */
export const DeleteRecordInputSchema = z.object({
  collection: z.string().min(1, 'Collection name required')
    .describe('Collection name'),
  id: z.string().min(1, 'Record ID required')
    .describe('Record ID to delete'),
  format: formatParam,
}).strict();

export type DeleteRecordInput = z.infer<typeof DeleteRecordInputSchema>;
