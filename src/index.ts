#!/usr/bin/env node
/**
 * PocketBase MCP Server
 * 
 * An MCP server that enables AI agents to interact with PocketBase instances
 * for both data queries and administration operations.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Create MCP server instance
const server = new McpServer({
  name: 'pocketbase-mcp-server',
  version: '1.0.0',
});

// Export server for tool registration in other modules
export { server };

// Import and register tools
import { registerRecordTools } from './tools/records.js';
import { registerAuthTools } from './tools/auth.js';
import { registerCollectionTools } from './tools/collections.js';

// Register all tools
registerRecordTools();
registerAuthTools();
registerCollectionTools();

/**
 * Start the MCP server with stdio transport
 */
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log to stderr so it doesn't interfere with MCP protocol on stdout
  console.error('PocketBase MCP Server started');
  console.error(`POCKETBASE_URL: ${process.env.POCKETBASE_URL || '(not set)'}`);
}

// Run the server
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});