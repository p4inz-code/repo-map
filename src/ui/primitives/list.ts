/**
 * List primitive — bulleted, pointer, ordered, or plain lists.
 *
 * # Architecture Rules
 * - MUST NOT know about other primitives, screens, or business logic.
 * - MUST NOT emit ANSI codes directly.
 */

export type ListStyle = 'bullet' | 'pointer' | 'ordered' | 'none';

/**
 * Options for rendering a list.
 */
export interface ListOptions {
  /** List items (plain text, no ANSI). */
  items: string[];
  /** Visual style of the list markers. */
  style?: ListStyle;
  /** Indentation level (number of spaces). Default: 0. */
  indent?: number;
}

// Marker maps
const MARKERS: Record<ListStyle, (i: number) => string> = {
  bullet: () => '·',
  pointer: () => '▸',
  ordered: (i: number) => `${i + 1}.`,
  none: () => '',
};

/**
 * Render a list of items with the specified marker style.
 *
 * @example
 * renderList(['Apples', 'Bananas', 'Cherries'], { style: 'bullet' })
 * // ['· Apples', '· Bananas', '· Cherries']
 *
 * renderList(['First', 'Second'], { style: 'ordered' })
 * // ['1. First', '2. Second']
 */
export function renderList(options: ListOptions): string[] {
  const { items } = options;
  const style = options.style ?? 'bullet';
  const indent = options.indent ?? 0;

  if (items.length === 0) return [];

  const indentStr = ' '.repeat(indent);
  const markerFn = MARKERS[style];

  return items.map((item, i) => {
    const marker = markerFn(i);
    if (!marker) {
      // 'none' style — just the item
      return `${indentStr}${item}`;
    }
    return `${indentStr}${marker} ${item}`;
  });
}
