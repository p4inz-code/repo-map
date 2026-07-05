import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTerminalWidth,
  setForcedWidth,
  breakpoint,
  scaleColumns,
  type WidthInfo,
} from '../../../src/ui/layout/width.js';

// ─── Helpers ─────────────────────────────────────────────────────

/** Stub process.stdout columns and isTTY for the duration of a test. */
function withStdout(
  opts: { columns?: number; isTTY?: boolean },
  fn: () => void,
): void {
  const origColumns: PropertyDescriptor | undefined =
    Object.getOwnPropertyDescriptor(process.stdout, 'columns');
  const origIsTTY: PropertyDescriptor | undefined =
    Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');

  if (opts.columns !== undefined) {
    Object.defineProperty(process.stdout, 'columns', {
      value: opts.columns,
      configurable: true,
      writable: false,
    });
  }
  if (opts.isTTY !== undefined) {
    Object.defineProperty(process.stdout, 'isTTY', {
      value: opts.isTTY,
      configurable: true,
      writable: false,
    });
  }

  try {
    fn();
  } finally {
    if (origColumns) {
      Object.defineProperty(process.stdout, 'columns', origColumns);
    } else {
      delete (process.stdout as { columns?: unknown }).columns;
    }
    if (origIsTTY) {
      Object.defineProperty(process.stdout, 'isTTY', origIsTTY);
    } else {
      delete (process.stdout as { isTTY?: unknown }).isTTY;
    }
  }
}

// Reset forced width between tests
beforeEach(() => {
  setForcedWidth(null);
});

// =================================================================
// getTerminalWidth — TTY detection
// =================================================================

describe('getTerminalWidth', () => {
  describe('TTY behavior', () => {
    it('returns columns from process.stdout when TTY', () => {
      withStdout({ columns: 100, isTTY: true }, () => {
        const info = getTerminalWidth();
        expect(info.columns).toBe(100);
      });
    });

    it('returns 80 fallback when TTY but columns is undefined', () => {
      withStdout({ columns: undefined as unknown as number, isTTY: true }, () => {
        // process.stdout.columns can be undefined in some edge cases
        const info = getTerminalWidth();
        expect(info.columns).toBe(80);
      });
    });

    it('computes contentWidth correctly for a 100-col terminal', () => {
      withStdout({ columns: 100, isTTY: true }, () => {
        const info = getTerminalWidth();
        // contentWidth = min(100 - 4, 100) = 96
        expect(info.contentWidth).toBe(96);
      });
    });
  });

  describe('non-TTY behavior', () => {
    it('returns 80 fallback when stdout is not a TTY', () => {
      withStdout({ columns: 999, isTTY: false }, () => {
        const info = getTerminalWidth();
        expect(info.columns).toBe(80);
        expect(info.contentWidth).toBe(76); // min(80 - 4, 100)
      });
    });

    it('returns 80 fallback when isTTY is undefined', () => {
      withStdout({ columns: 999, isTTY: undefined as unknown as boolean }, () => {
        const info = getTerminalWidth();
        expect(info.columns).toBe(80);
      });
    });
  });

  describe('contentWidth edge cases', () => {
    it('caps contentWidth to MAX_CONTENT_WIDTH (100)', () => {
      withStdout({ columns: 200, isTTY: true }, () => {
        const info = getTerminalWidth();
        expect(info.columns).toBe(200);
        expect(info.contentWidth).toBe(100); // capped
      });
    });

  it('ensures contentWidth is positive for very narrow terminals', () => {
    withStdout({ columns: 10, isTTY: true }, () => {
      const info = getTerminalWidth();
      expect(info.contentWidth).toBe(6); // 10 - 4
    });
  });

    it('standard 80-col terminal gets correct content width', () => {
      withStdout({ columns: 80, isTTY: true }, () => {
        const info = getTerminalWidth();
        expect(info.contentWidth).toBe(76); // 80 - 4
      });
    });
  });

  describe('isNarrow / isWide', () => {
    it('marks terminals < 60 as narrow', () => {
      withStdout({ columns: 50, isTTY: true }, () => {
        const info = getTerminalWidth();
        expect(info.isNarrow).toBe(true);
        expect(info.isWide).toBe(false);
      });
    });

    it('marks terminals >= 120 as wide', () => {
      withStdout({ columns: 120, isTTY: true }, () => {
        const info = getTerminalWidth();
        expect(info.isNarrow).toBe(false);
        expect(info.isWide).toBe(true);
      });
    });

    it('marks 80-col terminal as neither narrow nor wide', () => {
      withStdout({ columns: 80, isTTY: true }, () => {
        const info = getTerminalWidth();
        expect(info.isNarrow).toBe(false);
        expect(info.isWide).toBe(false);
      });
    });

    it('marks 60-col terminal as not narrow (boundary)', () => {
      withStdout({ columns: 60, isTTY: true }, () => {
        const info = getTerminalWidth();
        expect(info.isNarrow).toBe(false);
        expect(info.isWide).toBe(false);
      });
    });

    it('marks 119-col terminal as not wide (boundary)', () => {
      withStdout({ columns: 119, isTTY: true }, () => {
        const info = getTerminalWidth();
        expect(info.isNarrow).toBe(false);
        expect(info.isWide).toBe(false);
      });
    });
  });
});

// =================================================================
// setForcedWidth
// =================================================================

describe('setForcedWidth', () => {
  it('overrides detected width when set', () => {
    setForcedWidth(50);
    const info = getTerminalWidth();
    expect(info.columns).toBe(50);
    expect(info.isNarrow).toBe(true);
  });

  it('overrides non-TTY fallback', () => {
    setForcedWidth(120);
    const info = getTerminalWidth();
    expect(info.columns).toBe(120);
    expect(info.isWide).toBe(true);
  });

  it('restores detection when set to null', () => {
    setForcedWidth(50);
    expect(getTerminalWidth().columns).toBe(50);

    setForcedWidth(null);
    // After restore, should detect again (non-TTY in test → 80)
    const info = getTerminalWidth();
    expect(info.columns).toBe(80);
  });

  it('allows switching forced widths without restoring', () => {
    setForcedWidth(50);
    expect(getTerminalWidth().columns).toBe(50);

    setForcedWidth(100);
    expect(getTerminalWidth().columns).toBe(100);
  });

  it('restores TTY-based detection after clear', () => {
    withStdout({ columns: 132, isTTY: true }, () => {
      setForcedWidth(50);
      expect(getTerminalWidth().columns).toBe(50);

      setForcedWidth(null);
      expect(getTerminalWidth().columns).toBe(132);
    });
  });

  it('accepts 0 as a forced width', () => {
    setForcedWidth(0);
    const info = getTerminalWidth();
    expect(info.columns).toBe(0);
    expect(info.contentWidth).toBe(0); // floored at 0
    expect(info.isNarrow).toBe(true);
  });

  it('contentWidth is min(columns - 4, 100) with forced width', () => {
    setForcedWidth(80);
    expect(getTerminalWidth().contentWidth).toBe(76);

    setForcedWidth(150);
    expect(getTerminalWidth().contentWidth).toBe(100); // capped
  });
});

// =================================================================
// breakpoint
// =================================================================

describe('breakpoint', () => {
  it("returns 'compact' for columns < 60", () => {
    expect(breakpoint(0)).toBe('compact');
    expect(breakpoint(30)).toBe('compact');
    expect(breakpoint(59)).toBe('compact');
  });

  it("returns 'normal' for 60 <= columns < 120", () => {
    expect(breakpoint(60)).toBe('normal');
    expect(breakpoint(80)).toBe('normal');
    expect(breakpoint(119)).toBe('normal');
  });

  it("returns 'wide' for columns >= 120", () => {
    expect(breakpoint(120)).toBe('wide');
    expect(breakpoint(200)).toBe('wide');
  });

  it('handles very large column counts', () => {
    expect(breakpoint(9999)).toBe('wide');
  });
});

// =================================================================
// scaleColumns
// =================================================================

describe('scaleColumns', () => {
  it('returns empty array for no columns', () => {
    expect(scaleColumns(100, [], [])).toEqual([]);
  });

  it('returns full available width for single column', () => {
    expect(scaleColumns(50, [10], [5])).toEqual([50]);
  });

  it('allocates minimum widths when available is exactly equal to min sum', () => {
    expect(scaleColumns(15, [3, 3], [5, 10])).toEqual([5, 10]);
  });

  it('allocates minimum widths when available is less than min sum', () => {
    expect(scaleColumns(10, [3, 3], [5, 8])).toEqual([5, 8]);
  });

  it('distributes proportionally by weight', () => {
    // 100 - (10 + 5) = 85 remaining
    // weight sum = 20 + 10 = 30
    // col 0: 10 + floor(85 * 20/30) = 10 + 56 = 66
    // col 1: 5 + floor(85 * 10/30) = 5 + 28 = 33
    // total: 99, 1 leftover → +1 to col 0 = 67
    const result = scaleColumns(100, [20, 10], [10, 5]);
    expect(result[0]).toBeGreaterThanOrEqual(10);
    expect(result[1]).toBeGreaterThanOrEqual(5);
    expect(result[0] + result[1]).toBe(100);
  });

  it('handles equal counts fairly', () => {
    // 75 remaining, each column gets floor(75*10/30) = 25
    const result = scaleColumns(90, [10, 10, 10], [5, 5, 5]);
    expect(result[0]).toBe(30); // 5 + 25
    expect(result[1]).toBe(30); // 5 + 25
    expect(result[2]).toBe(30); // 5 + 25
    expect(result.reduce((a, b) => a + b, 0)).toBe(90);
  });

  it('handles zero counts (equal distribution)', () => {
    const result = scaleColumns(30, [0, 0, 0], [3, 3, 3]);
    expect(result[0]).toBe(10);
    expect(result[1]).toBe(10);
    expect(result[2]).toBe(10);
    expect(result.reduce((a, b) => a + b, 0)).toBe(30);
  });

  it('respects minimum widths with zero counts', () => {
    const result = scaleColumns(30, [0, 0, 0], [5, 10, 15]);
    expect(result).toEqual([5, 10, 15]);
  });

  it('handles counts where some are zero', () => {
    // 100 - (5 + 5 + 5) = 85 remaining
    // total count = 0 + 10 + 0 = 10
    // col 0: 5 + floor(85 * 0/10) = 5 + 0 = 5
    // col 1: 5 + floor(85 * 10/10) = 5 + 85 = 90
    // col 2: 5 + floor(85 * 0/10) = 5 + 0 = 5
    // total: 100 ✓
    const result = scaleColumns(100, [0, 10, 0], [5, 5, 5]);
    expect(result[0]).toBe(5);
    expect(result[1]).toBe(90);
    expect(result[2]).toBe(5);
  });

  it('no column is starved (each respects its own minWidth)', () => {
    const result = scaleColumns(50, [10, 3, 7], [5, 2, 8]);
    const minWidths = [5, 2, 8];
    for (let i = 0; i < result.length; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(minWidths[i]);
    }
  });

  it('sum of widths equals available (within distribution precision)', () => {
    const result = scaleColumns(73, [13, 7, 5, 3], [5, 3, 2, 1]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(73);
  });

  it('handles a single column with exact width', () => {
    expect(scaleColumns(80, [1], [5])).toEqual([80]);
  });

  it('handles large count disparities without overflow', () => {
    const result = scaleColumns(100, [1, 1000], [10, 10]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    expect(result[1]).toBeGreaterThanOrEqual(result[0]);
  });
});

// =================================================================
// CJK-Awareness — width functions don't assume 1 char = 1 cell
// =================================================================

describe('CJK awareness', () => {
  it('scaleColumns respects minimums for CJK content widths', () => {
    // Chinese characters in practice are 2 cells wide, but layout
    // functions shouldn't make assumptions about character width.
    // Minimum widths should be set externally based on visibleLength.
    const result = scaleColumns(80, [30, 20, 10], [10, 5, 3]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(80);
    // Each column meets or exceeds its minimum
    expect(result[0]).toBeGreaterThanOrEqual(10);
    expect(result[1]).toBeGreaterThanOrEqual(5);
    expect(result[2]).toBeGreaterThanOrEqual(3);
  });

  it('getTerminalWidth returns numeric columns (no text-width assumption)', () => {
    withStdout({ columns: 80, isTTY: true }, () => {
      const info = getTerminalWidth();
      // columns is purely a number — no text width assumptions
      expect(typeof info.columns).toBe('number');
      expect(typeof info.contentWidth).toBe('number');
      // contentWidth should not assume 1 char = 1 cell — it's a
      // raw column count passed to layout functions.
      expect(info.contentWidth).toBe(76);
    });
  });

  it('breakpoint does not depend on character width assumptions', () => {
    // breakpoint is purely a numeric comparison — no text involved
    expect(breakpoint(60)).toBe('normal');
    expect(breakpoint(59)).toBe('compact');
    expect(breakpoint(120)).toBe('wide');
  });
});

// =================================================================
// Type checking — WidthInfo interface is correct
// =================================================================

describe('WidthInfo type', () => {
  it('has all required fields with correct types', () => {
    withStdout({ columns: 80, isTTY: true }, () => {
      const info: WidthInfo = getTerminalWidth();
      expect(typeof info.columns).toBe('number');
      expect(typeof info.contentWidth).toBe('number');
      expect(typeof info.isNarrow).toBe('boolean');
      expect(typeof info.isWide).toBe('boolean');
      expect(['compact', 'normal', 'wide']).toContain(info.breakpoint);
    });
  });

  it('full object shape is correct for a standard 80-col terminal', () => {
    withStdout({ columns: 80, isTTY: true }, () => {
      const info = getTerminalWidth();
      expect(info).toEqual({
        columns: 80,
        contentWidth: 76,  // 80 - 4
        isNarrow: false,   // 80 >= 60
        isWide: false,     // 80 < 120
        breakpoint: 'normal',
      });
    });
  });

  it('full object shape is correct for a narrow 50-col terminal', () => {
    withStdout({ columns: 50, isTTY: true }, () => {
      const info = getTerminalWidth();
      expect(info).toEqual({
        columns: 50,
        contentWidth: 46,  // 50 - 4
        isNarrow: true,    // 50 < 60
        isWide: false,     // 50 < 120
        breakpoint: 'compact',
      });
    });
  });

  it('full object shape is correct for a wide 150-col terminal', () => {
    withStdout({ columns: 150, isTTY: true }, () => {
      const info = getTerminalWidth();
      expect(info).toEqual({
        columns: 150,
        contentWidth: 100,  // capped at MAX_CONTENT_WIDTH
        isNarrow: false,    // 150 >= 60
        isWide: true,       // 150 >= 120
        breakpoint: 'wide',
      });
    });
  });
});
