import type { Analysis } from '../types.js';

/**
 * Formats an Analysis result as a pretty-printed JSON string.
 *
 * The output wraps the Analysis in a standard envelope with a `format`
 * field for downstream consumers.
 */
export function formatJson(analysis: Analysis): string {
  return JSON.stringify(analysis, null, 2);
}
