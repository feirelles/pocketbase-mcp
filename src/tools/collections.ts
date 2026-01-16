/**
 * Collection Management Tools
 */

import { server } from '../index.js';
import { getClient, requireAdminAuth, handlePocketBaseError } from '../services/pocketbase.js';
import { format } from '../formatters/index.js';
import {
  ListCollectionsInputSchema,
  GetCollectionInputSchema,
  CreateCollectionInputSchema,
  UpdateCollectionInputSchema,
  DeleteCollectionInputSchema,
  type ListCollectionsInput,
  type GetCollectionInput,
  type CreateCollectionInput,
  type UpdateCollectionInput,
  type DeleteCollectionInput,
} from '../schemas/collections.js';
import type { OutputFormat } from '../types.js';

/**
 * Register all collection management tools with the MCP server
 */
export function registerCollectionTools(): void {
  // List Collections Tool
  server.tool(
    'pocketbase_list_collections',
    `List all collections in the PocketBase instance.

**Requires admin authentication.**

Returns collection names, types, and field counts.
Use this to discover what collections are available.

Examples:
- List all: (no params needed)
- Filter by type: filter="type='base'"`,
    ListCollectionsInputSchema.shape,
    async (params: ListCollectionsInput) => {
      try {
        requireAdminAuth();
        const pb = getClient();
        
        const options: { filter?: string } = {};
        if (params.filter) {
          options.filter = params.filter;
        }
        
        const result = await pb.collections.getList(
          params.page,
          params.perPage,
          options
        );
        
        const output = {
          page: result.page,
          perPage: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
          items: result.items.map(col => ({
            id: col.id,
            name: col.name,
            type: col.type,
            system: col.system,
            fieldCount: col.schema?.length ?? 0,
          })),
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

  // Get Collection Tool
  server.tool(
    'pocketbase_get_collection',
    `Get detailed schema information for a collection.

**Requires admin authentication.**

Returns full schema including fields, types, rules, and indexes.
Use this to understand collection structure before querying or creating records.

Examples:
- Get posts schema: name="posts"
- Get users schema: name="users"`,
    GetCollectionInputSchema.shape,
    async (params: GetCollectionInput) => {
      try {
        requireAdminAuth();
        const pb = getClient();
        
        const collection = await pb.collections.getOne(params.name);
        
        const output = {
          id: collection.id,
          name: collection.name,
          type: collection.type,
          system: collection.system,
          created: collection.created,
          updated: collection.updated,
          listRule: collection.listRule,
          viewRule: collection.viewRule,
          createRule: collection.createRule,
          updateRule: collection.updateRule,
          deleteRule: collection.deleteRule,
          indexes: collection.indexes || [],
          fields: (collection.schema || []).map((field) => ({
            name: field.name,
            type: field.type,
            required: field.required ?? false,
            options: field.options || {},
          })),
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

  // Create Collection Tool
  server.tool(
    'pocketbase_create_collection',
    `Create a new collection with schema definition.

**Requires admin authentication.**

Creates a new collection with specified fields and rules.
Collection name must start with a letter and contain only alphanumeric characters and underscores.

Examples:
- Create posts: name="posts", type="base", fields=[{name: "title", type: "text", required: true}]`,
    CreateCollectionInputSchema.shape,
    async (params: CreateCollectionInput) => {
      try {
        requireAdminAuth();
        const pb = getClient();
        
        const collectionData = {
          name: params.name,
          type: params.type,
          // PocketBase v0.21+ uses 'fields' instead of 'schema'
          fields: params.fields.map(f => {
            const field: any = {
              name: f.name,
              type: f.type,
              required: f.required,
            };
            
            // For select fields, extract values and maxSelect from options to field level
            if (f.type === 'select' && f.options) {
              if (f.options.values) field.values = f.options.values;
              if (f.options.maxSelect) field.maxSelect = f.options.maxSelect;
              // Pass remaining options
              const { values, maxSelect, ...rest } = f.options;
              if (Object.keys(rest).length > 0) {
                field.options = rest;
              }
            } else if (f.type === 'autodate' && f.options) {
              // For autodate fields, extract onCreate and onUpdate from options to field level
              if (f.options.onCreate !== undefined) field.onCreate = f.options.onCreate;
              if (f.options.onUpdate !== undefined) field.onUpdate = f.options.onUpdate;
              // Pass remaining options
              const { onCreate, onUpdate, ...rest } = f.options;
              if (Object.keys(rest).length > 0) {
                field.options = rest;
              }
            } else if (f.options && Object.keys(f.options).length > 0) {
              field.options = f.options;
            }
            
            return field;
          }),
          listRule: params.listRule,
          viewRule: params.viewRule,
          createRule: params.createRule,
          updateRule: params.updateRule,
          deleteRule: params.deleteRule,
          indexes: params.indexes || [],
        };
        
        const collection = await pb.collections.create(collectionData);
        
        const output = {
          success: true,
          id: collection.id,
          name: collection.name,
          type: collection.type,
          message: `Collection "${collection.name}" created successfully`,
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

  // Update Collection Tool
  server.tool(
    'pocketbase_update_collection',
    `Update an existing collection's schema or rules.

**Requires admin authentication.**

Updates collection configuration. Only provided fields are updated.
Warning: Changing fields may affect existing data.

Examples:
- Rename: name="posts", newName="articles"
- Update rules: name="posts", listRule="", createRule="@request.auth.id != ''"`,
    UpdateCollectionInputSchema.shape,
    async (params: UpdateCollectionInput) => {
      try {
        requireAdminAuth();
        const pb = getClient();
        
        // First get the collection to get its ID
        const existing = await pb.collections.getOne(params.name);
        
        const updateData: Record<string, unknown> = {};
        
        if (params.newName) updateData.name = params.newName;
        if (params.fields) {
          // PocketBase v0.21+ uses 'fields' instead of 'schema'
          updateData.fields = params.fields.map(f => {
            const field: any = {
              name: f.name,
              type: f.type,
              required: f.required,
            };
            
            // For select fields, extract values and maxSelect from options to field level
            if (f.type === 'select' && f.options) {
              if (f.options.values) field.values = f.options.values;
              if (f.options.maxSelect) field.maxSelect = f.options.maxSelect;
              // Pass remaining options
              const { values, maxSelect, ...rest } = f.options;
              if (Object.keys(rest).length > 0) {
                field.options = rest;
              }
            } else if (f.type === 'autodate' && f.options) {
              // For autodate fields, extract onCreate and onUpdate from options to field level
              if (f.options.onCreate !== undefined) field.onCreate = f.options.onCreate;
              if (f.options.onUpdate !== undefined) field.onUpdate = f.options.onUpdate;
              // Pass remaining options
              const { onCreate, onUpdate, ...rest } = f.options;
              if (Object.keys(rest).length > 0) {
                field.options = rest;
              }
            } else if (f.options && Object.keys(f.options).length > 0) {
              field.options = f.options;
            }
            
            return field;
          });
        }
        if (params.listRule !== undefined) updateData.listRule = params.listRule;
        if (params.viewRule !== undefined) updateData.viewRule = params.viewRule;
        if (params.createRule !== undefined) updateData.createRule = params.createRule;
        if (params.updateRule !== undefined) updateData.updateRule = params.updateRule;
        if (params.deleteRule !== undefined) updateData.deleteRule = params.deleteRule;
        if (params.indexes) updateData.indexes = params.indexes;
        
        const collection = await pb.collections.update(existing.id, updateData);
        
        const output = {
          success: true,
          id: collection.id,
          name: collection.name,
          type: collection.type,
          message: `Collection "${collection.name}" updated successfully`,
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

  // Delete Collection Tool
  server.tool(
    'pocketbase_delete_collection',
    `Delete a collection and all its records.

**Requires admin authentication.**

Permanently deletes the collection and all data it contains.
This action cannot be undone.

Examples:
- Delete posts: name="posts"`,
    DeleteCollectionInputSchema.shape,
    async (params: DeleteCollectionInput) => {
      try {
        requireAdminAuth();
        const pb = getClient();
        
        // First get the collection to get its ID
        const existing = await pb.collections.getOne(params.name);
        
        await pb.collections.delete(existing.id);
        
        const output = {
          success: true,
          deletedCollection: params.name,
          message: 'Collection and all records deleted successfully',
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
