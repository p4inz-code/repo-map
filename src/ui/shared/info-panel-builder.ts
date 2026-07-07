/**
 * InfoPanelData builder — shared pure function for building InfoPanelData
 * from a selected tree node and optional analysis data.
 *
 * Previously duplicated in:
 * - App::_syncTreeState()              (src/ui/app.ts)
 * - WorkspaceLayout::_onTreeSelection() (src/ui/components/workspace-layout.ts)
 *
 * # Architecture
 * - Pure function: no side effects, no references to Store or components.
 * - Depends only on state types and formatSize utility.
 * - Both callers produce identical InfoPanelData for the same inputs.
 * - The richer version (with file-size share, tech matching, language
 *   breakdown, health score) is used, so both callers benefit.
 */

import type { InfoPanelData, InspectorSection } from '../state/types.js';
import type { Analysis } from '../../types.js';
import { formatSize } from '../../utils.js';

// ─── Types ─────────────────────────────────────────────────────

/**
 * Minimal node info required to build panel data.
 * Both callers can adapt their richer types to this interface.
 */
export interface NodeInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  language?: string;
}

// ─── Builder ───────────────────────────────────────────────────

/**
 * Build an InfoPanelData object from a selected node and optional analysis.
 *
 * When analysis data is available, produces rich structured sections with:
 * - File: status, size share, extension, total files, tech confidence
 * - Directory: status, repository summary, technologies, languages, health score
 *
 * When analysis is null, produces a minimal description-only view.
 *
 * @param node     - The selected file or directory node.
 * @param analysis - Optional analysis data for structured sections.
 * @returns InfoPanelData ready to be passed to the InfoPanel component
 *          or stored in the UI state.
 */
export function buildInfoPanelData(
  node: NodeInfo,
  analysis: Analysis | null,
): InfoPanelData {
  // ── Metadata ──────────────────────────────────────────────
  const metadata: { label: string; value: string }[] = [
    { label: 'Path', value: node.path },
    { label: 'Type', value: node.type === 'file' ? 'File' : 'Directory' },
  ];
  if (node.size !== undefined) {
    metadata.push({ label: 'Size', value: formatSize(node.size) });
  }
  if (node.language) {
    metadata.push({ label: 'Language', value: node.language });
  }

  // ── Sections ──────────────────────────────────────────────
  const sections: InspectorSection[] = [];

  if (analysis) {
    if (node.type === 'file') {
      // File-level details from analysis
      const stats = analysis.stats;
      const techMatch = analysis.technologies.find(
        (t) => node.language && t.name.toLowerCase() === node.language!.toLowerCase(),
      );

      // Summary section
      const summaryItems: InspectorSection['items'] = [
        { label: 'Status', value: 'Analyzed' },
      ];
      if (node.size !== undefined) {
        const pct = stats.totalSize > 0
          ? ((node.size / stats.totalSize) * 100).toFixed(1)
          : '0';
        summaryItems.push({ label: 'Size share', value: `${pct}%`, dim: true });
      }
      sections.push({ title: 'Summary', items: summaryItems });

      // Details section
      const detailItems: InspectorSection['items'] = [
        {
          label: 'Extension',
          value: node.name.includes('.')
            ? node.name.split('.').pop() || 'none'
            : 'none',
          dim: true,
        },
        { label: 'Total files', value: String(stats.totalFiles), dim: true },
      ];
      if (techMatch) {
        detailItems.push({
          label: 'Confidence',
          value: `${techMatch.evidence || 'detected'}`,
          dim: true,
        });
      }
      sections.push({ title: 'Details', items: detailItems });
    } else {
      // Directory-level details
      const stats = analysis.stats;
      const techCount = analysis.technologies.length;
      sections.push({
        title: 'Summary',
        items: [
          { label: 'Status', value: 'Analyzed' },
          { label: 'Repository', value: stats.totalFiles + ' files', dim: true },
          { label: 'Technologies', value: String(techCount), dim: true },
        ],
      });

      // Languages used in repo
      const langs = analysis.technologies.filter((t) => t.category === 'language');
      if (langs.length > 0) {
        sections.push({
          title: 'Languages',
          items: langs.slice(0, 5).map((l) => ({
            label: l.name,
            value: l.count ? `${l.count} files` : 'detected',
            dim: true,
          })),
        });
      }
    }

    // Health score
    const health = analysis.intelligence.health;
    if (health && health.overall !== undefined) {
      sections.push({
        title: 'Health',
        items: [
          { label: 'Score', value: `${health.overall}/${health.maxOverall}` },
          { label: 'Categories', value: String(health.categories.length), dim: true },
        ],
      });
    }
  }

  // ── Assemble ──────────────────────────────────────────────
  return {
    contentType: node.type === 'file' ? 'file' : 'folder',
    title: node.name,
    subtitle: node.path,
    metadata,
    sections: sections.length > 0 ? sections : undefined,
    description: sections.length === 0
      ? [
          node.type === 'file'
            ? `File selected: ${node.name}`
            : `Directory selected: ${node.name}`,
        ]
      : undefined,
    relationships: [],
  };
}
