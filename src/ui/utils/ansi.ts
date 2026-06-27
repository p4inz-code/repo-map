/**
 * ANSI escape sequence utilities for the repo-map CLI.
 *
 * This is the ONLY module that produces raw ANSI escape codes for
 * cursor control, line operations, screen management, and ANSI
 * stripping. Every other module (screens, primitives, layout,
 * theme) must go through this module or the renderer for ANSI
 * output.
 *
 * # Architecture Rule
 * - Screens MUST NOT emit ANSI directly.
 * - Primitives MUST NOT emit ANSI directly.
 * - Layout MUST NOT emit ANSI directly.
 * - Theme resolves semantic styles only.
 * - Renderer and this utility are the ONLY ANSI boundary.
 */

// ─── Escape constants ───────────────────────────────────────────
// Single source of truth for all ANSI escape prefix/suffix values.
// No other file should contain ANSI literal strings for cursor or
// screen operations.

const CSI = '\x1b[';     // Control Sequence Introducer
const CR = '\r';          // Carriage return

// ─── Cursor Control ──────────────────────────────────────────────

/**
 * Move the cursor up by `lines` rows.
 * The terminal scrolls if the cursor is at the top of the screen.
 */
export function cursorUp(lines: number): string {
  return `${CSI}${lines}A`;
}

/**
 * Move the cursor down by `lines` rows.
 * The terminal scrolls if the cursor is at the bottom of the screen.
 */
export function cursorDown(lines: number): string {
  return `${CSI}${lines}B`;
}

/**
 * Hide the cursor.
 * Use {@link cursorShow} to restore it.
 */
export function cursorHide(): string {
  return `${CSI}?25l`;
}

/**
 * Show the cursor.
 * Complements {@link cursorHide}.
 */
export function cursorShow(): string {
  return `${CSI}?25h`;
}

/**
 * Save the current cursor position.
 * Use {@link restorePosition} to return to it.
 */
export function savePosition(): string {
  return `${CSI}s`;
}

/**
 * Restore the cursor to the position last saved with {@link savePosition}.
 */
export function restorePosition(): string {
  return `${CSI}u`;
}

// ─── Line / Screen Operations ────────────────────────────────────

/**
 * Clear the entire current line from the cursor position to the end.
 */
export function clearLine(): string {
  return `${CSI}2K`;
}

/**
 * Clear the entire screen and move the cursor to the top-left.
 */
export function clearScreen(): string {
  return `${CSI}2J`;
}

/**
 * Carriage return — move the cursor to column 0 of the current row.
 * Commonly paired with {@link clearLine} to overwrite a status line.
 */
export function carriageReturn(): string {
  return CR;
}

// ─── Detection ───────────────────────────────────────────────────

/**
 * Returns `true` if stdout is connected to a terminal (TTY).
 * When `false`, animations and cursor control should be disabled.
 */
export function isTTY(): boolean {
  return process.stdout.isTTY === true;
}

/**
 * Returns `true` on Windows when NOT running inside Windows Terminal.
 *
 * Windows CMD / ConHost has limited ANSI support (no true color,
 * slower I/O, no Unicode box drawing). Windows Terminal ("WT_SESSION"
 * env var) has full modern support.
 */
export function isWindowsLegacy(): boolean {
  return process.platform === 'win32' && !process.env.WT_SESSION;
}

// ─── ANSI Stripping ──────────────────────────────────────────────

/**
 * Regex that matches known ANSI escape sequences:
 *
 * - CSI sequences:   `\x1b[` + params + final byte   e.g. `\x1b[31m`, `\x1b[2K`
 * - OSC sequences:   `\x1b]` + text + ST/BEL         e.g. `\x1b]0;title\x07`
 * - Two-byte escapes:`\x1b` + letter                  e.g. `\x1b=`, `\x1b>`
 */
const ANSI_PATTERN = /(?:\x1b\[[0-9;?]*[a-zA-Z]|\x1b\].*?(?:\x1b\\|\x07)|\x1b[A-Za-z])/g; // eslint-disable-line no-control-regex

/**
 * Remove all ANSI escape sequences from a string.
 *
 * @param text - The input string potentially containing ANSI codes.
 * @returns Clean text with all escape sequences removed.
 *
 * @example
 * ```ts
 * stripAnsi('\x1b[32mHello\x1b[0m')    // 'Hello'
 * stripAnsi('\x1b[1m\x1b[31mError!\x1b[0m')  // 'Error!'
 * stripAnsi('plain text')              // 'plain text'
 * ```
 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '');
}

/**
 * Calculate the visible width of a string (without ANSI escape codes).
 *
 * Each ASCII/ANSI character is 1 cell wide. CJK characters
 * (Chinese, Japanese, Korean) are 2 cells wide.
 *
 * @param text - The input string, possibly with ANSI codes.
 * @returns The number of terminal cells the text occupies.
 *
 * @example
 * ```ts
 * visibleLength('\x1b[32mOK\x1b[0m')      // 2
 * visibleLength('Hello')                   // 5
 * visibleLength('中文')                     // 4 (2 CJK chars × 2 cells)
 * ```
 */
export function visibleLength(text: string): number {
  const cleaned = stripAnsi(text);
  let length = 0;

  for (const char of cleaned) {
    const code = char.codePointAt(0)!;
    // CJK Unified Ideographs (U+4E00–U+9FFF)
    // CJK Unified Ideographs Extension A (U+3400–U+4DBF)
    // CJK Unified Ideographs Extension B (U+20000–U+2A6DF)
    // CJK Compatibility Ideographs (U+F900–U+FAFF)
    // Fullwidth forms (U+FF01–U+FF60, U+FFE0–U+FFE6)
    // Hangul Syllables (U+AC00–U+D7AF)
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x20000 && code <= 0x2a6df) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xff01 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0xac00 && code <= 0xd7af)
    ) {
      length += 2;
    } else {
      length += 1;
    }
  }

  return length;
}
