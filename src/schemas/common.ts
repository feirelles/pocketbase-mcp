/**
 * Shared Zod schema fragments used across tool input schemas.
 */

import { z } from 'zod';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../constants.js';

/** Output format parameter — applied to every tool. */
export const formatParam = z.enum(['toml', 'json']).default('toml')
  .describe('Output format: toml (default, compact) or json');

/** Optional registered-connection name. Omit when only one connection is registered. */
export const instanceParam = z.string().min(1).optional()
  .describe(
    'Registered connection name (from pocketbase_connect). Omit if only one connection is registered. Required when multiple connections exist.'
  );

/** Pagination parameters used by list-style tools. */
export const paginationParams = {
  page: z.number().int().min(1).default(1)
    .describe('Page number (1-indexed)'),
  perPage: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT)
    .describe(`Items per page (max ${MAX_LIMIT})`),
};

/** Common record query parameters (filter / sort / projection / expand). */
export const queryParams = {
  filter: z.string().optional()
    .describe('PocketBase filter expression (e.g., status="published")'),
  sort: z.string().optional()
    .describe('Sort field(s), prefix with - for descending (e.g., -created)'),
  fields: z.string().optional()
    .describe('Comma-separated fields to return (e.g., id,title,created)'),
  expand: z.string().optional()
    .describe('Relations to expand (e.g., author,comments)'),
};
