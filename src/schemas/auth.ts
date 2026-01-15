/**
 * Authentication Zod Schemas
 */

import { z } from 'zod';

/** Common output format parameter */
const formatParam = z.enum(['toml', 'json']).default('toml')
  .describe('Output format: toml (default, compact) or json');

/**
 * Input schema for admin authentication
 */
export const AuthAdminInputSchema = z.object({
  email: z.string().email('Invalid email format')
    .describe('Admin email address'),
  password: z.string().min(1, 'Password required')
    .describe('Admin password'),
  format: formatParam,
}).strict();

export type AuthAdminInput = z.infer<typeof AuthAdminInputSchema>;

/**
 * Input schema for user authentication
 */
export const AuthUserInputSchema = z.object({
  collection: z.string().default('users')
    .describe('Auth collection name (default: users)'),
  email: z.string().email('Invalid email format')
    .describe('User email address'),
  password: z.string().min(1, 'Password required')
    .describe('User password'),
  format: formatParam,
}).strict();

export type AuthUserInput = z.infer<typeof AuthUserInputSchema>;

/**
 * Input schema for getting auth status
 */
export const GetAuthStatusInputSchema = z.object({
  format: formatParam,
}).strict();

export type GetAuthStatusInput = z.infer<typeof GetAuthStatusInputSchema>;

/**
 * Input schema for logout
 */
export const LogoutInputSchema = z.object({
  format: formatParam,
}).strict();

export type LogoutInput = z.infer<typeof LogoutInputSchema>;
