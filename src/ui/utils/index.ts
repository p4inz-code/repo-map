/**
 * Shared UI utility functions.
 *
 * Contains helper functions used across multiple screens and components.
 * Follows the v2.2 pattern: inline first, extract to shared when used in 2+ screens.
 */

// ─── Label-value layout ─────────────────────────────────────────

/**
 * Width of the label column in character cells.
 * Fits "Classification" (the longest label across all screens).
 */
export const LABEL_WIDTH = 20;

/**
 * Render a label-value pair with a fixed-width label column.
 *
 * Contract (per PRODUCT_IDENTITY_V2.2.md §5):
 *   Input:  label ("Classification"), value ("CLI Tool"), suffix ("87%")
 *   Output: "Classification    CLI Tool                              87%"
 *
 * Label: padRight to LABEL_WIDTH chars
 * Value: follows immediately after label
 * Suffix: right-aligned after value (optional)
 *
 * @param label  - The label text (displayed bold at the caller level).
 * @param value  - The value text.
 * @param suffix - Optional suffix text (displayed dim at the caller level).
 * @returns A single string with the label-value pair spaced to LABEL_WIDTH.
 */
export function renderLabelValue(label: string, value: string, suffix?: string): string {
  const paddedLabel = label.padEnd(LABEL_WIDTH);
  if (suffix) {
    return paddedLabel + value + suffix.padStart(6);
  }
  return paddedLabel + value;
}
