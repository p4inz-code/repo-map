/**
 * Screen Layout Helpers — consistent visual hierarchy for all screens.
 *
 * Every screen uses these helpers to ensure uniform spacing, padding,
 * and component usage. All spacing follows the 1-line, 2-space grid.
 *
 * # Spacing Rules (Phase A)
 * - 1 blank line between sections
 * - 2 spaces inside cards
 * - Equal left/right padding (2 spaces minimum)
 * - Consistent title spacing
 * - Consistent divider spacing
 * - Consistent card spacing
 */

import type { ThemeV2, TextStyle, ColorToken } from '../theme/theme.js';
import type { Line } from '../renderer/types.js';

// ═══════════════════════════════════════════════════════════════════
// SPACING HELPERS (Phase A)
// ═══════════════════════════════════════════════════════════════════

/** Global left padding for screen content (2 spaces). */
export const LEFT_PAD = 2;
/** Global right padding for screen content. */
const RIGHT_PAD = 2;
/** Inner card padding (2 spaces per Phase A spec). */
export const CARD_PAD = 2;

/** Create blank lines (default 1). */
export function blank(count: number = 1): Line[] {
  return Array.from({ length: count }, () => ({ segments: [{ text: '' }] }));
}

/** Pad text to a minimum width, truncating if too long. */
export function pad(text: string, width: number): string {
  const len = [...text].length; // Handle multi-byte / emoji
  if (len >= width) return [...text].slice(0, width).join('');
  return text + ' '.repeat(width - len);
}



// ═══════════════════════════════════════════════════════════════════
// TITLE BAR (Phase A)
// ═══════════════════════════════════════════════════════════════════

/** Render a screen title with icon and optional subtitle. */
export function screenTitle(theme: ThemeV2, icon: string, title: string, subtitle?: string): Line[] {
  const lines: Line[] = [];
  lines.push({
    segments: [
      { text: `${' '.repeat(LEFT_PAD)}${theme.glyph(icon)} `, style: { bold: true, color: 'primary' as ColorToken } },
      { text: title, style: { bold: true } },
    ],
  });
  if (subtitle) {
    lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}${subtitle}`, style: { dim: true } }] });
  }
  return lines;
}

// ═══════════════════════════════════════════════════════════════════
// SECTION HEADER (Phase A)
// ═══════════════════════════════════════════════════════════════════

const SEP_WIDTH = 36;

/** Render a section header with icon, title, and separator. */
export function sectionHeader(theme: ThemeV2, title: string, icon?: string, color?: ColorToken): Line[] {
  const iconStr = icon ? `${theme.glyph(icon)} ` : '';
  const sep = theme.glyph('separator');
  return [
    { segments: [{ text: '' }] },
    { segments: [{ text: `${' '.repeat(LEFT_PAD)}${iconStr}${title}`, style: { bold: true, color: color ?? 'primary' as ColorToken } }] },
    { segments: [{ text: `${' '.repeat(LEFT_PAD)}${sep.repeat(SEP_WIDTH)}`, style: { dim: true } }] },
  ];
}

// ═══════════════════════════════════════════════════════════════════
// DIVIDER (Phase A)
// ═══════════════════════════════════════════════════════════════════

/** Render a separator line across the screen. */
export function sectionDivider(theme: ThemeV2, width?: number): Line[] {
  const sep = theme.glyph('separator');
  const w = width ?? SEP_WIDTH;
  return [{ segments: [{ text: `${' '.repeat(LEFT_PAD)}${sep.repeat(w)}`, style: { dim: true } }] }];
}

// ═══════════════════════════════════════════════════════════════════
// PREMIUM CARD SYSTEM (Phase B)
// ═══════════════════════════════════════════════════════════════════

export type CardSeverity = 'health' | 'warning' | 'danger' | 'success' | 'neutral' | 'info';

/** Card severity → color token mapping. */
const SEVERITY_COLORS: Record<CardSeverity, ColorToken> = {
  health: 'primary',
  warning: 'warning',
  danger: 'error',
  success: 'success',
  neutral: 'dim',
  info: 'info',
};

export interface CardStyle {
  title?: string;
  subtitle?: string;
  severity?: CardSeverity;
  color?: ColorToken;
  footer?: string;
  width?: number;
  icon?: string;
  badge?: { text: string; color?: CardSeverity };
  progress?: { value: number; max?: number; label?: string };
}

/**
 * Get rounded border characters from the theme.
 */
function cardBorder(theme: ThemeV2) {
  return theme.border('round');
}

/**
 * Get double border characters from the theme.
 */
function doubleBorder(theme: ThemeV2) {
  return theme.border('double');
}

/**
 * Wrap content in a premium card with rounded borders.
 *
 * ┌──────────────────────────────┐
 * │  Title          [BADGE]      │
 * │  ─────────────────────────   │
 * │  body content                 │
 * │  ████████░░ 42%              │
 * │  ─────────────────────────   │
 * │  Footer                       │
 * └──────────────────────────────┘
 */
export function cardWrap(theme: ThemeV2, content: Line[], opts: CardStyle = {}): Line[] {
  const w = opts.width ?? 60;
  const severity = opts.severity ?? 'neutral';
  const color = opts.color ?? SEVERITY_COLORS[severity];
  const lines: Line[] = [];

  // ── Top border ──────────────────────────────────────────────
  const titlePart = opts.title ? ` ${opts.title} ` : '';
  const badgePart = opts.badge ? ` [${opts.badge.text}]` : '';
  const iconPart = opts.icon ? `${theme.glyph(opts.icon)} ` : '';
  const leftSide = `${iconPart}${titlePart}${badgePart}`;
  const topPad = Math.max(0, w - leftSide.length - 2);
  const b = cardBorder(theme);
  const topStr = `${' '.repeat(LEFT_PAD)}${b.tl}${leftSide}${b.h.repeat(topPad)}${b.tr}`;
  lines.push({ segments: [{ text: topStr, style: color !== 'dim' ? { color } : undefined }] });

  // ── Subtitle ────────────────────────────────────────────────
  if (opts.subtitle) {
    const subStr = `${' '.repeat(LEFT_PAD)}${b.v} ${pad(opts.subtitle, w - 4)} ${b.v}`;
    lines.push({ segments: [{ text: subStr, style: { dim: true } }] });
  }

  // ── Content ─────────────────────────────────────────────────
  // innerW = w - 2*CARD_PAD - 2 ensures the `│` chars align with the border corners
  // Full content line: LEFT_PAD + v + space + (CARD_PAD-1) + text + (CARD_PAD-1) + space + v
  //                 = 2 + 1 + 1 + (CARD_PAD-1) + innerW + (CARD_PAD-1) + 1 + 1
  //                 = 6 + 2*(CARD_PAD-1) + innerW = 4 + 2*CARD_PAD + innerW
  // Border line: LEFT_PAD + tl + h.repeat(w-2) + tr = 2 + 1 + w-2 + 1 = w + 2
  // For alignment: 4 + 2*CARD_PAD + innerW = w + 2 → innerW = w - 2 - 2*CARD_PAD
  const innerW = w - 2 - 2 * CARD_PAD;
  for (const line of content) {
    const text = line.segments.map(s => s.text).join('');
    const padded = `${' '.repeat(LEFT_PAD)}${b.v} ${' '.repeat(CARD_PAD - 1)}${pad(text, innerW)}${' '.repeat(CARD_PAD - 1)} ${b.v}`;
    lines.push({ segments: [{ text: padded }] });
  }

  // ── Progress bar ────────────────────────────────────────────
  if (opts.progress) {
    const { value, max = 100, label } = opts.progress;
    const pct = Math.min(1, Math.max(0, value / max));
    const barW = Math.min(w - 10, 20);
    const filled = Math.round(pct * barW);
    const empty = barW - filled;
    const bar = `${' '.repeat(LEFT_PAD)}${b.v} ${theme.glyph('filled').repeat(filled)}${theme.glyph('empty').repeat(empty)} ${label ?? `${Math.round(pct * 100)}%`}${' '.repeat(Math.max(0, w - barW - (label?.length ?? 4) - 6))}${b.v}`;
    lines.push({ segments: [{ text: bar }] });
  }

  // ── Footer separator + footer ───────────────────────────────
  if (opts.footer) {
    const fSep = `${' '.repeat(LEFT_PAD)}${b.v} ${b.h.repeat(w - 4)} ${b.v}`;
    lines.push({ segments: [{ text: fSep, style: { dim: true } }] });
    const fLine = `${' '.repeat(LEFT_PAD)}${b.v} ${pad(opts.footer, w - 4)} ${b.v}`;
    lines.push({ segments: [{ text: fLine, style: { dim: true } }] });
  }

  // ── Bottom border ───────────────────────────────────────────
  const botStr = `${' '.repeat(LEFT_PAD)}${b.bl}${b.h.repeat(w - 2)}${b.br}`;
  lines.push({ segments: [{ text: botStr, style: color !== 'dim' ? { color } : undefined }] });

  return lines;
}

/**
 * Double-border card for emphasis (error screens, important alerts).
 */
/** Double-border card for emphasis (error screens, important alerts). Uses same CARD_PAD as cardWrap. */
export function cardDouble(theme: ThemeV2, content: Line[], opts: CardStyle = {}): Line[] {
  const w = opts.width ?? 60;
  const color = opts.color ?? 'error';
  const lines: Line[] = [];
  const innerW = w - 2 - 2 * CARD_PAD;

  const db = doubleBorder(theme);
  const titlePart = opts.title ? ` ${opts.title} ` : '';
  const topPad = Math.max(0, w - titlePart.length - 2);
  lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD)}${db.tl}${titlePart}${db.h.repeat(topPad)}${db.tr}`, style: { color } }] });

  for (const line of content) {
    const text = line.segments.map(s => s.text).join('');
    const padded = `${' '.repeat(LEFT_PAD)}${db.v} ${' '.repeat(CARD_PAD - 1)}${pad(text, innerW)}${' '.repeat(CARD_PAD - 1)} ${db.v}`;
    lines.push({ segments: [{ text: padded }] });
  }

  if (opts.footer) {
    const fLine = `${' '.repeat(LEFT_PAD)}${db.v} ${' '.repeat(CARD_PAD - 1)}${pad(opts.footer, innerW)}${' '.repeat(CARD_PAD - 1)} ${db.v}`;
    lines.push({ segments: [{ text: fLine, style: { dim: true } }] });
  }

  lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD)}${db.bl}${db.h.repeat(w - 2)}${db.br}`, style: { color } }] });
  return lines;
}

// ═══════════════════════════════════════════════════════════════════
// BETTER METRICS — Premium boxed metric blocks (Phase C)
// ═══════════════════════════════════════════════════════════════════

export interface MetricItem {
  icon: string;
  label: string;
  value: string;
  color?: ColorToken;
  trend?: 'up' | 'down' | 'stable';
  delta?: string;
  subtitle?: string;
}

/**
 * Render a row of premium boxed metrics.
 *
 * ┌──────────────┐ ┌──────────────┐
 * │ ◆ 420        │ │ ▾ 12         │
 * │ FILES    ↑12%│ │ DIRS         │
 * └──────────────┘ └──────────────┘
 */
export function metricRow(theme: ThemeV2, items: MetricItem[], width?: number): Line[] {
  const totalW = width ?? 78;
  const itemW = Math.floor((totalW - LEFT_PAD - RIGHT_PAD) / items.length);
  const lines: Line[] = [];

  // Top borders
  const topParts = items.map(() => '╭' + '─'.repeat(itemW - 2) + '╮');
  lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD)}${topParts.join('')}` }] });

  // Value rows (icon + value + trend)
  const valParts = items.map((m) => {
    const icon = theme.glyph(m.icon);
    const trendIcon = m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '';
    const trendStr = trendIcon ? ` ${trendIcon}` : '';
    const val = `${icon} ${m.value}${trendStr}`;
    return `│ ${pad(val, itemW - 4)} │`;
  });
  lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD)}${valParts.join('')}`, style: { bold: true } }] });

  // Label rows (label + delta)
  const labelParts = items.map((m) => {
    const deltaStr = m.delta ? ` ${m.delta}` : '';
    return `│ ${pad(m.label.toUpperCase() + deltaStr, itemW - 4)} │`;
  });
  lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD)}${labelParts.join('')}`, style: { dim: true } }] });

  // Optional subtitles
  if (items.some(m => m.subtitle)) {
    const subParts = items.map((m) => {
      return `│ ${pad(m.subtitle ?? '', itemW - 4)} │`;
    });
    lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD)}${subParts.join('')}`, style: { dim: true } }] });
  }

  // Bottom borders
  const botParts = items.map(() => '╰' + '─'.repeat(itemW - 2) + '╯');
  lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD)}${botParts.join('')}` }] });

  return lines;
}

// ═══════════════════════════════════════════════════════════════════
// PROGRESS VISUALIZATION (Phase D)
// ═══════════════════════════════════════════════════════════════════

/** Health bar with color thresholds. */
export function healthBar(theme: ThemeV2, value: number, max: number = 100, label?: string, width?: number): Line[] {
  const w = width ?? 20;
  const pct = Math.min(1, Math.max(0, value / max));
  const filled = Math.round(pct * w);
  const empty = w - filled;
  const color: ColorToken = pct >= 0.8 ? 'success' : pct >= 0.5 ? 'warning' : 'error';
  const bar = theme.glyph('filled').repeat(Math.max(0, filled)) + theme.glyph('empty').repeat(Math.max(0, empty));
  const lbl = label ?? `${Math.round(pct * 100)}%`;
  return [{ segments: [{ text: `${' '.repeat(LEFT_PAD)}${bar} ${lbl}`, style: { color } }] }];
}

/** Percentage bar (10/20/30/auto width, rounded ends). */
export function percentageBar(theme: ThemeV2, pct: number, barWidth?: number, showLabel?: boolean): Line[] {
  const w = barWidth ?? 20;
  const clamped = Math.min(1, Math.max(0, pct));
  const filled = Math.round(clamped * w);
  const empty = w - filled;
  const color: ColorToken = clamped >= 0.8 ? 'success' : clamped >= 0.5 ? 'warning' : 'error';
  const bar = theme.glyph('filled').repeat(Math.max(0, filled)) + theme.glyph('empty').repeat(Math.max(0, empty));
  const label = showLabel !== false ? ` ${Math.round(clamped * 100)}%` : '';
  return [{ segments: [{ text: `${' '.repeat(LEFT_PAD)}${bar}${label}`, style: { color } }] }];
}

/** Segment bar (multiple colored segments in one bar). */
export function segmentBar(theme: ThemeV2, segments: { value: number; color: ColorToken }[], barWidth?: number): Line[] {
  const w = barWidth ?? 20;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let rendered = '';
  for (const seg of segments) {
    const segW = Math.max(0, Math.round((seg.value / total) * w));
    if (segW > 0) {
      rendered += theme.style(theme.glyph('filled').repeat(segW), { color: seg.color });
    }
  }
  const remaining = w - [...rendered].length;
  if (remaining > 0) {
    rendered += theme.glyph('empty').repeat(remaining);
  }
  return [{ segments: [{ text: `${' '.repeat(LEFT_PAD)}${rendered}` }] }];
}

/** Stack bar (stacked segments with total). */
export function stackBar(theme: ThemeV2, stacks: { label: string; value: number; color: ColorToken }[], barWidth?: number): Line[] {
  const w = barWidth ?? 20;
  const total = stacks.reduce((a, s) => a + s.value, 0) || 1;

  // Bar
  let bar = '';
  for (const s of stacks) {
    const segW = Math.max(0, Math.round((s.value / total) * w));
    if (segW > 0) bar += theme.style(theme.glyph('filled').repeat(segW), { color: s.color });
  }
  const remaining = w - [...bar].length;
  if (remaining > 0) bar += theme.glyph('empty').repeat(remaining);

  // Legend
  const legend = stacks.map(s => {
    const sample = theme.style('█', { color: s.color });
    return `${sample} ${s.label} ${s.value}`;
  }).join('  ');

  return [
    { segments: [{ text: `${' '.repeat(LEFT_PAD)}${bar}` }] },
    { segments: [{ text: `${' '.repeat(LEFT_PAD)}  ${legend}`, style: { dim: true } }] },
  ];
}

/** Mini sparkline. */
export function miniSparkline(theme: ThemeV2, data: number[], width?: number, color?: ColorToken): Line[] {
  const w = width ?? Math.min(data.length, 20);
  const c = color ?? 'primary';
  if (data.length === 0) return [{ segments: [{ text: '' }] }];

  const sliced = data.slice(-w);
  const maxVal = Math.max(...sliced, 1);
  const minVal = Math.min(...sliced, 0);
  const range = maxVal - minVal || 1;
  const chars = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const line = sliced.map(v => chars[Math.min(8, Math.round(((v - minVal) / range) * 8))]).join('');

  return [{ segments: [{ text: `${' '.repeat(LEFT_PAD)}${line}`, style: { color: c } }] }];
}

/** Gauge with label. */
export function gauge(theme: ThemeV2, value: number, max: number = 100, label?: string, width?: number): Line[] {
  const w = width ?? 16;
  const pct = Math.min(1, Math.max(0, value / max));
  const filled = Math.round(pct * w);
  const empty = w - filled;
  const color: ColorToken = pct >= 0.8 ? 'success' : pct >= 0.5 ? 'warning' : 'error';
  const blocks = theme.glyph('filled').repeat(Math.max(0, filled)) + theme.glyph('empty').repeat(Math.max(0, empty));
  const lbl = label ? ` ${label}` : '';
  return [{ segments: [{ text: `${' '.repeat(LEFT_PAD)}${blocks} ${value}${lbl}`, style: { color } }] }];
}

// ═══════════════════════════════════════════════════════════════════
// BADGE / TAG / PILL SYSTEM
// ═══════════════════════════════════════════════════════════════════

/** Render a row of badge pills. */
export function badgeRow(theme: ThemeV2, items: { text: string; color?: ColorToken; icon?: string }[]): Line[] {
  const lines: Line[] = [];
  // Render each badge as [label] with color
  const badges = items.map((b) => {
    const icon = b.icon ? `${theme.glyph(b.icon)} ` : '';
    const style: TextStyle = b.color ? { color: b.color } : { dim: true };
    return `${icon}${b.text}`;
  });
  // Group horizontally with spacing
  let currentLine = `${' '.repeat(LEFT_PAD)}`;
  for (const badge of badges) {
    if (currentLine.length + badge.length + 3 > 80) {
      lines.push({ segments: [{ text: currentLine }] });
      currentLine = `${' '.repeat(LEFT_PAD)}  `;
    }
    currentLine += `[${badge}] `;
  }
  lines.push({ segments: [{ text: currentLine, style: { dim: true } }] });
  return lines;
}

/** Render a single colored badge pill. */
export function badgePill(theme: ThemeV2, text: string, color?: ColorToken): Line[] {
  const c = color ?? 'primary';
  return [{ segments: [{ text: `${' '.repeat(LEFT_PAD)}[${text}]`, style: { color: c, bold: true } }] }];
}

// ═══════════════════════════════════════════════════════════════════
// KV PAIR LINE
// ═══════════════════════════════════════════════════════════════════

/** Render a key-value pair. No leading indent so callers provide their own spacing. */
export function kvLine(key: string, value: string, keyWidth?: number): Line {
  const kw = keyWidth ?? Math.max(key.length + 1, 14);
  const padded = pad(key, kw);
  return { segments: [{ text: `${padded}  ${value}` }] };
}

/** Dim variant of kvLine. */
export function kvLineDim(key: string, value: string, keyWidth?: number): Line {
  const kw = keyWidth ?? Math.max(key.length + 1, 14);
  const padded = pad(key, kw);
  return { segments: [{ text: `${padded}  ${value}`, style: { dim: true } }] };
}

/** Render a list of KV pairs as a card. */
export function kvCard(theme: ThemeV2, items: { key: string; value: string; dim?: boolean }[], opts?: CardStyle): Line[] {
  const kw = Math.max(...items.map(i => i.key.length + 1), 14);
  const lines: Line[] = items.map(i => ({
    segments: [{ text: `${pad(i.key, kw)}  ${i.value}`, style: i.dim ? { dim: true } : {} }],
  }));
  return cardWrap(theme, lines, opts);
}

// ═══════════════════════════════════════════════════════════════════
// SCREEN FOOTER
// ═══════════════════════════════════════════════════════════════════

/** Render a screen footer separator. */
export function screenFooter(theme: ThemeV2, width?: number): Line[] {
  const w = width ?? SEP_WIDTH;
  const sep = theme.glyph('separator');
  return [
    { segments: [{ text: '' }] },
    { segments: [{ text: `${' '.repeat(LEFT_PAD)}${sep.repeat(w)}`, style: { dim: true } }] },
  ];
}

// ═══════════════════════════════════════════════════════════════════
// RESPONSIVE HELPERS (Phase K)
// ═══════════════════════════════════════════════════════════════════

export type Breakpoint = 'compact' | 'normal' | 'wide' | 'xwide';

/** Classify a terminal width into a breakpoint. */
export function getBreakpoint(w: number): Breakpoint {
  if (w < 80) return 'compact';
  if (w < 100) return 'normal';
  if (w < 120) return 'wide';
  return 'xwide';
}

/** Get card width based on breakpoint. */
export function cardWidth(w: number): number {
  const bp = getBreakpoint(w);
  if (bp === 'compact') return Math.min(50, w - 4);
  if (bp === 'normal') return Math.min(56, w - 4);
  return Math.min(64, w - 4);
}

/** Get metric card count based on breakpoint. */
export function metricCount(w: number): number {
  const bp = getBreakpoint(w);
  if (bp === 'compact') return 2;
  if (bp === 'normal') return 3;
  return 4;
}

/** Get columns for tables based on breakpoint. */
export function tableColumns(w: number, preferred: number): number {
  const bp = getBreakpoint(w);
  if (bp === 'compact') return Math.min(preferred, 3);
  if (bp === 'normal') return Math.min(preferred, 5);
  return preferred;
}
