/**
 * Pipeline types for the V3 Render Pipeline.
 *
 * Defines the contracts between each stage of the render pipeline:
 * 1. FrameBuilder — collects layer content
 * 2. LayerComposer — blends layers by z-order
 * 3. DoubleBuffer — stores front/back buffers
 * 4. DiffEngine — computes changed cells
 * 5. Terminal Output — writes ANSI escape sequences
 */

import type { FrameContext } from '../types.js';
import type { Line } from '../../v2/renderer/types.js';

// ─── Layer Content ────────────────────────────────────────────────

/**
 * Content produced by a single layer during the build phase.
 */
export interface LayerContent {
  /** Layer identifier (e.g., 'background', 'header', 'sidebar'). */
  readonly layerId: string;
  /** Z-index (higher = rendered on top). */
  readonly zIndex: number;
  /** Rendered lines for this layer. */
  readonly lines: Line[];
  /** Whether this layer is empty (no content). */
  readonly isEmpty: boolean;
}

// ─── Composed Frame ──────────────────────────────────────────────

/**
 * A fully composed frame ready for output.
 * Produced by the LayerComposer after z-order compositing.
 */
export interface ComposedFrame {
  /** Rendered lines (top-to-bottom, each line is the full terminal width). */
  readonly lines: Line[];
  /** Cached string representation per line (for diffing). */
  readonly textLines: string[];
  /** Width of the frame in character cells. */
  readonly width: number;
  /** Height of the frame in character cells. */
  readonly height: number;
}

// ─── Frame Build Plan ─────────────────────────────────────────────

/**
 * Describes which layers should be rendered this frame and their render order.
 * Produced by the FrameBuilder, consumed by the LayerComposer.
 */
export interface FrameBuildPlan {
  /** Layers to render, in z-order (lowest first). */
  readonly layers: LayerBuildItem[];
  /** Whether this is a full redraw. */
  readonly fullRedraw: boolean;
}

/**
 * A single layer to render in this frame.
 */
export interface LayerBuildItem {
  /** Layer identifier. */
  readonly layerId: string;
  /** Z-index. */
  readonly zIndex: number;
  /** Whether this layer is dirty and needs re-rendering. */
  dirty: boolean;
  /** Render function that produces Lines for this layer. */
  readonly render: (ctx: FrameContext) => Line[];
}

// ─── Diff Result ──────────────────────────────────────────────────

/**
 * Result of diffing two frames.
 */
export interface DiffResult {
  /** Changed cells that need to be written to the terminal. */
  readonly changes: CellChange[];
  /** Total number of changed cells. */
  readonly changeCount: number;
  /** Whether this is a full redraw (every cell changed). */
  readonly isFullRedraw: boolean;
}

/**
 * A single cell change detected by the diff engine.
 */
export interface CellChange {
  /** Column (0-based). */
  readonly x: number;
  /** Row (0-based). */
  readonly y: number;
  /** Character to write. */
  readonly char: string;
  /** ANSI escape code for styling. */
  readonly style: string;
}

// ─── Pipeline Stats ───────────────────────────────────────────────

/**
 * Performance statistics for a single frame pipeline run.
 */
export interface PipelineFrameStats {
  /** Frame number. */
  readonly frameNumber: number;
  /** Time to build frame (collect layer content) in ms. */
  readonly buildMs: number;
  /** Time to compose layers in ms. */
  readonly composeMs: number;
  /** Time to diff buffers in ms. */
  readonly diffMs: number;
  /** Time to write ANSI output to terminal in ms. */
  readonly flushMs: number;
  /** Total pipeline time in ms. */
  readonly totalMs: number;
  /** Number of changed cells this frame. */
  readonly changedCells: number;
  /** Whether a full redraw was triggered. */
  readonly fullRedraw: boolean;
}

// ─── Terminal Output ──────────────────────────────────────────────

/**
 * Output writer interface for platform-specific terminal writing.
 */
export interface TerminalWriter {
  /** Write raw string data to stderr (primary output stream). */
  write(data: string): void;
  /** Get terminal dimensions. */
  getSize(): { width: number; height: number };
}
