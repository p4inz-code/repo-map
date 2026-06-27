/**
 * Process items concurrently with a configurable batch size.
 *
 * Ensures deterministic output order (preserves input order) while
 * allowing bounded parallelism to improve throughput on large datasets.
 *
 * @param items - Array of items to process
 * @param fn - Async function to apply to each item
 * @param batchSize - Maximum concurrent operations (default: 50)
 * @returns Results in the same order as input items
 */
export async function processBatch<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  batchSize = 50,
): Promise<R[]> {
  // Guard against invalid values.
  // Non-positive batch sizes fall back to the default.
  batchSize = batchSize > 0 ? batchSize : 50;

  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map((item, batchIdx) => fn(item, i + batchIdx)),
    );

    results.push(...batchResults);
  }

  return results;
}