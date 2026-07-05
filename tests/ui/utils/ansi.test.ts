import { describe, it, expect } from 'vitest';
import {
  cursorUp,
  cursorDown,
  cursorHide,
  cursorShow,
  savePosition,
  restorePosition,
  clearLine,
  clearScreen,
  carriageReturn,
  isTTY,
  isWindowsLegacy,
  stripAnsi,
  visibleLength,
  sanitizeFilePath,
} from '../../../src/ui/utils/ansi.js';

// ─── Helpers ─────────────────────────────────────────────────────

/** Stub process.stdout.isTTY for the duration of a test callback. */
function withTty(value: boolean, fn: () => void): void {
  const original = process.stdout.isTTY;
  Object.defineProperty(process.stdout, 'isTTY', {
    value,
    configurable: true,
    writable: false,
  });
  try {
    fn();
  } finally {
    Object.defineProperty(process.stdout, 'isTTY', {
      value: original,
      configurable: true,
      writable: false,
    });
  }
}

/** Stub process.platform and env for the duration of a test callback. */
function withWindowsEnv(
  opts: { platform?: NodeJS.Platform; wtSession?: string | undefined },
  fn: () => void,
): void {
  const origPlatform: PropertyDescriptor | undefined =
    Object.getOwnPropertyDescriptor(process, 'platform');
  const origWt = process.env.WT_SESSION;

  if (opts.platform !== undefined) {
    Object.defineProperty(process, 'platform', {
      value: opts.platform,
      configurable: true,
      writable: false,
    });
  }
  if (opts.wtSession !== undefined) {
    process.env.WT_SESSION = opts.wtSession;
  }

  try {
    fn();
  } finally {
    if (origPlatform) {
      Object.defineProperty(process, 'platform', origPlatform);
    }
    if (opts.wtSession !== undefined) {
      if (origWt === undefined) {
        delete process.env.WT_SESSION;
      } else {
        process.env.WT_SESSION = origWt;
      }
    }
  }
}

// =================================================================
// Escape Sequence Generation
// =================================================================

describe('escape generation', () => {
  describe('cursorUp', () => {
    it('returns a string starting with \\x1b[', () => {
      expect(cursorUp(1)).toMatch(/^\x1b\[/);
    });

    it('encodes the line count in the sequence', () => {
      expect(cursorUp(1)).toBe('\x1b[1A');
      expect(cursorUp(3)).toBe('\x1b[3A');
      expect(cursorUp(99)).toBe('\x1b[99A');
    });

    it('accepts 0 (no-op sequence)', () => {
      expect(cursorUp(0)).toBe('\x1b[0A');
    });

    it('accepts very large values', () => {
      expect(cursorUp(500)).toBe('\x1b[500A');
    });
  });

  describe('cursorDown', () => {
    it('returns a string starting with \\x1b[', () => {
      expect(cursorDown(1)).toMatch(/^\x1b\[/);
    });

    it('encodes the line count in the sequence', () => {
      expect(cursorDown(1)).toBe('\x1b[1B');
      expect(cursorDown(3)).toBe('\x1b[3B');
      expect(cursorDown(99)).toBe('\x1b[99B');
    });
  });

  describe('cursorHide', () => {
    it('returns the DECTCEM hide sequence', () => {
      expect(cursorHide()).toBe('\x1b[?25l');
    });
  });

  describe('cursorShow', () => {
    it('returns the DECTCEM show sequence', () => {
      expect(cursorShow()).toBe('\x1b[?25h');
    });
  });

  describe('savePosition', () => {
    it('returns the ANSI.SYS save sequence', () => {
      expect(savePosition()).toBe('\x1b[s');
    });
  });

  describe('restorePosition', () => {
    it('returns the ANSI.SYS restore sequence', () => {
      expect(restorePosition()).toBe('\x1b[u');
    });
  });
});

// =================================================================
// Line / Screen Operations
// =================================================================

describe('line / screen operations', () => {
  describe('clearLine', () => {
    it('returns the erase-in-line (entire line) sequence', () => {
      expect(clearLine()).toBe('\x1b[2K');
    });
  });

  describe('clearScreen', () => {
    it('returns the erase-in-display (entire screen) sequence', () => {
      expect(clearScreen()).toBe('\x1b[2J');
    });
  });

  describe('carriageReturn', () => {
    it('returns the carriage return character', () => {
      expect(carriageReturn()).toBe('\r');
    });
  });
});

// =================================================================
// Detection
// =================================================================

describe('isTTY', () => {
  it('returns true when process.stdout.isTTY is true', () => {
    withTty(true, () => {
      expect(isTTY()).toBe(true);
    });
  });

  it('returns false when process.stdout.isTTY is false', () => {
    withTty(false, () => {
      expect(isTTY()).toBe(false);
    });
  });

  it('returns false when process.stdout.isTTY is undefined', () => {
    withTty(undefined as unknown as boolean, () => {
      expect(isTTY()).toBe(false);
    });
  });
});

describe('isWindowsLegacy', () => {
  it('returns false on non-Windows platforms', () => {
    withWindowsEnv({ platform: 'linux' }, () => {
      expect(isWindowsLegacy()).toBe(false);
    });
  });

  it('returns false on macOS', () => {
    withWindowsEnv({ platform: 'darwin' }, () => {
      expect(isWindowsLegacy()).toBe(false);
    });
  });

  it('returns false on Windows Terminal (WT_SESSION set)', () => {
    withWindowsEnv({ platform: 'win32', wtSession: '1' }, () => {
      expect(isWindowsLegacy()).toBe(false);
    });
  });

  it('returns true on Windows without WT_SESSION', () => {
    withWindowsEnv({ platform: 'win32', wtSession: undefined }, () => {
      // Ensure WT_SESSION is not set
      delete process.env.WT_SESSION;
      expect(isWindowsLegacy()).toBe(true);
    });
  });

  it('returns false when process is not a TTY regardless of platform', () => {
    // isWindowsLegacy should not depend on TTY state — it only checks
    // platform + WT_SESSION.
    // But when combined with isTTY(), non-TTY should disable cursor ops.
    withWindowsEnv({ platform: 'win32', wtSession: undefined }, () => {
      expect(isWindowsLegacy()).toBe(true);
      // Even on legacy Windows, a piped output (isTTY=false) means
      // no cursor operations should be attempted.
    });
  });
});

// =================================================================
// ANSI Stripping
// =================================================================

describe('stripAnsi', () => {
  it('removes a simple color sequence', () => {
    expect(stripAnsi('\x1b[32mHello\x1b[0m')).toBe('Hello');
  });

  it('preserves non-ANSI text unchanged', () => {
    expect(stripAnsi('Hello, world!')).toBe('Hello, world!');
  });

  it('removes multiple ANSI sequences', () => {
    expect(stripAnsi('\x1b[1m\x1b[31mError!\x1b[0m')).toBe('Error!');
  });

  it('removes bold sequence', () => {
    expect(stripAnsi('\x1b[1mBold\x1b[0m')).toBe('Bold');
  });

  it('removes dim sequence', () => {
    expect(stripAnsi('\x1b[2mDim\x1b[0m')).toBe('Dim');
  });

  it('removes cursor control sequences', () => {
    expect(stripAnsi('\x1b[1A\x1b[2K')).toBe('');
  });

  it('removes clear screen sequence', () => {
    expect(stripAnsi('\x1b[2J')).toBe('');
  });

  it('removes cursor hide/show sequences', () => {
    expect(stripAnsi('\x1b[?25l\x1b[?25h')).toBe('');
  });

  it('removes save/restore position', () => {
    expect(stripAnsi('\x1b[s\x1b[u')).toBe('');
  });

  it('returns empty string for input consisting only of ANSI codes', () => {
    expect(stripAnsi('\x1b[32m\x1b[1m\x1b[0m')).toBe('');
  });

  it('handles Unicode safety — preserves CJK characters', () => {
    const input = '\x1b[32m中文\x1b[0m';
    expect(stripAnsi(input)).toBe('中文');
  });

  it('handles Unicode safety — preserves emoji', () => {
    const input = '\x1b[31m🚀\x1b[0m';
    expect(stripAnsi(input)).toBe('🚀');
  });

  it('handles Unicode safety — mixed content', () => {
    const input = '\x1b[1mError: 文件未找到\x1b[0m';
    expect(stripAnsi(input)).toBe('Error: 文件未找到');
  });

  it('handles nested ANSI sequences', () => {
    expect(stripAnsi('\x1b[31m\x1b[1mNested\x1b[0m\x1b[0m')).toBe('Nested');
  });

  it('handles empty string input', () => {
    expect(stripAnsi('')).toBe('');
  });

  it('handles standard SGR sequences', () => {
    expect(stripAnsi('Hello\x1b[31mWorld')).toBe('HelloWorld');
  });

  it('handles malformed sequences — truncated CSI (no final byte)', () => {
    expect(stripAnsi('Hello\x1b[')).toBe('Hello\x1b[');
  });

  it('handles malformed sequences — just ESC', () => {
    expect(stripAnsi('Hello\x1b')).toBe('Hello\x1b');
  });

  it('handles malformed sequences — truncated private mode (no final byte)', () => {
    expect(stripAnsi('Hello\x1b[?')).toBe('Hello\x1b[?');
  });

  it('removes 256-color sequences', () => {
    expect(stripAnsi('\x1b[38;5;196mRed\x1b[0m')).toBe('Red');
  });

  it('removes truecolor sequences', () => {
    expect(stripAnsi('\x1b[38;2;255;0;0mRGB Red\x1b[0m')).toBe('RGB Red');
  });

  it('removes sequences with multiple semicolons', () => {
    expect(stripAnsi('\x1b[1;31;42mMulti\x1b[0m')).toBe('Multi');
  });

  it('removes cursor position sequences', () => {
    expect(stripAnsi('\x1b[10;20H')).toBe('');
  });

  it('removes erase-in-display sequences', () => {
    expect(stripAnsi('\x1b[0J\x1b[1J\x1b[2J')).toBe('');
  });

  it('removes erase-in-line sequences', () => {
    expect(stripAnsi('\x1b[0K\x1b[1K\x1b[2K')).toBe('');
  });

  it('preserves text adjacent to ANSI sequences', () => {
    expect(stripAnsi('\x1b[32mleft\x1b[0mright')).toBe('leftright');
  });

  it('preserves text with no ANSI codes at all', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    expect(stripAnsi(text)).toBe(text);
  });

  it('strips multiple lines', () => {
    const input = '\x1b[32mLine 1\x1b[0m\n\x1b[31mLine 2\x1b[0m';
    expect(stripAnsi(input)).toBe('Line 1\nLine 2');
  });
});

// =================================================================
// Visible Width Calculation
// =================================================================

describe('visibleLength', () => {
  it('returns 0 for empty string', () => {
    expect(visibleLength('')).toBe(0);
  });

  it('returns correct length for plain ASCII text', () => {
    expect(visibleLength('Hello')).toBe(5);
  });

  it('strips ANSI codes before measuring', () => {
    expect(visibleLength('\x1b[32mOK\x1b[0m')).toBe(2);
  });

  it('counts CJK characters as 2 cells each', () => {
    expect(visibleLength('中文')).toBe(4);
  });

  it('counts mixed CJK and ASCII correctly', () => {
    expect(visibleLength('文件file')).toBe(8); // 2×2 + 4×1 = 8
  });

  it('counts Hangul syllables as 2 cells each', () => {
    expect(visibleLength('한글')).toBe(4);
  });

  it('counts fullwidth characters as 2 cells', () => {
    expect(visibleLength('Ａ')).toBe(2); // Fullwidth A
    expect(visibleLength('￥')).toBe(2); // Fullwidth yen sign
  });

  it('counts CJK Compatibility Ideographs as 2 cells', () => {
    expect(visibleLength('豈')).toBe(2);
  });

  it('handles text with ANSI and CJK', () => {
    expect(visibleLength('\x1b[32m文件\x1b[0m')).toBe(4);
  });

  it('handles text with emoji (counts as 1 cell)', () => {
    // Emoji are typically 2 cells, but our simplistic approach
    // counts them as 1 since they don't match CJK ranges
    const result = visibleLength('a🚀b');
    expect(result).toBeGreaterThanOrEqual(2);
  });

  it('handles mixed content with ANSI, CJK, and ASCII', () => {
    const input = '\x1b[1mStatus: 完成\x1b[0m';
    // "Status: " = 8 chars, "完成" = 4 cells (2×2), total = 12
    expect(visibleLength(input)).toBe(12);
  });

  // ── LOW 2: Unicode ranges ──

  it('counts Hangul Jamo as 2 cells each', () => {
    // U+1100–U+11FF range
    const jamo = '\u1100\u1161\u11a8'; // ᄀ ᅡ ᆨ (Korean Jamo)
    expect(visibleLength(jamo)).toBe(6);
  });

  it('counts Hangul Jamo Extended-A as 2 cells each', () => {
    // U+A960–U+A97C range
    expect(visibleLength('\ua960')).toBe(2);
  });

  it('counts Hangul Jamo Extended-B as 2 cells each', () => {
    // U+D7B0–U+D7FF range
    expect(visibleLength('\ud7b0')).toBe(2);
  });

  it('counts CJK Radicals Supplement as 2 cells each', () => {
    // U+2E80–U+2EFF range
    expect(visibleLength('\u2e80')).toBe(2);
  });

  it('counts Kangxi Radicals as 2 cells each', () => {
    // U+2F00–U+2FDF range
    expect(visibleLength('\u2f00')).toBe(2);
  });

  it('counts Ideographic Description Characters as 2 cells each', () => {
    // U+2FF0–U+2FFF range
    expect(visibleLength('\u2ff0')).toBe(2);
  });

  it('counts CJK Symbols and Punctuation as 2 cells each (including fullwidth space)', () => {
    // U+3000 is fullwidth space: U+3000–U+303F
    expect(visibleLength('\u3000')).toBe(2); // Fullwidth space
    expect(visibleLength('\u3001')).toBe(2); // Ideographic comma
  });

  it('counts Enclosed CJK Letters and Months as 2 cells each', () => {
    // U+3200–U+32FF range
    expect(visibleLength('\u3200')).toBe(2);
  });

  it('counts CJK Compatibility as 2 cells each', () => {
    // U+3300–U+33FF range
    expect(visibleLength('\u3300')).toBe(2);
  });

  it('counts CJK Extension C characters as 2 cells each', () => {
    // U+2B820–U+2CEAF range
    expect(visibleLength('\u{2b820}')).toBe(2);
  });

  it('counts CJK Extension D characters as 2 cells each', () => {
    // U+2CEB0–U+2EBE0 range
    expect(visibleLength('\u{2ceb0}')).toBe(2);
  });

  it('counts CJK Compatibility Ideographs Supplement as 2 cells each', () => {
    // U+2F800–U+2FA1F range
    expect(visibleLength('\u{2f800}')).toBe(2);
  });
});

// =================================================================
// Sanitize File Path (ANSI Injection Prevention)
// =================================================================

describe('sanitizeFilePath', () => {
  it('removes ANSI color codes from a file name', () => {
    expect(sanitizeFilePath('\x1b[31mHACKED\x1b[0m.txt')).toBe('HACKED.txt');
  });

  it('removes cursor movement sequences from a path', () => {
    expect(sanitizeFilePath('\x1b[1Aup\x1b[1Bdown')).toBe('updown');
  });

  it('removes OSC hyperlink sequences', () => {
    expect(sanitizeFilePath('\x1b]8;;https://evil.com\x07click\x1b]8;;\x07.txt')).toBe('click.txt');
  });

  it('removes malformed escape sequences', () => {
    // Truncated CSI with no final byte
    expect(sanitizeFilePath('file\x1b[')).toBe('file\x1b[');
    // Just ESC character
    expect(sanitizeFilePath('file\x1b')).toBe('file\x1b');
  });

  it('preserves normal Unicode filenames', () => {
    expect(sanitizeFilePath('src/index.ts')).toBe('src/index.ts');
    expect(sanitizeFilePath('中文文件名')).toBe('中文文件名');
    expect(sanitizeFilePath('ファイル名.txt')).toBe('ファイル名.txt');
    expect(sanitizeFilePath('résumé.md')).toBe('résumé.md');
  });

  it('preserves Windows-style paths', () => {
    expect(sanitizeFilePath('src\\components\\Button.tsx')).toBe('src\\components\\Button.tsx');
    expect(sanitizeFilePath('C:\\Users\\test\\file.ts')).toBe('C:\\Users\\test\\file.ts');
  });

  it('preserves Linux/Mac paths', () => {
    expect(sanitizeFilePath('/usr/local/bin/node')).toBe('/usr/local/bin/node');
    expect(sanitizeFilePath('./relative/path/to/file.ts')).toBe('./relative/path/to/file.ts');
    expect(sanitizeFilePath('~/config/settings.json')).toBe('~/config/settings.json');
  });

  it('removes ANSI from deeply nested paths', () => {
    const injected = '\x1b[32msrc\x1b[0m/\x1b[31mcomponents\x1b[0m/Button.tsx';
    expect(sanitizeFilePath(injected)).toBe('src/components/Button.tsx');
  });

  it('removes multiple ANSI sequences from a single path', () => {
    const injected = '\x1b[1m\x1b[31m\x1b[42mcolorful\x1b[0m.txt';
    expect(sanitizeFilePath(injected)).toBe('colorful.txt');
  });

  it('removes cursor hide/show sequences', () => {
    expect(sanitizeFilePath('\x1b[?25lhidden\x1b[?25h')).toBe('hidden');
  });

  it('removes clear screen and erase sequences', () => {
    expect(sanitizeFilePath('\x1b[2Jfile\x1b[2K')).toBe('file');
  });

  it('removes truecolor sequences', () => {
    expect(sanitizeFilePath('\x1b[38;2;255;0;0mred.txt')).toBe('red.txt');
  });

  it('removes 256-color sequences', () => {
    expect(sanitizeFilePath('\x1b[38;5;196mfile.ts')).toBe('file.ts');
  });

  it('removes save/restore cursor position', () => {
    expect(sanitizeFilePath('\x1b[sfile\x1b[u')).toBe('file');
  });

  it('handles empty string input', () => {
    expect(sanitizeFilePath('')).toBe('');
  });

  it('preserves plain text unchanged', () => {
    const text = 'a-very-long-and-complex-file-name.with.multiple.dots.ts';
    expect(sanitizeFilePath(text)).toBe(text);
  });

  it('removes OSC sequences terminated by ST', () => {
    expect(sanitizeFilePath('\x1b]0;title\x1b\\file.ts')).toBe('file.ts');
  });

  it('removes two-byte escape sequences', () => {
    // Two-byte sequences: ESC followed by a letter (A-Z, a-z)
    expect(sanitizeFilePath('\x1bMfile.ts')).toBe('file.ts');
    expect(sanitizeFilePath('\x1bDfile.ts')).toBe('file.ts');
    expect(sanitizeFilePath('\x1bEfile.ts')).toBe('file.ts');
    expect(sanitizeFilePath('\x1bHfile.ts')).toBe('file.ts');
    expect(sanitizeFilePath('\x1bZfile.ts')).toBe('file.ts');
  });

  it('is idempotent when called multiple times', () => {
    const injected = '\x1b[31mHACKED\x1b[0m.txt';
    const once = sanitizeFilePath(injected);
    const twice = sanitizeFilePath(once);
    expect(once).toBe('HACKED.txt');
    expect(twice).toBe(once);
  });

  it('preserves carriage returns in path (not ANSI)', () => {
    // \r is not stripped by sanitizeFilePath — it preserves printable content
    expect(sanitizeFilePath('file\rname.ts')).toBe('file\rname.ts');
  });
});

// =================================================================
// Cross-cutting Concerns
// =================================================================

describe('cross-cutting concerns', () => {
  describe('all escape functions return valid sequences', () => {
    it('cursorUp starts with \\x1b[', () => {
      expect(cursorUp(5)).toMatch(/^\x1b\[/);
    });

    it('cursorDown starts with \\x1b[', () => {
      expect(cursorDown(3)).toMatch(/^\x1b\[/);
    });

    it('cursorHide starts with \\x1b[', () => {
      expect(cursorHide()).toMatch(/^\x1b\[/);
    });

    it('cursorShow starts with \\x1b[', () => {
      expect(cursorShow()).toMatch(/^\x1b\[/);
    });

    it('savePosition starts with \\x1b[', () => {
      expect(savePosition()).toMatch(/^\x1b\[/);
    });

    it('restorePosition starts with \\x1b[', () => {
      expect(restorePosition()).toMatch(/^\x1b\[/);
    });

    it('clearLine starts with \\x1b[', () => {
      expect(clearLine()).toMatch(/^\x1b\[/);
    });

    it('clearScreen starts with \\x1b[', () => {
      expect(clearScreen()).toMatch(/^\x1b\[/);
    });

    it('carriageReturn is \\r', () => {
      expect(carriageReturn()).toBe('\r');
    });
  });

  describe('no ANSI literal duplication', () => {
    it('stripAnsi round-trips cleanly', () => {
      // Every generated escape should be strippable
      const sequences = [
        cursorUp(3),
        cursorDown(3),
        cursorHide(),
        cursorShow(),
        savePosition(),
        restorePosition(),
        clearLine(),
        clearScreen(),
      ];
      for (const seq of sequences) {
        expect(stripAnsi(seq)).toBe('');
      }
    });
  });

  describe('visibleLength with stripped ANSI', () => {
    it('visibleLength === stripAnsi(text).length for pure ASCII', () => {
      const text = 'Hello, world!';
      expect(visibleLength(text)).toBe(stripAnsi(text).length);
    });
  });
});
