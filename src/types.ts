/**
 * PocketBase MCP Server Type Definitions
 */

import type { ErrorCode } from './constants.js';

/** Server configuration */
export interface ServerConfig {
  /** PocketBase instance URL (from POCKETBASE_URL env var) */
  baseUrl: string;
  /** Default output format */
  defaultFormat: 'toml' | 'json';
  /** Default pagination limit */
  defaultLimit: number;
  /** Maximum pagination limit */
  maxLimit: number;
  /** Maximum response size in characters */
  maxResponseSize: number;
}

/** Authentication state */
export interface AuthState {
  /** Whether currently authenticated */
  isAuthenticated: boolean;
  /** Type of authentication */
  authType: 'admin' | 'user' | null;
  /** Authenticated user/admin info */
  model: {
    id: string;
    email: string;
    [key: string]: unknown;
  } | null;
  /** Whether token is valid */
  tokenValid: boolean;
  /** Token expiration timestamp */
  tokenExpiry: string | null;
}

/** Parameters for listing records */
export interface RecordListParams {
  /** Collection name */
  collection: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  perPage?: number;
  /** Filter expression (PocketBase syntax) */
  filter?: string;
  /** Sort expression (prefix - for desc) */
  sort?: string;
  /** Fields to return (comma-separated) */
  fields?: string;
  /** Relations to expand (comma-separated) */
  expand?: string;
  /** Output format */
  format?: 'toml' | 'json';
}

/** Result from listing records */
export interface RecordListResult {
  /** Current page number */
  page: number;
  /** Items per page */
  perPage: number;
  /** Total matching records */
  totalItems: number;
  /** Total pages */
  totalPages: number;
  /** Whether more pages exist */
  hasMore: boolean;
  /** Offset for next page */
  nextOffset?: number;
  /** Record data */
  items: Record<string, unknown>[];
}

/** Generic record data */
export interface RecordData {
  /** Record ID */
  id?: string;
  /** Creation timestamp */
  created?: string;
  /** Last update timestamp */
  updated?: string;
  /** Dynamic fields */
  [key: string]: unknown;
}

/** Collection field definition */
export interface FieldDefinition {
  /** Field name */
  name: string;
  /** Field type */
  type: 'text' | 'number' | 'bool' | 'email' | 'url' | 'date' | 'select' | 'json' | 'file' | 'relation' | 'editor';
  /** Whether required */
  required: boolean;
  /** Type-specific options */
  options: Record<string, unknown>;
}

/** Collection schema */
export interface CollectionSchema {
  /** Collection ID */
  id: string;
  /** Collection name */
  name: string;
  /** Collection type */
  type: 'base' | 'auth' | 'view';
  /** Whether system collection */
  system: boolean;
  /** Field definitions */
  fields: FieldDefinition[];
  /** Index definitions */
  indexes: string[];
  /** API rules */
  listRule: string | null;
  viewRule: string | null;
  createRule: string | null;
  updateRule: string | null;
  deleteRule: string | null;
  /** Timestamps */
  created: string;
  updated: string;
}

/** Structured error response */
export interface ErrorResponse {
  error: {
    /** Error code for programmatic handling */
    code: ErrorCode;
    /** Human-readable error message */
    message: string;
    /** Actionable suggestion */
    suggestion?: string;
    /** Field-specific validation errors */
    fieldErrors?: Record<string, string>;
  };
}

/** Output format type */
export type OutputFormat = 'toml' | 'json';
