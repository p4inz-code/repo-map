import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EtaAnimation } from '../../../src/ui/animation/eta.js';

describe('EtaAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('has type "eta"', () => {
    const eta = new EtaAnimation();
    expect(eta.type).toBe('eta');
  });

  it('returns a frame on first tick (shows 0.0s immediately)', () => {
    const eta = new EtaAnimation();
    // First tick at t=0 — shows "Done in 0.0s" as immediate feedback
    const frame = eta.tick(100);
    expect(frame).not.toBeNull();
    expect(frame!.lines[0]).toBe('Done in 0.0s');
  });

  it('returns a frame after 1 second', () => {
    const eta = new EtaAnimation('Elapsed');
    vi.advanceTimersByTime(1000);
    const frame = eta.tick(1000);
    expect(frame).not.toBeNull();
    expect(frame!.lines[0]).toContain('Elapsed');
    expect(frame!.lines[0]).toContain('s');
    expect(frame!.position).toBe('inline');
  });

  it('coalesces frames within the same second', () => {
    const eta = new EtaAnimation('Time');
    vi.advanceTimersByTime(1000);
    eta.tick(1000); // first frame — second boundary crossed
    const second = eta.tick(200); // still in the same second
    expect(second).toBeNull();
  });

  it('emits a new frame each second', () => {
    const eta = new EtaAnimation('T');

    vi.advanceTimersByTime(1000);
    const f1 = eta.tick(1000);
    expect(f1!.lines[0]).toMatch(/T \d+\.\ds/);

    vi.advanceTimersByTime(1000);
    const f2 = eta.tick(1000);
    expect(f2!.lines[0]).toMatch(/T \d+\.\ds/);
  });

  it('uses default label "Done in"', () => {
    const eta = new EtaAnimation();
    vi.advanceTimersByTime(1000);
    const frame = eta.tick(1000);
    expect(frame!.lines[0]).toContain('Done in');
  });

  it('reset() restarts the elapsed counter', () => {
    const eta = new EtaAnimation('T');
    vi.advanceTimersByTime(2000);
    eta.tick(1000);
    // Second elapsed is ~2s
    eta.reset();
    vi.advanceTimersByTime(1000);
    const frame = eta.tick(1000);
    expect(frame!.lines[0]).toMatch(/T \d+\.\ds/);
  });

  it('returns null after dispose', () => {
    const eta = new EtaAnimation();
    eta.dispose();
    expect(eta.tick(1000)).toBeNull();
  });
});
