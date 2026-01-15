/**
 * TOML Output Formatter
 */

import TOML from '@iarna/toml';

/**
 * Format data as TOML string
 */
export function formatToToml(data: unknown): string {
  // TOML.stringify expects an object at the top level
  if (typeof data !== 'object' || data === null) {
    return TOML.stringify({ value: data } as TOML.JsonMap);
  }
  
  // Convert to TOML-compatible format
  const tomlData = convertToTomlCompatible(data);
  return TOML.stringify(tomlData as TOML.JsonMap);
}

/**
 * Convert JavaScript object to TOML-compatible format
 * - Converts Date objects to ISO strings
 * - Handles nested objects and arrays
 */
function convertToTomlCompatible(data: unknown): unknown {
  if (data === null || data === undefined) {
    return '';
  }
  
  if (data instanceof Date) {
    return data.toISOString();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => convertToTomlCompatible(item));
  }
  
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip undefined values
      if (value !== undefined) {
        result[key] = convertToTomlCompatible(value);
      }
    }
    return result;
  }
  
  return data;
}
