/**
 * FrameGraph — the canonical render order enforcer for the V3 Runtime.
 *
 * Every visual component in the V3 Runtime renders into one of the
 * 11 canonical layers. The FrameGraph ensures:
 * - No layer renders out of order.
 * - All layers are registered before the pipeline starts.
 * - Z-index assignments are immutable and deterministic.
 *
 * # Render Order (bottom to top)
 * 0.  Background    — global background fill
 * 1.  Header        — top bar (repo name, path, badges)
 * 2.  Sidebar       — navigation tree
 * 3.  Workspace     — main content area (active screen)
 * 4.  Panels        — floating/inspector panels
 * 5.  Overlay       — semi-transparent overlay for modals
 * 6.  Notifications — toast notifications
 * 7.  Palette       — command palette
 * 8.  Search        — search overlay
 * 9.  Status Bar    — bottom bar
 * 10. Cursor        — cursor position indicator
 *
 * # Validation
 * - Call isComplete() before starting the render loop to ensure all
 *   layers have registered renderers.
 * - getMissingLayers() returns which layers are not yet registered.
 *
 * # Determinism
 * - The render order is fixed at construction time.
 * - Z-index values are immutable.
 * - iteration order is deterministic.
 */

import type { FrameContext } from '../types.js';
import type { Line } from '../../v2/renderer/types.js';
import type {
  FrameGraphLayerId,
  FrameGraphNode,
  FrameGraph as FrameGraphInterface,
} from './types.js';
import {
  FRAME_GRAPH_Z_ORDER,
  FRAME_GRAPH_ORDER,
} from './types.js';

// ─── FrameGraph ───────────────────────────────────────────────────

export class FrameGraph implements FrameGraphInterface {
  /** Registered renderers per layer. */
  private readonly _nodes: Map<FrameGraphLayerId, FrameGraphNode> = new Map();

  /** Visibility overrides (default: all visible). */
  private readonly _visibility: Map<FrameGraphLayerId, boolean> = new Map();

  /** Set of layers whose renderers have been explicitly set (not default no-op). */
  private readonly _renderersSet: Set<FrameGraphLayerId> = new Set();

  constructor() {
    // Initialize all canonical layers
    for (const layerId of FRAME_GRAPH_ORDER) {
      const zIndex = FRAME_GRAPH_Z_ORDER[layerId];

      this._nodes.set(layerId, {
        layerId,
        zIndex,
        description: this._getDefaultDescription(layerId),
        visibleByDefault: true,
        render: () => [],
      });

      this._visibility.set(layerId, true);
    }
  }

  // ── Accessors ─────────────────────────────────────────────────

  get order(): readonly FrameGraphLayerId[] {
    return FRAME_GRAPH_ORDER;
  }

  getZIndex(layerId: FrameGraphLayerId): number {
    return FRAME_GRAPH_Z_ORDER[layerId];
  }

  getNode(layerId: FrameGraphLayerId): FrameGraphNode | undefined {
    return this._nodes.get(layerId);
  }

  // ── Registration ──────────────────────────────────────────────

  setRenderer(
    layerId: FrameGraphLayerId,
    renderer: (ctx: FrameContext) => Line[],
  ): void {
    const existing = this._nodes.get(layerId);
    if (!existing) {
      throw new Error(
        `FrameGraph: unknown layer "${layerId}". Valid layers: ${FRAME_GRAPH_ORDER.join(', ')}`,
      );
    }

    this._nodes.set(layerId, {
      ...existing,
      render: renderer,
    });

    this._renderersSet.add(layerId);
  }

  // ── Visibility ────────────────────────────────────────────────

  setVisible(layerId: FrameGraphLayerId, visible: boolean): void {
    this._visibility.set(layerId, visible);
  }

  isVisible(layerId: FrameGraphLayerId): boolean {
    return this._visibility.get(layerId) ?? true;
  }

  // ── Validation ────────────────────────────────────────────────

  /**
   * Check if all canonical layers have render functions registered.
   * This should be called before starting the render loop.
   * A layer is "registered" only if its renderer was explicitly set
   * via setRenderer(), not if it still uses the default no-op.
   */
  isComplete(): boolean {
    for (const layerId of FRAME_GRAPH_ORDER) {
      if (!this._renderersSet.has(layerId)) return false;
    }
    return true;
  }

  /**
   * Get a list of canonical layers that don't have custom renderers.
   * These are still using the default no-op renderer.
   */
  getMissingLayers(): FrameGraphLayerId[] {
    const missing: FrameGraphLayerId[] = [];
    for (const layerId of FRAME_GRAPH_ORDER) {
      if (!this._renderersSet.has(layerId)) {
        missing.push(layerId);
      }
    }
    return missing;
  }

  /**
   * Iterate over all visible layers in render order (bottom to top).
   * Yields (layerId, node) pairs.
   */
  *iterateRenderOrder(): Generator<[FrameGraphLayerId, FrameGraphNode]> {
    for (const layerId of FRAME_GRAPH_ORDER) {
      if (!this._visibility.get(layerId)) continue;
      const node = this._nodes.get(layerId);
      if (node) {
        yield [layerId, node];
      }
    }
  }

  /**
   * Get all layers that need default renderers (for validation).
   * Only the Background and Cursor layers have meaningful default renderers
   * — all others must be explicitly set.
   */
  getDefaultRendererLayers(): FrameGraphLayerId[] {
    return ['background', 'cursor'];
  }

  // ── Internal ──────────────────────────────────────────────────

  private _getDefaultDescription(layerId: FrameGraphLayerId): string {
    const descriptions: Record<FrameGraphLayerId, string> = {
      background: 'Global background fill',
      header: 'Top bar: project name, path, badges, FPS, clock',
      sidebar: 'Navigation sidebar with sections and selection',
      workspace: 'Main content area showing the active screen',
      panels: 'Floating panels (inspector, split panes)',
      overlay: 'Semi-transparent overlay for modal dialogs',
      notifications: 'Toast notifications (top-right)',
      palette: 'Command palette overlay',
      search: 'Search overlay with results',
      'status-bar': 'Bottom status bar with mode, progress, FPS, hints',
      cursor: 'Cursor position indicator',
    };
    return descriptions[layerId] ?? 'Unknown layer';
  }
}
