/**
 * ActionManager — displays and manages quick actions per screen.
 *
 * Every screen exposes actions displayed in the footer bar.
 * Actions update automatically when the screen changes.
 * Supports global actions (always visible) and screen-specific ones.
 *
 * Integrates with EventBus to react to screen changes.
 * Integrates with WorkspaceManager for context-aware actions.
 */

import type { EventBus } from '../../event-bus/bus.js';
import type { WorkspaceManager } from '../../workspace/context.js';
import type { QuickAction, ActionManagerState } from './types.js';

// ─── ActionManager ──────────────────────────────────────────────────

export class ActionManager {
  private readonly _eventBus: EventBus;
  private readonly _workspaceManager: WorkspaceManager;

  /** Global actions (visible on every screen). */
  private readonly _globalActions: Map<string, QuickAction> = new Map();

  /** Screen-specific actions. */
  private readonly _screenActions: Map<string, Map<string, QuickAction>> = new Map();

  /** The active screen ID. */
  private _activeScreen: string | null = null;

  constructor(eventBus: EventBus, workspaceManager: WorkspaceManager) {
    this._eventBus = eventBus;
    this._workspaceManager = workspaceManager;
    this._registerDefaults();
    this._setupListeners();
  }

  // ── Registration ──────────────────────────────────────────────────

  /**
   * Register a global action (visible on all screens).
   */
  registerGlobal(action: QuickAction): void {
    this._globalActions.set(action.id, action);
  }

  /**
   * Register a screen-specific action.
   */
  registerScreen(screenId: string, action: QuickAction): void {
    let actions = this._screenActions.get(screenId);
    if (!actions) {
      actions = new Map();
      this._screenActions.set(screenId, actions);
    }
    actions.set(action.id, action);
  }

  /**
   * Register multiple screen-specific actions at once.
   */
  registerScreenActions(screenId: string, actions: QuickAction[]): void {
    for (const action of actions) {
      this.registerScreen(screenId, action);
    }
  }

  /**
   * Unregister an action by ID from a screen.
   */
  unregisterScreen(screenId: string, actionId: string): void {
    const actions = this._screenActions.get(screenId);
    if (actions) {
      actions.delete(actionId);
    }
  }

  /**
   * Unregister a global action.
   */
  unregisterGlobal(actionId: string): void {
    this._globalActions.delete(actionId);
  }

  // ── Querying ──────────────────────────────────────────────────────

  /**
   * Get currently visible actions for the active screen.
   */
  getVisibleActions(): QuickAction[] {
    const visible: QuickAction[] = [];

    // Global actions
    for (const [, action] of this._globalActions) {
      if (action.visible) {
        visible.push(action);
      }
    }

    // Screen-specific actions
    if (this._activeScreen) {
      const screenActions = this._screenActions.get(this._activeScreen);
      if (screenActions) {
        for (const [, action] of screenActions) {
          if (action.visible) {
            visible.push(action);
          }
        }
      }
    }

    return visible;
  }

  /**
   * Get the full state snapshot.
   */
  getState(): ActionManagerState {
    const allActions: QuickAction[] = [];

    for (const [, action] of this._globalActions) {
      allActions.push(action);
    }

    if (this._activeScreen) {
      const screenActions = this._screenActions.get(this._activeScreen);
      if (screenActions) {
        for (const [, action] of screenActions) {
          allActions.push(action);
        }
      }
    }

    return {
      visibleActions: this.getVisibleActions(),
      allActions,
      activeScreen: this._activeScreen,
    };
  }

  /**
   * Handle a key press and execute the matching action.
   * @returns Whether an action was executed.
   */
  handleKeyPress(key: string): boolean {
    const visible = this.getVisibleActions();
    for (const action of visible) {
      if (action.key === key && action.enabled) {
        action.handler();
        return true;
      }
    }
    return false;
  }

  /**
   * Enable or disable a specific action.
   */
  setEnabled(actionId: string, enabled: boolean): void {
    // Check global actions
    const global = this._globalActions.get(actionId);
    if (global) {
      global.enabled = enabled;
      return;
    }

    // Check screen-specific actions
    if (this._activeScreen) {
      const screenActions = this._screenActions.get(this._activeScreen);
      if (screenActions) {
        const action = screenActions.get(actionId);
        if (action) {
          action.enabled = enabled;
        }
      }
    }
  }

  /**
   * Show or hide a specific action.
   */
  setVisible(actionId: string, visible: boolean): void {
    const global = this._globalActions.get(actionId);
    if (global) {
      global.visible = visible;
      return;
    }

    if (this._activeScreen) {
      const screenActions = this._screenActions.get(this._activeScreen);
      if (screenActions) {
        const action = screenActions.get(actionId);
        if (action) {
          action.visible = visible;
        }
      }
    }
  }

  /**
   * Reset all actions to defaults.
   */
  reset(): void {
    this._globalActions.clear();
    this._screenActions.clear();
    this._registerDefaults();
  }

  // ── Internal ──────────────────────────────────────────────────────

  private _registerDefaults(): void {
    // Global default actions
    this.registerGlobal({
      id: 'help',
      label: 'Help',
      key: '?',
      description: 'Show keyboard help',
      enabled: true,
      visible: true,
      icon: '?',
      handler: () => {
        this._eventBus.emit('overlay-changed', {
          overlayId: 'help',
          visible: true,
          modal: false,
        }, 'actions');
      },
    });

    this.registerGlobal({
      id: 'search',
      label: 'Search',
      key: '/',
      description: 'Open search',
      enabled: true,
      visible: true,
      icon: '⌕',
      handler: () => {
        this._eventBus.emit('search-opened', {
          query: '',
          resultCount: 0,
        }, 'actions');
      },
    });

    this.registerGlobal({
      id: 'palette',
      label: 'Commands',
      key: 'ctrl-p',
      description: 'Open command palette',
      enabled: true,
      visible: true,
      icon: '≡',
      handler: () => {
        this._eventBus.emit('palette-opened', {
          open: true,
        }, 'actions');
      },
    });
  }

  private _setupListeners(): void {
    this._eventBus.on('screen-changed', (msg) => {
      this._activeScreen = msg.payload.screenId;
    });
  }
}
