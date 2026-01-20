/**
 * Contract tests for Zod schemas
 * 
 * These tests validate that our Zod schemas correctly match the expected API contracts
 */

import { describe, it, expect } from 'vitest';
import {
  AuthAdminInputSchema,
  AuthUserInputSchema,
  GetAuthStatusInputSchema,
  LogoutInputSchema,
} from '../../src/schemas/auth.js';
import {
  ListRecordsInputSchema,
  GetRecordInputSchema,
  CreateRecordInputSchema,
  UpdateRecordInputSchema,
  DeleteRecordInputSchema,
} from '../../src/schemas/records.js';
import {
  ListCollectionsInputSchema,
  GetCollectionInputSchema,
  CreateCollectionInputSchema,
  UpdateCollectionInputSchema,
  DeleteCollectionInputSchema,
} from '../../src/schemas/collections.js';

describe('Auth Schemas Contract Tests', () => {
  describe('AuthAdminInputSchema', () => {
    it('should accept valid admin auth input', () => {
      const input = {
        email: 'admin@example.com',
        password: 'secretpassword',
      };
      
      const result = AuthAdminInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept admin auth with format option', () => {
      const input = {
        email: 'admin@example.com',
        password: 'secretpassword',
        format: 'json' as const,
      };
      
      const result = AuthAdminInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject missing email', () => {
      const input = {
        password: 'secretpassword',
      };
      
      const result = AuthAdminInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const input = {
        email: 'admin@example.com',
      };
      
      const result = AuthAdminInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('AuthUserInputSchema', () => {
    it('should accept valid user auth input with identity', () => {
      const input = {
        identity: 'user@example.com',
        password: 'userpassword',
      };
      
      const result = AuthUserInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.collection).toBe('users'); // default
      }
    });

    it('should accept username as identity', () => {
      const input = {
        identity: 'johndoe',
        password: 'userpassword',
      };
      
      const result = AuthUserInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept custom collection', () => {
      const input = {
        collection: 'members',
        identity: 'member@example.com',
        password: 'password',
      };
      
      const result = AuthUserInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.collection).toBe('members');
      }
    });

    it('should accept optional identityField', () => {
      const input = {
        identity: 'user@example.com',
        password: 'password',
        identityField: 'email',
      };
      
      const result = AuthUserInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.identityField).toBe('email');
      }
    });

    it('should reject missing identity', () => {
      const input = {
        password: 'password',
      };
      
      const result = AuthUserInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('GetAuthStatusInputSchema', () => {
    it('should accept empty input with defaults', () => {
      const result = GetAuthStatusInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.format).toBe('toml');
      }
    });

    it('should accept format option', () => {
      const result = GetAuthStatusInputSchema.safeParse({ format: 'json' });
      expect(result.success).toBe(true);
    });
  });

  describe('LogoutInputSchema', () => {
    it('should accept empty input with defaults', () => {
      const result = LogoutInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe('Records Schemas Contract Tests', () => {
  describe('ListRecordsInputSchema', () => {
    it('should accept minimal input', () => {
      const input = {
        collection: 'posts',
      };
      
      const result = ListRecordsInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.perPage).toBe(50);
      }
    });

    it('should accept all query parameters', () => {
      const input = {
        collection: 'posts',
        page: 2,
        perPage: 20,
        filter: 'status="published"',
        sort: '-created',
        fields: 'id,title,created',
        expand: 'author',
        skipTotal: true,
      };
      
      const result = ListRecordsInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skipTotal).toBe(true);
      }
    });

    it('should reject page less than 1', () => {
      const input = {
        collection: 'posts',
        page: 0,
      };
      
      const result = ListRecordsInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject perPage exceeding max', () => {
      const input = {
        collection: 'posts',
        perPage: 1000,
      };
      
      const result = ListRecordsInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('GetRecordInputSchema', () => {
    it('should accept collection and id', () => {
      const input = {
        collection: 'posts',
        id: 'abc123',
      };
      
      const result = GetRecordInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept expand and fields options', () => {
      const input = {
        collection: 'posts',
        id: 'abc123',
        expand: 'author,comments',
        fields: 'id,title',
      };
      
      const result = GetRecordInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject missing id', () => {
      const input = {
        collection: 'posts',
      };
      
      const result = GetRecordInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateRecordInputSchema', () => {
    it('should accept collection and data', () => {
      const input = {
        collection: 'posts',
        data: { title: 'Hello World', status: 'draft' },
      };
      
      const result = CreateRecordInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept expand and fields options', () => {
      const input = {
        collection: 'posts',
        data: { title: 'Test' },
        expand: 'author',
        fields: 'id,title,expand.author.name',
      };
      
      const result = CreateRecordInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expand).toBe('author');
        expect(result.data.fields).toBe('id,title,expand.author.name');
      }
    });

    it('should reject missing data', () => {
      const input = {
        collection: 'posts',
      };
      
      const result = CreateRecordInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateRecordInputSchema', () => {
    it('should accept collection, id and data', () => {
      const input = {
        collection: 'posts',
        id: 'abc123',
        data: { status: 'published' },
      };
      
      const result = UpdateRecordInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept expand and fields options', () => {
      const input = {
        collection: 'posts',
        id: 'abc123',
        data: { author: 'user_id' },
        expand: 'author',
        fields: 'id,expand.author.name',
      };
      
      const result = UpdateRecordInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expand).toBe('author');
      }
    });

    it('should reject missing id', () => {
      const input = {
        collection: 'posts',
        data: { title: 'New Title' },
      };
      
      const result = UpdateRecordInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('DeleteRecordInputSchema', () => {
    it('should accept collection and id', () => {
      const input = {
        collection: 'posts',
        id: 'abc123',
      };
      
      const result = DeleteRecordInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty id', () => {
      const input = {
        collection: 'posts',
        id: '',
      };
      
      const result = DeleteRecordInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('Collections Schemas Contract Tests', () => {
  describe('ListCollectionsInputSchema', () => {
    it('should accept empty input with defaults', () => {
      const result = ListCollectionsInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.perPage).toBe(50);
      }
    });

    it('should accept filter', () => {
      const input = {
        filter: 'type="base"',
      };
      
      const result = ListCollectionsInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('GetCollectionInputSchema', () => {
    it('should accept collection name', () => {
      const input = {
        name: 'posts',
      };
      
      const result = GetCollectionInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const input = {
        name: '',
      };
      
      const result = GetCollectionInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateCollectionInputSchema', () => {
    it('should accept valid collection with fields', () => {
      const input = {
        name: 'posts',
        type: 'base' as const,
        fields: [
          { name: 'title', type: 'text' as const, required: true },
          { name: 'content', type: 'editor' as const },
        ],
      };
      
      const result = CreateCollectionInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept all field types', () => {
      const fieldTypes = [
        'text', 'number', 'bool', 'email', 'url', 'date',
        'select', 'json', 'file', 'relation', 'editor', 'autodate', 'geoPoint'
      ] as const;
      
      const input = {
        name: 'test_collection',
        fields: fieldTypes.map(type => ({ name: `field_${type}`, type })),
      };
      
      const result = CreateCollectionInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept API rules', () => {
      const input = {
        name: 'posts',
        fields: [{ name: 'title', type: 'text' as const }],
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id = author.id',
        deleteRule: null,
      };
      
      const result = CreateCollectionInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid collection name', () => {
      const input = {
        name: '123invalid',
        fields: [{ name: 'title', type: 'text' as const }],
      };
      
      const result = CreateCollectionInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject collection with no fields', () => {
      const input = {
        name: 'empty',
        fields: [],
      };
      
      const result = CreateCollectionInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept auth collection type', () => {
      const input = {
        name: 'members',
        type: 'auth' as const,
        fields: [{ name: 'displayName', type: 'text' as const }],
      };
      
      const result = CreateCollectionInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateCollectionInputSchema', () => {
    it('should accept name and newName for rename', () => {
      const input = {
        name: 'posts',
        newName: 'articles',
      };
      
      const result = UpdateCollectionInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept updated fields', () => {
      const input = {
        name: 'posts',
        fields: [
          { name: 'title', type: 'text' as const, required: true },
          { name: 'subtitle', type: 'text' as const },
        ],
      };
      
      const result = UpdateCollectionInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept rule updates', () => {
      const input = {
        name: 'posts',
        listRule: '',
        createRule: '@request.auth.verified = true',
      };
      
      const result = UpdateCollectionInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('DeleteCollectionInputSchema', () => {
    it('should accept collection name', () => {
      const input = {
        name: 'posts',
      };
      
      const result = DeleteCollectionInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});
