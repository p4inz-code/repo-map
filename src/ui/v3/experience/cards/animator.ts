/**
 * CardAnimator — drives animated card entry for the V3 Experience Engine.
 *
 * Supports:
 * - Fade: opacity 0→1
 * - Lift: slide up from below with fade
 * - Expand: grow from center
 * - Stagger: sequential delays for multiple cards entering together
 *
 * All animations driven by AnimationScheduler. No setTimeout.
 * Stagger timing is deterministic (configurable delay between cards).
 */

import type { AnimationScheduler } from '../../animation/scheduler.js';
import type { CardAnimationConfig, CardAnimationState, CardAnimationType } from './types.js';
import { DEFAULT_CARD_CONFIGS } from './types.js';

// ─── CardAnimator ─────────────────────────────────────────────────

export class CardAnimator {
  private readonly _scheduler: AnimationScheduler;
  private readonly _configs: Map<CardAnimationType, CardAnimationConfig>;

  /** Active card animation states. */
  private readonly _cards: Map<string, CardAnimationState> = new Map();

  constructor(scheduler: AnimationScheduler, customConfigs?: Partial<Record<CardAnimationType, Partial<CardAnimationConfig>>>) {
    this._scheduler = scheduler;
    this._configs = new Map();

    // Apply defaults + overrides
    for (const [type, defaultCfg] of Object.entries(DEFAULT_CARD_CONFIGS)) {
      const override = customConfigs?.[type as CardAnimationType];
      this._configs.set(type as CardAnimationType, {
        ...defaultCfg,
        ...override,
      });
    }
  }

  /**
   * Animate a set of cards entering with stagger timing.
   *
   * @param cardIds  - Array of card IDs in display order.
   * @param animType - Animation type for all cards.
   * @param onFrame  - Optional callback every frame with all card states.
   */
  animateCards(
    cardIds: string[],
    animType: CardAnimationType = 'fade',
    onFrame?: (states: CardAnimationState[]) => void,
  ): void {
    const config = this._configs.get(animType) ?? DEFAULT_CARD_CONFIGS.fade;

    // Initialize card states
    for (let i = 0; i < cardIds.length; i++) {
      const id = cardIds[i];
      const delay = i * config.staggerDelayMs;

      const state: CardAnimationState = {
        id,
        type: animType,
        progress: 0,
        completed: false,
        opacity: 0,
        offsetY: animType === 'lift' ? (config.liftOffset ?? 2) : 0,
        scale: animType === 'expand' ? 0 : 1,
      };

      this._cards.set(id, state);

      // Schedule animation with delay for stagger
      this._scheduler.animate({
        id: `card-${id}`,
        duration: config.durationMs,
        easing: config.easing,
        delay,
        from: 0,
        to: 1,
        onTick: (value) => {
          state.progress = value;
          state.opacity = this._calculateOpacity(animType, value);
          state.offsetY = animType === 'lift'
            ? (config.liftOffset ?? 2) * (1 - value)
            : 0;
          state.scale = animType === 'expand' ? value : 1;

          onFrame?.(this.getAllStates());
        },
        onComplete: () => {
          state.progress = 1;
          state.opacity = 1;
          state.offsetY = 0;
          state.scale = 1;
          state.completed = true;

          onFrame?.(this.getAllStates());
        },
      });
    }
  }

  /**
   * Animate a single card.
   */
  animateCard(
    cardId: string,
    animType: CardAnimationType = 'fade',
    onFrame?: (state: CardAnimationState) => void,
  ): void {
    this.animateCards([cardId], animType, (states) => {
      const card = states.find((s) => s.id === cardId);
      if (card) onFrame?.(card);
    });
  }

  // ── Accessors ─────────────────────────────────────────────────

  /**
   * Get the animation state for a specific card.
   * Returns null if the card hasn't been animated yet.
   * Returns a completed state if not found (default fully visible).
   */
  getState(cardId: string): CardAnimationState | null {
    return this._cards.get(cardId) ?? null;
  }

  /**
   * Get all active card animation states.
   */
  getAllStates(): CardAnimationState[] {
    return [...this._cards.values()];
  }

  /**
   * Get opacity for a card (1.0 if not animating).
   */
  getOpacity(cardId: string): number {
    return this._cards.get(cardId)?.opacity ?? 1;
  }

  /**
   * Get vertical offset for a card (0 if not animating).
   */
  getOffsetY(cardId: string): number {
    return this._cards.get(cardId)?.offsetY ?? 0;
  }

  /**
   * Get scale for a card (1.0 if not animating).
   */
  getScale(cardId: string): number {
    return this._cards.get(cardId)?.scale ?? 1;
  }

  /**
   * Reset all card animations.
   */
  reset(): void {
    this._cards.clear();
  }

  // ── Internal ──────────────────────────────────────────────────

  private _calculateOpacity(type: CardAnimationType, progress: number): number {
    switch (type) {
      case 'fade':
        return progress;
      case 'lift':
        return Math.min(1, progress * 1.5); // Fade in faster than lift
      case 'expand':
        return Math.min(1, progress * 1.2);
      default:
        return progress;
    }
  }
}
