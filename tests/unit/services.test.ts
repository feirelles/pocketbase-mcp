/**
 * Unit tests for PocketBase service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createErrorResponse, 
  handlePocketBaseError, 
  isErrorResponse 
} from '../../src/services/pocketbase.js';
import { ErrorCodes } from '../../src/constants.js';
import { ClientResponseError } from 'pocketbase';

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
});
