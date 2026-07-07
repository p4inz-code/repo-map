/**
 * RepositoryIdentity — makes the header feel alive.
 *
 * Provides repository metadata rendered in the header:
 * - Repository icon (derived from language/framework)
 * - Branch name
 * - Health score (with color)
 * - Git state (clean, dirty, uncommitted)
 * - Primary language
 * - Primary framework
 * - Repository badge (composite visual)
 *
 * Integrates with EventBus to react to analysis/repository changes.
 * Integrates with AnimationScheduler for smooth transitions.
 */

import type { EventBus } from '../../event-bus/bus.js';

// ─── Repository Metadata ────────────────────────────────────────────

export interface RepoMetadata {
  /** Project name. */
  readonly projectName: string;
  /** Git branch (null if not a git repo). */
  readonly branch: string | null;
  /** Health score (0-100). */
  readonly healthScore: number;
  /** Git state. */
  readonly gitState: GitState;
  /** Primary language. */
  readonly language: string | null;
  /** Primary framework. */
  readonly framework: string | null;
  /** Total file count. */
  readonly fileCount: number;
  /** Total directory count. */
  readonly directoryCount: number;
  /** Repository icon character. */
  readonly icon: string;
}

// ─── Git State ──────────────────────────────────────────────────────

export type GitState = 'clean' | 'dirty' | 'uncommitted' | 'untracked' | 'no-repo' | 'unknown';

// ─── Repository Identity Types ──────────────────────────────────────

export interface RepoIdentityState {
  /** Current repository metadata (null if no repo loaded). */
  readonly metadata: RepoMetadata | null;
  /** Whether the header identity is visible. */
  readonly visible: boolean;
  /** Whether data is loading. */
  readonly loading: boolean;
}

// ─── Language Icons ─────────────────────────────────────────────────

/**
 * Map of language names to icon characters.
 * Used to give each repository a distinct visual identity.
 */
export const LANGUAGE_ICONS: Record<string, string> = {
  typescript: 'TS',
  javascript: 'JS',
  python: '🐍',
  rust: '🦀',
  go: '🔷',
  java: '☕',
  ruby: '💎',
  csharp: '#',
  cpp: '++',
  c: '©',
  php: '🐘',
  swift: '🕊',
  kotlin: '🅺',
  scala: '🆂',
  dart: '🎯',
  elixir: '💧',
  clojure: '🍄',
  haskell: 'λ',
  lua: '🌙',
  zig: '⚡',
};

// ─── RepositoryIdentity ─────────────────────────────────────────────

export class RepositoryIdentity {
  private readonly _eventBus: EventBus;

  /** Current repo metadata. */
  private _metadata: RepoMetadata | null = null;

  /** Whether the identity is visible. */
  private _visible: boolean = true;

  /** Whether we're loading. */
  private _loading: boolean = false;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
    this._setupListeners();
  }

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Set or update repository metadata.
   */
  setMetadata(meta: Partial<RepoMetadata> & { projectName: string }): void {
    const icon = LANGUAGE_ICONS[meta.language?.toLowerCase() ?? ''] ?? '📁';

    this._metadata = {
      projectName: meta.projectName,
      branch: meta.branch ?? null,
      healthScore: meta.healthScore ?? 0,
      gitState: meta.gitState ?? 'unknown',
      language: meta.language ?? null,
      framework: meta.framework ?? null,
      fileCount: meta.fileCount ?? 0,
      directoryCount: meta.directoryCount ?? 0,
      icon,
    };

    this._loading = false;
    this._visible = true;
  }

  /**
   * Get the current repository identity state.
   */
  getState(): RepoIdentityState {
    return {
      metadata: this._metadata ? { ...this._metadata } : null,
      visible: this._visible,
      loading: this._loading,
    };
  }

  /**
   * Set loading state.
   */
  setLoading(loading: boolean): void {
    this._loading = loading;
  }

  /**
   * Show or hide the repository identity.
   */
  setVisible(visible: boolean): void {
    this._visible = visible;
  }

  /**
   * Reset to initial state.
   */
  reset(): void {
    this._metadata = null;
    this._visible = true;
    this._loading = false;
  }

  // ── Internal ──────────────────────────────────────────────────

  private _setupListeners(): void {
    this._eventBus.on('repository-loaded', (msg) => {
      const { projectName, fileCount, directoryCount } = msg.payload;
      this.setMetadata({ projectName, fileCount, directoryCount });
    });

    this._eventBus.on('analysis-finished', (msg) => {
      if (this._metadata) {
        this._metadata = {
          ...this._metadata,
          healthScore: msg.payload.healthScore,
        };
      }
    });
  }
}
