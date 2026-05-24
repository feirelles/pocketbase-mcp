#!/usr/bin/env node
/**
 * PocketBase MCP Server
 *
 * Lets AI agents interact with one or more PocketBase instances through a
 * single MCP process. Connections are registered at runtime via
 * `pocketbase_connect`; if POCKETBASE_URL is set it auto-registers as "default".
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerConnectionTools } from './tools/connections.js';
import { registerAuthTools } from './tools/auth.js';
import { registerRecordTools } from './tools/records.js';
import { registerCollectionTools } from './tools/collections.js';
import { registerAdminTools } from './tools/admin.js';
import { registerFileTools } from './tools/files.js';
import { registerConnection } from './services/pocketbase.js';

const server = new McpServer({
  name: 'pocketbase-mcp-server',
  version: '1.3.0',
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
  // Backward compatibility: if POCKETBASE_URL is set at startup, register
  // it as "default". A reachability failure is logged but does NOT abort
  // startup (the PB instance may come up after the MCP).
  const legacyUrl = process.env.POCKETBASE_URL;
  if (legacyUrl) {
    try {
      await registerConnection('default', legacyUrl);
      console.error(`Auto-registered POCKETBASE_URL as 'default' → ${legacyUrl}`);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : (error as { error?: { message?: string } })?.error?.message ?? String(error);
      console.error(`Failed to auto-register POCKETBASE_URL (${legacyUrl}): ${message}`);
      console.error('Server is up; use pocketbase_connect once PocketBase is reachable.');
    }
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('PocketBase MCP Server started');
  console.error(
    legacyUrl
      ? `Default connection: ${legacyUrl}`
      : 'No POCKETBASE_URL in env; call pocketbase_connect to register an instance.'
  );
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
