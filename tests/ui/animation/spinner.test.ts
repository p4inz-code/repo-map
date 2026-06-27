import { describe, it, expect, vi } from 'vitest';
import { SpinnerAnimation } from '../../../src/ui/animation/spinner.js';

describe('SpinnerAnimation', () => {
  it('has type "spinner"', () => {
    const spinner = new SpinnerAnimation('test');
    expect(spinner.type).toBe('spinner');
  });

  it('returns a frame on first tick with default frames', () => {
    const spinner = new SpinnerAnimation('loading');
    const frame = spinner.tick(80);
    expect(frame).not.toBeNull();
    expect(frame!.lines[0]).toContain('loading');
    expect(frame!.position).toBe('inline');
  });

  it('advances frame after accumulating enough dt', () => {
    const spinner = new SpinnerAnimation('test', { frames: ['a', 'b', 'c'], interval: 100 });
    const f1 = spinner.tick(100);
    expect(f1!.lines[0]).toBe('a test');
    const f2 = spinner.tick(100);
    expect(f2!.lines[0]).toBe('b test');
    const f3 = spinner.tick(100);
    expect(f3!.lines[0]).toBe('c test');
  });

  it('wraps around after last frame', () => {
    const spinner = new SpinnerAnimation('x', { frames: ['a', 'b'], interval: 50 });
    spinner.tick(50); // a
    spinner.tick(50); // b
    const f3 = spinner.tick(50); // wraps to a
    expect(f3!.lines[0]).toBe('a x');
  });

  it('skips multiple frames when dt exceeds interval', () => {
    const spinner = new SpinnerAnimation('t', { frames: ['a', 'b', 'c'], interval: 50 });
    const frame = spinner.tick(150); // 3 intervals worth: wraps to start
    expect(frame!.lines[0]).toBe('a t'); // (0 + 3) % 3 = 0
  });

  it('updates text when update() is called', () => {
    const spinner = new SpinnerAnimation('old');
    spinner.update('new');
    const frame = spinner.tick(80);
    expect(frame!.lines[0]).toContain('new');
    expect(frame!.lines[0]).not.toContain('old');
  });

  it('returns null after dispose', () => {
    const spinner = new SpinnerAnimation('test');
    spinner.dispose();
    expect(spinner.tick(80)).toBeNull();
  });

  it('handles empty text', () => {
    const spinner = new SpinnerAnimation('', { frames: ['⠋'] });
    const frame = spinner.tick(80);
    expect(frame!.lines[0]).toBe('⠋');
  });

  it('returns static frame when enabled is false', () => {
    const spinner = new SpinnerAnimation('static', { frames: ['x'], enabled: false });
    const frame = spinner.tick(100);
    expect(frame!.lines[0]).toBe('x static');
  });
});
