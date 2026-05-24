/**
 * Authentication Tools
 */

import {
  resolveInstance,
  getAuthState,
  listConnections,
  handlePocketBaseError,
  createErrorResponse,
} from '../services/pocketbase.js';
import { ErrorCodes } from '../constants.js';
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
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Register all authentication tools with the MCP server
 */
export function registerAuthTools(server: McpServer): void {
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
        const pb = resolveInstance(params.instance);
        
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
- Authenticate: identity="user@example.com", password="userpassword"
- With username: identity="johndoe", password="password"
- Custom collection: collection="members", identity="member@example.com", password="password"
- Specific field: identity="user@example.com", identityField="email", password="password"`,
    AuthUserInputSchema.shape,
    async (params: AuthUserInput) => {
      try {
        const pb = resolveInstance(params.instance);
        
        // Build auth options
        const authOptions: { identity?: string } = {};
        if (params.identityField) {
          authOptions.identity = params.identityField;
        }
        
        // Authenticate as user
        const authData = await pb.collection(params.collection).authWithPassword(
          params.identity,
          params.password,
          authOptions
        );
        
        const output = {
          success: true,
          authType: 'user' as const,
          collection: params.collection,
          user: {
            id: authData.record.id,
            email: authData.record.email,
            username: authData.record.username,
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
        const authState = getAuthState(params.instance);
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
    `Clear the authentication session on one or all registered connections.

By default targets the resolved instance (the only registered one, or the
one named by \`instance\`). Pass \`all: true\` (and omit \`instance\`) to
clear every registered connection at once.

Examples:
- One: instance="projA"
- All: all=true`,
    LogoutInputSchema.shape,
    async (params: LogoutInput) => {
      try {
        if (params.all && params.instance !== undefined) {
          const err = createErrorResponse(
            ErrorCodes.VALIDATION_ERROR,
            'logout: `all` and `instance` are mutually exclusive',
            'Pass either `instance=<name>` to clear one, or `all=true` to clear every connection.'
          );
          return {
            content: [{ type: 'text', text: format(err, params.format as OutputFormat) }],
            isError: true,
          };
        }

        if (params.all) {
          const names = listConnections().map(c => c.name);
          for (const name of names) {
            resolveInstance(name).authStore.clear();
          }
          const output = {
            success: true,
            cleared: names,
            message: `Cleared authStore on ${names.length} connection(s)`,
          };
          return {
            content: [{ type: 'text', text: format(output, params.format as OutputFormat) }],
          };
        }

        const pb = resolveInstance(params.instance);
        pb.authStore.clear();

        const output = {
          success: true,
          instance: params.instance ?? '(resolved)',
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
