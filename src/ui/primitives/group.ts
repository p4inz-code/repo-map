/**
 * Group primitive — labeled content section with indented items.
 *
 * # Architecture Rules
 * - MUST NOT know about other primitives, screens, or business logic.
 * - MUST NOT emit ANSI codes directly.
 */

/**
 * Options for rendering a group.
 */
export interface GroupOptions {
  /** Section title (displayed as a bold label). */
  title: string;
  /** Content items to display below the title. */
  items: string[];
  /** Indentation level for items (number of spaces). Default: 0. */
  indent?: number;
}

/**
 * Render a labeled content group: a title line followed by indented items.
 *
 * @example
 * renderGroup({ title: 'Languages', items: ['TypeScript', 'JavaScript'] })
 * // ['Languages', '  TypeScript', '  JavaScript']
 */
export function renderGroup(options: GroupOptions): string[] {
  const { title, items } = options;
  const indent = options.indent ?? 0;
  const indentStr = ' '.repeat(indent);

  const lines: string[] = [];

  // Title line
  lines.push(`${indentStr}${title}`);

  // Indented items
  for (const item of items) {
    lines.push(`${indentStr}  ${item}`);
  }

  return lines;
}
