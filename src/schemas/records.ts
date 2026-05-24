/**
 * Record Operation Zod Schemas
 */

import { z } from 'zod';
import { formatParam, instanceParam, paginationParams, queryParams } from './common.js';

/**
 * Input schema for listing records
 */
export const ListRecordsInputSchema = z.object({
  collection: z.string().min(1, 'Collection name required')
    .describe('Collection name to query'),
  ...paginationParams,
  ...queryParams,
  skipTotal: z.boolean().optional()
    .describe('Skip total count query for better performance (totalItems/totalPages will be -1)'),
  format: formatParam,
  instance: instanceParam,
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
  instance: instanceParam,
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
  expand: z.string().optional()
    .describe('Relations to expand in the response'),
  fields: z.string().optional()
    .describe('Comma-separated fields to return in the response'),
  format: formatParam,
  instance: instanceParam,
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
  expand: z.string().optional()
    .describe('Relations to expand in the response'),
  fields: z.string().optional()
    .describe('Comma-separated fields to return in the response'),
  format: formatParam,
  instance: instanceParam,
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
  instance: instanceParam,
}).strict();

export type DeleteRecordInput = z.infer<typeof DeleteRecordInputSchema>;
