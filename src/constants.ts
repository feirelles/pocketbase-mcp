/**
 * PocketBase MCP Server Constants
 */

/** Default number of items per page for list operations */
export const DEFAULT_LIMIT = 50;

/** Maximum number of items per page */
export const MAX_LIMIT = 500;

/** Maximum response size in characters before truncation */
export const MAX_RESPONSE_SIZE = 25000;

/** Default output format */
export const DEFAULT_FORMAT: 'toml' | 'json' = 'toml';

/** Error codes for structured error responses */
export const ErrorCodes = {
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_FAILED: 'AUTH_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
