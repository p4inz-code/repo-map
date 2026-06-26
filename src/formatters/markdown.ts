import type { Analysis } from '../types.js';

/**
 * Formats an Analysis result as Markdown.
 *
 * Delegates to the pre-computed `architecture` field produced by
 * the ArchitectureGenerator during analysis.
 */
export function formatMarkdown(analysis: Analysis): string {
  return analysis.architecture;
}
