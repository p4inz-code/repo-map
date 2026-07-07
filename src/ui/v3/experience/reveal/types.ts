/**
 * Reveal types for progressive workspace reveal animations.
 *
 * Each component in the workspace reveals progressively:
 * Header → Sidebar → Workspace → Cards → Footer
 *
 * Each component owns its reveal animation and reports completion
 * back to the reveal manager for sequencing.
 */

import type { EasingFn } from '../../animation/easing.js';
import { easeOutCubic } from '../../animation/easing.js';

// ─── Reveal Element ───────────────────────────────────────────────

/**
 * A revealable component/element in the workspace.
 */
export interface RevealElement {
  /** Element identifier. */
  readonly id: string;
  /** The frame graph layer this element renders into. */
  readonly layerId: string;
  /** Duration of the reveal animation in ms. */
  readonly durationMs: number;
  /** Easing function for the reveal. */
  readonly easing: EasingFn;
  /** Delay after the previous element's reveal starts, in ms. */
  readonly staggerDelayMs: number;
  /** Whether the element is currently revealed. */
  revealed: boolean;
  /** Current reveal progress (0..1). */
  progress: number;
}

// ─── Reveal Sequence ──────────────────────────────────────────────

/**
 * A sequence of elements to reveal in order.
 */
export interface RevealSequence {
  /** Elements to reveal, in order. */
  readonly elements: RevealElement[];
  /** Whether the entire sequence is complete. */
  completed: boolean;
}

// ─── Reveal Config ────────────────────────────────────────────────

export interface RevealConfig {
  /** Default reveal duration in ms. */
  readonly defaultDurationMs?: number;
  /** Default stagger delay between elements in ms. */
  readonly defaultStaggerMs?: number;
  /** Default easing function. */
  readonly defaultEasing?: EasingFn;
}

// ─── Default Reveal Elements ──────────────────────────────────────

export const DEFAULT_REVEAL_ELEMENTS: Omit<RevealElement, 'revealed' | 'progress'>[] = [
  { id: 'header', layerId: 'header', durationMs: 300, easing: easeOutCubic, staggerDelayMs: 0 },
  { id: 'sidebar', layerId: 'sidebar', durationMs: 400, easing: easeOutCubic, staggerDelayMs: 100 },
  { id: 'workspace', layerId: 'workspace', durationMs: 500, easing: easeOutCubic, staggerDelayMs: 150 },
  { id: 'panels', layerId: 'panels', durationMs: 350, easing: easeOutCubic, staggerDelayMs: 200 },
  { id: 'status-bar', layerId: 'status-bar', durationMs: 250, easing: easeOutCubic, staggerDelayMs: 100 },
];
