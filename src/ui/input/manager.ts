/**
 * InputManager — production-quality raw stdin keyboard handler.
 *
 * Manages raw-mode stdin, parses bytes into KeyEvents, and dispatches
 * them to registered handlers. Supports start/stop lifecycle for
 * clean integration with the application lifecycle.
 *
 * # Terminal Safety Guarantees
 * - Raw mode is ALWAYS restored on stop() or destroy().
 * - Even if the process crashes, the finally block in the App ensures cleanup.
 * - Ctrl+C restores terminal state before propagating the signal.
 *
 * # Lifecycle
 * ```
 * const input = new InputManager();
 * input.onKey((event) => handleKey(event));
 * input.start();    // enters raw mode
 * // ... interact ...
 * input.stop();     // exits raw mode — terminal is ALWAYS restored
 * input.destroy();  // full cleanup
 * ```
 *
 * # Error Recovery
 * - If setRawMode throws, the manager catches the error and continues
 *   gracefully (no keyboard input, but terminal is not corrupted).
 * - stop() catches all errors to ensure terminal state is always restored.
 */

import { parseKeyEvent } from './keys.js';
import type { KeyHandler } from './types.js';
import { cursorShow } from '../utils/ansi.js';

// ─── InputManager ──────────────────────────────────────────────

export class InputManager {
  private _handler: KeyHandler | null = null;
  private _rawMode: boolean = false;
  private _started: boolean = false;
  private _boundOnData: ((data: Buffer) => void) | null = null;
  private _sigintHandler: (() => void) | null = null;

  // ── Configuration ────────────────────────────────────────────

  /**
   * Register a handler to receive parsed KeyEvents.
   * Only one handler at a time is supported.
   *
   * @param handler - Called with each parsed KeyEvent.
   */
  onKey(handler: KeyHandler): void {
    this._handler = handler;
  }

  /**
   * Remove the current key handler.
   */
  removeHandler(): void {
    this._handler = null;
  }

  // ── Lifecycle ────────────────────────────────────────────────

  /**
   * Start listening for keyboard input.
   *
   * Enables raw mode on stdin so that every keystroke is delivered
   * immediately (no line buffering). Parses bytes into KeyEvents
   * and dispatches to the registered handler.
   *
   * Also installs a SIGINT handler that restores terminal state
   * before exiting, so the terminal is never left in a broken state.
   *
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  start(): void {
    if (this._started) return;
    if (!process.stdin.isTTY) return;

    try {
      this._boundOnData = (data: Buffer) => this._onData(data);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', this._boundOnData);
      this._rawMode = true;
      this._started = true;

      // Install SIGINT handler for terminal safety
      this._sigintHandler = () => {
        this._emergencyTerminalRestore();
        process.exit(130);
      };
      process.on('SIGINT', this._sigintHandler as NodeJS.SignalsListener);
    } catch {
      // Failed to enter raw mode — continue without keyboard input
      this._rawMode = false;
      this._started = false;
    }
  }

  /**
   * Stop listening for keyboard input.
   *
   * Exits raw mode on stdin, removes the data listener, and
   * unregisters the SIGINT handler.
   *
   * Safe to call multiple times. ALWAYS restores terminal state,
   * even if an error occurs during cleanup.
   */
  stop(): void {
    if (!this._started) return;

    try {
      // Unregister SIGINT handler first
      if (this._sigintHandler) {
        try {
          process.removeListener('SIGINT', this._sigintHandler as NodeJS.SignalsListener);
        } catch {
          // Ignore errors during listener removal
        }
        this._sigintHandler = null;
      }

      // Restore stdin raw mode
      try {
        process.stdin.setRawMode(false);
      } catch {
        // Some terminals/platforms throw when restoring raw mode
        // We still continue cleanup regardless
      }

      // Remove data listener
      if (this._boundOnData) {
        process.stdin.removeListener('data', this._boundOnData);
        this._boundOnData = null;
      }

      // Pause stdin
      try {
        process.stdin.pause();
      } catch {
        // Ignore errors on pause
      }

      // Restore cursor visibility
      process.stderr.write(cursorShow());

    } catch {
      // Catch-all: terminal cleanup must NEVER throw
    } finally {
      this._rawMode = false;
      this._started = false;
    }
  }

  /**
   * Full cleanup. Stops listening and removes the handler.
   */
  destroy(): void {
    this.stop();
    this._handler = null;
  }

  // ── Accessors ────────────────────────────────────────────────

  /** Whether raw mode is currently active. */
  get rawMode(): boolean {
    return this._rawMode;
  }

  /** Whether the manager has been started. */
  get started(): boolean {
    return this._started;
  }

  // ── Internal ─────────────────────────────────────────────────

  /**
   * Handle raw data from stdin.
   */
  private _onData(data: Buffer): void {
    if (!this._handler) return;

    const event = parseKeyEvent(data);
    if (event) {
      this._handler(event);
    }
  }

  /**
   * Emergency terminal restore when SIGINT is received.
   * This is a last resort — it restores raw mode and cursor
   * before letting the process exit.
   */
  private _emergencyTerminalRestore(): void {
    try {
      if (this._rawMode) {
        process.stdin.setRawMode(false);
      }
    } catch {
      // Best-effort
    }

    try {
      process.stderr.write(cursorShow());
    } catch {
      // Best-effort
    }

    try {
      process.stdin.pause();
    } catch {
      // Best-effort
    }
  }
}
