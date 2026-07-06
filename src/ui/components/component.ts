/**
 * Component — abstract base class for all TUI components.
 *
 * Every visual element in the TUI framework extends Component.
 * Components produce styled Lines via the render() method, which
 * the Renderer converts to ANSI-wrapped terminal output.
 *
 * # Architecture
 * - Components are composable: a Panel contains Sections, etc.
 * - Components have a dirty flag for render optimization.
 * - Cache rendered buffers when not dirty for reuse.
 * - Components do NOT write to the terminal directly.
 *
 * # Lifecycle
 * ```
 * class MyComponent extends Component {
 *   get height(): number { return this._cachedLines.length; }
 *   renderContent(renderer: Renderer): Line[] { return this._lines; }
 * }
 * ```
 *
 * # Dirty State Rendering
 * - Call markDirty() when component state changes.
 * - The RenderLoop checks dirty flags and only re-renders dirty components.
 * - Cached buffers are invalidated when marked dirty.
 */

import type { Renderer, Line } from '../renderer.js';
import type { TextStyle, ColorToken } from '../theme/index.js';

// ─── Component ─────────────────────────────────────────────────

export abstract class Component {
  /** Unique identifier for this component (used for focus tracking). */
  readonly id: string;

  /** Whether this component needs re-rendering. */
  private _dirty: boolean = true;

  /** Cached render output (reused when not dirty). */
  private _cachedLines: Line[] | null = null;

  /**
   * @param id - Unique identifier for this component instance.
   */
  constructor(id: string) {
    this.id = id;
  }

  /**
   * The number of terminal lines this component occupies.
   * Used by parent components for layout calculations.
   */
  abstract get height(): number;

  /**
   * Render this component to styled Lines.
   * Called by the framework when dirty.
   * Override renderContent() instead of this method.
   *
   * @param renderer - The Renderer for ANSI style resolution.
   * @returns An array of styled Lines.
   */
  render(renderer: Renderer): Line[] {
    if (!this._dirty && this._cachedLines !== null) {
      return this._cachedLines;
    }
    const lines = this.renderContent(renderer);
    this._cachedLines = lines;
    this._dirty = false;
    return lines;
  }

  /**
   * Implement this method to provide the component's content.
   *
   * @param renderer - The Renderer for ANSI style resolution.
   * @returns An array of styled Lines.
   */
  protected abstract renderContent(renderer: Renderer): Line[];

  // ── Dirty State ──────────────────────────────────────────────

  /**
   * Mark this component as dirty, requiring re-render on next frame.
   */
  markDirty(): void {
    this._dirty = true;
    this._cachedLines = null;
  }

  /**
   * Whether this component needs re-rendering.
   */
  get isDirty(): boolean {
    return this._dirty;
  }

  /**
   * Force-clear dirty flag (for testing).
   */
  clearDirty(): void {
    this._dirty = false;
  }

  // ── Lifecycle ────────────────────────────────────────────────

  /**
   * Called when this component gains focus.
   * Implementations should call markDirty() to trigger re-render.
   */
  onFocus(): void {
    this.markDirty();
  }

  /**
   * Called when this component loses focus.
   * Implementations should call markDirty() to trigger re-render.
   */
  onBlur(): void {
    this.markDirty();
  }

  /**
   * Called when the component is removed. Clean up resources.
   */
  dispose(): void {
    this._cachedLines = null;
    this._dirty = true;
  }
}

// ─── Helper utilities for components ───────────────────────────

/**
 * Create a simple unstyled line from text.
 */
export function line(text: string): Line {
  return { segments: [{ text }] };
}

/**
 * Create a styled line segment.
 */
export function segment(text: string, style?: TextStyle): Line {
  return { segments: [style ? { text, style } : { text }] };
}

/**
 * Create a line with multiple styled segments.
 */
export function join(...segments: { text: string; style?: TextStyle }[]): Line {
  return { segments };
}

/**
 * Create a blank (empty) line.
 */
export function blank(): Line {
  return { segments: [{ text: '' }] };
}

/**
 * Create a divider line using the theme separator character.
 */
export function divider(renderer: Renderer, width: number): Line {
  const sep = renderer.theme.symbol('separator');
  return { segments: [{ text: sep.repeat(width) }] };
}

/**
 * Create a label-value pair as a single Line.
 */
export function labelValue(
  label: string,
  value: string,
  labelWidth: number = 20,
  valueStyle?: TextStyle,
): Line {
  const paddedLabel = label.padEnd(labelWidth);
  return {
    segments: [
      { text: paddedLabel, style: { bold: true } },
      { text: value, ...(valueStyle ? { style: valueStyle } : {}) },
    ],
  };
}

/**
 * Create a line with a marker prefix (for lists/suggestions).
 */
export function markedLine(
  marker: string,
  text: string,
  markerStyle?: TextStyle,
  textStyle?: TextStyle,
): Line {
  return {
    segments: [
      ...(markerStyle
        ? [{ text: ` ${marker} `, style: markerStyle }]
        : [{ text: ` ${marker} ` }]),
      ...(textStyle
        ? [{ text, style: textStyle }]
        : [{ text }]),
    ],
  };
}

/**
 * Apply a color to text using the renderer's theme.
 */
export function colored(text: string, color: ColorToken, renderer: Renderer): string {
  return renderer.theme.style(text, { color });
}
