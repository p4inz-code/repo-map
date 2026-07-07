/**
 * NavigationRouter — routes screen navigation with auto-selected transitions.
 *
 * Integrates with TransitionManager to drive screen transitions:
 * - Dashboard → Results: Slide Left
 * - Results → Dashboard: Slide Right
 * - Help: Fade
 * - Palette/Search: Overlay (non-transition)
 * - Error: Fade
 *
 * # Architecture
 * ```
 * NavigationRouter
 *   ├── Auto-select transition from (fromScreen, toScreen)
 *   ├── Feed transition to TransitionManager
 *   └── Emit navigation events on EventBus
 * ```
 *
 * # Determinism
 * - Transition selection is purely a function of (fromScreen, toScreen).
 * - Same navigation always selects the same transition.
 * - No random values.
 */

import type { TransitionManager } from '../../transition/manager.js';
import type { EventBus } from '../../event-bus/bus.js';
import type { WorkspaceManager } from '../../workspace/context.js';
import type { NavigationEvent, NavigationDirection } from './types.js';
import { autoSelectTransition, TRANSITION_PRESETS } from './types.js';

// ─── NavigationRouter ─────────────────────────────────────────────

export class NavigationRouter {
  private readonly _transitionManager: TransitionManager;
  private readonly _eventBus: EventBus;
  private readonly _workspaceManager: WorkspaceManager;
  private _lastScreen: string | null = null;

  constructor(
    transitionManager: TransitionManager,
    eventBus: EventBus,
    workspaceManager: WorkspaceManager,
  ) {
    this._transitionManager = transitionManager;
    this._eventBus = eventBus;
    this._workspaceManager = workspaceManager;
  }

  /**
   * Navigate to a screen with an auto-selected transition.
   *
   * @param screenId - The screen to navigate to.
   * @param fromScreen - The source screen (null if unknown, auto-detected).
   */
  navigate(screenId: string, fromScreen?: string | null): void {
    const source = fromScreen ?? this._lastScreen;
    const direction = source === screenId ? 'same' as NavigationDirection
      : this._isForward(source, screenId) ? 'forward' as NavigationDirection
      : 'backward' as NavigationDirection;

    // Auto-select transition
    const transitionConfig = autoSelectTransition(source, screenId);

    // If instant, don't use transition
    if (transitionConfig.instant) {
      // Direct navigation
      this._navigateDirect(screenId, source, direction, transitionConfig);
      return;
    }

    // Start a transition
    const active = this._transitionManager.startTransition(screenId, transitionConfig);

    // If a transition is already in progress, the manager queues this one
    if (active) {
      // Wire the transition completion to actual screen change
      this._transitionManager.onComplete((completed) => {
        if (completed.toScreen === screenId) {
          this._workspaceManager.setActiveScreen(screenId);
          this._lastScreen = screenId;

          this._emitNavigationEvent(
            source ?? '',
            screenId,
            direction,
            completed.config,
          );
        }
      });
    } else {
      // Queued — the transition will handle it
      // We still set the active screen so the workspace shows something
      this._workspaceManager.setActiveScreen(screenId);
      this._lastScreen = screenId;
    }
  }

  /**
   * Go back to the previous screen.
   * Uses the workspace history to determine the target.
   */
  goBack(): void {
    const ctx = this._workspaceManager.getContext();
    const history = ctx.screenHistory;

    if (history.length < 2) return;

    const prevScreen = history[history.length - 2]?.screenId;
    if (!prevScreen) return;

    this.navigate(prevScreen, history[history.length - 1]?.screenId ?? null);
  }

  // ── Accessors ─────────────────────────────────────────────────

  /** Get the last navigated screen. */
  get lastScreen(): string | null {
    return this._lastScreen;
  }

  // ── Internal ──────────────────────────────────────────────────

  /**
   * Determine if navigation is forward in the sidebar order.
   */
  private _isForward(from: string | null, to: string): boolean {
    const sidebarOrder: readonly string[] = [
      'dashboard', 'scan', 'results', 'architecture', 'dependencies',
      'insights', 'suggestions', 'history', 'plugins', 'settings', 'about',
    ];

    const fromIdx = sidebarOrder.indexOf(from ?? '');
    const toIdx = sidebarOrder.indexOf(to);

    if (fromIdx === -1 || toIdx === -1) return true; // Default forward

    return toIdx > fromIdx;
  }

  /**
   * Navigate directly without a transition (instant).
   */
  private _navigateDirect(
    screenId: string,
    source: string | null,
    direction: NavigationDirection,
    config: ReturnType<typeof autoSelectTransition>,
  ): void {
    this._workspaceManager.setActiveScreen(screenId);
    this._lastScreen = screenId;

    this._emitNavigationEvent(
      source ?? '',
      screenId,
      direction,
      {
        type: (config.type ?? 'fade') as 'fade' | 'slide' | 'push' | 'reveal' | 'crossfade',
        fromScreen: source ?? null,
        toScreen: screenId,
        duration: config.duration ?? 200,
      },
    );
  }

  /**
   * Emit a navigation event.
   */
  private _emitNavigationEvent(
    fromScreen: string,
    toScreen: string,
    direction: NavigationDirection,
    transition: any,
  ): void {
    this._eventBus.emit('transition-completed', {
      type: transition.type ?? 'fade',
      fromScreen,
      toScreen,
      duration: transition.duration ?? 200,
    }, 'navigation-router');
  }
}
