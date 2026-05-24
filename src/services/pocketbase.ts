/**
 * PocketBase Service - Named-connection registry and error handling.
 *
 * Multiple PocketBase instances can be registered under distinct names via
 * `registerConnection()`. Tool handlers resolve the target instance with
 * `resolveInstance(name?)`. Auth state is isolated per registered client.
 */

import PocketBase, { ClientResponseError } from 'pocketbase';
import { ErrorCodes, type ErrorCode } from '../constants.js';
import type { AuthState, ConnectionInfo, ErrorResponse } from '../types.js';

/** A registered PocketBase connection. */
interface ConnectionEntry {
  name: string;
  url: string;
  client: PocketBase;
  registeredAt: Date;
}

const registry = new Map<string, ConnectionEntry>();
let legacyEnvAttempted = false;

/**
 * Build a PocketBase client for `url` without storing it.
 * Used by `registerConnection` and by ad-hoc `health_check` calls.
 */
function buildClient(url: string): PocketBase {
  const client = new PocketBase(url);
  client.autoCancellation(false);
  return client;
}

/**
 * Backward-compatibility shim. When no connections are registered and
 * `POCKETBASE_URL` is set, lazy-register it as 'default' (synchronously,
 * without a health check — matches the pre-2.0 behavior of `getClient()`).
 *
 * Only runs once per process; subsequent invocations are no-ops.
 */
function maybeRegisterLegacyEnv(): void {
  if (legacyEnvAttempted || registry.size > 0) return;
  legacyEnvAttempted = true;
  const url = process.env.POCKETBASE_URL;
  if (!url) return;
  const client = buildClient(url);
  registry.set('default', { name: 'default', url, client, registeredAt: new Date() });
}

/**
 * Register a named PocketBase connection. Validates reachability via
 * `/api/health` before storing. Throws `ErrorResponse` on failure; does
 * NOT register the connection in that case.
 *
 * Idempotent for same name + same URL (re-pings, returns existing entry).
 * Rejects same name + different URL (caller must disconnect first).
 */
export async function registerConnection(name: string, url: string): Promise<ConnectionEntry> {
  const existing = registry.get(name);
  if (existing && existing.url !== url) {
    throw createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      `Connection '${name}' is already registered to ${existing.url}`,
      `Call pocketbase_disconnect with name='${name}' first, then reconnect.`
    );
  }

  const client = existing ? existing.client : buildClient(url);
  try {
    await client.health.check();
  } catch {
    throw createErrorResponse(
      ErrorCodes.CONNECTION_ERROR,
      `Cannot reach PocketBase at ${url}`,
      'Check the URL and that PocketBase is running. Tool: pocketbase_health_check url=<url> to test without registering.',
      undefined
    );
  }

  if (existing) return existing;

  const entry: ConnectionEntry = { name, url, client, registeredAt: new Date() };
  registry.set(name, entry);
  return entry;
}

/**
 * Remove a connection from the registry. Clears its authStore.
 * Returns true if a connection was removed, false if `name` was unknown.
 */
export function unregisterConnection(name: string): boolean {
  const entry = registry.get(name);
  if (!entry) return false;
  entry.client.authStore.clear();
  registry.delete(name);
  return true;
}

/**
 * List all registered connections as plain snapshots.
 */
export function listConnections(): ConnectionInfo[] {
  return Array.from(registry.values()).map(entry => {
    const isSuperuser = entry.client.authStore.isSuperuser;
    const record = entry.client.authStore.record;
    return {
      name: entry.name,
      url: entry.url,
      isAuthenticated: entry.client.authStore.isValid,
      authType: isSuperuser ? 'admin' : record ? 'user' : null,
      registeredAt: entry.registeredAt.toISOString(),
    };
  });
}

/** Build a transient (non-registered) PocketBase client for ad-hoc operations. */
export function createTransientClient(url: string): PocketBase {
  return buildClient(url);
}

/**
 * Resolve a connection by name. Implements the resolution matrix:
 * - name provided + found → return entry
 * - name provided + missing → VALIDATION_ERROR listing registered names
 * - name omitted + zero registered → NO_CONNECTION
 * - name omitted + one registered → return that one
 * - name omitted + multiple registered → VALIDATION_ERROR listing names
 */
export function resolveInstanceEntry(name?: string): ConnectionEntry {
  maybeRegisterLegacyEnv();

  if (name !== undefined) {
    const entry = registry.get(name);
    if (entry) return entry;
    throw createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      `Unknown connection '${name}'`,
      registry.size === 0
        ? 'No connections registered. Call pocketbase_connect first.'
        : `Registered connections: ${Array.from(registry.keys()).join(', ')}. Use pocketbase_connect to add this one.`
    );
  }

  if (registry.size === 0) {
    throw createErrorResponse(
      ErrorCodes.NO_CONNECTION,
      'No PocketBase connection registered',
      'Call pocketbase_connect with a name and URL to register an instance, e.g. pocketbase_connect name="local" url="http://localhost:8090".'
    );
  }

  if (registry.size === 1) {
    return registry.values().next().value as ConnectionEntry;
  }

  throw createErrorResponse(
    ErrorCodes.VALIDATION_ERROR,
    'Multiple PocketBase connections registered; instance parameter required',
    `Registered: ${Array.from(registry.keys()).join(', ')}. Pass instance=<name> to the tool call.`
  );
}

/** Resolve and return the PocketBase client only. */
export function resolveInstance(name?: string): PocketBase {
  return resolveInstanceEntry(name).client;
}

/**
 * @deprecated Use resolveInstance(name?). Kept as a shim during the
 * step-by-step migration; will be removed in step 5 of the multi-instance
 * refactor.
 */
export function getClient(): PocketBase {
  return resolveInstance(undefined);
}

/** Clear the registry. Testing only. */
export function resetRegistry(): void {
  for (const entry of registry.values()) {
    entry.client.authStore.clear();
  }
  registry.clear();
  legacyEnvAttempted = false;
}

/**
 * @deprecated Backward-compat alias for resetRegistry().
 */
export function resetClient(): void {
  resetRegistry();
}

/** Get current authentication state for a connection. */
export function getAuthState(name?: string): AuthState {
  const entry = resolveInstanceEntry(name);
  const pb = entry.client;
  const record = pb.authStore.record;
  const isSuperuser = pb.authStore.isSuperuser;

  return {
    isAuthenticated: pb.authStore.isValid,
    authType: isSuperuser ? 'admin' : record ? 'user' : null,
    model: record ? {
      id: record.id as string,
      email: (record.email ?? record.username ?? '') as string,
      collectionName: record.collectionName as string,
      ...(record as Record<string, unknown>),
    } : null,
    tokenValid: pb.authStore.isValid,
    tokenExpiry: null,
  };
}

/**
 * Require the resolved connection to be authenticated as a superuser.
 * Throws ErrorResponse otherwise.
 */
export function requireAdminAuth(name?: string): void {
  const entry = resolveInstanceEntry(name);
  if (!entry.client.authStore.isSuperuser) {
    throw createErrorResponse(
      ErrorCodes.AUTH_REQUIRED,
      'Admin authentication required for this operation',
      name
        ? `Use pocketbase_auth_admin instance='${name}' to authenticate first.`
        : 'Use pocketbase_auth_admin to authenticate as admin first.'
    );
  }
}

/** Build a structured error response. */
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
 * Map an arbitrary thrown value to a structured ErrorResponse.
 * `urlHint` (optional) lets callers attribute connection errors to a
 * specific URL instead of leaking the legacy env var.
 */
export function handlePocketBaseError(error: unknown, urlHint?: string): ErrorResponse {
  // Connection errors (fetch failure)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    const target = urlHint ?? process.env.POCKETBASE_URL ?? '(unknown)';
    return createErrorResponse(
      ErrorCodes.CONNECTION_ERROR,
      `Cannot connect to PocketBase server: ${target}`,
      'Check that PocketBase is running and the connection URL is correct.'
    );
  }

  // PocketBase API errors
  if (error instanceof ClientResponseError) {
    const status = error.status;
    const data = error.data;

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

/** Type guard for ErrorResponse */
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
