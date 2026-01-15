/**
 * PocketBase Service - SDK Wrapper and Error Handling
 */

import PocketBase, { ClientResponseError } from 'pocketbase';
import { ErrorCodes, type ErrorCode } from '../constants.js';
import type { AuthState, ErrorResponse } from '../types.js';

/** Singleton PocketBase client instance */
let pbClient: PocketBase | null = null;

/**
 * Get or create the PocketBase client singleton
 * @throws Error if POCKETBASE_URL is not set
 */
export function getClient(): PocketBase {
  if (!pbClient) {
    const url = process.env.POCKETBASE_URL;
    if (!url) {
      throw new Error('POCKETBASE_URL environment variable is required');
    }
    pbClient = new PocketBase(url);
  }
  return pbClient;
}

/**
 * Reset the PocketBase client (useful for testing)
 */
export function resetClient(): void {
  if (pbClient) {
    pbClient.authStore.clear();
  }
  pbClient = null;
}

/**
 * Get current authentication state
 */
export function getAuthState(): AuthState {
  const pb = getClient();
  const model = pb.authStore.model;
  
  return {
    isAuthenticated: pb.authStore.isValid,
    authType: pb.authStore.isAdmin ? 'admin' : (model ? 'user' : null),
    model: model ? {
      id: model.id as string,
      email: (model.email ?? model.username ?? '') as string,
      ...(model as Record<string, unknown>),
    } : null,
    tokenValid: pb.authStore.isValid,
    tokenExpiry: null, // SDK doesn't expose token expiry directly
  };
}

/**
 * Check if current auth is admin
 * @throws ErrorResponse if not authenticated as admin
 */
export function requireAdminAuth(): void {
  const pb = getClient();
  if (!pb.authStore.isAdmin) {
    throw createErrorResponse(
      ErrorCodes.AUTH_REQUIRED,
      'Admin authentication required for this operation',
      'Use pocketbase_auth_admin tool to authenticate as admin first'
    );
  }
}

/**
 * Create a structured error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  suggestion?: string,
  fieldErrors?: Record<string, string>
): ErrorResponse {
  return {
    error: {
      code,
      message,
      ...(suggestion && { suggestion }),
      ...(fieldErrors && { fieldErrors }),
    },
  };
}

/**
 * Handle PocketBase errors and convert to structured ErrorResponse
 */
export function handlePocketBaseError(error: unknown): ErrorResponse {
  // Connection errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createErrorResponse(
      ErrorCodes.CONNECTION_ERROR,
      `Cannot connect to PocketBase server: ${process.env.POCKETBASE_URL}`,
      'Check that PocketBase is running and POCKETBASE_URL is correct'
    );
  }
  
  // PocketBase API errors
  if (error instanceof ClientResponseError) {
    const status = error.status;
    const data = error.data;
    
    // Extract field-specific errors if present
    const fieldErrors = data?.data as Record<string, { message: string }> | undefined;
    const formattedFieldErrors = fieldErrors
      ? Object.fromEntries(
          Object.entries(fieldErrors).map(([k, v]) => [k, v.message])
        )
      : undefined;
    
    switch (status) {
      case 400:
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          data?.message || 'Invalid request data',
          'Check the input parameters and try again',
          formattedFieldErrors
        );
      
      case 401:
        return createErrorResponse(
          ErrorCodes.AUTH_FAILED,
          'Authentication failed: Invalid credentials',
          'Check email and password, then try again'
        );
      
      case 403:
        return createErrorResponse(
          ErrorCodes.PERMISSION_DENIED,
          data?.message || 'Permission denied',
          'You do not have permission to perform this operation. Check collection rules or authenticate with appropriate credentials.'
        );
      
      case 404:
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          data?.message || 'Resource not found',
          'Check that the collection and record ID are correct'
        );
      
      case 429:
        return createErrorResponse(
          ErrorCodes.RATE_LIMITED,
          'Rate limit exceeded',
          'Wait a moment and try again'
        );
      
      default:
        return createErrorResponse(
          ErrorCodes.SERVER_ERROR,
          data?.message || `Server error (${status})`,
          'Check PocketBase server logs for details'
        );
    }
  }
  
  // ErrorResponse passthrough
  if (isErrorResponse(error)) {
    return error;
  }
  
  // Generic errors
  const message = error instanceof Error ? error.message : String(error);
  return createErrorResponse(
    ErrorCodes.SERVER_ERROR,
    message,
    'An unexpected error occurred'
  );
}

/**
 * Type guard for ErrorResponse
 */
export function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ErrorResponse).error === 'object' &&
    'code' in (value as ErrorResponse).error &&
    'message' in (value as ErrorResponse).error
  );
}
