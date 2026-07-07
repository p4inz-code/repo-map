/**
 * FrameGraph types for the V3 Runtime.
 *
 * The FrameGraph defines the deterministic render order of all layers.
 * No component may violate this ordering. Every layer is rendered in
 * the exact z-order defined by the graph.
 *
 * # Render Order (bottom to top)
 * 0.  Background
 * 1.  Header
 * 2.  Sidebar
 * 3.  Workspace
 * 4.  Panels
 * 5.  Overlay
 * 6.  Notifications
 * 7.  Palette
 * 8.  Search
 * 9.  Status Bar
 * 10. Cursor
 */

import type { FrameContext } from '../types.js';
import type { Line } from '../../v2/renderer/types.js';

// ─── Layer Identifier ─────────────────────────────────────────────

/**
 * Canonical layer identifiers in the FrameGraph.
 * These are the only valid layer IDs in the V3 Runtime.
 */
export type FrameGraphLayerId =
  | 'background'
  | 'header'
  | 'sidebar'
  | 'workspace'
  | 'panels'
  | 'overlay'
  | 'notifications'
  | 'palette'
  | 'search'
  | 'status-bar'
  | 'cursor';

// ─── Layer Assignment ─────────────────────────────────────────────

/**
 * Z-index assignment for each layer in the FrameGraph.
 *
 * These are the canonical z-values. Every layer MUST use these values.
 */
export const FRAME_GRAPH_Z_ORDER: Record<FrameGraphLayerId, number> = {
  'background': 0,
  'header': 100,
  'sidebar': 200,
  'workspace': 300,
  'panels': 400,
  'overlay': 500,
  'notifications': 600,
  'palette': 700,
  'search': 800,
  'status-bar': 900,
  'cursor': 1000,
};

/**
 * Ordered list of layer IDs from bottom to top.
 * This is the canonical render order.
 */
export const FRAME_GRAPH_ORDER: readonly FrameGraphLayerId[] = [
  'background',
  'header',
  'sidebar',
  'workspace',
  'panels',
  'overlay',
  'notifications',
  'palette',
  'search',
  'status-bar',
  'cursor',
];

// ─── Frame Graph Node ─────────────────────────────────────────────

/**
 * A single node in the FrameGraph.
 * Each node represents one renderable layer.
 */
export interface FrameGraphNode {
  /** Canonical layer ID. */
  readonly layerId: FrameGraphLayerId;
  /** Z-index for ordering (higher = on top). */
  readonly zIndex: number;
  /** Human-readable description of this layer's purpose. */
  readonly description: string;
  /** Whether this layer is visible by default. */
  readonly visibleByDefault: boolean;
  /** Render function for this layer. */
  render: (ctx: FrameContext) => Line[];
}

// ─── Frame Graph ──────────────────────────────────────────────────

/**
 * The FrameGraph defines and enforces the render order.
 *
 * It provides:
 * - A deterministic list of all layers in the correct order.
 * - Z-index assignments that cannot be overridden.
 * - Registration of render functions for each layer.
 * - Validation that all layers are registered.
 */
export interface FrameGraph {
  /** Get all layer IDs in render order (bottom to top). */
  readonly order: readonly FrameGraphLayerId[];

  /** Get the z-index for a given layer. */
  getZIndex(layerId: FrameGraphLayerId): number;

  /** Get the node for a given layer. */
  getNode(layerId: FrameGraphLayerId): FrameGraphNode | undefined;

  /** Register a render function for a layer. */
  setRenderer(layerId: FrameGraphLayerId, renderer: (ctx: FrameContext) => Line[]): void;

  /** Check if all canonical layers have renderers registered. */
  isComplete(): boolean;

  /** Get a list of missing (unregistered) layers. */
  getMissingLayers(): FrameGraphLayerId[];

  /** Set a layer's visibility. */
  setVisible(layerId: FrameGraphLayerId, visible: boolean): void;

  /** Check if a layer is visible. */
  isVisible(layerId: FrameGraphLayerId): boolean;
}
