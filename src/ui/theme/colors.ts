/**
 * Color system for the repo-map CLI.
 *
 * Maps semantic color tokens to ANSI escape codes for all supported
 * color modes (none, 16-color, 256-color, truecolor).
 *
 * This is the ONLY module that defines ANSI color code mappings.
 */

export type ColorToken =
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'dim'
  | 'muted'
  | 'text'
  | 'bg'
  | 'heading'
  | 'code'
  | 'link'
  | 'border'
  | 'bar-fill'
  | 'bar-empty';

/**
 * Detected color capabilities of the terminal.
 */
export type ColorMode = 'none' | '16' | '256' | 'truecolor';

// ─── ANSI code tables ────────────────────────────────────────────

/**
 * ANSI 16-color (basic terminal colors).
 * Uses bold/bright variants for emphasis where appropriate.
 */
const ANSI_16: Record<ColorToken, string> = {
  primary: '\x1b[96m',     // Bold Cyan
  success: '\x1b[92m',     // Bold Green
  warning: '\x1b[93m',     // Bold Yellow
  error: '\x1b[91m',       // Bold Red
  info: '\x1b[94m',        // Bold Blue
  dim: '\x1b[2m',          // Dim
  muted: '\x1b[90m',       // Bright Black (Dark Gray)
  text: '\x1b[0m',         // Default
  bg: '\x1b[100m',         // Bright Black Background
  heading: '\x1b[1;96m',   // Bold + Cyan
  code: '\x1b[33m',        // Yellow (stand out from body)
  link: '\x1b[4;94m',      // Underline + Blue
  border: '\x1b[2;90m',    // Dim + Gray
  'bar-fill': '\x1b[92m',  // Bold Green
  'bar-empty': '\x1b[2m',  // Dim
};

/**
 * ANSI 256-color (8-bit extended colors).
 * Closer to the intended design palette.
 */
const ANSI_256: Record<ColorToken, string> = {
  primary: '\x1b[38;5;51m',    // Bright Cyan
  success: '\x1b[38;5;82m',   // Bright Green
  warning: '\x1b[38;5;226m',  // Yellow
  error: '\x1b[38;5;196m',    // Red
  info: '\x1b[38;5;39m',      // Blue
  dim: '\x1b[38;5;242m',      // Dark Gray
  muted: '\x1b[38;5;236m',    // Deeper Gray
  text: '\x1b[0m',             // Default
  bg: '\x1b[48;5;235m',       // Dark Background
  heading: '\x1b[1;38;5;51m', // Bold + Cyan
  code: '\x1b[38;5;220m',     // Gold
  link: '\x1b[4;38;5;39m',    // Underline + Blue
  border: '\x1b[2;38;5;236m', // Dim + Gray
  'bar-fill': '\x1b[38;5;82m',   // Bright Green
  'bar-empty': '\x1b[38;5;242m', // Dark Gray
};

/**
 * TrueColor (24-bit RGB).
 * Exact color fidelity for modern terminals.
 */
const TRUECOLOR: Record<ColorToken, string> = {
  primary: '\x1b[38;2;0;212;255m',   // #00d4ff
  success: '\x1b[38;2;0;255;94m',    // #00ff5e
  warning: '\x1b[38;2;255;255;0m',   // #ffff00
  error: '\x1b[38;2;255;0;0m',       // #ff0000
  info: '\x1b[38;2;0;175;255m',      // #00afff
  dim: '\x1b[38;2;108;108;108m',     // #6c6c6c
  muted: '\x1b[38;2;48;48;48m',      // #303030
  text: '\x1b[0m',                    // Default
  bg: '\x1b[48;2;38;38;38m',         // #262626
  heading: '\x1b[1;38;2;0;212;255m', // Bold + #00d4ff
  code: '\x1b[38;2;255;174;0m',      // #ffae00
  link: '\x1b[4;38;2;0;175;255m',    // Underline + #00afff
  border: '\x1b[2;38;2;48;48;48m',   // Dim + #303030
  'bar-fill': '\x1b[38;2;0;255;94m',    // #00ff5e
  'bar-empty': '\x1b[38;2;108;108;108m', // #6c6c6c
};

const RESET = '\x1b[0m';

// ─── Color mode detection ────────────────────────────────────────

/**
 * Detect the terminal's color capabilities.
 *
 * Detection order:
 *   1. NO_COLOR env var → 'none'
 *   2. FORCE_COLOR env var → forces highest mode
 *   3. TrueColor detection (COLORTERM, WT_SESSION)
 *   4. 256-color detection (TERM)
 *   5. Fallback → '16'
 */
export function detectColorMode(): ColorMode {
  // NO_COLOR takes highest precedence
  if (process.env.NO_COLOR === '1' || process.env.NO_COLOR === 'true') {
    return 'none';
  }

  // FORCE_COLOR overrides automatic detection
  if (process.env.FORCE_COLOR) {
    if (process.env.FORCE_COLOR === '0') return 'none';
    if (process.env.FORCE_COLOR === '1') return '16';
    if (process.env.FORCE_COLOR === '2') return '256';
    if (process.env.FORCE_COLOR === '3') return 'truecolor';
  }

  // Not a TTY — no color
  if (!process.stdout.isTTY) {
    return 'none';
  }

  // TrueColor detection
  const colorterm = process.env.COLORTERM;
  if (colorterm === 'truecolor' || colorterm === '24bit') {
    return 'truecolor';
  }

  // Windows Terminal supports TrueColor
  if (process.platform === 'win32' && process.env.WT_SESSION) {
    return 'truecolor';
  }

  // 256-color detection via TERM
  const term = process.env.TERM || '';
  if (term.includes('256') || term.includes('direct')) {
    return '256';
  }

  // Default to basic 16 colors
  return '16';
}

// ─── Color resolution ────────────────────────────────────────────

/**
 * Resolve a ColorToken to its ANSI escape code for the given color mode.
 *
 * @param token - The semantic color token to resolve
 * @param mode - The target color mode
 * @returns ANSI escape sequence, or empty string for 'none' mode
 */
export function resolveColor(token: ColorToken, mode: ColorMode): string {
  if (mode === 'none') return '';

  switch (mode) {
    case '16':
      return ANSI_16[token];
    case '256':
      return ANSI_256[token];
    case 'truecolor':
      return TRUECOLOR[token];
    default:
      return ANSI_16[token];
  }
}

/**
 * Get the ANSI reset sequence.
 */
export function ansiReset(): string {
  return RESET;
}
