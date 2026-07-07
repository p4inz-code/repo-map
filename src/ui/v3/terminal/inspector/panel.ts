/**
 * InspectorPanel — collapsible, resizable right-side inspector panel.
 *
 * Shows:
 * - Selection details (file info, metadata)
 * - Statistics (files, directories, health)
 * - Keyboard hints (current mode shortcuts)
 * - Future plugin panels
 *
 * Features:
 * - Animated collapse/expand
 * - Resizable (drag handle)
 * - Responsive width
 * - Integration with FrameContext
 */

import type { EventBus } from '../../event-bus/bus.js';
import type { AnimationScheduler } from '../../animation/scheduler.js';
import { easeOutCubic } from '../../animation/easing.js';

// ─── Inspector Section ────────────────────────────────────────────

export type InspectorSectionId = 'details' | 'stats' | 'hints' | 'plugins';

export interface InspectorSection {
  readonly id: InspectorSectionId;
  readonly label: string;
  readonly icon: string;
  visible: boolean;
  content: string[];
}

// ─── InspectorPanel ───────────────────────────────────────────────

export class InspectorPanel {
  private readonly _scheduler: AnimationScheduler;
  private readonly _eventBus: EventBus;

  /** Whether the panel is visible. */
  private _visible: boolean = true;

  /** Panel width in characters. */
  private _width: number = 30;

  /** Minimum and maximum width. */
  private readonly _minWidth: number = 15;
  private readonly _maxWidth: number = 50;

  /** Collapse/expand animation progress (0=collapsed, 1=expanded). */
  private _animProgress: number = 1;

  /** Sections to display. */
  private readonly _sections: Map<InspectorSectionId, InspectorSection> = new Map();

  /** Cached content lines for rendering. */
  private _cachedLines: string[] | null = null;

  constructor(scheduler: AnimationScheduler, eventBus: EventBus) {
    this._scheduler = scheduler;
    this._eventBus = eventBus;

    // Initialize default sections
    this._initSections();
  }

  // ── Visibility ───────────────────────────────────────────────

  /**
   * Toggle panel visibility with animation.
   */
  toggle(): void {
    if (this._visible) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  /**
   * Expand the panel with animation.
   */
  expand(): void {
    if (this._visible && this._animProgress >= 1) return;
    this._visible = true;

    this._scheduler.animate({
      id: 'inspector-expand',
      duration: 200,
      easing: easeOutCubic,
      from: this._animProgress,
      to: 1,
      onTick: (value) => {
        this._animProgress = value;
        this._cachedLines = null;
      },
    });
  }

  /**
   * Collapse the panel with animation.
   */
  collapse(): void {
    if (!this._visible || this._animProgress <= 0) return;

    this._scheduler.animate({
      id: 'inspector-collapse',
      duration: 200,
      easing: easeOutCubic,
      from: this._animProgress,
      to: 0,
      onTick: (value) => {
        this._animProgress = value;
        this._cachedLines = null;
      },
      onComplete: () => {
        this._visible = false;
      },
    });
  }

  // ── Resize ──────────────────────────────────────────────────

  /**
   * Resize the panel by a delta.
   */
  resizeBy(delta: number): void {
    this._width = Math.max(this._minWidth, Math.min(this._maxWidth, this._width + delta));
    this._cachedLines = null;
  }

  /**
   * Set panel width directly.
   */
  setWidth(width: number): void {
    this._width = Math.max(this._minWidth, Math.min(this._maxWidth, width));
    this._cachedLines = null;
  }

  // ── Content ─────────────────────────────────────────────────

  /**
   * Set a section's content.
   */
  setSectionContent(id: InspectorSectionId, content: string[]): void {
    const section = this._sections.get(id);
    if (section) {
      section.content = content;
      this._cachedLines = null;
    }
  }

  /**
   * Toggle a section's visibility.
   */
  toggleSection(id: InspectorSectionId): void {
    const section = this._sections.get(id);
    if (section) {
      section.visible = !section.visible;
      this._cachedLines = null;
    }
  }

  /**
   * Set a section's visibility.
   */
  showSection(id: InspectorSectionId, visible: boolean): void {
    const section = this._sections.get(id);
    if (section) {
      section.visible = visible;
      this._cachedLines = null;
    }
  }

  // ── Rendering ───────────────────────────────────────────────

  /**
   * Render the panel content.
   * @param availableWidth - The full available width for the panel.
   * @param availableHeight - The available height in rows.
   * @returns Array of strings, each representing a row with spaces for hidden/inactive.
   */
  render(availableWidth: number, availableHeight: number): string[] {
    if (!this._visible && this._animProgress <= 0) {
      return new Array(availableHeight).fill('');
    }

    const w = Math.max(1, Math.round(this._width * this._animProgress));
    if (w <= 1) {
      // When collapsed to minimum, just show a thin border
      return new Array(availableHeight).fill(' '.repeat(w));
    }

    const lines: string[] = [];
    const sep = '─';

    // Section: Details
    if (this._sections.get('details')?.visible) {
      const details = this._sections.get('details')!;
      lines.push(` ${details.icon} ${details.label}`);
      lines.push(` ${sep.repeat(Math.min(w - 2, 14))}`);
      for (const content of details.content) {
        lines.push(` ${content.slice(0, w - 2).padEnd(w - 2)}`);
      }
    }

    // Section: Stats
    if (this._sections.get('stats')?.visible) {
      const stats = this._sections.get('stats')!;
      if (lines.length > 0) lines.push('');
      lines.push(` ${stats.icon} ${stats.label}`);
      lines.push(` ${sep.repeat(Math.min(w - 2, 14))}`);
      for (const content of stats.content) {
        lines.push(` ${content.slice(0, w - 2).padEnd(w - 2)}`);
      }
    }

    // Section: Hints
    if (this._sections.get('hints')?.visible) {
      const hints = this._sections.get('hints')!;
      if (lines.length > 0) lines.push('');
      lines.push(` ${hints.icon} ${hints.label}`);
      lines.push(` ${sep.repeat(Math.min(w - 2, 14))}`);
      for (const content of hints.content) {
        lines.push(` ${content.slice(0, w - 2).padEnd(w - 2)}`);
      }
    }

    // Section: Plugin panels
    if (this._sections.get('plugins')?.visible) {
      const plugins = this._sections.get('plugins')!;
      if (lines.length > 0) lines.push('');
      lines.push(` ${plugins.icon} ${plugins.label}`);
      lines.push(` ${sep.repeat(Math.min(w - 2, 14))}`);
      for (const content of plugins.content) {
        lines.push(` ${content.slice(0, w - 2).padEnd(w - 2)}`);
      }
    }

    // Pad remaining height
    while (lines.length < availableHeight) {
      lines.push(` ${' '.repeat(Math.max(0, w - 2))}`);
    }

    // Truncate to available height
    this._cachedLines = lines.slice(0, availableHeight).map((l) => l.padEnd(w).slice(0, w));
    return this._cachedLines;
  }

  /**
   * Get the current effective width (considering animation).
   */
  get currentWidth(): number {
    return Math.max(0, Math.round(this._width * this._animProgress));
  }

  /** Whether the panel is visible. */
  get isVisible(): boolean {
    return this._visible;
  }

  /** Get the target width. */
  get targetWidth(): number {
    return this._width;
  }

  /** Get the current animation progress. */
  get animProgress(): number {
    return this._animProgress;
  }

  /** Reset to defaults. */
  reset(): void {
    this._visible = true;
    this._width = 30;
    this._animProgress = 1;
    this._sections.clear();
    this._initSections();
    this._cachedLines = null;
  }

  // ── Internal ─────────────────────────────────────────────────

  private _initSections(): void {
    this._sections.set('details', {
      id: 'details',
      label: 'Details',
      icon: '◆',
      visible: true,
      content: ['No selection'],
    });
    this._sections.set('stats', {
      id: 'stats',
      label: 'Statistics',
      icon: '█',
      visible: true,
      content: ['No data'],
    });
    this._sections.set('hints', {
      id: 'hints',
      label: 'Keys',
      icon: '?',
      visible: true,
      content: ['↑↓ Navigate', 'Enter Select', '? Help'],
    });
    this._sections.set('plugins', {
      id: 'plugins',
      label: 'Plugins',
      icon: '⚒',
      visible: false,
      content: ['No plugins active'],
    });
  }
}
