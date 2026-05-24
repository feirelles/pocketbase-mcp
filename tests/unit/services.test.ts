/**
 * Unit tests for PocketBase service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createErrorResponse,
  handlePocketBaseError,
  isErrorResponse,
  registerConnection,
  unregisterConnection,
  listConnections,
  resolveInstance,
  resolveInstanceEntry,
  resetRegistry,
  getAuthState,
  requireAdminAuth,
} from '../../src/services/pocketbase.js';
import { ErrorCodes } from '../../src/constants.js';
import { ClientResponseError } from 'pocketbase';

// Mock the pocketbase SDK so the registry tests don't make real HTTP calls.
// Each `new PocketBase(url)` returns a fake client with a configurable
// `health.check()` and a mutable `authStore` honoring the bits we read.
vi.mock('pocketbase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pocketbase')>();

  class FakeAuthStore {
    isValid = false;
    isSuperuser = false;
    record: Record<string, unknown> | null = null;
    clear() {
      this.isValid = false;
      this.isSuperuser = false;
      this.record = null;
    }
  }

  // Per-URL behavior knobs; tests configure via `__pbControl(url, ...)`.
  const control = new Map<string, { healthFails?: boolean }>();
  (globalThis as any).__pbControl = (url: string, cfg: { healthFails?: boolean }) => {
    control.set(url, cfg);
  };
  (globalThis as any).__pbResetControl = () => control.clear();

  class FakePocketBase {
    baseURL: string;
    authStore = new FakeAuthStore();
    health = {
      check: async () => {
        if (control.get(this.baseURL)?.healthFails) {
          throw new TypeError('fetch failed');
        }
        return { code: 200, message: 'API is healthy.', data: {} };
      },
    };
    constructor(url: string) { this.baseURL = url; }
    autoCancellation(_v: boolean) { return this; }
  }

  return {
    ...actual,
    default: FakePocketBase,
  };
});

describe('createErrorResponse', () => {
  it('should create error response with required fields', () => {
    const result = createErrorResponse(
      ErrorCodes.NOT_FOUND,
      'Resource not found'
    );
    
    expect(result.error.code).toBe('NOT_FOUND');
    expect(result.error.message).toBe('Resource not found');
    expect(result.error.suggestion).toBeUndefined();
    expect(result.error.fieldErrors).toBeUndefined();
  });

  it('should include suggestion when provided', () => {
    const result = createErrorResponse(
      ErrorCodes.AUTH_REQUIRED,
      'Authentication required',
      'Use pocketbase_auth_admin first'
    );
    
    expect(result.error.suggestion).toBe('Use pocketbase_auth_admin first');
  });

  it('should include field errors when provided', () => {
    const fieldErrors = {
      email: 'Invalid email format',
      name: 'Name is required',
    };
    
    const result = createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      undefined,
      fieldErrors
    );
    
    expect(result.error.fieldErrors).toEqual(fieldErrors);
  });
});

describe('isErrorResponse', () => {
  it('should return true for valid error response', () => {
    const errorResponse = {
      error: {
        code: 'NOT_FOUND',
        message: 'Not found',
      },
    };
    
    expect(isErrorResponse(errorResponse)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isErrorResponse(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isErrorResponse(undefined)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(isErrorResponse('string')).toBe(false);
    expect(isErrorResponse(123)).toBe(false);
  });

  it('should return false for object without error property', () => {
    expect(isErrorResponse({ data: 'something' })).toBe(false);
  });

  it('should return false for error without code', () => {
    expect(isErrorResponse({ error: { message: 'test' } })).toBe(false);
  });

  it('should return false for error without message', () => {
    expect(isErrorResponse({ error: { code: 'TEST' } })).toBe(false);
  });
});

describe('handlePocketBaseError', () => {
  it('should handle generic Error', () => {
    const error = new Error('Something went wrong');
    const result = handlePocketBaseError(error);
    
    expect(result.error.code).toBe('SERVER_ERROR');
    expect(result.error.message).toBe('Something went wrong');
  });

  it('should handle string error', () => {
    const result = handlePocketBaseError('String error message');
    
    expect(result.error.code).toBe('SERVER_ERROR');
    expect(result.error.message).toBe('String error message');
  });

  it('should pass through existing ErrorResponse', () => {
    const existingError = createErrorResponse(
      ErrorCodes.AUTH_REQUIRED,
      'Auth required'
    );
    
    const result = handlePocketBaseError(existingError);
    
    expect(result).toBe(existingError);
  });

  it('should handle 401 ClientResponseError as AUTH_FAILED', () => {
    const error = new ClientResponseError({
      status: 401,
      data: { message: 'Invalid credentials' },
    });
    
    const result = handlePocketBaseError(error);
    
    expect(result.error.code).toBe('AUTH_FAILED');
  });

  it('should handle 403 ClientResponseError as PERMISSION_DENIED', () => {
    const error = new ClientResponseError({
      status: 403,
      data: { message: 'Access denied' },
    });
    
    const result = handlePocketBaseError(error);
    
    expect(result.error.code).toBe('PERMISSION_DENIED');
  });

  it('should handle 404 ClientResponseError as NOT_FOUND', () => {
    const error = new ClientResponseError({
      status: 404,
      data: { message: 'Record not found' },
    });
    
    const result = handlePocketBaseError(error);
    
    expect(result.error.code).toBe('NOT_FOUND');
  });

  it('should handle 400 ClientResponseError as VALIDATION_ERROR', () => {
    const error = new ClientResponseError({
      status: 400,
      data: { 
        message: 'Validation failed',
        data: {
          email: { message: 'Invalid email' },
        },
      },
    });
    
    const result = handlePocketBaseError(error);
    
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.fieldErrors?.email).toBe('Invalid email');
  });

  it('should handle 429 ClientResponseError as RATE_LIMITED', () => {
    const error = new ClientResponseError({
      status: 429,
      data: {},
    });
    
    const result = handlePocketBaseError(error);
    
    expect(result.error.code).toBe('RATE_LIMITED');
  });

  it('should handle unknown status as SERVER_ERROR', () => {
    const error = new ClientResponseError({
      status: 500,
      data: { message: 'Internal server error' },
    });

    const result = handlePocketBaseError(error);

    expect(result.error.code).toBe('SERVER_ERROR');
  });

  it('should attribute connection errors to urlHint when provided', () => {
    const error = new TypeError('fetch failed');
    const result = handlePocketBaseError(error, 'http://example.test:8090');

    expect(result.error.code).toBe('CONNECTION_ERROR');
    expect(result.error.message).toContain('http://example.test:8090');
  });
});

describe('connection registry', () => {
  beforeEach(() => {
    delete process.env.POCKETBASE_URL;
    (globalThis as any).__pbResetControl?.();
    resetRegistry();
  });

  afterEach(() => {
    delete process.env.POCKETBASE_URL;
    (globalThis as any).__pbResetControl?.();
    resetRegistry();
  });

  describe('registerConnection', () => {
    it('registers a connection after a successful health check', async () => {
      const entry = await registerConnection('local', 'http://localhost:8090');
      expect(entry.name).toBe('local');
      expect(entry.url).toBe('http://localhost:8090');
      expect(listConnections()).toHaveLength(1);
    });

    it('is idempotent for the same name + same URL (re-pings)', async () => {
      const first = await registerConnection('local', 'http://localhost:8090');
      const second = await registerConnection('local', 'http://localhost:8090');
      expect(second).toBe(first);
      expect(listConnections()).toHaveLength(1);
    });

    it('rejects same name with a different URL', async () => {
      await registerConnection('local', 'http://localhost:8090');
      await expect(
        registerConnection('local', 'http://localhost:9999')
      ).rejects.toMatchObject({
        error: { code: ErrorCodes.VALIDATION_ERROR },
      });
      // Original connection survives.
      expect(listConnections()).toHaveLength(1);
      expect(listConnections()[0].url).toBe('http://localhost:8090');
    });

    it('throws CONNECTION_ERROR and does not register when health check fails', async () => {
      (globalThis as any).__pbControl('http://nope:1234', { healthFails: true });
      await expect(
        registerConnection('bad', 'http://nope:1234')
      ).rejects.toMatchObject({
        error: { code: ErrorCodes.CONNECTION_ERROR },
      });
      expect(listConnections()).toHaveLength(0);
    });
  });

  describe('unregisterConnection', () => {
    it('removes a known connection and returns true', async () => {
      await registerConnection('local', 'http://localhost:8090');
      expect(unregisterConnection('local')).toBe(true);
      expect(listConnections()).toHaveLength(0);
    });

    it('returns false for an unknown name', () => {
      expect(unregisterConnection('nope')).toBe(false);
    });
  });

  describe('resolveInstance / resolveInstanceEntry', () => {
    it('throws NO_CONNECTION when no instances are registered and name is omitted', () => {
      expect(() => resolveInstance()).toThrowError(
        expect.objectContaining({
          error: expect.objectContaining({ code: ErrorCodes.NO_CONNECTION }),
        })
      );
    });

    it('returns the only registered instance when name is omitted', async () => {
      await registerConnection('only', 'http://localhost:8090');
      const client = resolveInstance();
      expect(client.baseURL).toBe('http://localhost:8090');
    });

    it('throws VALIDATION_ERROR listing names when multiple are registered and name is omitted', async () => {
      await registerConnection('a', 'http://localhost:8090');
      await registerConnection('b', 'http://localhost:8091');
      expect(() => resolveInstance()).toThrowError(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCodes.VALIDATION_ERROR,
            suggestion: expect.stringContaining('a, b'),
          }),
        })
      );
    });

    it('returns the named instance when present', async () => {
      await registerConnection('a', 'http://localhost:8090');
      await registerConnection('b', 'http://localhost:8091');
      const entry = resolveInstanceEntry('b');
      expect(entry.url).toBe('http://localhost:8091');
    });

    it('throws VALIDATION_ERROR listing registered names when the named instance is missing', async () => {
      await registerConnection('a', 'http://localhost:8090');
      expect(() => resolveInstance('missing')).toThrowError(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCodes.VALIDATION_ERROR,
            suggestion: expect.stringContaining('a'),
          }),
        })
      );
    });
  });

  describe('legacy POCKETBASE_URL shim', () => {
    it('lazy-registers POCKETBASE_URL as "default" on first resolve', () => {
      process.env.POCKETBASE_URL = 'http://legacy:8090';
      const client = resolveInstance();
      expect(client.baseURL).toBe('http://legacy:8090');
      expect(listConnections()).toHaveLength(1);
      expect(listConnections()[0].name).toBe('default');
    });

    it('does not run again after the first call (caches the attempt)', () => {
      // No env var set during initial resolve → throws NO_CONNECTION
      expect(() => resolveInstance()).toThrowError(
        expect.objectContaining({
          error: expect.objectContaining({ code: ErrorCodes.NO_CONNECTION }),
        })
      );
      // Setting the env var afterwards is ignored — shim is one-shot
      process.env.POCKETBASE_URL = 'http://late:8090';
      expect(() => resolveInstance()).toThrowError(
        expect.objectContaining({
          error: expect.objectContaining({ code: ErrorCodes.NO_CONNECTION }),
        })
      );
    });
  });

  describe('getAuthState / requireAdminAuth', () => {
    it('getAuthState reports unauthenticated for a fresh connection', async () => {
      await registerConnection('local', 'http://localhost:8090');
      const state = getAuthState('local');
      expect(state.isAuthenticated).toBe(false);
      expect(state.authType).toBeNull();
    });

    it('requireAdminAuth throws AUTH_REQUIRED when not a superuser', async () => {
      await registerConnection('local', 'http://localhost:8090');
      expect(() => requireAdminAuth('local')).toThrowError(
        expect.objectContaining({
          error: expect.objectContaining({ code: ErrorCodes.AUTH_REQUIRED }),
        })
      );
    });
  });
});
