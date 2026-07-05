import { describe, it, expect } from 'vitest';
import { isColorEnabled, formatSize } from '../src/utils.js';

// Save and restore NO_COLOR env var around tests
const ORIG_NO_COLOR = process.env.NO_COLOR;

function withNoColor(value: string | undefined, fn: () => void): void {
  if (value === undefined) {
    delete process.env.NO_COLOR;
  } else {
    process.env.NO_COLOR = value;
  }
  try {
    fn();
  } finally {
    if (ORIG_NO_COLOR === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = ORIG_NO_COLOR;
    }
  }
}

describe('isColorEnabled', () => {
  it('returns true when NO_COLOR is not set and no --no-color flag', () => {
    withNoColor(undefined, () => {
      expect(isColorEnabled([])).toBe(true);
    });
  });

  it('returns false when NO_COLOR env var is "1"', () => {
    withNoColor('1', () => {
      expect(isColorEnabled([])).toBe(false);
    });
  });

  it('returns false when NO_COLOR env var is "true"', () => {
    withNoColor('true', () => {
      expect(isColorEnabled([])).toBe(false);
    });
  });

  it('returns false when argv contains --no-color', () => {
    withNoColor(undefined, () => {
      expect(isColorEnabled(['node', 'script', '--no-color'])).toBe(false);
    });
  });

  it('returns true when argv does not contain --no-color and NO_COLOR not set', () => {
    withNoColor(undefined, () => {
      expect(isColorEnabled(['node', 'script', '--json'])).toBe(true);
    });
  });

  it('NO_COLOR env var takes precedence over missing flag', () => {
    withNoColor('1', () => {
      expect(isColorEnabled(['node', 'script', '--json'])).toBe(false);
    });
  });

  it('handles undefined argv gracefully', () => {
    withNoColor(undefined, () => {
      expect(isColorEnabled()).toBe(true);
    });
  });

  it('handles empty argv gracefully', () => {
    withNoColor(undefined, () => {
      expect(isColorEnabled([])).toBe(true);
    });
  });
});

describe('formatSize', () => {
  it('formats bytes', () => {
    expect(formatSize(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatSize(1024)).toBe('1.0 KB');
    expect(formatSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatSize(1048576)).toBe('1.0 MB');
    expect(formatSize(1572864)).toBe('1.5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatSize(1073741824)).toBe('1.0 GB');
  });

  it('handles zero', () => {
    expect(formatSize(0)).toBe('0 B');
  });
});
