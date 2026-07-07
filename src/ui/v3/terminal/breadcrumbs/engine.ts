/**
 * BreadcrumbEngine — keyboard-navigable breadcrumb path.
 *
 * Displays the current navigation path as a series of clickable/selectable
 * breadcrumbs. Each breadcrumb represents a screen in the navigation stack.
 * Keyboard navigation allows jumping to any breadcrumb in the path.
 *
 * Example:
 * ```
 * Workspace > Architecture > Circular Dependencies > Module A
 * ```
 *
 * Integrates with WorkspaceIdentity for the breadcrumb data.
 * Integrates with FocusTree for keyboard navigation.
 */

import type { EventBus } from '../../event-bus/bus.js';
import type { Breadcrumb } from '../workspace/identity.js';

// ─── BreadcrumbEngine ───────────────────────────────────────────────

export class BreadcrumbEngine {
  private readonly _eventBus: EventBus;

  /** Current breadcrumb path. */
  private _breadcrumbs: Breadcrumb[] = [];

  /** Currently selected breadcrumb index (-1 = none). */
  private _selectedIndex: number = -1;

  /** Max breadcrumbs to display. */
  private readonly _maxVisible: number = 8;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
    this._setupListeners();
  }

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Update breadcrumbs from navigation history.
   */
  update(breadcrumbs: Breadcrumb[]): void {
    this._breadcrumbs = breadcrumbs.slice(-this._maxVisible);
    if (this._selectedIndex >= this._breadcrumbs.length) {
      this._selectedIndex = this._breadcrumbs.length - 1;
    }
  }

  /**
   * Navigate to the previous breadcrumb (left).
   */
  navigateLeft(): void {
    if (this._breadcrumbs.length === 0) return;
    if (this._selectedIndex < 0) {
      this._selectedIndex = this._breadcrumbs.length - 1;
    } else if (this._selectedIndex > 0) {
      this._selectedIndex--;
    }
  }

  /**
   * Navigate to the next breadcrumb (right).
   */
  navigateRight(): void {
    if (this._breadcrumbs.length === 0) return;
    if (this._selectedIndex < 0) {
      this._selectedIndex = 0;
    } else if (this._selectedIndex < this._breadcrumbs.length - 1) {
      this._selectedIndex++;
    }
  }

  /**
   * Activate the currently selected breadcrumb.
   * @returns The target screen ID, or null if none selected.
   */
  activateSelected(): string | null {
    if (this._selectedIndex < 0 || this._selectedIndex >= this._breadcrumbs.length) {
      return null;
    }
    const target = this._breadcrumbs[this._selectedIndex];
    if (target.isCurrent) return null;
    return target.screenId;
  }

  /**
   * Get the current breadcrumb path for rendering.
   */
  getPath(): string[] {
    return this._breadcrumbs.map((b, i) => {
      const prefix = i === this._selectedIndex ? '>' : ' ';
      const suffix = b.isCurrent ? '*' : '';
      return `${prefix} ${b.label}${suffix}`;
    });
  }

  /**
   * Get the raw breadcrumb data.
   */
  getBreadcrumbs(): Breadcrumb[] {
    return [...this._breadcrumbs];
  }

  /**
   * Get the currently selected index.
   */
  get selectedIndex(): number {
    return this._selectedIndex;
  }

  /**
   * Get the number of visible breadcrumbs.
   */
  get count(): number {
    return this._breadcrumbs.length;
  }

  /**
   * Reset selection.
   */
  deselect(): void {
    this._selectedIndex = -1;
  }

  // ── Internal ──────────────────────────────────────────────────────

  private _setupListeners(): void {
    this._eventBus.on('screen-changed', () => {
      this.deselect();
    });
  }
}
