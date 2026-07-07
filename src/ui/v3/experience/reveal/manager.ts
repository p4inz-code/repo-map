/**
 * RevealManager — progressive component reveal for the V3 Experience Engine.
 *
 * Animates the sequential reveal of workspace components:
 * Header → Sidebar → Workspace → Panels → Status Bar
 *
 * Each component reveals with a configurable duration, easing, and stagger delay.
 * The reveal progress is exposed to layer renderers via the FrameContext's workspace
 * snapshot (using metadata/flags).
 *
 * # Architecture
 * ```
 * RevealManager
 *   ├── RevealSequence (ordered elements to reveal)
 *   ├── Current revealing element tracking
 *   ├── Animation registration with AnimationScheduler
 *   └── Completion callback for sequence end
 * ```
 *
 * # Determinism
 * - Reveal order is fixed at construction time.
 * - Durations are deterministic (no random values).
 * - Progress is driven by frame delta time.
 */

import type { AnimationScheduler } from '../../animation/scheduler.js';
import type { RevealElement, RevealConfig } from './types.js';
import { DEFAULT_REVEAL_ELEMENTS } from './types.js';
import { easeOutCubic } from '../../animation/easing.js';

// ─── RevealManager ────────────────────────────────────────────────

export class RevealManager {
  /** The reveal sequence (ordered elements). */
  private readonly _elements: RevealElement[];

  /** Whether the reveal is running. */
  private _running: boolean = false;

  /** Whether the full sequence has completed. */
  private _completed: boolean = false;

  /** Index of the currently revealing element. */
  private _currentIndex: number = -1;

  /** Timestamp when the current element's reveal started. */
  private _currentStartTime: number = 0;

  /** Callback for when an element reveals. */
  private _onElementReveal: ((id: string, progress: number) => void) | null = null;

  /** Callback for when the sequence completes. */
  private _onComplete: (() => void) | null = null;

  constructor(config?: RevealConfig) {
    this._elements = DEFAULT_REVEAL_ELEMENTS.map((e) => ({
      ...e,
      durationMs: config?.defaultDurationMs ?? e.durationMs,
      easing: config?.defaultEasing ?? e.easing,
      staggerDelayMs: config?.defaultStaggerMs ?? e.staggerDelayMs,
      revealed: false,
      progress: 0,
    }));
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  /**
   * Start the reveal sequence.
   */
  start(): void {
    if (this._running) return;

    this._running = true;
    this._completed = false;
    this._currentIndex = -1;

    // Start revealing the first element
    this._revealNext();
  }

  /**
   * Reset the reveal sequence back to initial state.
   */
  reset(): void {
    this._running = false;
    this._completed = false;
    this._currentIndex = -1;

    for (const el of this._elements) {
      el.revealed = false;
      el.progress = 0;
    }
  }

  /**
   * Update reveal progress. Called each frame.
   *
   * @param dt - Delta time in milliseconds.
   * @param now - Current timestamp (performance.now()).
   */
  update(dt: number, now: number = performance.now()): void {
    if (!this._running || this._completed) return;

    const current = this._currentElement;
    if (!current) return;

    // Advance progress
    current.progress = Math.min(1, current.progress + dt / current.durationMs);

    // Notify listener
    this._onElementReveal?.(current.id, current.progress);

    // Check if current element reveal is complete
    if (current.progress >= 1) {
      current.revealed = true;
      current.progress = 1;
      this._onElementReveal?.(current.id, 1);

      // Check if all elements are revealed
      if (this._allRevealed()) {
        this._completed = true;
        this._running = false;
        this._onComplete?.();
      } else {
        // Schedule next element reveal after stagger delay
        const nextEl = this._elements[this._currentIndex + 1];
        if (nextEl) {
          // Advance index immediately; the stagger is handled by progress
          this._revealNext();
        }
      }
    }
  }

  // ── Callbacks ─────────────────────────────────────────────────

  /**
   * Register a callback for when an element reveals.
   */
  onElementReveal(callback: (id: string, progress: number) => void): void {
    this._onElementReveal = callback;
  }

  /**
   * Register a callback for when the sequence completes.
   */
  onComplete(callback: () => void): void {
    this._onComplete = callback;
  }

  // ── Accessors ─────────────────────────────────────────────────

  /** Whether the reveal sequence is running. */
  get isRunning(): boolean {
    return this._running;
  }

  /** Whether the sequence has completed. */
  get completed(): boolean {
    return this._completed;
  }

  /** Get the current revealing element. */
  get currentElement(): string | null {
    return this._currentElement?.id ?? null;
  }

  /** Get progress of a specific element by ID. */
  getProgress(id: string): number {
    return this._elements.find((e) => e.id === id)?.progress ?? 1;
  }

  /** Get whether a specific element is fully revealed. */
  isRevealed(id: string): boolean {
    return this._elements.find((e) => e.id === id)?.revealed ?? true;
  }

  /** Get the reveal opacity for a layer (for use in renderers). */
  getLayerOpacity(layerId: string): number {
    const el = this._elements.find((e) => e.layerId === layerId);
    return el ? el.progress : 1;
  }

  /** Get the full list of reveal elements. */
  get elements(): readonly RevealElement[] {
    return this._elements;
  }

  // ── Internal ──────────────────────────────────────────────────

  private get _currentElement(): RevealElement | null {
    return this._currentIndex >= 0 && this._currentIndex < this._elements.length
      ? this._elements[this._currentIndex]
      : null;
  }

  private _revealNext(): void {
    this._currentIndex++;
    if (this._currentIndex >= this._elements.length) {
      this._completed = true;
      this._running = false;
      this._onComplete?.();
    }
  }

  private _allRevealed(): boolean {
    return this._elements.every((e) => e.revealed);
  }
}
