import { describe, it, expect } from 'vitest';
import { ProgressBarAnimation } from '../../../src/ui/animation/progress-bar.js';

describe('ProgressBarAnimation', () => {
  it('has type "progress-bar"', () => {
    const bar = new ProgressBarAnimation();
    expect(bar.type).toBe('progress-bar');
  });

  it('returns a frame on first tick (shows 0% on initial render)', () => {
    const bar = new ProgressBarAnimation({ width: 10 });
    const frame = bar.tick(80);
    expect(frame).not.toBeNull();
    expect(frame!.lines[0]).toContain('0%');
  });

  it('returns a frame after setting progress', () => {
    const bar = new ProgressBarAnimation({ width: 10 });
    bar.setProgress(50);
    const frame = bar.tick(80);
    expect(frame).not.toBeNull();
    expect(frame!.lines[0]).toContain('50%');
    expect(frame!.position).toBe('inline');
  });

  it('returns null on subsequent tick if progress unchanged (coalescing)', () => {
    const bar = new ProgressBarAnimation({ width: 10 });
    bar.setProgress(50);
    bar.tick(80); // first frame
    const second = bar.tick(80); // should be null (unchanged)
    expect(second).toBeNull();
  });

  it('renders 0% correctly', () => {
    const bar = new ProgressBarAnimation({ width: 10, showPercent: true });
    bar.setProgress(0);
    const frame = bar.tick(80);
    expect(frame!.lines[0]).toContain('0%');
  });

  it('renders 100% correctly', () => {
    const bar = new ProgressBarAnimation({ width: 10, showPercent: true });
    bar.setProgress(100);
    const frame = bar.tick(80);
    expect(frame!.lines[0]).toContain('100%');
  });

  it('clamps progress to 0-100', () => {
    const bar = new ProgressBarAnimation({ width: 10 });
    bar.setProgress(-10);
    expect(bar.tick(80)!.lines[0]).toContain('0%');
    bar.setProgress(150);
    expect(bar.tick(80)!.lines[0]).toContain('100%');
  });

  it('includes label when provided', () => {
    const bar = new ProgressBarAnimation({ label: 'Downloading', width: 10 });
    bar.setProgress(50);
    const frame = bar.tick(80);
    expect(frame!.lines[0]).toContain('Downloading');
  });

  it('hides percentage when showPercent is false', () => {
    const bar = new ProgressBarAnimation({ showPercent: false, width: 10 });
    bar.setProgress(50);
    const frame = bar.tick(80);
    expect(frame!.lines[0]).not.toMatch(/\d+%/);
  });

  it('returns null after dispose', () => {
    const bar = new ProgressBarAnimation();
    bar.dispose();
    expect(bar.tick(80)).toBeNull();
  });
});
