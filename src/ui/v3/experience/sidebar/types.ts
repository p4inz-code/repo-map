/**
 * Sidebar motion types for the V3 Experience Engine.
 *
 * Defines the configuration for animated sidebar interactions:
 * - Gliding selection bar (eased position transition)
 * - Animated counters
 * - Animated expand/collapse
 * - Smooth group resizing
 */

// ─── Sidebar Motion State ─────────────────────────────────────────

/**
 * Tracks the animated state of the sidebar selection bar.
 */
export interface SidebarMotionState {
  /** Whether the selection bar animation is active. */
  readonly animating: boolean;
  /** Current animated Y position (continuous, may be between items). */
  readonly animatedPosition: number;
  /** Target Y position (where selection should land). */
  readonly targetPosition: number;
  /** Current progress of the selection glide (0..1). */
  readonly glideProgress: number;
  /** Whether the sidebar is currently expanding or collapsing. */
  readonly expandProgress: number; // 0 = collapsed, 1 = expanded
}

// ─── Animated Counter ─────────────────────────────────────────────

/**
 * An animated counter value for sidebar item counts.
 */
export interface AnimatedCounter {
  /** The item ID this counter belongs to. */
  readonly id: string;
  /** Current displayed value (animated). */
  currentValue: number;
  /** Target value to reach. */
  readonly targetValue: number;
  /** Whether the counter is still counting. */
  counting: boolean;
}

// ─── Sidebar Motion Config ────────────────────────────────────────

export interface SidebarMotionConfig {
  /** Duration of the selection glide in ms (default: 200). */
  readonly glideDurationMs?: number;
  /** Duration of expand/collapse in ms (default: 300). */
  readonly expandDurationMs?: number;
  /** Duration of counter animation in ms (default: 400). */
  readonly counterDurationMs?: number;
}
