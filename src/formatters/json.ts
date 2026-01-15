/**
 * JSON Output Formatter
 */

/**
 * Format data as pretty JSON string
 */
export function formatToJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
