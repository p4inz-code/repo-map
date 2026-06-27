/**
 * Divider primitive — horizontal rule with optional centered label.
 *
 * # Architecture Rules
 * - MUST NOT know about other primitives, screens, or business logic.
 * - MUST NOT emit ANSI codes directly.
 * - MUST NOT access terminal width directly (receive as parameter).
 */

/**
 * Options for rendering a divider line.
 */
export interface DividerOptions {
  /** Character to repeat for the rule. Defaults to the theme's 'separator' symbol. */
  char?: string;
  /** Optional label to center on the rule. */
  label?: string;
  /** Total width of the divider in character cells. Defaults to the calling context's width. */
  width?: number;
}

/**
 * Render a horizontal divider line.
 *
 * @example
 * renderDivider()                          // '──────────────────────'
 * renderDivider({ label: 'Languages' })    // '──── Languages ──────'
 * renderDivider({ char: '-', width: 10 })  // '──────────'
 */
export function renderDivider(options?: DividerOptions): string {
  const width = options?.width ?? 80;
  const char = options?.char ?? '─';

  if (width <= 0) return '';

  if (!options?.label) {
    return char.repeat(width);
  }

  // With label:  ─── label ───
  const label = ` ${options.label} `;
  const labelLen = label.length;
  const remaining = width - labelLen;

  if (remaining <= 0) {
    // Label is wider than available width — just return the label
    return options.label.slice(0, width);
  }

  const sideLen = Math.floor(remaining / 2);
  const left = char.repeat(sideLen);
  const right = char.repeat(remaining - sideLen);

  return `${left}${label}${right}`;
}
