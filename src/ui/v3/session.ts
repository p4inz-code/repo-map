/**
 * UISessionV3 — the ONE UISession implementation powered by RuntimeManager.
 *
 * This is the only execution path for visual output. It replaces both the
 * V1 UISessionImpl and the never-used V2 AppShellV2 adapter.
 *
 * # Execution Path
 * ```
 * CLI (src/index.ts)
 *   ↓
 * UISessionV3 (created by createUISession())
 *   ↓
 * RuntimeManager (singleton runtime)
 *   ↓
 * Frame Pipeline (FrameBuilder → LayerComposer → DoubleBuffer → DiffEngine)
 *   ↓
 * Terminal (stderr)
 * ```
 *
 * # Layer Registration
 * - workspace: Main content (completion, stats, help, errors, scanning)
 * - All other layers registered but produce no content (no sidebar, no header for CLI mode)
 */

import { RuntimeManager } from './runtime/manager.js';
import { getThemeV2 } from '../v2/theme/index.js';
import type { Analysis } from '../../types.js';
import type { TreeNodeData } from '../state/types.js';
import type { FrameContext } from './types.js';
import type { Line } from '../v2/renderer/types.js';
import { cursorShow } from '../utils/ansi.js';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { ExportFormat } from './terminal/export/types.js';
import { formatJson } from '../../formatters/json.js';
import { formatMarkdown } from '../../formatters/markdown.js';
import { WorkspaceController } from './workspace/controller.js';

// ─── V3 System Imports ───────────────────────────────────────────

import { LoadingManager } from './experience/loading/manager.js';
import { TaskManager } from './terminal/tasks/manager.js';
import { ContextHintManager } from './experience/context-hints/manager.js';
import { WorkspaceIndicators } from './terminal/indicators/manager.js';
import { RepositoryIdentity } from './terminal/indicators/repository-identity.js';
import { NotificationSystem } from './experience/notifications/system.js';
import { ExportManager } from './terminal/export/manager.js';

// ─── Types (mirror of the public interface, avoids circular import) ──

export type ScanProgressCallback = (progress: { files: number; dirs: number }) => void;

// ─── Constants ─────────────────────────────────────────────────────

const DEFAULT_WIDTH = 80;
const DEFAULT_HEIGHT = 24;

/** A function that produces workspace content for a frame. */
type ScreenBuilder = (ctx: FrameContext) => Line[];

// ─── UISessionV3 ───────────────────────────────────────────────────

export class UISessionV3 {
  private readonly _runtime: RuntimeManager;
  private _screenBuilder: ScreenBuilder | null = null;
  private _projectName: string = '';
  private _closed: boolean = false;

  // ── V3 Systems ──────────────────────────────────────────────────
  private readonly _loadingManager: LoadingManager;
  private readonly _taskManager: TaskManager;
  private readonly _contextHints: ContextHintManager;
  private readonly _indicators: WorkspaceIndicators;
  private readonly _repositoryIdentity: RepositoryIdentity;
  private readonly _notificationSystem: NotificationSystem;
  private readonly _exportManager: ExportManager;

  /** Track the current scan task ID for progress updates. */
  private _scanTaskId: string | null = null;

  /** Track the current analysis task ID. */
  private _analysisTaskId: string | null = null;

  constructor(options: { color: boolean }) {
    const theme = getThemeV2();
    const width = process.stdout.columns ?? DEFAULT_WIDTH;
    const height = process.stdout.rows ?? DEFAULT_HEIGHT;

    this._runtime = new RuntimeManager(theme, { width, height, autoStart: false, debug: false });

    // ── Initialize V3 Systems ────────────────────────────────────
    this._loadingManager = new LoadingManager(this._runtime.eventBus);
    this._taskManager = new TaskManager(this._runtime.eventBus);
    this._contextHints = new ContextHintManager(this._runtime.eventBus);
    this._indicators = new WorkspaceIndicators();
    this._repositoryIdentity = new RepositoryIdentity(this._runtime.eventBus);
    this._notificationSystem = new NotificationSystem(
      this._runtime.animationScheduler,
      this._runtime.eventBus,
    );
    this._exportManager = new ExportManager(this._runtime.eventBus);

    // Register workspace layer renderer — produces all screen content
    this._runtime.frameGraph.setRenderer('workspace', (ctx: FrameContext) => {
      if (this._screenBuilder) return this._screenBuilder(ctx);
      return [];
    });

    // Register all other layers as empty
    const allLayers = ['background','header','sidebar','panels','overlay','notifications','palette','search','status-bar','cursor'] as const;
    for (let i = 0; i < allLayers.length; i++) {
      this._runtime.frameGraph.setRenderer(allLayers[i], () => []);
    }

    this._runtime.initialize();
    if (!options.color) { process.env.NO_COLOR = '1'; }
  }

  // ── Public API (conforms to UISession interface structurally) ──

  startScanning(projectName: string): ScanProgressCallback {
    this._projectName = projectName;

    // ── Wire V3 Systems ──────────────────────────────────────────
    this._loadingManager.startOperation('scanning');
    this._indicators.setActive('loading', true);
    this._contextHints.setMode('scanning');

    // Create a background task for the scan
    this._scanTaskId = this._taskManager.createTask({
      id: 'scan-repository',
      label: `Scanning ${projectName}`,
      description: 'Walking file tree to discover project structure',
      type: 'scan',
      priority: 10,
      cancellable: false,
    });
    this._taskManager.startTask(this._scanTaskId);

    // Update repository identity with project name
    this._repositoryIdentity.setMetadata({
      projectName,
      healthScore: 0,
      fileCount: 0,
      directoryCount: 0,
    });

    // Start the RuntimeManager render loop
    this._runtime.start();

    // Show initial scanning message
    this._setScanningContent(projectName, 0, 0);

    // Throttle metadata updates to every 50 files to reduce object churn
    let lastMetadataUpdate = 0;

    // Return REAL progress callback
    return (progress: { files: number; dirs: number }) => {
      const { files, dirs } = progress;

      // Update V3 systems with REAL progress
      this._loadingManager.updateProgress(
        -1, // Indeterminate — we don't know total files upfront
        `Found ${files.toLocaleString()} files`,
        { files, dirs, operation: 'file-walk' },
      );

      // Update repository identity with real counts (throttled to every 50 files)
      if (files - lastMetadataUpdate >= 50 || files === 0) {
        lastMetadataUpdate = files;
        this._repositoryIdentity.setMetadata({
          projectName,
          fileCount: files,
          directoryCount: dirs,
        });
      }

      // Show real progress text
      this._setScanningContent(projectName, files, dirs);

      // The RuntimeManager render loop will pick up the dirty marker
      // on its next tick (16ms interval), keeping scanning fast.
    };
  }

  finishScanning(files: number, dirs: number): void {
    // ── Complete V3 Systems ───────────────────────────────────────
    this._loadingManager.completeOperation(
      `Scanned ${files.toLocaleString()} files across ${dirs.toLocaleString()} directories`,
    );
    if (this._scanTaskId) {
      this._taskManager.completeTask(this._scanTaskId);
      this._scanTaskId = null;
    }
    this._indicators.setActive('loading', false);
    this._contextHints.setMode('browsing');

    // Emit EventBus event
    this._runtime.eventBus.emit('repository-loaded', {
      projectName: this._projectName,
      fileCount: files,
      directoryCount: dirs,
    }, 'session');

    // Show meaningful completion message
    this._notificationSystem.success(
      `Scanned ${files.toLocaleString()} files across ${dirs.toLocaleString()} directories`
    );
    this._screenBuilder = () => [{
      segments: [{
        text: `Scanned ${files.toLocaleString()} files across ${dirs.toLocaleString()} directories`,
        style: { color: 'success' },
      }],
    }];
    this._runtime.markDirty('workspace');
    this._runtime.syncFrame();
  }

  startAnalyzing(): void {
    // ── Wire V3 Systems ──────────────────────────────────────────
    this._loadingManager.startOperation('analyzing', {
      totalFiles: undefined,
      operation: 'architecture-analysis',
    });
    this._indicators.setActive('loading', true);
    this._contextHints.setMode('analyzing');

    // Create a background task for analysis
    this._analysisTaskId = this._taskManager.createTask({
      id: 'analyze-repository',
      label: 'Analyzing repository',
      description: 'Analyzing dependencies, architecture patterns, and code quality',
      type: 'analysis',
      priority: 10,
      cancellable: false,
    });
    this._taskManager.startTask(this._analysisTaskId);

    // Show meaningful analyzing message
    this._screenBuilder = () => [{
      segments: [{
        text: 'Analyzing repository architecture — building dependency graph, detecting patterns, assessing code quality',
        style: { dim: true },
      }],
    }];
    this._runtime.markDirty('workspace');
    this._runtime.syncFrame();
  }

  finishAnalyzing(elapsed: number): void {
    // ── Complete V3 Systems ───────────────────────────────────────
    this._loadingManager.completeOperation(
      `Analysis complete in ${elapsed.toFixed(1)}s`,
    );
    if (this._analysisTaskId) {
      this._taskManager.completeTask(this._analysisTaskId);
      this._analysisTaskId = null;
    }
    this._indicators.setActive('loading', false);
    this._contextHints.setMode('browsing');

    // Emit analysis-finished event
    this._runtime.eventBus.emit('analysis-finished', {
      elapsed,
      healthScore: 0, // Will be updated when analysis data is set
      technologyCount: 0,
    }, 'session');

    // Show meaningful completion message
    this._notificationSystem.success(
      `Analysis complete in ${elapsed.toFixed(1)}s`
    );
    this._screenBuilder = () => [{
      segments: [{
        text: `Analysis complete — ${elapsed.toFixed(1)}s`,
        style: { color: 'success' },
      }],
    }];
    this._runtime.markDirty('workspace');
    this._runtime.syncFrame();
  }

  renderCompletion(analysis: Analysis, outputPath?: string): void {
    // Wire ExportManager for the export workflow (Phase H)
    if (outputPath) {
      this._contextHints.setMode('exporting');
      this._indicators.setActive('tasks', true);

      const format: ExportFormat = outputPath.endsWith('.json') ? 'json' : 'markdown';

      // Register export handlers with real analysis data
      this._exportManager.onPrepare((fmt) => {
        // Use the same formatters as the main pipeline for output consistency
        if (fmt === 'json') {
          return formatJson(analysis, { includeArchitectureString: false });
        }
        return formatMarkdown(analysis);
      });
      this._exportManager.onRender((_fmt, data) => {
        return data; // formatters already produce the final output
      });
      this._exportManager.onWrite(async (outputFilePath, content) => {
        try {
          await mkdir(path.dirname(outputFilePath), { recursive: true });
          await writeFile(outputFilePath, content, 'utf-8');
          return true;
        } catch {
          return false;
        }
      });

      // Fire-and-forget the export workflow; notification fires on completion
      this._exportManager.startExport({
        format,
        outputPath,
        fileName: 'repo-map-analysis',
      }).then(() => {
        this._notificationSystem.success(`Analysis exported to ${outputPath}`);
      }).catch(() => {
        this._notificationSystem.error(`Export failed for ${outputPath}`);
      }).finally(() => {
        this._indicators.setActive('tasks', false);
        this._contextHints.setMode('browsing');
      });
    }

    this._screenBuilder = () => this._buildCompletionContent(analysis, outputPath);
    this._runtime.markDirty('workspace');
    this._runtime.syncFrame();
  }

  renderStats(analysis: Analysis, elapsed: number): void {
    this._screenBuilder = () => this._buildStatsContent(analysis, elapsed);
    this._runtime.markDirty('workspace');
    this._runtime.syncFrame();
  }

  renderSuggest(analysis: Analysis): void {
    this._screenBuilder = () => this._buildSuggestContent(analysis);
    this._runtime.markDirty('workspace');
    this._runtime.syncFrame();
  }

  renderHelp(): void {
    this._screenBuilder = () => this._buildHelpContent();
    this._runtime.markDirty('workspace');
    this._runtime.syncFrame();
  }

  private _workspaceController: WorkspaceController | null = null;

  runInteractiveWorkspace(): Promise<void> | undefined {
    // Create the persistent workspace controller — created ONCE, never recreated.
    // The workspace controller takes ownership of the RuntimeManager render loop.
    this._workspaceController = new WorkspaceController(this._runtime, this._runtime.theme);
    return this._workspaceController.closed;
  }

  setAnalysisData(analysis: Analysis): void {
    if (this._workspaceController) {
      this._workspaceController.setAnalysisData(analysis);
    } else {
      this._runtime.workspaceManager.setAnalysis(analysis);
    }
  }

  setTreeData(data: TreeNodeData): void {
    if (this._workspaceController) {
      this._workspaceController.setTreeData(data);
    }
  }

  reportError(message: string, suggestion?: string): void {
    this._loadingManager.failOperation(message);
    this._contextHints.setMode('error');
    this._indicators.setActive('loading', false);

    if (this._workspaceController) {
      // Route error to workspace error screen with message
      this._workspaceController.reportError(message, suggestion);
    } else {
      this._screenBuilder = () => this._buildErrorContent(message, suggestion);
      this._runtime.markDirty('workspace');
      this._runtime.syncFrame();
    }
  }

  close(): void {
    if (this._closed) return;
    this._closed = true;
    if (this._workspaceController) {
      this._workspaceController.close();
    } else {
      this._runtime.stop();
      this._runtime.destroy();
    }
    process.stderr.write(cursorShow());
  }

  // ── Internal ─────────────────────────────────────────────────

  private _setScanningContent(projectName: string, files: number, dirs: number): void {
    // Never show generic "Scanning..." — always show what's actually happening
    let msg: string;
    if (files === 0 && dirs === 0) {
      msg = `Walking file tree — discovering ${projectName} structure`;
    } else {
      const fileStr = files.toLocaleString();
      const dirStr = dirs.toLocaleString();
      msg = `Scanning ${projectName} — ${fileStr} files discovered across ${dirStr} directories`;
    }
    this._screenBuilder = () => [{ segments: [{ text: msg, style: { dim: true } }] }];
    this._runtime.markDirty('workspace');
  }

  // ── Content Builders ─────────────────────────────────────────

  private _buildCompletionContent(analysis: Analysis, outputPath?: string): Line[] {
    const lines: Line[] = [];
    const { stats, intelligence, technologies } = analysis;

    lines.push({ segments: [
      { text: 'repo-map', style: { bold: true } },
      { text: '  Professional repository analysis', style: { dim: true } },
    ]});
    lines.push({ segments: [{ text: '' }] });

    const langCount = technologies.filter(t => t.category === 'language').length;
    lines.push({ segments: [{ text: `  ${this._projectName}  ${stats.totalFiles} files · ${stats.totalDirectories} dirs · ${langCount} languages` }] });
    lines.push({ segments: [{ text: '' }] });

    lines.push({ segments: [{ text: '  Project Summary', style: { bold: true } }] });
    lines.push({ segments: [{ text: '  Classification  ' + intelligence.classification.category + '  ' + intelligence.classification.confidence + '%' }] });
    lines.push({ segments: [{ text: '  Maturity        ' + intelligence.maturity.level }] });
    lines.push({ segments: [{ text: '  Health          ' + intelligence.health.overall + '/100' }] });
    lines.push({ segments: [{ text: '' }] });
    lines.push({ segments: [{ text: '  Files ' + stats.totalFiles + '   Dirs ' + stats.totalDirectories + '   Depth ' + stats.maxDepth }] });
    lines.push({ segments: [{ text: '' }] });

    const languages = technologies.filter(t => t.category === 'language' && t.count !== undefined) as { name: string; count: number }[];
    if (languages.length > 0) {
      lines.push({ segments: [{ text: '  Languages', style: { bold: true } }] });
      const total = stats.totalFiles || 1;
      for (const lang of languages.slice(0, 5)) {
        const pct = Math.round((lang.count / total) * 100);
        lines.push({ segments: [{ text: '  ' + lang.name.padEnd(12) + ' ' + String(lang.count).padStart(4) + ' files (' + pct + '%)' }] });
      }
      if (languages.length > 5) lines.push({ segments: [{ text: '  +' + (languages.length - 5) + ' more', style: { dim: true } }] });
      lines.push({ segments: [{ text: '' }] });
    }

    if (outputPath) {
      lines.push({ segments: [{ text: '  Output: ' + outputPath }] });
      lines.push({ segments: [{ text: '' }] });
    }

    return lines;
  }

  private _buildStatsContent(analysis: Analysis, elapsed: number): Line[] {
    const lines: Line[] = [];
    const { stats, technologies } = analysis;
    lines.push({ segments: [{ text: '  Repository Statistics', style: { bold: true } }] });
    lines.push({ segments: [{ text: '' }] });
    lines.push({ segments: [{ text: '  Files: ' + stats.totalFiles + '   Dirs: ' + stats.totalDirectories + '   Size: ' + stats.totalSize + '   Depth: ' + stats.maxDepth }] });
    lines.push({ segments: [{ text: '' }] });
    const languages = technologies.filter(t => t.category === 'language' && t.count !== undefined) as { name: string; count: number }[];
    if (languages.length > 0) {
      lines.push({ segments: [{ text: '  Languages', style: { bold: true } }] });
      const total = stats.totalFiles || 1;
      for (const lang of languages) {
        lines.push({ segments: [{ text: '  ' + lang.name.padEnd(12) + ' ' + String(lang.count).padStart(4) + ' files (' + Math.round((lang.count / total) * 100) + '%)' }] });
      }
      lines.push({ segments: [{ text: '' }] });
    }
    if (stats.largestFile) lines.push({ segments: [{ text: '  Largest file: ' + stats.largestFile, style: { dim: true } }] });
    if (stats.largestDirectory) lines.push({ segments: [{ text: '  Largest dir: ' + stats.largestDirectory, style: { dim: true } }] });
    lines.push({ segments: [{ text: '  Completed in ' + elapsed.toFixed(1) + 's', style: { dim: true } }] });
    return lines;
  }

  private _buildSuggestContent(analysis: Analysis): Line[] {
    const lines: Line[] = [];
    const { intelligence } = analysis;
    lines.push({ segments: [{ text: '  Suggestions', style: { bold: true } }] });
    lines.push({ segments: [{ text: '' }] });
    lines.push({ segments: [{ text: '  Strengths', style: { bold: true } }] });
    if (intelligence.strengths.length > 0) {
      for (const s of intelligence.strengths) lines.push({ segments: [{ text: '  ✓ ' + s.title }] });
    } else {
      lines.push({ segments: [{ text: '  No strengths identified', style: { dim: true } }] });
    }
    lines.push({ segments: [{ text: '' }] });
    lines.push({ segments: [{ text: '  Suggestions', style: { bold: true } }] });
    if (intelligence.suggestions.length > 0) {
      const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const sorted = [...intelligence.suggestions].sort((a, b) => {
        return (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99);
      });
      for (const s of sorted) {
        const marker = s.priority === 'high' ? '!' : s.priority === 'medium' ? '•' : '·';
        lines.push({ segments: [{ text: '  ' + marker + ' ' + s.title + ' (' + s.priority + ')' }] });
      }
    } else {
      lines.push({ segments: [{ text: '  No suggestions available', style: { dim: true } }] });
    }
    return lines;
  }

  private _buildHelpContent(): Line[] {
    return [
      { segments: [{ text: 'repo-map Help', style: { bold: true } }] },
      { segments: [{ text: '' }] },
      { segments: [{ text: '  Usage: repo-map [path] [options]' }] },
      { segments: [{ text: '' }] },
      { segments: [{ text: '  Options:', style: { bold: true } }] },
      { segments: [{ text: '    --json              JSON output' }] },
      { segments: [{ text: '    -o, --output <file> Write output to file' }] },
      { segments: [{ text: '    --depth <number>    Max directory depth' }] },
      { segments: [{ text: '    --stats             Repository summary' }] },
      { segments: [{ text: '    --suggest           Improvement suggestions' }] },
      { segments: [{ text: '    --no-color          Disable ANSI color' }] },
      { segments: [{ text: '' }] },
      { segments: [{ text: '  Examples:', style: { bold: true } }] },
      { segments: [{ text: '    $ repo-map .' }] },
      { segments: [{ text: '    $ repo-map --json -o report.json' }] },
    ];
  }

  private _buildErrorContent(message: string, suggestion?: string): Line[] {
    const lines: Line[] = [];
    lines.push({ segments: [{ text: 'Error: ' + message, style: { bold: true } }] });
    if (suggestion) {
      lines.push({ segments: [{ text: '' }] });
      lines.push({ segments: [{ text: '  ' + suggestion, style: { dim: true } }] });
    }
    return lines;
  }
}
