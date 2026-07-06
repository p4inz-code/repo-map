/**
 * Scanning phase screen — the first visible UI when running repo-map.
 *
 * Shows a spinner with "Scanning projectName..." while the scan runs,
 * then completes with "✓ Scanned projectName — X files, Y directories".
 *
 * # Architecture
 * - Uses the Renderer for ANSI conversion (never emits raw codes).
 * - Uses the AnimationManager and SpinnerAnimation for animated feedback.
 * - Writes to stderr (progress output convention).
 *
 * # Lifecycle
 * 1. `renderScanPhase()` — renders initial spinner line, starts animation,
 *    returns a Promise that resolves when the phase completes.
 * 2. `completeScanPhase()` — stops animation, renders completion line,
 *    fulfills the Promise from step 1.
 */

import { Renderer } from '../renderer.js';
import { AnimationManager } from '../animation/index.js';
import { SpinnerAnimation } from '../animation/spinner.js';
import { cursorHide, sanitizeFilePath } from '../utils/ansi.js';

// ─── Types ───────────────────────────────────────────────────────

export interface ScanPhaseOptions {
  /** Name of the project being scanned. */
  projectName: string;
}

// ─── Module-level state ──────────────────────────────────────────

/**
 * Maps AnimationManager instances to their pending phase state.
 * This allows the UISession orchestrator (Phase 12) to start and
 * complete the scan phase across separate function calls.
 */
const _pending = new Map<
  AnimationManager,
  {
    resolve: (result: { files: number; dirs: number }) => void;
    spinner: SpinnerAnimation;
    projectName: string;
  }
>();

// ─── Public API ──────────────────────────────────────────────────

/**
 * Start the scanning phase UI.
 *
 * Renders the initial spinner line to stderr, registers a
 * SpinnerAnimation with the manager, and starts frame delivery.
 *
 * @param renderer - The renderer for ANSI conversion.
 * @param manager  - The animation manager (must not be running).
 * @param options  - Scan phase configuration.
 * @returns An object with:
 *   - `done`: A Promise that resolves with file/directory counts when
 *     {@link completeScanPhase} is called.
 *   - `updateProgress`: A function to update the spinner with current
 *     file/directory counts during scanning.
 */
export function renderScanPhase(
  renderer: Renderer,
  manager: AnimationManager,
  options: ScanPhaseOptions,
): {
  done: Promise<{ files: number; dirs: number }>;
  updateProgress: (progress: { files: number; dirs: number }) => void;
} {
  const spinner = new SpinnerAnimation(`Scanning ${sanitizeFilePath(options.projectName)}...`);
  manager.register(spinner);

  // Hide cursor and render the first frame directly (synchronously)
  // so the user sees immediate feedback before the first animation tick.
  process.stderr.write(cursorHide());
  const initialFrame = spinner.tick(80);
  const initialLines = renderer.renderFrame([
    { segments: [{ text: initialFrame!.lines[0] }] },
  ]);
  for (const line of initialLines) {
    process.stderr.write(line + '\n');
  }

  // Start animation — each tick delivers a frame via the callback.
  // We use buildUpdate to overwrite the previous frame in-place.
  // buildUpdate returns [cursor-up, ...content lines]. The first element
  // is a cursor movement escape — it must NOT be followed by a newline.
  // Content lines need a newline to advance the terminal row.
  manager.start((frame) => {
    const update = renderer.buildUpdate([
      { segments: [{ text: frame.lines[0] }] },
    ]);
    update.forEach((line, i) => {
      // First element is cursor-up (no newline), rest are content lines
      process.stderr.write(i === 0 ? line : line + '\n');
    });
  });

  // Create a progress update function that modifies the spinner text
  // with current file/directory counts.
  function updateProgress(progress: { files: number; dirs: number }): void {
    spinner.update(
      `Scanning ${sanitizeFilePath(options.projectName)} — ${progress.files.toLocaleString()} files, ${progress.dirs.toLocaleString()} directories`,
    );
  }

  // Return a Promise that will be fulfilled when completeScanPhase is called,
  // along with a progress update function.
  // Clean up any stale pending entry for the same manager to prevent
  // memory leaks from orphaned promises (delete is a no-op if absent).
  _pending.delete(manager);
  const done = new Promise<{ files: number; dirs: number }>((resolve) => {
    _pending.set(manager, {
      resolve,
      spinner,
      projectName: options.projectName,
    });
  });

  return { done, updateProgress };
}

/**
 * Complete the scanning phase UI.
 *
 * Stops the animation, renders the completion summary line, and
 * fulfills the Promise returned by the corresponding
 * {@link renderScanPhase} call.
 *
 * @param renderer    - The renderer for ANSI conversion.
 * @param manager     - The animation manager (must be running).
 * @param files       - Total number of files found.
 * @param dirs        - Total number of directories found.
 * @param projectName - The project name (used for the completion message).
 */
export function completeScanPhase(
  renderer: Renderer,
  manager: AnimationManager,
  files: number,
  dirs: number,
  projectName: string,
): void {
  // Stop the manager — this disposes the spinner and stops frame delivery.
  // Must happen BEFORE we render the completion line so the animation
  // area is cleared.
  manager.stop();

  // Render the completion line with success styling.
  const checkSymbol = renderer.theme.symbol('check');
  const completionLines = renderer.renderFrame([
    {
      segments: [
        { text: `${checkSymbol} `, style: { color: 'success' } },
        { text: `Scanned ${sanitizeFilePath(projectName)} — ${files} files, ${dirs} directories` },
      ],
    },
  ]);
  for (const line of completionLines) {
    process.stderr.write(line + '\n');
  }

  // Fulfill the pending Promise.
  const pending = _pending.get(manager);
  if (pending) {
    pending.resolve({ files, dirs });
    _pending.delete(manager);
  }
}
