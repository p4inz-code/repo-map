/**
 * Easing functions for the V3 Runtime Animation Scheduler.
 *
 * All functions follow the signature: (t: number) => number
 * where t is the normalized time (0..1) and the return value
 * is the eased progress (also 0..1 for standard easings).
 *
 * # Determinism
 * All easing functions are pure and deterministic — given the same t,
 * they always return the same value. This ensures reproducible animations.
 *
 * # Available Easings
 * - Linear
 * - Ease In / Out / InOut (quadratic, cubic, quartic, quintic)
 * - Sine In / Out / InOut
 * - Expo In / Out / InOut
 * - Circ In / Out / InOut
 * - Back In / Out / InOut (overshoot)
 * - Elastic In / Out / InOut (bounce)
 * - Bounce In / Out / InOut (realistic bounce)
 *
 * # Usage
 * ```ts
 * import { Easings } from './easing.js';
 * const eased = Easings.easeOutCubic(0.5); // ~0.875
 * ```
 */

// ─── Easing Function Type ─────────────────────────────────────────

export type EasingFn = (t: number) => number;

// ─── Linear ───────────────────────────────────────────────────────

export const linear: EasingFn = (t) => t;

// ─── Quadratic ────────────────────────────────────────────────────

export const easeInQuad: EasingFn = (t) => t * t;
export const easeOutQuad: EasingFn = (t) => t * (2 - t);
export const easeInOutQuad: EasingFn = (t) =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

// ─── Cubic ────────────────────────────────────────────────────────

export const easeInCubic: EasingFn = (t) => t * t * t;
export const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ─── Quartic ──────────────────────────────────────────────────────

export const easeInQuart: EasingFn = (t) => t * t * t * t;
export const easeOutQuart: EasingFn = (t) => 1 - Math.pow(1 - t, 4);
export const easeInOutQuart: EasingFn = (t) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

// ─── Quintic ──────────────────────────────────────────────────────

export const easeInQuint: EasingFn = (t) => t * t * t * t * t;
export const easeOutQuint: EasingFn = (t) => 1 - Math.pow(1 - t, 5);
export const easeInOutQuint: EasingFn = (t) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

// ─── Sine ─────────────────────────────────────────────────────────

export const easeInSine: EasingFn = (t) => 1 - Math.cos((t * Math.PI) / 2);
export const easeOutSine: EasingFn = (t) => Math.sin((t * Math.PI) / 2);
export const easeInOutSine: EasingFn = (t) =>
  -(Math.cos(Math.PI * t) - 1) / 2;

// ─── Exponential ──────────────────────────────────────────────────

export const easeInExpo: EasingFn = (t) =>
  t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
export const easeOutExpo: EasingFn = (t) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
export const easeInOutExpo: EasingFn = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
};

// ─── Circular ─────────────────────────────────────────────────────

export const easeInCirc: EasingFn = (t) => 1 - Math.sqrt(1 - Math.pow(t, 2));
export const easeOutCirc: EasingFn = (t) => Math.sqrt(1 - Math.pow(t - 1, 2));
export const easeInOutCirc: EasingFn = (t) =>
  t < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;

// ─── Back (overshoot) ─────────────────────────────────────────────

const BACK_C1 = 1.70158;
const BACK_C2 = BACK_C1 * 1.525;
const BACK_C3 = BACK_C1 + 1;

export const easeInBack: EasingFn = (t) => BACK_C3 * t * t * t - BACK_C1 * t * t;
export const easeOutBack: EasingFn = (t) =>
  1 + BACK_C3 * Math.pow(t - 1, 3) + BACK_C1 * Math.pow(t - 1, 2);
export const easeInOutBack: EasingFn = (t) =>
  t < 0.5
    ? (Math.pow(2 * t, 2) * ((BACK_C2 + 1) * 2 * t - BACK_C2)) / 2
    : (Math.pow(2 * t - 2, 2) * ((BACK_C2 + 1) * (t * 2 - 2) + BACK_C2) + 2) / 2;

// ─── Elastic ──────────────────────────────────────────────────────

const ELASTIC_C4 = (2 * Math.PI) / 3;
const ELASTIC_C5 = (2 * Math.PI) / 4.5;

export const easeInElastic: EasingFn = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ELASTIC_C4);
};

export const easeOutElastic: EasingFn = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return (
    Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ELASTIC_C4) + 1
  );
};

export const easeInOutElastic: EasingFn = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5
    ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * ELASTIC_C5)) / 2
    : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * ELASTIC_C5)) / 2 + 1;
};

// ─── Bounce ───────────────────────────────────────────────────────

function bounceOut(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

export const easeOutBounce: EasingFn = bounceOut;

export const easeInBounce: EasingFn = (t) => 1 - bounceOut(1 - t);

export const easeInOutBounce: EasingFn = (t) =>
  t < 0.5
    ? (1 - bounceOut(1 - 2 * t)) / 2
    : (1 + bounceOut(2 * t - 1)) / 2;

// ─── Step (discrete) ──────────────────────────────────────────────

/**
 * Step easing — snaps to 1 at the given threshold.
 * Useful for instant transitions or discrete animation steps.
 */
export function step(threshold: number = 0.5): EasingFn {
  return (t: number) => (t < threshold ? 0 : 1);
}

// ─── Reverse (mirror) ─────────────────────────────────────────────

/**
 * Reverse an easing function.
 * Useful for reverse animations: easeOut becomes easeIn, etc.
 */
export function reverse(easing: EasingFn): EasingFn {
  return (t: number) => 1 - easing(1 - t);
}

// ─── Composite ────────────────────────────────────────────────────

/**
 * Composite two easings: apply `first` for t < crossover, then `second`.
 * Useful for multi-phase animations.
 */
export function composite(
  first: EasingFn,
  second: EasingFn,
  crossover: number = 0.5,
): EasingFn {
  return (t: number) => {
    if (t < crossover) {
      return first(t / crossover) * crossover;
    }
    return crossover + second((t - crossover) / (1 - crossover)) * (1 - crossover);
  };
}

// ─── Named Easing Map ─────────────────────────────────────────────

/**
 * Registry of all named easing functions.
 * Accessible by string key for serializable animation definitions.
 */
export const EasingRegistry: Record<string, EasingFn> = {
  linear,

  'ease-in-quad': easeInQuad,
  'ease-out-quad': easeOutQuad,
  'ease-in-out-quad': easeInOutQuad,

  'ease-in-cubic': easeInCubic,
  'ease-out-cubic': easeOutCubic,
  'ease-in-out-cubic': easeInOutCubic,

  'ease-in-quart': easeInQuart,
  'ease-out-quart': easeOutQuart,
  'ease-in-out-quart': easeInOutQuart,

  'ease-in-quint': easeInQuint,
  'ease-out-quint': easeOutQuint,
  'ease-in-out-quint': easeInOutQuint,

  'ease-in-sine': easeInSine,
  'ease-out-sine': easeOutSine,
  'ease-in-out-sine': easeInOutSine,

  'ease-in-expo': easeInExpo,
  'ease-out-expo': easeOutExpo,
  'ease-in-out-expo': easeInOutExpo,

  'ease-in-circ': easeInCirc,
  'ease-out-circ': easeOutCirc,
  'ease-in-out-circ': easeInOutCirc,

  'ease-in-back': easeInBack,
  'ease-out-back': easeOutBack,
  'ease-in-out-back': easeInOutBack,

  'ease-in-elastic': easeInElastic,
  'ease-out-elastic': easeOutElastic,
  'ease-in-out-elastic': easeInOutElastic,

  'ease-in-bounce': easeInBounce,
  'ease-out-bounce': easeOutBounce,
  'ease-in-out-bounce': easeInOutBounce,
};

/**
 * Look up an easing function by name.
 * Falls back to linear if the name is not found.
 */
export function getEasing(name: string): EasingFn {
  return EasingRegistry[name] ?? linear;
}
