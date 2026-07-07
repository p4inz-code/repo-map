/**
 * Card animation types for the V3 Experience Engine.
 *
 * Cards no longer appear instantly. Supported animations:
 * - Fade: opacity animation
 * - Lift: vertical slide-up with fade
 * - Expand: horizontal expand from center
 * - Stagger: sequential delays for multiple cards entering together
 */

import type { EasingFn } from '../../animation/easing.js';
import { easeOutCubic, easeOutBack } from '../../animation/easing.js';

// ─── Card Animation Type ──────────────────────────────────────────

export type CardAnimationType = 'fade' | 'lift' | 'expand';

// ─── Card Animation Config ────────────────────────────────────────

export interface CardAnimationConfig {
  /** Animation type. */
  readonly type: CardAnimationType;
  /** Duration in ms (default: 300). */
  readonly durationMs: number;
  /** Easing function. */
  readonly easing: EasingFn;
  /** Stagger delay between cards in ms (default: 80). */
  readonly staggerDelayMs: number;
  /** Lift offset in rows (for 'lift' type, default: 2). */
  readonly liftOffset?: number;
}

// ─── Card Animation State ─────────────────────────────────────────

export interface CardAnimationState {
  /** Card identifier. */
  readonly id: string;
  /** Animation type for this card. */
  readonly type: CardAnimationType;
  /** Current progress (0..1). */
  progress: number;
  /** Whether this card's animation has completed. */
  completed: boolean;
  /** The opacity at this frame (0..1). */
  opacity: number;
  /** The vertical offset at this frame (in rows). */
  offsetY: number;
  /** The scale at this frame (0..1, for expand). */
  scale: number;
}

// ─── Default Card Configs ─────────────────────────────────────────

export const DEFAULT_CARD_CONFIGS: Record<CardAnimationType, CardAnimationConfig> = {
  fade: {
    type: 'fade',
    durationMs: 300,
    easing: easeOutCubic,
    staggerDelayMs: 80,
  },
  lift: {
    type: 'lift',
    durationMs: 400,
    easing: easeOutCubic,
    staggerDelayMs: 100,
    liftOffset: 2,
  },
  expand: {
    type: 'expand',
    durationMs: 500,
    easing: easeOutBack,
    staggerDelayMs: 120,
  },
};
