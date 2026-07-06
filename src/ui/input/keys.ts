/**
 * Key parsing utilities for the repo-map TUI framework.
 *
 * Parses raw terminal byte sequences into semantic Key values.
 * Handles ANSI escape sequences produced by modern terminals
 * for arrow keys, function keys, and modified keys.
 *
 * # Architecture
 * - This is the ONLY module that understands raw terminal bytes.
 * - All other modules use semantic Key types.
 * - Supports xterm, kitty, and Windows Terminal escape sequences.
 */

import type { Key, KeyEvent, KeyAction } from './types.js';

// ─── Escape Sequence Parsing ───────────────────────────────────

// Control character lookup
const CTRL_CODES: Record<number, string> = {
  0x01: 'a', 0x02: 'b', 0x03: 'c', 0x04: 'd', 0x05: 'e',
  0x06: 'f', 0x07: 'g', 0x08: 'h', 0x09: 'i', 0x0a: 'j',
  0x0b: 'k', 0x0c: 'l', 0x0d: 'm', 0x0e: 'n', 0x0f: 'o',
  0x10: 'p', 0x11: 'q', 0x12: 'r', 0x13: 's', 0x14: 't',
  0x15: 'u', 0x16: 'v', 0x17: 'w', 0x18: 'x', 0x19: 'y',
  0x1a: 'z',
};

// Escape sequence map
const ESCAPE_SEQUENCES: Record<string, Key> = {
  // Arrow keys
  '[A': { type: 'up' },
  '[B': { type: 'down' },
  '[C': { type: 'right' },
  '[D': { type: 'left' },
  // Alt+Arrow keys
  '[1;3A': { type: 'altUp' },
  '[1;3B': { type: 'altDown' },
  '[1;3C': { type: 'altRight' },
  '[1;3D': { type: 'altLeft' },
  // Home / End
  '[H': { type: 'home' },
  '[F': { type: 'end' },
  '[1~': { type: 'home' },
  '[4~': { type: 'end' },
  // Ctrl+Home / Ctrl+End
  '[1;5H': { type: 'ctrlHome' },
  '[1;5F': { type: 'ctrlEnd' },
  // Page Up / Down
  '[5~': { type: 'pageUp' },
  '[6~': { type: 'pageDown' },
  // Insert / Delete
  '[2~': { type: 'unknown', value: 'insert' },
  '[3~': { type: 'delete' },
  // Tab (CSI)
  '[Z': { type: 'shiftTab' },
  // F-keys (basic)
  'OP': { type: 'unknown', value: 'f1' },
  'OQ': { type: 'unknown', value: 'f2' },
  'OR': { type: 'unknown', value: 'f3' },
  'OS': { type: 'unknown', value: 'f4' },
};  // Alt-modified: ESC + key
const ALT_MODIFIED: Record<string, Key> = {
  'a': { type: 'char', value: 'a' },
  'b': { type: 'char', value: 'b' },
  'c': { type: 'char', value: 'c' },
  'd': { type: 'char', value: 'd' },
  'e': { type: 'char', value: 'e' },
  'f': { type: 'char', value: 'f' },
  'h': { type: 'char', value: 'h' },
  'j': { type: 'char', value: 'j' },
  'k': { type: 'char', value: 'k' },
  'l': { type: 'char', value: 'l' },
  'n': { type: 'char', value: 'n' },
  'q': { type: 'char', value: 'q' },
  'r': { type: 'char', value: 'r' },
  's': { type: 'char', value: 's' },
  't': { type: 'char', value: 't' },
  'u': { type: 'char', value: 'u' },
  'v': { type: 'char', value: 'v' },
  'w': { type: 'char', value: 'w' },
  'x': { type: 'char', value: 'x' },
  'y': { type: 'char', value: 'y' },
  'z': { type: 'char', value: 'z' },
  // Arrow keys with Alt modifier are handled via CSI sequences
};

// ─── Public API ────────────────────────────────────────────────

/**
 * Parse a raw byte buffer from stdin into a KeyEvent.
 *
 * @param data - The raw bytes received from stdin.
 * @returns A parsed KeyEvent, or null if the sequence is incomplete.
 */
export function parseKeyEvent(data: Buffer): KeyEvent | null {
  if (data.length === 0) return null;

  const firstByte = data[0];

  // Escape sequences start with 0x1b
  if (firstByte === 0x1b) {
    return parseEscapeSequence(data);
  }

  // Ctrl+letter
  if (firstByte >= 0x01 && firstByte <= 0x1a) {
    return {
      key: { type: 'ctrl', value: CTRL_CODES[firstByte] },
      ctrl: true,
      alt: false,
      meta: false,
    };
  }

  // Control characters
  if (firstByte === 0x1b) return parseEscapeSequence(data);
  if (firstByte === 0x0a || firstByte === 0x0d) {
    return {
      key: { type: 'enter' },
      ctrl: false,
      alt: false,
      meta: false,
    };
  }
  if (firstByte === 0x09) {
    return {
      key: { type: 'tab' },
      ctrl: false,
      alt: false,
      meta: false,
    };
  }
  if (firstByte === 0x7f || firstByte === 0x08) {
    return {
      key: { type: 'backspace' },
      ctrl: false,
      alt: false,
      meta: false,
    };
  }
  if (firstByte === 0x20) {
    return {
      key: { type: 'space' },
      ctrl: false,
      alt: false,
      meta: false,
    };
  }

  // Printable ASCII
  if (firstByte >= 0x20 && firstByte <= 0x7e) {
    const char = String.fromCharCode(firstByte);
    if (char === 'q') {
      return {
        key: { type: 'char', value: 'q' },
        ctrl: false,
        alt: false,
        meta: false,
      };
    }
    if (char === '/') {
      return {
        key: { type: 'slash' },
        ctrl: false,
        alt: false,
        meta: false,
      };
    }
    if (char === '?') {
      return {
        key: { type: 'question' },
        ctrl: false,
        alt: false,
        meta: false,
      };
    }
    return {
      key: { type: 'char', value: char },
      ctrl: false,
      alt: false,
      meta: false,
    };
  }

  return {
    key: { type: 'unknown', value: `0x${firstByte.toString(16)}` },
    ctrl: false,
    alt: false,
    meta: false,
  };
}

/**
 * Parse an escape sequence (starting with 0x1b).
 */
function parseEscapeSequence(data: Buffer): KeyEvent | null {
  if (data.length < 2) {
    // Just ESC alone
    return {
      key: { type: 'escape' },
      ctrl: false,
      alt: false,
      meta: false,
    };
  }

  const seq = data.toString('utf-8');
  const stripped = seq.slice(1); // Remove leading ESC

  // Check known escape sequences
  if (ESCAPE_SEQUENCES[stripped]) {
    return {
      key: ESCAPE_SEQUENCES[stripped],
      ctrl: false,
      alt: false,
      meta: false,
    };
  }

  // Check for alt-modified keys: ESC + char
  if (stripped.length === 1 && ALT_MODIFIED[stripped]) {
    return {
      key: ALT_MODIFIED[stripped],
      ctrl: false,
      alt: true,
      meta: false,
    };
  }

  return {
    key: { type: 'unknown', value: stripped },
    ctrl: false,
    alt: false,
    meta: false,
  };
}

// ─── Default Key Mapping ───────────────────────────────────────

/**
 * Map a KeyEvent to a semantic KeyAction.
 *
 * This provides sensible defaults that screens can override or extend.
 *
 * @param event - The key event to map.
 * @returns The corresponding KeyAction, or null if unmapped.
 */
export function mapKeyToAction(event: KeyEvent): KeyAction | null {
  switch (event.key.type) {
    case 'up': return { type: 'navigateUp' };
    case 'down': return { type: 'navigateDown' };
    case 'left': return { type: 'navigateLeft' };
    case 'right': return { type: 'navigateRight' };
    case 'altUp': return { type: 'resizeUp' };
    case 'altDown': return { type: 'resizeDown' };
    case 'altLeft': return { type: 'resizeLeft' };
    case 'altRight': return { type: 'resizeRight' };
    case 'enter': return { type: 'confirm' };
    case 'escape': return { type: 'cancel' };
    case 'tab': return { type: 'focusNext' };
    case 'shiftTab': return { type: 'focusPrev' };
    case 'slash': return { type: 'search' };
    case 'question': return { type: 'help' };
    case 'home': return { type: 'scrollToTop' };
    case 'end': return { type: 'scrollToBottom' };
    case 'ctrlHome': return { type: 'jumpToTop' };
    case 'ctrlEnd': return { type: 'jumpToBottom' };
    case 'pageUp': return { type: 'scrollUp' };
    case 'pageDown': return { type: 'scrollDown' };
    case 'space': return { type: 'select' };
    case 'char':
      if (event.key.value === 'q') return { type: 'quit' };
      if (event.key.value === 'h') return { type: 'help' };
      if (event.key.value === '/') return { type: 'search' };
      return { type: 'custom', value: event.key.value };
    case 'ctrl':
      if (event.key.value === 'c') return null; // SIGINT
      if (event.key.value === 'd') return null; // EOF
      if (event.key.value === 'p') return { type: 'palette' };
      return { type: 'custom', value: `ctrl-${event.key.value}` };
    default:
      return null;
  }
}
