/**
 * AccessibilityManager — accessibility modes for the Terminal Ecosystem.
 *
 * Provides:
 * - Reduced motion mode (disables animations and transitions)
 * - No color mode (removes all ANSI color codes)
 * - High contrast mode (enhances color contrast)
 * - Wide terminal mode (optimized for wide terminals)
 * - Narrow terminal mode (optimized for narrow terminals)
 *
 * All UI components check accessibility settings before rendering.
 * Everything remains usable regardless of mode.
 */

import type { EventBus } from '../../event-bus/bus.js';

// ─── Accessibility Mode Flags ───────────────────────────────────────

export interface AccessibilityFlags {
  /** Disable animations and transitions. */
  reducedMotion: boolean;
  /** Remove all ANSI color codes. */
  noColor: boolean;
  /** Enhance color contrast for readability. */
  highContrast: boolean;
  /** Optimize for wide terminals (≥120 cols). */
  wideMode: boolean;
  /** Optimize for narrow terminals (<60 cols). */
  narrowMode: boolean;
}

// ─── Accessibility State ────────────────────────────────────────────

export interface AccessibilityState {
  /** Current mode flags. */
  flags: AccessibilityFlags;
  /** Whether the accessibility overlay is visible. */
  showOverlay: boolean;
  /** Terminal width (used to determine wide/narrow mode). */
  terminalWidth: number;
  /** Terminal height. */
  terminalHeight: number;
}

// ─── AccessibilityManager ───────────────────────────────────────────

export class AccessibilityManager {
  private readonly _eventBus: EventBus;

  /** Current accessibility state. */
  private _state: AccessibilityState = {
    flags: {
      reducedMotion: false,
      noColor: false,
      highContrast: false,
      wideMode: false,
      narrowMode: false,
    },
    showOverlay: false,
    terminalWidth: 80,
    terminalHeight: 24,
  };

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
  }

  // ── Getters ───────────────────────────────────────────────────────

  /**
   * Get the current accessibility flags.
   */
  get flags(): AccessibilityFlags {
    return { ...this._state.flags };
  }

  /**
   * Get the full accessibility state.
   */
  getState(): AccessibilityState {
    return { ...this._state, flags: { ...this._state.flags } };
  }

  /**
   * Check if animations should be skipped.
   */
  get shouldReduceMotion(): boolean {
    return this._state.flags.reducedMotion;
  }

  /**
   * Check if colors should be stripped.
   */
  get shouldStripColor(): boolean {
    return this._state.flags.noColor;
  }

  /**
   * Check if high contrast mode is active.
   */
  get isHighContrast(): boolean {
    return this._state.flags.highContrast;
  }

  /**
   * Get the terminal width mode.
   */
  get widthMode(): 'wide' | 'normal' | 'narrow' {
    if (this._state.flags.wideMode) return 'wide';
    if (this._state.flags.narrowMode) return 'narrow';
    if (this._state.terminalWidth >= 120) return 'wide';
    if (this._state.terminalWidth < 60) return 'narrow';
    return 'normal';
  }

  // ── Setters ───────────────────────────────────────────────────────

  /**
   * Toggle reduced motion mode.
   */
  toggleReducedMotion(): void {
    this._state.flags.reducedMotion = !this._state.flags.reducedMotion;
    this._emitChange();
  }

  /**
   * Toggle no color mode.
   */
  toggleNoColor(): void {
    this._state.flags.noColor = !this._state.flags.noColor;
    this._emitChange();
  }

  /**
   * Toggle high contrast mode.
   */
  toggleHighContrast(): void {
    this._state.flags.highContrast = !this._state.flags.highContrast;
    this._emitChange();
  }

  /**
   * Set terminal dimensions (auto-detects wide/narrow).
   */
  setTerminalSize(width: number, height: number): void {
    this._state.terminalWidth = width;
    this._state.terminalHeight = height;
    this._state.flags.wideMode = width >= 120;
    this._state.flags.narrowMode = width < 60;
    this._emitChange();
  }

  /**
   * Set all flags at once.
   */
  setFlags(flags: Partial<AccessibilityFlags>): void {
    this._state.flags = { ...this._state.flags, ...flags };
    this._emitChange();
  }

  /**
   * Show or hide the accessibility overlay.
   */
  setShowOverlay(show: boolean): void {
    this._state.showOverlay = show;
  }

  /**
   * Toggle the accessibility overlay.
   */
  toggleOverlay(): void {
    this._state.showOverlay = !this._state.showOverlay;
  }

  /**
   * Reset all accessibility flags to defaults.
   */
  reset(): void {
    this._state.flags = {
      reducedMotion: false,
      noColor: false,
      highContrast: false,
      wideMode: false,
      narrowMode: false,
    };
    this._state.showOverlay = false;
    this._emitChange();
  }

  // ── Internal ──────────────────────────────────────────────────

  private _emitChange(): void {
    this._eventBus.emit('theme-changed', {
      themeName: this._state.flags.highContrast ? 'high-contrast' : 'default',
    }, 'accessibility');
  }
}
