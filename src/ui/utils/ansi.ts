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
 * Sanitize a file path or user-controlled string for safe terminal display.
 *
 * Strips all ANSI escape sequences that could inject color, cursor movement,
 * hyperlinks, or other terminal control into displayed output.
 *
 * Idempotent — safe to call multiple times on the same string.
 * Use at every rendering/output boundary where user-controlled filenames,
 * paths, or project names are displayed.
 *
 * Does NOT modify internal stored paths — use ONLY at output boundaries.
 *
 * @param text - The text to sanitize (e.g. a file path, project name).
 * @returns The text with all ANSI escape sequences removed.
 *
 * @example
 * ```ts
 * sanitizeFilePath('\x1b[31mHACKED\x1b[0m.txt')  // 'HACKED.txt'
 * sanitizeFilePath('src/index.ts')                   // 'src/index.ts'
 * sanitizeFilePath('中文文件名')                       // '中文文件名'
 * ```
 */
export function sanitizeFilePath(text: string): string {
  return stripAnsi(text);
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
    // --- East Asian Wide characters (2 cells wide) ---
    //
    // Source: Unicode East Asian Width property (W / F)
    //
    // CJK Radicals Supplement:          U+2E80–U+2EFF
    // Kangxi Radicals:                  U+2F00–U+2FDF
    // Ideographic Description Chars:    U+2FF0–U+2FFF
    // CJK Symbols & Punctuation:        U+3000–U+303F  (fullwidth space, etc.)
    // CJK Unified Ideographs Ext A:     U+3400–U+4DBF
    // CJK Unified Ideographs:           U+4E00–U+9FFF
    // Hangul Jamo:                      U+1100–U+11FF
    // Enclosed CJK Letters & Months:    U+3200–U+32FF
    // CJK Compatibility:                U+3300–U+33FF
    // Hangul Syllables:                 U+AC00–U+D7AF
    // Hangul Jamo Extended-A:           U+A960–U+A97C
    // Hangul Jamo Extended-B:           U+D7B0–U+D7FF
    // CJK Compatibility Ideographs:     U+F900–U+FAFF
    // Fullwidth Forms (ASCII vars):     U+FF01–U+FF60
    // Fullwidth Forms (additional):     U+FFE0–U+FFE6
    // CJK Unified Ideographs Ext B:     U+20000–U+2A6DF
    // CJK Unified Ideographs Ext C:     U+2B820–U+2CEAF
    // CJK Unified Ideographs Ext D:     U+2CEB0–U+2EBE0
    // CJK Compatibility Supplement:     U+2F800–U+2FA1F
    if (
      (code >= 0x1100 && code <= 0x11ff) ||  // Hangul Jamo
      (code >= 0x2e80 && code <= 0x2eff) ||  // CJK Radicals Supplement
      (code >= 0x2f00 && code <= 0x2fdf) ||  // Kangxi Radicals
      (code >= 0x2ff0 && code <= 0x2fff) ||  // Ideographic Description Characters
      (code >= 0x3000 && code <= 0x303f) ||  // CJK Symbols and Punctuation (includes fullwidth space)
      (code >= 0x3200 && code <= 0x32ff) ||  // Enclosed CJK Letters and Months
      (code >= 0x3300 && code <= 0x33ff) ||  // CJK Compatibility
      (code >= 0x3400 && code <= 0x4dbf) ||  // CJK Unified Ideographs Extension A
      (code >= 0x4e00 && code <= 0x9fff) ||  // CJK Unified Ideographs
      (code >= 0xa960 && code <= 0xa97c) ||  // Hangul Jamo Extended-A
      (code >= 0xac00 && code <= 0xd7af) ||  // Hangul Syllables
      (code >= 0xd7b0 && code <= 0xd7ff) ||  // Hangul Jamo Extended-B
      (code >= 0xf900 && code <= 0xfaff) ||  // CJK Compatibility Ideographs
      (code >= 0xff01 && code <= 0xff60) ||  // Fullwidth Forms (ASCII variants)
      (code >= 0xffe0 && code <= 0xffe6) ||  // Fullwidth Forms (additional)
      (code >= 0x20000 && code <= 0x2a6df) || // CJK Unified Ideographs Extension B
      (code >= 0x2b820 && code <= 0x2ceaf) || // CJK Unified Ideographs Extension C
      (code >= 0x2ceb0 && code <= 0x2ebe0) || // CJK Unified Ideographs Extension D
      (code >= 0x2f800 && code <= 0x2fa1f)    // CJK Compatibility Ideographs Supplement
    ) {
      length += 2;
    } else {
      length += 1;
    }
  }

  return length;
}
