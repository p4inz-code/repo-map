import { describe, it, expect } from 'vitest';
import { detectUnicodeSupport, resolveSymbol } from '../../../src/ui/theme/symbols.js';
import type { SymbolToken } from '../../../src/ui/theme/symbols.js';

const ALL_TOKENS: SymbolToken[] = [
  'check', 'cross', 'warning', 'arrow', 'bullet', 'pointer', 'ellipsis',
  'arrowUp', 'arrowDown', 'separator', 'filled', 'empty',
];

/** Stub process.stdout.isTTY and process.platform for the duration of a test callback. */
function withStubbedEnv(
  opts: { tty?: boolean; platform?: NodeJS.Platform },
  fn: () => void,
): void {
  const origTty = process.stdout.isTTY;
  const origPlatform: PropertyDescriptor | undefined =
    Object.getOwnPropertyDescriptor(process, 'platform');

  if (opts.tty !== undefined) {
    Object.defineProperty(process.stdout, 'isTTY', {
      value: opts.tty,
      configurable: true,
      writable: false,
    });
  }
  if (opts.platform !== undefined) {
    Object.defineProperty(process, 'platform', {
      value: opts.platform,
      configurable: true,
      writable: false,
    });
  }

  try {
    fn();
  } finally {
    Object.defineProperty(process.stdout, 'isTTY', {
      value: origTty,
      configurable: true,
      writable: false,
    });
    if (origPlatform) {
      Object.defineProperty(process, 'platform', origPlatform);
    }
  }
}

describe('detectUnicodeSupport', () => {
  beforeEach(() => {
    delete process.env.WT_SESSION;
  });

  it('returns false when stdout is not a TTY', () => {
    withStubbedEnv({ tty: false }, () => {
      expect(detectUnicodeSupport()).toBe(false);
    });
  });

  it('returns true on non-Windows platforms with TTY', () => {
    withStubbedEnv({ tty: true, platform: 'linux' }, () => {
      expect(detectUnicodeSupport()).toBe(true);
    });
  });

  it('returns true on macOS with TTY', () => {
    withStubbedEnv({ tty: true, platform: 'darwin' }, () => {
      expect(detectUnicodeSupport()).toBe(true);
    });
  });

  it('returns false on Windows CMD (no WT_SESSION)', () => {
    withStubbedEnv({ tty: true, platform: 'win32' }, () => {
      delete process.env.WT_SESSION;
      expect(detectUnicodeSupport()).toBe(false);
    });
  });

  it('returns true on Windows Terminal (WT_SESSION set)', () => {
    withStubbedEnv({ tty: true, platform: 'win32' }, () => {
      process.env.WT_SESSION = '1';
      expect(detectUnicodeSupport()).toBe(true);
      delete process.env.WT_SESSION;
    });
  });
});

describe('resolveSymbol', () => {
  it('returns Unicode characters when unicode=true', () => {
    expect(resolveSymbol('check', true)).toBe('✓');
    expect(resolveSymbol('cross', true)).toBe('✗');
    expect(resolveSymbol('warning', true)).toBe('⚠');
    expect(resolveSymbol('arrow', true)).toBe('→');
    expect(resolveSymbol('bullet', true)).toBe('·');
    expect(resolveSymbol('ellipsis', true)).toBe('…');
    expect(resolveSymbol('filled', true)).toBe('█');
    expect(resolveSymbol('empty', true)).toBe('░');
  });

  it('returns ASCII fallback characters when unicode=false', () => {
    expect(resolveSymbol('check', false)).toBe('[ok]');
    expect(resolveSymbol('cross', false)).toBe('[!]');
    expect(resolveSymbol('warning', false)).toBe('[!]');
    expect(resolveSymbol('arrow', false)).toBe('->');
    expect(resolveSymbol('bullet', false)).toBe('*');
    expect(resolveSymbol('ellipsis', false)).toBe('...');
    expect(resolveSymbol('filled', false)).toBe('#');
    expect(resolveSymbol('empty', false)).toBe('.');
  });

  it('returns a non-empty string for every token in Unicode mode', () => {
    for (const token of ALL_TOKENS) {
      expect(resolveSymbol(token, true)).not.toBe('');
    }
  });

  it('returns a non-empty string for every token in ASCII mode', () => {
    for (const token of ALL_TOKENS) {
      expect(resolveSymbol(token, false)).not.toBe('');
    }
  });

  it('check and cross are different in Unicode mode', () => {
    const check = resolveSymbol('check', true);
    const cross = resolveSymbol('cross', true);
    expect(check).not.toBe(cross);
  });
});
