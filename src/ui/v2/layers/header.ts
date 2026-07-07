/**
 * Premium Header — top bar with repo name, path, git branch, health score,
 * technology badges, project size, current mode, FPS, clock, version.
 *
 * Responsive: hides lower-priority info on narrow terminals.
 * Supports: badges, animated activity indicator, clean separators.
 */

import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import type { ColorToken } from '../theme/theme.js';

export interface HeaderConfig {
  store: V2Store;
}

export class HeaderComponent {
  private _store: V2Store;
  private _cachedLines: Line[] | null = null;

  constructor(config: HeaderConfig) {
    this._store = config.store;
  }

  render(ctx: RenderContext): Line[] {
    const state = this._store.getState();
    const h = state.header;
    const analysis = state.analysis;
    const w = ctx.width;
    const theme = ctx.theme;
    const g = theme.glyph.bind(theme);

    // Responsive: hide lower-priority items on narrow terminals
    const isNarrow = w < 80;
    const isMedium = w >= 80 && w < 100;

    // ── Left: Repo icon + name + branch + mode badge ─────────
    const repoIcon = g('repo');
    const name = `${repoIcon} ${h.projectName}`;

    // Git branch badge
    const branchStr = h.gitBranch && !isNarrow
      ? ` ${g('branch')} ${h.gitBranch}`
      : '';

    // Mode badge
    const modeTag = h.currentMode
      ? ` ${g('bullet')} ${h.currentMode}`
      : '';

    // ── Center: Path + health score + badges ─────────────────
    const centerParts: string[] = [];
    if (h.currentPath && !isNarrow && !isMedium) {
      centerParts.push(h.currentPath);
    }
    if (analysis) {
      const health = analysis.intelligence.health.overall;
      const healthColor = health >= 80 ? 'success' : health >= 50 ? 'warning' : 'error';
      if (!isNarrow) {
        centerParts.push(`${g('heart')} ${health}`);
      }
    }
    if (analysis && !isNarrow) {
      const totalFiles = analysis.stats.totalFiles;
      centerParts.push(`${totalFiles} files`);
    }
    const centerStr = centerParts.length > 0
      ? ` ${g('bullet')} ${centerParts.join(` ${g('bullet')} `)}`
      : '';

    // ── Right: FPS, memory, clock, version ───────────────────
    const rightParts: string[] = [];
    if (h.fps > 0 && !isNarrow) {
      rightParts.push(`FPS:${Math.round(h.fps)}`);
    }
    if (!isMedium && !isNarrow && h.clock) rightParts.push(h.clock);
    if (!isNarrow && h.terminalSize) rightParts.push(h.terminalSize);
    const rightStr = rightParts.length > 0 ? ` ${rightParts.join(' ')}` : '';

    // ── Assemble with exact spacing ──────────────────────────
    const leftFull = `${name}${branchStr}${modeTag}${centerStr}`;
    const totalLen = leftFull.length + rightStr.length;
    const padLen = Math.max(1, w - totalLen);
    const fullLine = `${leftFull}${' '.repeat(padLen)}${rightStr}`;

    // ── Divider line ─────────────────────────────────────────
    const sep = g('separator');

    this._cachedLines = [
      {
        segments: [{ text: fullLine.slice(0, w), style: {} }],
      },
      {
        segments: [{ text: sep.repeat(w), style: { dim: true } }],
      },
    ];

    return this._cachedLines;
  }

  getCachedLines(): Line[] | null { return this._cachedLines; }
  get height(): number { return 2; }
}
