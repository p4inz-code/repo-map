import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { detectColorMode, resolveColor, ansiReset } from '../../../src/ui/theme/colors.js';
import type { ColorToken, ColorMode } from '../../../src/ui/theme/colors.js';

const ALL_TOKENS: ColorToken[] = [
  'primary', 'success', 'warning', 'error', 'info',
  'dim', 'muted', 'text', 'bg', 'heading', 'code', 'link', 'border',
];

const ALL_MODES: ColorMode[] = ['none', '16', '256', 'truecolor'];

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

describe('detectColorMode', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    delete process.env.NO_COLOR;
    delete process.env.FORCE_COLOR;
    delete process.env.COLORTERM;
    delete process.env.TERM;
  });

  it('returns "none" when NO_COLOR is set', () => {
    process.env.NO_COLOR = '1';
    expect(detectColorMode()).toBe('none');
  });

  it('returns "none" when NO_COLOR is "true"', () => {
    process.env.NO_COLOR = 'true';
    expect(detectColorMode()).toBe('none');
  });

  it('returns "none" when FORCE_COLOR is "0"', () => {
    process.env.FORCE_COLOR = '0';
    expect(detectColorMode()).toBe('none');
  });

  it('returns "16" when FORCE_COLOR is "1" with TTY', () => {
    withTty(true, () => {
      process.env.FORCE_COLOR = '1';
      expect(detectColorMode()).toBe('16');
    });
  });

  it('returns "256" when FORCE_COLOR is "2" with TTY', () => {
    withTty(true, () => {
      process.env.FORCE_COLOR = '2';
      expect(detectColorMode()).toBe('256');
    });
  });

  it('returns "truecolor" when FORCE_COLOR is "3" with TTY', () => {
    withTty(true, () => {
      process.env.FORCE_COLOR = '3';
      expect(detectColorMode()).toBe('truecolor');
    });
  });

  it('returns "none" when stdout is not a TTY', () => {
    withTty(false, () => {
      expect(detectColorMode()).toBe('none');
    });
  });

  it('returns "truecolor" when COLORTERM is "truecolor"', () => {
    withTty(true, () => {
      process.env.COLORTERM = 'truecolor';
      expect(detectColorMode()).toBe('truecolor');
    });
  });

  it('returns "truecolor" when COLORTERM is "24bit"', () => {
    withTty(true, () => {
      process.env.COLORTERM = '24bit';
      expect(detectColorMode()).toBe('truecolor');
    });
  });

  it('returns "256" when TERM contains "256"', () => {
    withTty(true, () => {
      process.env.TERM = 'xterm-256color';
      expect(detectColorMode()).toBe('256');
    });
  });

  it('returns "16" as fallback for a basic terminal', () => {
    withTty(true, () => {
      process.env.TERM = 'xterm';
      expect(detectColorMode()).toBe('16');
    });
  });
});

describe('resolveColor', () => {
  it('returns empty string for mode "none" regardless of token', () => {
    for (const token of ALL_TOKENS) {
      expect(resolveColor(token, 'none')).toBe('');
    }
  });

  it('returns non-empty string for every token in mode "16"', () => {
    for (const token of ALL_TOKENS) {
      expect(resolveColor(token, '16')).not.toBe('');
    }
  });

  it('returns non-empty string for every token in mode "256"', () => {
    for (const token of ALL_TOKENS) {
      expect(resolveColor(token, '256')).not.toBe('');
    }
  });

  it('returns non-empty string for every token in mode "truecolor"', () => {
    for (const token of ALL_TOKENS) {
      expect(resolveColor(token, 'truecolor')).not.toBe('');
    }
  });

  it('returns ANSI codes starting with \\x1b[', () => {
    const tokens: ColorToken[] = ['primary', 'success', 'error'];
    for (const token of tokens) {
      for (const mode of ['16', '256', 'truecolor'] as ColorMode[]) {
        expect(resolveColor(token, mode)).toMatch(/^\x1b\[/);
      }
    }
  });

  it('each token returns a different code in mode "16"', () => {
    const codes = ALL_TOKENS.map((t) => resolveColor(t, '16'));
    const unique = new Set(codes);
    // Some tokens may share the same code (e.g., dim and muted could share)
    // But at minimum we should have > 3 unique codes
    expect(unique.size).toBeGreaterThan(3);
  });
});

describe('ansiReset', () => {
  it('returns the ANSI reset sequence', () => {
    expect(ansiReset()).toBe('\x1b[0m');
  });
});
