/**
 * SpinnerAnimation — frame-based spinner with cycling animation frames.
 *
 * Displays a sequence of characters (frames) cycling at a configurable
 * interval, with optional descriptive text.
 *
 * # Architecture Rules
 * - NO independent timers (uses AnimationManager's single interval).
 * - NO process.stdout writes.
 * - NO screen or layout logic.
 */

import type { Animation, AnimationFrame } from './types.js';

// Default spinner frames (classic braille spinner)
const DEFAULT_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Options for constructing a SpinnerAnimation.
 */
export interface SpinnerOptions {
  /** Custom frame characters to cycle through. */
  frames?: string[];
  /**
   * Minimum interval between frame advances in milliseconds.
   * The actual rate depends on the AnimationManager's tick interval.
   * Default: 80ms (matches default manager interval).
   */
  interval?: number;
  /** Whether animations are enabled. When false, renders a static character. */
  enabled?: boolean;
}

/**
 * Animation that displays a cycling spinner character with optional text.
 *
 * @example
 * ```ts
 * const spinner = new SpinnerAnimation('Scanning...');
 * spinner.tick(80); // → { lines: ['⠋ Scanning...'], position: 'inline' }
 * spinner.tick(80); // → { lines: ['⠙ Scanning...'], position: 'inline' }
 * ```
 */
export class SpinnerAnimation implements Animation {
  readonly type = 'spinner';

  private _text: string;
  private _frames: string[];
  private _frameIndex: number = 0;
  private _accumulated: number = 0;
  private _interval: number;
  private _enabled: boolean;
  private _disposed: boolean = false;

  /**
   * @param text    - Descriptive text displayed after the spinner character.
   * @param options - Optional configuration.
   */
  constructor(text: string = '', options?: SpinnerOptions) {
    this._text = text;
    this._frames = options?.frames ?? DEFAULT_FRAMES;
    this._interval = options?.interval ?? 80;
    this._enabled = options?.enabled ?? true;
  }

  /**
   * Update the spinner's descriptive text.
   */
  update(text: string): void {
    this._text = text;
  }

  /**
   * Called by the AnimationManager on each tick.
   *
   * @param dt - Milliseconds since the last tick.
   * @returns An AnimationFrame with the current spinner state, or
   *          `null` if animations are disabled.
   */
  tick(dt: number): AnimationFrame | null {
    if (this._disposed) return null;

    // Capture the current frame BEFORE advancing
    const currentFrame = this._frames[this._frameIndex];

    if (this._enabled) {
      // Advance frame based on accumulated time
      this._accumulated += dt;
      if (this._accumulated >= this._interval && this._frames.length > 0) {
        const steps = Math.floor(this._accumulated / this._interval);
        this._accumulated -= steps * this._interval;
        this._frameIndex = (this._frameIndex + steps) % this._frames.length;
      }
    }

    return {
      lines: [this._text ? `${currentFrame} ${this._text}` : currentFrame],
      position: 'inline',
    };
  }

  /**
   * Clean up resources. After disposal, tick() returns null.
   */
  dispose(): void {
    this._disposed = true;
  }
}
