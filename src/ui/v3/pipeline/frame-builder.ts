/**
 * FrameBuilder — the first stage of the V3 Render Pipeline.
 *
 * Responsibilities:
 * - Receives dirty layer notifications from the RuntimeManager.
 * - Collects rendered lines from each dirty layer.
 * - Produces a FrameBuildPlan describing which layers need compositing.
 * - Associates each layer with its z-index for correct ordering.
 *
 * # Architecture
 * ```
 * RuntimeManager → FrameBuilder → FrameBuildPlan → LayerComposer
 * ```
 *
 * # Flow
 * 1. RuntimeManager calls build() with current FrameContext and dirty layer set.
 * 2. FrameBuilder resolves the render order from the FrameGraph.
 * 3. For each dirty layer, calls its render function with the FrameContext.
 * 4. Produces a list of LayerContent ready for compositing.
 *
 * # Dirty Layer Tracking
 * - Layers are tracked by ID.
 * - A layer is dirty if it needs re-rendering this frame.
 * - On initial render or resize, all layers are dirty.
 * - Layers can be marked dirty externally (via markDirty).
 *
 * # Determinism
 * - For the same set of dirty layers and FrameContext, the builder always
 *   produces the same build plan.
 */

import type { FrameContext } from '../types.js';
import type { LayerContent, LayerBuildItem, FrameBuildPlan } from './types.js';
import type { Line } from '../../v2/renderer/types.js';

// ─── FrameBuilder ─────────────────────────────────────────────────

export class FrameBuilder {
  /** Registered render functions by layer ID. */
  private readonly _renderers: Map<string, LayerBuildItem> = new Map();

  /** Cached build plan (recomputed when renderers change). */
  private _cachedRenderOrder: string[] = [];

  /** Whether the render order cache is stale. */
  private _orderDirty: boolean = false;

  /**
   * Register a layer's render function.
   *
   * @param layerId - Unique layer identifier.
   * @param zIndex  - Stacking order (higher = on top).
   * @param render  - Function that produces Lines given a FrameContext.
   */
  registerLayer(
    layerId: string,
    zIndex: number,
    render: (ctx: FrameContext) => Line[],
  ): void {
    this._renderers.set(layerId, {
      layerId,
      zIndex,
      dirty: true,
      render,
    });
    this._orderDirty = true;
  }

  /**
   * Unregister a layer.
   *
   * @param layerId - Layer identifier to remove.
   */
  unregisterLayer(layerId: string): void {
    this._renderers.delete(layerId);
    this._orderDirty = true;
  }

  /**
   * Check if a layer is registered.
   */
  hasLayer(layerId: string): boolean {
    return this._renderers.has(layerId);
  }

  /**
   * Mark a specific layer as dirty, forcing re-render on the next frame.
   */
  markDirty(layerId: string): void {
    const item = this._renderers.get(layerId);
    if (item) {
      item.dirty = true;
    }
  }

  /**
   * Mark all registered layers as dirty.
   */
  markAllDirty(): void {
    for (const [, item] of this._renderers) {
      item.dirty = true;
    }
  }

  /**
   * Get the number of registered layers.
   */
  get layerCount(): number {
    return this._renderers.size;
  }

  /**
   * Build the frame: render all dirty layers and produce LayerContent.
   *
   * @param ctx        - Current frame context.
   * @param dirtyOnly  - If true, only render dirty layers. If false, render all.
   * @returns An array of LayerContent (sorted by z-index, lowest first).
   */
  build(ctx: FrameContext, dirtyOnly: boolean = true): LayerContent[] {
    // Recompute render order if needed
    if (this._orderDirty) {
      this._rebuildOrder();
    }

    const results: LayerContent[] = [];

    for (const layerId of this._cachedRenderOrder) {
      const item = this._renderers.get(layerId);
      if (!item) continue;

      // Skip non-dirty layers if dirtyOnly is true
      if (dirtyOnly && !item.dirty && !ctx.fullRedraw) continue;

      // Render the layer
      const lines = item.render(ctx);

      // Determine if empty
      const isEmpty = lines.length === 0 ||
        lines.every((l) => l.segments.every((s) => s.text.length === 0));

      results.push({
        layerId: item.layerId,
        zIndex: item.zIndex,
        lines,
        isEmpty,
      });

      // Mark as clean after rendering
      item.dirty = false;
    }

    return results;
  }

  /**
   * Produce a FrameBuildPlan describing what needs to be rendered.
   * This is a lightweight operation that doesn't execute render functions.
   *
   * @param ctx - Current frame context.
   * @returns A build plan describing dirty layers and their order.
   */
  plan(ctx: FrameContext): FrameBuildPlan {
    if (this._orderDirty) {
      this._rebuildOrder();
    }

    const layers: LayerBuildItem[] = [];

    for (const layerId of this._cachedRenderOrder) {
      const item = this._renderers.get(layerId);
      if (!item) continue;

      const isDirty = item.dirty || ctx.fullRedraw;
      layers.push({
        layerId: item.layerId,
        zIndex: item.zIndex,
        dirty: isDirty,
        render: item.render,
      });
    }

    return {
      layers,
      fullRedraw: ctx.fullRedraw,
    };
  }

  // ── Internal ──────────────────────────────────────────────────

  /**
   * Rebuild the render order cache, sorted by z-index (ascending).
   */
  private _rebuildOrder(): void {
    this._cachedRenderOrder = [...this._renderers.keys()].sort((a, b) => {
      const aItem = this._renderers.get(a);
      const bItem = this._renderers.get(b);
      return (aItem?.zIndex ?? 0) - (bItem?.zIndex ?? 0);
    });
    this._orderDirty = false;
  }
}
