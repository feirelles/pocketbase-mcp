/**
 * Record Tools - Query, Create, Update, Delete
 */

import { z } from 'zod';
import { server } from '../index.js';
import { getClient, handlePocketBaseError, isErrorResponse } from '../services/pocketbase.js';
import { format } from '../formatters/index.js';
import { MAX_RESPONSE_SIZE } from '../constants.js';
import {
  ListRecordsInputSchema,
  GetRecordInputSchema,
  CreateRecordInputSchema,
  UpdateRecordInputSchema,
  DeleteRecordInputSchema,
  type ListRecordsInput,
  type GetRecordInput,
  type CreateRecordInput,
  type UpdateRecordInput,
  type DeleteRecordInput,
} from '../schemas/records.js';
import type { RecordListResult, OutputFormat } from '../types.js';

/**
 * Register all record tools with the MCP server
 */
export function registerRecordTools(): void {
  // List Records Tool
  server.tool(
    'pocketbase_list_records',
    `List records from a PocketBase collection with filtering, sorting, and pagination.
    
Returns records in TOML format by default (compact) or JSON.
Supports PocketBase filter syntax, sorting, field selection, and relation expansion.

Examples:
- List all posts: collection="posts"
- Filter published: collection="posts", filter="status='published'"
- Sort by newest: collection="posts", sort="-created"
- With author: collection="posts", expand="author"`,
    ListRecordsInputSchema.shape,
    async (params: ListRecordsInput) => {
      try {
        const pb = getClient();
        
        const result = await pb.collection(params.collection).getList(
          params.page,
          params.perPage,
          {
            filter: params.filter,
            sort: params.sort,
            fields: params.fields,
            expand: params.expand,
          }
        );
        
        const output: RecordListResult = {
          page: result.page,
          perPage: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
          hasMore: result.page < result.totalPages,
          ...(result.page < result.totalPages && {
            nextOffset: result.page * result.perPage,
          }),
          items: result.items.map(item => ({ ...item })),
        };
        
        let text = format(output, params.format as OutputFormat);
        
        // Truncate if response is too large
        if (text.length > MAX_RESPONSE_SIZE) {
          const truncatedItems = output.items.slice(0, Math.ceil(output.items.length / 2));
          const truncatedOutput = {
            ...output,
            items: truncatedItems,
            _truncated: true,
            _message: `Response truncated from ${output.items.length} to ${truncatedItems.length} items. Use pagination or filters to see more.`,
          };
          text = format(truncatedOutput, params.format as OutputFormat);
        }
        
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

  // Get Single Record Tool
  server.tool(
    'pocketbase_get_record',
    `Get a single record by ID from a PocketBase collection.

Returns the full record with optional relation expansion.
Supports field selection to reduce response size.

Examples:
- Get post: collection="posts", id="abc123"
- With author: collection="posts", id="abc123", expand="author"
- Specific fields: collection="posts", id="abc123", fields="id,title,status"`,
    GetRecordInputSchema.shape,
    async (params: GetRecordInput) => {
      try {
        const pb = getClient();
        
        const record = await pb.collection(params.collection).getOne(
          params.id,
          {
            fields: params.fields,
            expand: params.expand,
          }
        );
        
        const text = format({ ...record }, params.format as OutputFormat);
        
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

  // Create Record Tool
  server.tool(
    'pocketbase_create_record',
    `Create a new record in a PocketBase collection.

Returns the created record with generated ID and timestamps.
Data should be provided as key-value pairs matching collection schema.

Examples:
- Create post: collection="posts", data={"title": "Hello", "status": "draft"}
- With relation: collection="comments", data={"text": "Nice!", "post": "post_id"}`,
    CreateRecordInputSchema.shape,
    async (params: CreateRecordInput) => {
      try {
        const pb = getClient();
        
        const record = await pb.collection(params.collection).create(params.data);
        
        const text = format({ ...record }, params.format as OutputFormat);
        
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

  // Update Record Tool
  server.tool(
    'pocketbase_update_record',
    `Update an existing record in a PocketBase collection (partial update).

Only the provided fields will be updated, other fields remain unchanged.
Returns the updated record with new timestamps.

Examples:
- Update status: collection="posts", id="abc123", data={"status": "published"}
- Update multiple: collection="posts", id="abc123", data={"title": "New Title", "status": "published"}`,
    UpdateRecordInputSchema.shape,
    async (params: UpdateRecordInput) => {
      try {
        const pb = getClient();
        
        const record = await pb.collection(params.collection).update(params.id, params.data);
        
        const text = format({ ...record }, params.format as OutputFormat);
        
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

  // Delete Record Tool
  server.tool(
    'pocketbase_delete_record',
    `Delete a record from a PocketBase collection.

Permanently removes the record. This action cannot be undone.
Returns confirmation of deletion.

Examples:
- Delete post: collection="posts", id="abc123"`,
    DeleteRecordInputSchema.shape,
    async (params: DeleteRecordInput) => {
      try {
        const pb = getClient();
        
        await pb.collection(params.collection).delete(params.id);
        
        const output = {
          success: true,
          deletedId: params.id,
          message: 'Record deleted successfully',
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
