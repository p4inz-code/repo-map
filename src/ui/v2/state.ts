/**
 * V2 State Store — centralized application state for all UI concerns.
 *
 * Wraps the v1 Store with enhanced capabilities for the v2 engine:
 * - Selected node, focused panel, notifications, scroll offsets, status
 * - Plugin state (future)
 * - Observable with fine-grained subscriptions
 *
 * Reuses the v1 Store internally for backward compatibility.
 */

import { Store as V1Store } from '../state/store.js';
import type { UIState } from '../state/types.js';
import type { Analysis, Technology } from '../../types.js';
import type { ThemeV2 } from './theme/theme.js';

// ─── V2 State Extensions ──────────────────────────────────────────

/** Application mode for v2. */
export type AppModeV2 =
  | 'idle'
  | 'dashboard'
  | 'scan'
  | 'scanning'
  | 'analyzing'
  | 'results'
  | 'architecture'
  | 'dependencies'
  | 'insights'
  | 'suggestions'
  | 'help'
  | 'settings'
  | 'about'
  | 'plugins'
  | 'history'
  | 'error'
  | 'loading';

/** Notification severity. */
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

/** A single notification in the queue. */
export interface Notification {
  id: string;
  message: string;
  severity: NotificationSeverity;
  duration: number;
  timestamp: number;
  dismissed: boolean;
}

/** Sidebar state. */
export interface SidebarState {
  /** Currently selected sidebar item ID. */
  selectedId: string;
  /** Whether the sidebar is collapsed. */
  collapsed: boolean;
  /** Sidebar width in characters. */
  width: number;
  /** Scroll offset. */
  scrollOffset: number;
  /** Animated selection progress (0..1 for smooth movement). */
  animationProgress: number;
}

/** Workspace split pane state. */
export interface SplitPaneState {
  /** Whether split mode is active. */
  active: boolean;
  /** Split direction. */
  direction: 'vertical' | 'horizontal';
  /** Position of the divider (ratio 0..1 or absolute position). */
  dividerPosition: number;
  /** Minimum pane sizes. */
  minSizes: [number, number];
}

/** Header state. */
export interface HeaderState {
  /** Project name. */
  projectName: string;
  /** Current file/directory path. */
  currentPath: string;
  /** Current mode label. */
  currentMode: string;
  /** Search query (when search is active). */
  searchQuery: string;
  /** Git branch name (if available). */
  gitBranch: string;
  /** Current time display. */
  clock: string;
  /** Terminal size display. */
  terminalSize: string;
  /** Performance indicator (FPS). */
  fps: number;
}

/** Status bar state. */
export interface StatusBarState {
  /** Current status message. */
  message: string;
  /** Background task description. */
  backgroundTask: string;
  /** Progress percentage (0-100, -1 if no progress). */
  progress: number;
  /** Memory usage in MB. */
  memory: number;
  /** Scan speed (files/sec). */
  scanSpeed: number;
  /** Selected file path. */
  selectedFile: string;
  /** Error count. */
  errors: number;
  /** Warning count. */
  warnings: number;
  /** Git branch name. */
  gitBranch: string;
}

/** Search state. */
export interface SearchState {
  /** Whether search is active. */
  active: boolean;
  /** Search query. */
  query: string;
  /** Indices of matching items. */
  matchIndices: number[];
  /** Currently selected match index. */
  selectedMatch: number;
}

/** Command palette state. */
export interface PaletteState {
  /** Whether the palette is open. */
  open: boolean;
  /** Filter text. */
  filter: string;
  /** Selected command index. */
  selectedIndex: number;
}

/** Modal state. */
export interface ModalState {
  /** Whether a modal is visible. */
  visible: boolean;
  /** Modal title. */
  title: string;
  /** Modal content type. */
  content: 'confirm' | 'info' | 'prompt' | 'custom';
  /** Custom modal content. */
  customContent?: unknown;
}

// ─── Full V2 State ────────────────────────────────────────────────

export interface V2AppState {
  /** Current application mode. */
  appMode: AppModeV2;

  /** Whether the v2 engine is active. */
  v2Active: boolean;

  /** Theme. */
  theme: ThemeV2 | null;

  /** Terminal dimensions. */
  terminalWidth: number;
  terminalHeight: number;

  /** Sidebar state. */
  sidebar: SidebarState;

  /** Header state. */
  header: HeaderState;

  /** Status bar state. */
  statusBar: StatusBarState;

  /** Split pane state. */
  splitPane: SplitPaneState;

  /** Search state. */
  search: SearchState;

  /** Command palette state. */
  palette: PaletteState;

  /** Modal state. */
  modal: ModalState;

  /** Notifications. */
  notifications: Notification[];

  /** Notifications queue. */
  notificationQueue: Notification[];

  /** Active screen ID. */
  activeScreen: string | null;

  /** Screen history stack. */
  screenHistory: string[];

  /** Analysis data (when available). */
  analysis: Analysis | null;

  /** Technology data. */
  technologies: Technology[];

  /** Whether raw mode is active. */
  rawMode: boolean;

  /** Cursor state. */
  cursorHidden: boolean;

  /** Render frame counter. */
  frameCount: number;

  /** Current FPS. */
  fps: number;

  /** System info. */
  performance: {
    lastFrameTime: number;
    avgFrameTime: number;
    minFrameTime: number;
    maxFrameTime: number;
  };

  /** Plugin registry (future). */
  plugins: Map<string, unknown>;

  /** Dirty state for render optimization. */
  dirty: Set<string>;
}

// ─── Initial State ────────────────────────────────────────────────

export function createInitialV2State(): V2AppState {
  return {
    appMode: 'idle',
    v2Active: true,
    theme: null,
    terminalWidth: 80,
    terminalHeight: 24,
    sidebar: {
      selectedId: 'dashboard',
      collapsed: false,
      width: 24,
      scrollOffset: 0,
      animationProgress: 0,
    },
    header: {
      projectName: 'repo-map',
      currentPath: '',
      currentMode: 'idle',
      searchQuery: '',
      gitBranch: '',
      clock: '',
      terminalSize: '80x24',
      fps: 0,
    },
    statusBar: {
      message: 'Ready',
      backgroundTask: '',
      progress: -1,
      memory: 0,
      scanSpeed: 0,
      selectedFile: '',
      errors: 0,
      warnings: 0,
      gitBranch: '',
    },
    splitPane: {
      active: false,
      direction: 'vertical',
      dividerPosition: 0.5,
      minSizes: [20, 20],
    },
    search: {
      active: false,
      query: '',
      matchIndices: [],
      selectedMatch: 0,
    },
    palette: {
      open: false,
      filter: '',
      selectedIndex: 0,
    },
    modal: {
      visible: false,
      title: '',
      content: 'info',
    },
    notifications: [],
    notificationQueue: [],
    activeScreen: null,
    screenHistory: [],
    analysis: null,
    technologies: [],
    rawMode: false,
    cursorHidden: false,
    frameCount: 0,
    fps: 0,
    performance: {
      lastFrameTime: 0,
      avgFrameTime: 0,
      minFrameTime: Infinity,
      maxFrameTime: 0,
    },
    plugins: new Map(),
    dirty: new Set<string>(),
  };
}

// ─── V2 Store ──────────────────────────────────────────────────────

export class V2Store {
  private _state: V2AppState;
  private _listeners: Map<string, Set<() => void>> = new Map();
  private _globalListeners: Set<() => void> = new Set();

  constructor(initialState?: Partial<V2AppState>) {
    this._state = { ...createInitialV2State(), ...initialState };
  }

  /** Get current state snapshot. */
  getState(): Readonly<V2AppState> {
    return this._state;
  }

  /** Update state with partial merge. */
  setState(partial: Partial<V2AppState>): void {
    this._state = { ...this._state, ...partial };
    this._notifyGlobal();
  }

  /** Update a specific slice of state. */
  updateSlice<K extends keyof V2AppState>(key: K, value: Partial<V2AppState[K]>): void {
    const current = this._state[key];
    // Only spread-merge for plain objects; Set/Map/M primitives assign directly
    const merged = (
      typeof current === 'object' &&
      current !== null &&
      !(current instanceof Map) &&
      !(current instanceof Set)
    )
      ? { ...(current as Record<string, unknown>), ...(value as Record<string, unknown>) } as V2AppState[K]
      : (value as V2AppState[K]);
    this._state = { ...this._state, [key]: merged };
    this._notifyGlobal();
    this._notifySlice(key);
  }

  /** Subscribe to all state changes. */
  subscribe(callback: () => void): () => void {
    this._globalListeners.add(callback);
    return () => this._globalListeners.delete(callback);
  }

  /** Subscribe to a specific slice of state. */
  subscribeSlice(key: string, callback: () => void): () => void {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key)!.add(callback);
    return () => this._listeners.get(key)?.delete(callback);
  }

  /** Clear all listeners. */
  clear(): void {
    this._globalListeners.clear();
    this._listeners.clear();
  }

  /** Mark a component as dirty. */
  markDirty(id: string): void {
    const dirty = new Set(this._state.dirty);
    dirty.add(id);
    this._state = { ...this._state, dirty };
    this._notifyGlobal();
  }

  /** Clear dirty flags. */
  clearDirty(): void {
    this._state = { ...this._state, dirty: new Set<string>() };
  }

  /** Add a notification. */
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'dismissed'>): string {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const notif: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      dismissed: false,
    };
    const notifications = [...this._state.notifications, notif];
    this._state = { ...this._state, notifications };
    this._notifyGlobal();

    // Auto-dismiss after duration
    if (notification.duration > 0) {
      setTimeout(() => this.dismissNotification(id), notification.duration);
    }

    return id;
  }

  /** Dismiss a notification. */
  dismissNotification(id: string): void {
    const notifications = this._state.notifications.map((n) =>
      n.id === id ? { ...n, dismissed: true } : n,
    );
    this._state = { ...this._state, notifications };
    this._notifyGlobal();

    // Clean up dismissed notifications after animation
    setTimeout(() => {
      this._state = {
        ...this._state,
        notifications: this._state.notifications.filter((n) => !n.dismissed),
      };
      this._notifyGlobal();
    }, 300);
  }

  /** Update performance metrics with a frame time. */
  updateFrameTime(frameTime: number): void {
    const perf = this._state.performance;
    // Exponential moving average
    const avgFrameTime = perf.avgFrameTime === 0
      ? frameTime
      : perf.avgFrameTime * 0.9 + frameTime * 0.1;

    this._state = {
      ...this._state,
      frameCount: this._state.frameCount + 1,
      fps: 1000 / (avgFrameTime || 16),
      performance: {
        lastFrameTime: frameTime,
        avgFrameTime,
        minFrameTime: Math.min(perf.minFrameTime, frameTime),
        maxFrameTime: Math.max(perf.maxFrameTime, frameTime),
      },
    };
  }

  // ── Internal ────────────────────────────────────────────────────

  private _notifyGlobal(): void {
    for (const cb of this._globalListeners) {
      try { cb(); } catch { /* swallow */ }
    }
  }

  private _notifySlice(key: string): void {
    const listeners = this._listeners.get(key);
    if (listeners) {
      for (const cb of listeners) {
        try { cb(); } catch { /* swallow */ }
      }
    }
  }
}
