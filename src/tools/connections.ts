/**
 * Connection-management tools.
 *
 * These let an agent register, inspect, and tear down PocketBase
 * connections at runtime. Every other tool in this server resolves its
 * target instance from this registry (see services/pocketbase.ts).
 */

import {
  registerConnection,
  unregisterConnection,
  listConnections,
  handlePocketBaseError,
  createErrorResponse,
} from '../services/pocketbase.js';
import { format } from '../formatters/index.js';
import { ErrorCodes } from '../constants.js';
import {
  ConnectInputSchema,
  DisconnectInputSchema,
  ListConnectionsInputSchema,
  type ConnectInput,
  type DisconnectInput,
  type ListConnectionsInput,
} from '../schemas/connections.js';
import type { OutputFormat } from '../types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerConnectionTools(server: McpServer): void {
  server.tool(
    'pocketbase_connect',
    `Register a PocketBase instance under a short name so subsequent tool calls can refer to it.

The server validates reachability by calling /api/health before storing the
connection. If PocketBase is unreachable the connection is NOT registered.

You MUST call this before any other pocketbase_* tool — the server starts
with an empty registry.

Names are short identifiers ([a-zA-Z0-9_-]+) you choose, e.g. "local",
"projA", "staging". The URL is the full PocketBase base URL.

Examples:
- Single project: name="local", url="http://localhost:8090"
- Multiple PBs in parallel: register "projA" (8090), "projB" (8091); pass
  instance=<name> on every subsequent tool call.

Idempotent for the same name + URL (re-pings health). Rejects a name that
is already taken with a different URL — call pocketbase_disconnect first.`,
    ConnectInputSchema.shape,
    async (params: ConnectInput) => {
      try {
        const entry = await registerConnection(params.name, params.url);
        const output = {
          success: true,
          name: entry.name,
          url: entry.url,
          registeredAt: entry.registeredAt.toISOString(),
          message: `Registered connection '${entry.name}' → ${entry.url}`,
        };
        return {
          content: [{ type: 'text', text: format(output, params.format as OutputFormat) }],
        };
      } catch (error) {
        const errorResponse = handlePocketBaseError(error, params.url);
        return {
          content: [{ type: 'text', text: format(errorResponse, params.format as OutputFormat) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'pocketbase_disconnect',
    `Remove a registered PocketBase connection. Clears its authStore as a side effect.

Returns an error if the name is unknown — use pocketbase_list_connections to see what's registered.

Examples:
- Remove: name="projA"`,
    DisconnectInputSchema.shape,
    async (params: DisconnectInput) => {
      try {
        const removed = unregisterConnection(params.name);
        if (!removed) {
          const err = createErrorResponse(
            ErrorCodes.VALIDATION_ERROR,
            `Unknown connection '${params.name}'`,
            'Use pocketbase_list_connections to see registered names.'
          );
          return {
            content: [{ type: 'text', text: format(err, params.format as OutputFormat) }],
            isError: true,
          };
        }
        const output = {
          success: true,
          name: params.name,
          message: `Disconnected '${params.name}'`,
        };
        return {
          content: [{ type: 'text', text: format(output, params.format as OutputFormat) }],
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

  server.tool(
    'pocketbase_list_connections',
    `List all registered PocketBase connections with their URL and auth state.

Returns an empty list (totalConnections=0) if none are registered — agents
can use this to self-diagnose before deciding whether to call pocketbase_connect.

Examples:
- (no params needed)`,
    ListConnectionsInputSchema.shape,
    async (params: ListConnectionsInput) => {
      try {
        const connections = listConnections();
        const output = {
          totalConnections: connections.length,
          connections,
        };
        return {
          content: [{ type: 'text', text: format(output, params.format as OutputFormat) }],
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
