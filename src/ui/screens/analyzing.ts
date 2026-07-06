/**
 * Analyzing phase screen — the second visible UI phase when running repo-map.
 *
 * Shows a spinner with "Analyzing..." while analysis runs, then completes
 * with "✓ Done in X.Xs".
 *
 * # Architecture
 * - Uses the Renderer for ANSI conversion (never emits raw codes).
 * - Uses the AnimationManager and SpinnerAnimation for animated feedback.
 * - Writes to stderr (progress output convention).
 *
 * # Lifecycle
 * 1. `renderAnalyzePhase()` — renders initial spinner line, starts animation,
 *    returns a Promise that resolves with elapsed seconds when the phase
 *    completes.
 * 2. `completeAnalyzePhase()` — stops animation, renders elapsed line,
 *    fulfills the Promise from step 1.
 */

import { Renderer } from '../renderer.js';
import { AnimationManager } from '../animation/index.js';
import { SpinnerAnimation } from '../animation/spinner.js';
import { cursorHide } from '../utils/ansi.js';

// ─── Module-level state ──────────────────────────────────────────

/**
 * Maps AnimationManager instances to their pending phase state.
 * This allows the UISession orchestrator (Phase 12) to start and
 * complete the analyze phase across separate function calls.
 */
const _pending = new Map<
  AnimationManager,
  {
    resolve: (elapsed: number) => void;
  }
>();

// ─── Public API ──────────────────────────────────────────────────

/**
 * Start the analyzing phase UI.
 *
 * Renders the initial spinner line to stderr, registers a
 * SpinnerAnimation with the manager, and starts frame delivery.
 *
 * @param renderer - The renderer for ANSI conversion.
 * @param manager  - The animation manager (must not be running).
 * @returns A Promise that resolves with the elapsed time in seconds
 *          when {@link completeAnalyzePhase} is called.
 */
export function renderAnalyzePhase(
  renderer: Renderer,
  manager: AnimationManager,
): Promise<number> {
  const spinner = new SpinnerAnimation('Analyzing...');
  manager.register(spinner);

  // Hide cursor and render the first frame directly (synchronously).
  process.stderr.write(cursorHide());
  const initialFrame = spinner.tick(80);
  const initialLines = renderer.renderFrame([
    { segments: [{ text: initialFrame!.lines[0] }] },
  ]);
  for (const line of initialLines) {
    process.stderr.write(line + '\n');
  }

  // Start animation — each tick overwrites the previous frame.
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

  // Return a Promise that will be fulfilled when completeAnalyzePhase is called.
  // Clean up any stale pending entry for the same manager to prevent
  // memory leaks from orphaned promises (delete is a no-op if absent).
  _pending.delete(manager);
  return new Promise((resolve) => {
    _pending.set(manager, { resolve });
  });
}

/**
 * Complete the analyzing phase UI.
 *
 * Stops the animation, renders the elapsed time line, and fulfills
 * the Promise returned by the corresponding {@link renderAnalyzePhase}
 * call.
 *
 * @param renderer - The renderer for ANSI conversion.
 * @param manager  - The animation manager (must be running).
 * @param elapsed  - The elapsed time in seconds (e.g. 1.2).
 */
export function completeAnalyzePhase(
  renderer: Renderer,
  manager: AnimationManager,
  elapsed: number,
): void {
  // Stop the manager — disposes the spinner and stops frame delivery.
  manager.stop();

  // Render the completion line with success styling.
  const checkSymbol = renderer.theme.symbol('check');
  const completionLines = renderer.renderFrame([
    {
      segments: [
        { text: `${checkSymbol} `, style: { color: 'success' } },
        { text: `Done in ${elapsed.toFixed(1)}s` },
      ],
    },
  ]);
  for (const line of completionLines) {
    process.stderr.write(line + '\n');
  }

  // Fulfill the pending Promise.
  const pending = _pending.get(manager);
  if (pending) {
    pending.resolve(elapsed);
    _pending.delete(manager);
  }
}
