/**
 * File Tools - File URL generation and access
 */

import { getClient, handlePocketBaseError } from '../services/pocketbase.js';
import { format } from '../formatters/index.js';
import { GetFileUrlInputSchema, type GetFileUrlInput } from '../schemas/files.js';
import type { OutputFormat } from '../types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Register all file tools with the MCP server
 */
export function registerFileTools(server: McpServer): void {
  // Get File URL Tool
  server.tool(
    'pocketbase_get_file_url',
    `Generate a URL to access a file stored in PocketBase.

Returns the direct URL to access the file, with optional thumbnail generation for images.
Supports JPG, PNG, GIF, and WebP image formats for thumbnails.

Thumbnail formats:
- WxH: Crop to WxH viewbox (from center)
- WxHt: Crop to WxH viewbox (from top)
- WxHb: Crop to WxH viewbox (from bottom)  
- WxHf: Fit inside WxH viewbox (no crop)
- 0xH: Resize to H height preserving aspect ratio
- Wx0: Resize to W width preserving aspect ratio

Examples:
- Get file URL: collection="posts", recordId="abc123", filename="document.pdf"
- With thumbnail: collection="posts", recordId="abc123", filename="image.jpg", thumb="100x100"
- Resize width: collection="posts", recordId="abc123", filename="photo.png", thumb="200x0"
- Force download: collection="posts", recordId="abc123", filename="file.zip", download=true`,
    GetFileUrlInputSchema.shape,
    async (params: GetFileUrlInput) => {
      try {
        const pb = getClient();
        
        // Build the file URL
        // Format: /api/files/COLLECTION/RECORD_ID/FILENAME
        let url = `${pb.baseURL}/api/files/${params.collection}/${params.recordId}/${encodeURIComponent(params.filename)}`;
        
        // Add query parameters
        const queryParams: string[] = [];
        if (params.thumb) {
          queryParams.push(`thumb=${encodeURIComponent(params.thumb)}`);
        }
        if (params.download) {
          queryParams.push('download=1');
        }
        
        if (queryParams.length > 0) {
          url += '?' + queryParams.join('&');
        }
        
        const output = {
          url,
          collection: params.collection,
          recordId: params.recordId,
          filename: params.filename,
          ...(params.thumb && { thumb: params.thumb }),
          ...(params.download && { download: true }),
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
