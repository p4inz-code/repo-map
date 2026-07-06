/**
 * Input system types for the repo-map TUI framework.
 *
 * Defines the key event model used by all screens and components.
 * Raw terminal bytes are parsed into semantic Key values by the
 * InputManager.
 *
 * # Architecture
 * - KeyEvent is the universal event type consumed by all handlers.
 * - Key is a discriminated union of all possible key presses.
 * - Action maps KeyEvents to semantic screen actions.
 */

// ─── Key ───────────────────────────────────────────────────────

/**
 * Semantic representation of a keyboard key press.
 *
 * Covers all keys needed for TUI navigation:
 * - Arrow keys for movement
 * - Enter/Escape for confirm/cancel
 * - Tab/Shift+Tab for focus cycling
 * - / and ? for search/help
 * - q for quit (per-screen)
 * - Single characters for accelerators
 */
export type Key =
  | { type: 'up' }
  | { type: 'down' }
  | { type: 'left' }
  | { type: 'right' }
  | { type: 'altUp' }
  | { type: 'altDown' }
  | { type: 'altLeft' }
  | { type: 'altRight' }
  | { type: 'enter' }
  | { type: 'escape' }
  | { type: 'tab' }
  | { type: 'shiftTab' }
  | { type: 'slash' }
  | { type: 'question' }
  | { type: 'char'; value: string }
  | { type: 'ctrl'; value: string }
  | { type: 'home' }
  | { type: 'end' }
  | { type: 'ctrlHome' }
  | { type: 'ctrlEnd' }
  | { type: 'pageUp' }
  | { type: 'pageDown' }
  | { type: 'space' }
  | { type: 'backspace' }
  | { type: 'delete' }
  | { type: 'unknown'; value: string };

// ─── KeyEvent ──────────────────────────────────────────────────

/**
 * A keyboard event with modifier flags.
 */
export interface KeyEvent {
  /** The semantic key that was pressed. */
  key: Key;
  /** Whether Ctrl was held. */
  ctrl: boolean;
  /** Whether Alt was held. */
  alt: boolean;
  /** Whether Meta/Windows was held. */
  meta: boolean;
}

// ─── KeyAction ─────────────────────────────────────────────────

/**
 * A semantic action that a screen or component can handle.
 *
 * Screens map KeyEvents to KeyActions, then dispatch them to the
 * appropriate handler. This decouples key bindings from behavior.
 */
export type KeyAction =
  | { type: 'navigateUp' }
  | { type: 'navigateDown' }
  | { type: 'navigateLeft' }
  | { type: 'navigateRight' }
  | { type: 'resizeUp' }
  | { type: 'resizeDown' }
  | { type: 'resizeLeft' }
  | { type: 'resizeRight' }
  | { type: 'confirm' }
  | { type: 'cancel' }
  | { type: 'focusNext' }
  | { type: 'focusPrev' }
  | { type: 'search' }
  | { type: 'help' }
  | { type: 'quit' }
  | { type: 'scrollUp' }
  | { type: 'scrollDown' }
  | { type: 'scrollToTop' }
  | { type: 'scrollToBottom' }
  | { type: 'jumpToTop' }
  | { type: 'jumpToBottom' }
  | { type: 'select' }
  | { type: 'toggle' }
  | { type: 'back' }
  | { type: 'palette' }
  | { type: 'custom'; value: string };

// ─── KeyHandler ────────────────────────────────────────────────

/**
 * Function signature for handling key events.
 */
export type KeyHandler = (event: KeyEvent) => void;

/**
 * Function signature for handling key actions.
 */
export type ActionHandler = (action: KeyAction) => void;
