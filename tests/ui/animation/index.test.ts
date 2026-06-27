import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AnimationManager,
  type Animation,
  type AnimationFrame,
} from '../../../src/ui/animation/index.js';

// ─── Mock Animation Factory ──────────────────────────────────────

/**
 * Create a mock Animation with controllable behavior.
 */
function createMockAnimation(
  type: string = 'test',
  frames: AnimationFrame[] | null = null,
): Animation {
  let tickCount = 0;
  const frameSequence = frames ?? [
    { lines: ['tick 0'], position: 'inline' as const },
  ];

  return {
    type,
    tick: vi.fn(() => {
      if (frameSequence === null) return null;
      const idx = Math.min(tickCount, frameSequence.length - 1);
      tickCount++;
      return frameSequence[idx];
    }),
    dispose: vi.fn(),
  };
}

/**
 * Create an always-null animation (for testing coalescing).
 */
function createNullAnimation(type: string = 'null-anim'): Animation {
  return {
    type,
    tick: vi.fn(() => null),
    dispose: vi.fn(),
  };
}

/**
 * Create an animation that throws on tick (error resilience test).
 */
function createBrokenAnimation(): Animation {
  return {
    type: 'broken',
    tick: vi.fn(() => {
      throw new Error('tick failure');
    }),
    dispose: vi.fn(),
  };
}

// ─── Fake Timers Setup ───────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// =================================================================
// Constructor & Accessors
// =================================================================

describe('constructor & accessors', () => {
  it('uses default interval of 80ms', () => {
    const mgr = new AnimationManager({ enabled: true });
    expect(mgr.interval).toBe(80);
  });

  it('uses custom interval when provided', () => {
    const mgr = new AnimationManager({ interval: 200, enabled: true });
    expect(mgr.interval).toBe(200);
  });

  it('is not running on creation', () => {
    const mgr = new AnimationManager({ enabled: true });
    expect(mgr.running).toBe(false);
  });

  it('frameCount starts at 0', () => {
    const mgr = new AnimationManager({ enabled: true });
    expect(mgr.frameCount).toBe(0);
  });

  it('enabled reflects the injected value', () => {
    const enabled = new AnimationManager({ enabled: true });
    expect(enabled.enabled).toBe(true);

    const disabled = new AnimationManager({ enabled: false });
    expect(disabled.enabled).toBe(false);
  });

  it('enabled defaults to isTTY() — true when TTY is available', () => {
    const original = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: true,
      configurable: true,
      writable: false,
    });
    try {
      const mgr = new AnimationManager();
      expect(mgr.enabled).toBe(true);
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: original,
        configurable: true,
        writable: false,
      });
    }
  });

  it('enabled defaults to isTTY() — false when not a TTY', () => {
    const original = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: false,
      configurable: true,
      writable: false,
    });
    try {
      const mgr = new AnimationManager();
      expect(mgr.enabled).toBe(false);
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: original,
        configurable: true,
        writable: false,
      });
    }
  });

  it('start() and stop() called without crash', () => {
    const mgr = new AnimationManager({ enabled: true });
    const frameCallback = vi.fn();

    mgr.start(frameCallback);
    expect(mgr.running).toBe(true);

    mgr.stop();
    expect(mgr.running).toBe(false);
  });
});

// =================================================================
// Start / Stop
// =================================================================

describe('start / stop', () => {
  it('delivers frames on each tick when started', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const anim = createMockAnimation('spinner', [
      { lines: ['⠋'], position: 'inline' },
      { lines: ['⠙'], position: 'inline' },
    ]);
    mgr.register(anim);
    const frameCallback = vi.fn();

    mgr.start(frameCallback);
    expect(mgr.running).toBe(true);

    // Advance one tick
    vi.advanceTimersByTime(50);
    expect(frameCallback).toHaveBeenCalledTimes(1);
    expect(frameCallback).toHaveBeenCalledWith({
      lines: ['⠋'],
      position: 'inline',
    });

    // Advance another tick
    vi.advanceTimersByTime(50);
    expect(frameCallback).toHaveBeenCalledTimes(2);
    expect(frameCallback).toHaveBeenLastCalledWith({
      lines: ['⠙'],
      position: 'inline',
    });
  });

  it('stops delivering frames after stop()', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const anim = createMockAnimation();
    mgr.register(anim);
    const frameCallback = vi.fn();

    mgr.start(frameCallback);
    vi.advanceTimersByTime(50);
    expect(frameCallback).toHaveBeenCalledTimes(1);

    mgr.stop();
    vi.advanceTimersByTime(200);
    // No more frames after stop
    expect(frameCallback).toHaveBeenCalledTimes(1);
  });

  it('does nothing when enabled is false', () => {
    const mgr = new AnimationManager({ enabled: false });
    const anim = createMockAnimation();
    mgr.register(anim);
    const frameCallback = vi.fn();

    mgr.start(frameCallback);
    expect(mgr.running).toBe(false);
    expect(frameCallback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(frameCallback).not.toHaveBeenCalled();
  });

  it('does nothing if start is called while already running', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const anim = createMockAnimation();
    mgr.register(anim);
    const frameCallback = vi.fn();

    mgr.start(frameCallback);
    mgr.start(frameCallback); // second start should be a no-op

    vi.advanceTimersByTime(50);
    // Only one timer was set up — single tick delivered
    expect(frameCallback).toHaveBeenCalledTimes(1);
  });

  it('can be restarted after stop with fresh animations', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const frameCallback = vi.fn();

    // First cycle
    const anim1 = createMockAnimation();
    mgr.register(anim1);
    mgr.start(frameCallback);
    vi.advanceTimersByTime(50);
    expect(frameCallback).toHaveBeenCalledTimes(1);
    mgr.stop();

    // Second cycle
    const anim2 = createMockAnimation();
    mgr.register(anim2);
    mgr.start(frameCallback);
    vi.advanceTimersByTime(50);
    expect(frameCallback).toHaveBeenCalledTimes(2);
    mgr.stop();
  });
});

// =================================================================
// Frame Coalescing
// =================================================================

describe('frame coalescing', () => {
  it('skips callback when all animations return null', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const anim = createNullAnimation();
    mgr.register(anim);
    const frameCallback = vi.fn();

    mgr.start(frameCallback);
    vi.advanceTimersByTime(50);

    // tick() was called, but returned null — no frame delivered
    expect(anim.tick).toHaveBeenCalledTimes(1);
    expect(frameCallback).not.toHaveBeenCalled();
  });

  it('delivers frame when at least one animation updates', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const nullAnim = createNullAnimation();
    const activeAnim = createMockAnimation('active', [
      { lines: ['data'], position: 'inline' },
    ]);
    mgr.register(nullAnim);
    mgr.register(activeAnim);
    const frameCallback = vi.fn();

    mgr.start(frameCallback);
    vi.advanceTimersByTime(50);

    expect(frameCallback).toHaveBeenCalledTimes(1);
    expect(frameCallback).toHaveBeenCalledWith({
      lines: ['data'],
      position: 'inline',
    });
  });

  it('frameCount only increments when a frame is delivered', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const anim = createNullAnimation();
    mgr.register(anim);
    const frameCallback = vi.fn();

    mgr.start(frameCallback);
    vi.advanceTimersByTime(100); // 2 ticks
    expect(mgr.frameCount).toBe(0); // no frames delivered
    expect(frameCallback).not.toHaveBeenCalled();
  });
});

// =================================================================
// Register / Unregister
// =================================================================

describe('register / unregister', () => {
  it('newly registered animation starts receiving ticks', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const anim = createMockAnimation();
    const frameCallback = vi.fn();

    mgr.start(frameCallback);
    vi.advanceTimersByTime(50);
    expect(frameCallback).not.toHaveBeenCalled(); // no animations yet

    mgr.register(anim);
    vi.advanceTimersByTime(50);
    expect(frameCallback).toHaveBeenCalledTimes(1);
  });

  it('unregistered animation stops receiving ticks', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const anim = createMockAnimation();
    mgr.register(anim);
    const frameCallback = vi.fn();

    mgr.start(frameCallback);
    vi.advanceTimersByTime(50);
    expect(frameCallback).toHaveBeenCalledTimes(1);

    mgr.unregister(anim);
    vi.advanceTimersByTime(100);
    // tick() may still be called (the reference is removed), but
    // no animation exists to produce frames → no more deliveries
    expect(frameCallback).toHaveBeenCalledTimes(1);
  });

  it('unregister handles non-existent animation gracefully', () => {
    const mgr = new AnimationManager({ enabled: true });
    const anim = createMockAnimation();
    // Should not throw
    expect(() => mgr.unregister(anim)).not.toThrow();
  });

  it('register allows dynamic add after start', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const anim1 = createMockAnimation('a', [
      { lines: ['a1'], position: 'inline' },
    ]);
    const anim2 = createMockAnimation('b', [
      { lines: ['b1'], position: 'inline' },
    ]);
    const frameCallback = vi.fn();

    mgr.register(anim1);
    mgr.start(frameCallback);

    vi.advanceTimersByTime(50);
    expect(frameCallback).toHaveBeenLastCalledWith(
      expect.objectContaining({ lines: ['a1'] }),
    );

    mgr.register(anim2);
    vi.advanceTimersByTime(50);
    expect(frameCallback).toHaveBeenLastCalledWith(
      expect.objectContaining({ lines: ['b1'] }),
    );
  });
});

// =================================================================
// Pause / Resume
// =================================================================

describe('pause / resume', () => {
  it('pause stops frame delivery', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const anim = createMockAnimation();
    mgr.register(anim);
    const frameCallback = vi.fn();

    mgr.start(frameCallback);
    vi.advanceTimersByTime(50);
    expect(frameCallback).toHaveBeenCalledTimes(1);

    mgr.pause();
    vi.advanceTimersByTime(200);
    // Timer still running, but paused — no frames delivered
    expect(frameCallback).toHaveBeenCalledTimes(1);
  });

  it('resume restarts frame delivery after pause', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const anim = createMockAnimation('s', [
      { lines: ['a'], position: 'inline' },
      { lines: ['b'], position: 'inline' },
      { lines: ['c'], position: 'inline' },
    ]);
    mgr.register(anim);
    const frameCallback = vi.fn();

    mgr.start(frameCallback);

    // Tick 1
    vi.advanceTimersByTime(50);
    expect(frameCallback).toHaveBeenCalledTimes(1);

    // Pause for 2 ticks
    mgr.pause();
    vi.advanceTimersByTime(100); // 2 skipped ticks

    // Resume
    mgr.resume();
    vi.advanceTimersByTime(50); // 1 resumed tick

    // Should have received 2 frames total (tick 1 + tick after resume)
    expect(frameCallback).toHaveBeenCalledTimes(2);
  });

  it('pause has no effect when not running', () => {
    const mgr = new AnimationManager({ enabled: true });
    expect(() => mgr.pause()).not.toThrow();
  });

  it('resume has no effect when not paused', () => {
    const mgr = new AnimationManager({ enabled: true });
    expect(() => mgr.resume()).not.toThrow();
  });
});

// =================================================================
// dispose on stop
// =================================================================

describe('dispose on stop', () => {
  it('calls dispose() on all registered animations when stopped', () => {
    const mgr = new AnimationManager({ enabled: true });
    const anim1 = createMockAnimation('a');
    const anim2 = createMockAnimation('b');
    mgr.register(anim1);
    mgr.register(anim2);
    const frameCallback = vi.fn();

    mgr.start(frameCallback);
    mgr.stop();

    expect(anim1.dispose).toHaveBeenCalledTimes(1);
    expect(anim2.dispose).toHaveBeenCalledTimes(1);
  });

  it('clears animation list after stop', () => {
    const mgr = new AnimationManager({ enabled: true });
    const anim = createMockAnimation();
    mgr.register(anim);
    mgr.start(vi.fn());
    mgr.stop();

    // After stop, no animations remain
    const frameCallback = vi.fn();
    mgr.start(frameCallback);
    vi.advanceTimersByTime(50);
    expect(frameCallback).not.toHaveBeenCalled(); // no animations registered
  });

  it('resets frameCount to 0 on stop', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const anim = createMockAnimation();
    mgr.register(anim);
    mgr.start(vi.fn());

    vi.advanceTimersByTime(50);
    expect(mgr.frameCount).toBe(1);

    mgr.stop();
    expect(mgr.frameCount).toBe(0);
  });
});

// =================================================================
// Edge Cases
// =================================================================

describe('edge cases', () => {
  it('handles animations that throw on tick gracefully', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const broken = createBrokenAnimation();
    const good = createMockAnimation('good', [
      { lines: ['ok'], position: 'inline' },
    ]);
    mgr.register(broken);
    mgr.register(good);
    const frameCallback = vi.fn();

    mgr.start(frameCallback);
    vi.advanceTimersByTime(50);

    // The good animation should still deliver its frame despite the
    // broken animation throwing
    expect(frameCallback).toHaveBeenCalledTimes(1);
    expect(frameCallback).toHaveBeenCalledWith({
      lines: ['ok'],
      position: 'inline',
    });
  });

  it('handles dispose throwing gracefully', () => {
    const mgr = new AnimationManager({ enabled: true });
    const broken: Animation = {
      type: 'broken',
      tick: vi.fn(() => null),
      dispose: vi.fn(() => {
        throw new Error('dispose error');
      }),
    };
    mgr.register(broken);
    mgr.start(vi.fn());

    // Should not throw
    expect(() => mgr.stop()).not.toThrow();
  });

  it('start without animations does not produce frames', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const frameCallback = vi.fn();

    mgr.start(frameCallback);
    vi.advanceTimersByTime(200);

    expect(frameCallback).not.toHaveBeenCalled();
    expect(mgr.frameCount).toBe(0);
  });

  it('tick is called on registered animations even if frame is not delivered', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const anim = createNullAnimation();
    mgr.register(anim);
    const frameCallback = vi.fn();

    mgr.start(frameCallback);
    vi.advanceTimersByTime(100); // 2 ticks

    expect(anim.tick).toHaveBeenCalledTimes(2);
    expect(frameCallback).not.toHaveBeenCalled(); // coalesced
  });

  it('can register multiple animations and all receive ticks', () => {
    const mgr = new AnimationManager({ interval: 50, enabled: true });
    const anim1 = createMockAnimation('a', [
      { lines: ['from a'], position: 'inline' },
    ]);
    const anim2 = createMockAnimation('b', [
      { lines: ['from b'], position: 'inline' },
    ]);
    mgr.register(anim1);
    mgr.register(anim2);
    const frameCallback = vi.fn();

    mgr.start(frameCallback);
    vi.advanceTimersByTime(50);

    // Both were ticked
    expect(anim1.tick).toHaveBeenCalledTimes(1);
    expect(anim2.tick).toHaveBeenCalledTimes(1);
    // Last non-null frame was from anim2
    expect(frameCallback).toHaveBeenCalledWith({
      lines: ['from b'],
      position: 'inline',
    });
  });
});
