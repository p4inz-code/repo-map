/**
 * PaletteUX — Raycast-inspired command palette for the V3 Experience Engine.
 *
 * Features:
 * - Recent commands (last used tracking)
 * - Pinned commands (user favorites)
 * - Usage frequency (most-used rises)
 * - Search ranking (fuzzy match + recency + frequency)
 * - Keyboard-only workflow
 *
 * No mouse assumptions. Everything is keyboard-driven.
 */

import type { PaletteCommand, PaletteEntry, PaletteSearchQuery, PaletteUXState } from './types.js';
import { DEFAULT_PALETTE_COMMANDS, scoreCommand, findMatchPositions, parseQuery } from './types.js';

// ─── PaletteUX ────────────────────────────────────────────────────

export class PaletteUX {
  /** All registered commands. */
  private readonly _commands: Map<string, PaletteCommand> = new Map();

  /** Current state. */
  private _state: PaletteUXState = {
    query: '',
    results: [],
    selectedIndex: 0,
    showRecent: true,
    showPinned: true,
  };

  constructor() {
    // Register default commands
    for (const cmd of DEFAULT_PALETTE_COMMANDS) {
      this._commands.set(cmd.id, { ...cmd });
    }
  }

  // ── Command Registration ──────────────────────────────────────

  /**
   * Register a new command.
   */
  register(command: PaletteCommand): void {
    this._commands.set(command.id, { ...command });
  }

  /**
   * Unregister a command.
   */
  unregister(id: string): void {
    this._commands.delete(id);
  }

  /**
   * Get a command by ID.
   */
  get(id: string): PaletteCommand | undefined {
    return this._commands.get(id);
  }

  // ── Search ────────────────────────────────────────────────────

  /**
   * Update the search query and recompute results.
   */
  search(query: string): void {
    const parsed = parseQuery(query);
    const allCommands = [...this._commands.values()];

    // Score all commands
    const scored: PaletteEntry[] = allCommands
      .map((cmd) => ({
        command: cmd,
        score: scoreCommand(cmd, parsed),
        matchPositions: parsed.isEmpty ? [] : findMatchPositions(cmd.label, parsed.query),
      }))
      .filter((entry) => parsed.isEmpty || entry.score > 0) // Only show results with score > 0 when query is active
      .sort((a, b) => b.score - a.score);

    this._state = {
      query,
      results: scored,
      selectedIndex: Math.min(this._state.selectedIndex, Math.max(0, scored.length - 1)),
      showRecent: parsed.isEmpty,
      showPinned: parsed.isEmpty,
    };
  }

  // ── Selection ─────────────────────────────────────────────────

  /**
   * Select the next result.
   */
  selectNext(): void {
    if (this._state.results.length === 0) return;
    const next = (this._state.selectedIndex + 1) % this._state.results.length;
    this._state = { ...this._state, selectedIndex: next };
  }

  /**
   * Select the previous result.
   */
  selectPrev(): void {
    if (this._state.results.length === 0) return;
    const prev = (this._state.selectedIndex - 1 + this._state.results.length) % this._state.results.length;
    this._state = { ...this._state, selectedIndex: prev };
  }

  /**
   * Get the currently selected command.
   */
  getSelected(): PaletteCommand | null {
    const idx = this._state.selectedIndex;
    return this._state.results[idx]?.command ?? null;
  }

  /**
   * Record that a command was executed (increments usage, updates recency).
   */
  recordUsage(commandId: string): void {
    const cmd = this._commands.get(commandId);
    if (cmd) {
      cmd.usageCount++;
      cmd.lastUsedAt = Date.now();
    }
  }

  /**
   * Toggle pin status for a command.
   */
  togglePin(commandId: string): void {
    const cmd = this._commands.get(commandId);
    if (cmd) {
      cmd.pinned = !cmd.pinned;
    }
  }

  /**
   * Pin a command.
   */
  pin(commandId: string): void {
    const cmd = this._commands.get(commandId);
    if (cmd) cmd.pinned = true;
  }

  /**
   * Unpin a command.
   */
  unpin(commandId: string): void {
    const cmd = this._commands.get(commandId);
    if (cmd) cmd.pinned = false;
  }

  // ── State ─────────────────────────────────────────────────────

  /** Get current palette UX state. */
  getState(): PaletteUXState {
    return this._state;
  }

  /** Get the current search query. */
  get query(): string {
    return this._state.query;
  }

  /** Get the current results. */
  get results(): readonly PaletteEntry[] {
    return this._state.results;
  }

  /** Get the selected index. */
  get selectedIndex(): number {
    return this._state.selectedIndex;
  }

  /** Get the total number of commands. */
  get commandCount(): number {
    return this._commands.size;
  }

  /** Reset the palette state. */
  reset(): void {
    this._state = {
      query: '',
      results: [],
      selectedIndex: 0,
      showRecent: true,
      showPinned: true,
    };
  }
}
