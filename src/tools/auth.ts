/**
 * Authentication Tools
 */

import { server } from '../index.js';
import { getClient, getAuthState, handlePocketBaseError } from '../services/pocketbase.js';
import { format } from '../formatters/index.js';
import {
  AuthAdminInputSchema,
  AuthUserInputSchema,
  GetAuthStatusInputSchema,
  LogoutInputSchema,
  type AuthAdminInput,
  type AuthUserInput,
  type GetAuthStatusInput,
  type LogoutInput,
} from '../schemas/auth.js';
import type { OutputFormat } from '../types.js';

/**
 * Register all authentication tools with the MCP server
 */
export function registerAuthTools(): void {
  // Admin Authentication Tool
  server.tool(
    'pocketbase_auth_admin',
    `Authenticate as PocketBase admin/superuser to access admin-only operations.

Admin auth is required for:
- Listing and managing collections
- Creating/updating/deleting collections
- Accessing admin-only API endpoints

Examples:
- Authenticate: email="admin@example.com", password="secretpassword"`,
    AuthAdminInputSchema.shape,
    async (params: AuthAdminInput) => {
      try {
        const pb = getClient();
        
        // Authenticate as superuser (PocketBase v0.21+ uses _superusers collection)
        const authData = await pb.collection('_superusers').authWithPassword(
          params.email,
          params.password
        );
        
        const output = {
          success: true,
          authType: 'admin' as const,
          admin: {
            id: authData.record.id,
            email: authData.record.email,
          },
          tokenExpiry: null, // SDK doesn't expose expiry
        };
        
        const text = format(output, params.format as OutputFormat);
        
        return {
          content: [{ type: 'text', text }],
        };
      } catch (error) {
        const errorResponse = handlePocketBaseError(error);
        return {
          content: [{ type: 'text', text: format(errorResponse, params.format as OutputFormat) }],
          isError: true,
        };
      }
    }
  );

  // User Authentication Tool
  server.tool(
    'pocketbase_auth_user',
    `Authenticate as a regular user from an auth collection.

User auth provides access based on collection API rules.
Default collection is "users", but you can specify any auth collection.

Examples:
- Authenticate: email="user@example.com", password="userpassword"
- Custom collection: collection="members", email="member@example.com", password="password"`,
    AuthUserInputSchema.shape,
    async (params: AuthUserInput) => {
      try {
        const pb = getClient();
        
        // Authenticate as user
        const authData = await pb.collection(params.collection).authWithPassword(
          params.email,
          params.password
        );
        
        const output = {
          success: true,
          authType: 'user' as const,
          collection: params.collection,
          user: {
            id: authData.record.id,
            email: authData.record.email,
            verified: authData.record.verified,
            created: authData.record.created,
            updated: authData.record.updated,
          },
          tokenExpiry: null,
        };
        
        const text = format(output, params.format as OutputFormat);
        
        return {
          content: [{ type: 'text', text }],
        };
      } catch (error) {
        const errorResponse = handlePocketBaseError(error);
        return {
          content: [{ type: 'text', text: format(errorResponse, params.format as OutputFormat) }],
          isError: true,
        };
      }
    }
  );

  // Get Auth Status Tool
  server.tool(
    'pocketbase_get_auth_status',
    `Get current authentication status without making any changes.

Returns whether authenticated, auth type (admin/user), and user/admin info if authenticated.
Use this to check if you need to authenticate before performing operations.`,
    GetAuthStatusInputSchema.shape,
    async (params: GetAuthStatusInput) => {
      try {
        const authState = getAuthState();
        const text = format(authState, params.format as OutputFormat);
        
        return {
          content: [{ type: 'text', text }],
        };
      } catch (error) {
        const errorResponse = handlePocketBaseError(error);
        return {
          content: [{ type: 'text', text: format(errorResponse, params.format as OutputFormat) }],
          isError: true,
        };
      }
    }
  );

  // Logout Tool
  server.tool(
    'pocketbase_logout',
    `Clear current authentication session.

After logout, you will need to authenticate again to access protected resources.`,
    LogoutInputSchema.shape,
    async (params: LogoutInput) => {
      try {
        const pb = getClient();
        pb.authStore.clear();
        
        const output = {
          success: true,
          message: 'Successfully logged out',
        };
        
        const text = format(output, params.format as OutputFormat);
        
        return {
          content: [{ type: 'text', text }],
        };
      } catch (error) {
        const errorResponse = handlePocketBaseError(error);
        return {
          content: [{ type: 'text', text: format(errorResponse, params.format as OutputFormat) }],
          isError: true,
        };
      }
    }
  );
}
