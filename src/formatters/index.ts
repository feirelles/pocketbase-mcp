/**
 * Output Formatters Index
 */

import { formatToToml } from './toml.js';
import { formatToJson } from './json.js';
import { DEFAULT_FORMAT } from '../constants.js';
import type { OutputFormat } from '../types.js';

export { formatToToml } from './toml.js';
export { formatToJson } from './json.js';

/**
 * Format data based on the specified format
 * @param data - Data to format
 * @param format - Output format ('toml' or 'json')
 * @returns Formatted string
 */
export function format(data: unknown, format: OutputFormat = DEFAULT_FORMAT): string {
  switch (format) {
    case 'json':
      return formatToJson(data);
    case 'toml':
    default:
      return formatToToml(data);
  }
}
