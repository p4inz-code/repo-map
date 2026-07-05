import os from 'node:os';

/**
 * Default batch size, adapted to the host machine's CPU count.
 * On a 4-core machine: 8 concurrent operations.
 * On an 8-core machine: 16 concurrent operations.
 * Minimum: 4 (safety floor for single-core or constrained environments).
 * Maximum: 64 (prevents excessive concurrency on high-core-count machines).
 */
const DEFAULT_BATCH_SIZE = Math.max(4, Math.min(64, os.cpus().length * 2));

/**
 * Process items concurrently with a configurable batch size.
 *
 * Ensures deterministic output order (preserves input order) while
 * allowing bounded parallelism to improve throughput on large datasets.
 *
 * The default batch size adapts to the host machine's CPU count.
 * Explicit batchSize overrides are preserved unchanged.
 *
 * @param items - Array of items to process
 * @param fn - Async function to apply to each item
 * @param batchSize - Maximum concurrent operations (default: adaptive based on CPU count)
 * @returns Results in the same order as input items
 */
export async function processBatch<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  batchSize?: number,
): Promise<R[]> {
  // Guard against non-positive values; fall back to adaptive default
  const effectiveBatchSize = (batchSize !== undefined && batchSize > 0) ? batchSize : DEFAULT_BATCH_SIZE;

  const results: R[] = [];

  for (let i = 0; i < items.length; i += effectiveBatchSize) {
    const batch = items.slice(i, i + effectiveBatchSize);

    const batchResults = await Promise.all(
      batch.map((item, batchIdx) => fn(item, i + batchIdx)),
    );

    results.push(...batchResults);
  }

  return results;
}