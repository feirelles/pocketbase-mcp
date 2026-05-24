#!/usr/bin/env node
/**
 * PocketBase MCP Server
 *
 * Lets AI agents interact with one or more PocketBase instances through a
 * single MCP process. Connections are registered at runtime via
 * `pocketbase_connect`.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerConnectionTools } from './tools/connections.js';
import { registerAuthTools } from './tools/auth.js';
import { registerRecordTools } from './tools/records.js';
import { registerCollectionTools } from './tools/collections.js';
import { registerAdminTools } from './tools/admin.js';
import { registerFileTools } from './tools/files.js';

const server = new McpServer({
  name: 'pocketbase-mcp-server',
  version: '2.0.0',
});

export { server };

// Registration order shows up in the tool list — surface connection
// management first so first-time agents notice it before reaching for
// pocketbase_list_records.
registerConnectionTools(server);
registerAuthTools(server);
registerRecordTools(server);
registerCollectionTools(server);
registerAdminTools(server);
registerFileTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('PocketBase MCP Server started');
  console.error('No connections registered; call pocketbase_connect to add one.');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
