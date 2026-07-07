/**
 * ContextHintManager — auto-detects the current context mode and provides
 * contextual hints for the status bar.
 *
 * Hints change automatically based on:
 * - Browsing: Normal navigation
 * - Searching: Search is active
 * - Palette: Command palette is open
 * - Loading: An operation is in progress
 * - Exporting: Exporting data
 * - Scanning: Scanning repository
 * - Error: Error state
 *
 * Integrates with EventBus to react to state changes.
 */

import type { EventBus } from '../../event-bus/bus.js';
import type { ContextMode, ContextHint } from './types.js';
import { CONTEXT_HINTS, detectContextMode } from './types.js';

// ─── ContextHintManager ───────────────────────────────────────────

export class ContextHintManager {
  private readonly _eventBus: EventBus;
  private _currentMode: ContextMode = 'browsing';
  private _onChange: ((hint: ContextHint) => void) | null = null;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
    this._setupListeners();
  }

  // ── Mode Detection ────────────────────────────────────────────

  /**
   * Update the current context mode based on workspace state.
   */
  updateMode(params: {
    searchActive: boolean;
    paletteOpen: boolean;
    isLoading: boolean;
    isScanning: boolean;
    isAnalyzing: boolean;
    isExporting: boolean;
    isError: boolean;
  }): void {
    const newMode = detectContextMode(params);

    if (newMode !== this._currentMode) {
      this._currentMode = newMode;
      this._notify();
    }
  }

  /**
   * Set the mode directly.
   */
  setMode(mode: ContextMode): void {
    if (mode !== this._currentMode) {
      this._currentMode = mode;
      this._notify();
    }
  }

  // ── Accessors ─────────────────────────────────────────────────

  /** Get the current context mode. */
  get currentMode(): ContextMode {
    return this._currentMode;
  }

  /** Get the current context hint. */
  get currentHint(): ContextHint {
    return CONTEXT_HINTS[this._currentMode] ?? CONTEXT_HINTS.browsing;
  }

  /** Get the status text for the current mode. */
  get statusText(): string {
    return this.currentHint.statusText;
  }

  /** Get the hint text for the current mode. */
  get hintText(): string {
    return this.currentHint.hintText;
  }

  /** Get the shortcuts string for the current mode. */
  get shortcuts(): string {
    return this.currentHint.shortcuts;
  }

  /** Whether the current mode shows progress. */
  get showProgress(): boolean {
    return this.currentHint.showProgress;
  }

  /**
   * Register a callback for mode changes.
   */
  onChange(callback: (hint: ContextHint) => void): void {
    this._onChange = callback;
  }

  // ── Internal ──────────────────────────────────────────────────

  private _setupListeners(): void {
    // React to search events
    this._eventBus.on('search-opened', () => {
      this.setMode('searching');
    });
    this._eventBus.on('search-closed', () => {
      this.setMode('browsing');
    });
  }

  private _notify(): void {
    this._onChange?.(this.currentHint);
  }
}
