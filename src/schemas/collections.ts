/**
 * Collection Management Zod Schemas
 */

import { z } from 'zod';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../constants.js';

/** Common output format parameter */
const formatParam = z.enum(['toml', 'json']).default('toml')
  .describe('Output format: toml (default, compact) or json');

/** Field type enum */
const fieldTypeEnum = z.enum([
  'text', 'number', 'bool', 'email', 'url', 'date', 
  'select', 'json', 'file', 'relation', 'editor'
]);

/** Field definition schema */
const fieldDefinitionSchema = z.object({
  name: z.string().min(1, 'Field name required'),
  type: fieldTypeEnum,
  required: z.boolean().default(false),
  options: z.record(z.unknown()).optional(),
});

/**
 * Input schema for listing collections
 */
export const ListCollectionsInputSchema = z.object({
  page: z.number().int().min(1).default(1)
    .describe('Page number (1-indexed)'),
  perPage: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT)
    .describe('Items per page'),
  filter: z.string().optional()
    .describe('Filter expression (e.g., type="base")'),
  format: formatParam,
}).strict();

export type ListCollectionsInput = z.infer<typeof ListCollectionsInputSchema>;

/**
 * Input schema for getting a collection
 */
export const GetCollectionInputSchema = z.object({
  name: z.string().min(1, 'Collection name required')
    .describe('Collection name or ID'),
  format: formatParam,
}).strict();

export type GetCollectionInput = z.infer<typeof GetCollectionInputSchema>;

/**
 * Input schema for creating a collection
 */
export const CreateCollectionInputSchema = z.object({
  name: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Invalid collection name: must start with letter, alphanumeric and underscores only')
    .describe('Collection name (alphanumeric, start with letter)'),
  type: z.enum(['base', 'auth']).default('base')
    .describe('Collection type: base (default) or auth'),
  fields: z.array(fieldDefinitionSchema)
    .min(1, 'At least one field required')
    .describe('Field definitions'),
  listRule: z.string().nullable().optional()
    .describe('List API rule (empty = public, null = admin only)'),
  viewRule: z.string().nullable().optional()
    .describe('View API rule'),
  createRule: z.string().nullable().optional()
    .describe('Create API rule'),
  updateRule: z.string().nullable().optional()
    .describe('Update API rule'),
  deleteRule: z.string().nullable().optional()
    .describe('Delete API rule'),
  indexes: z.array(z.string()).optional()
    .describe('Index definitions'),
  format: formatParam,
}).strict();

export type CreateCollectionInput = z.infer<typeof CreateCollectionInputSchema>;

/**
 * Input schema for updating a collection
 */
export const UpdateCollectionInputSchema = z.object({
  name: z.string().min(1)
    .describe('Collection name to update'),
  newName: z.string().optional()
    .describe('New collection name (rename)'),
  fields: z.array(fieldDefinitionSchema).optional()
    .describe('Updated field definitions (replaces all fields)'),
  listRule: z.string().nullable().optional(),
  viewRule: z.string().nullable().optional(),
  createRule: z.string().nullable().optional(),
  updateRule: z.string().nullable().optional(),
  deleteRule: z.string().nullable().optional(),
  indexes: z.array(z.string()).optional(),
  format: formatParam,
}).strict();

export type UpdateCollectionInput = z.infer<typeof UpdateCollectionInputSchema>;

/**
 * Input schema for deleting a collection
 */
export const DeleteCollectionInputSchema = z.object({
  name: z.string().min(1)
    .describe('Collection name to delete'),
  format: formatParam,
}).strict();

export type DeleteCollectionInput = z.infer<typeof DeleteCollectionInputSchema>;
