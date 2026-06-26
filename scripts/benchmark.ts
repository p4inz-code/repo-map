/**
 * Benchmark script for repo-map.
 *
 * Measures scan time, analysis time, memory usage, cache performance,
 * and report generation throughput against repositories of varying sizes.
 *
 * Usage:
 *   npx tsx scripts/benchmark.ts [path]
 *
 * If no path is specified, benchmarks against the project itself.
 */

import { scanDirectory } from '../src/scanner/index.js';
import { analyze } from '../src/analyzer/index.js';
import { formatJson } from '../src/formatters/json.js';
import { formatMarkdown } from '../src/formatters/markdown.js';
import { formatStats } from '../src/formatters/stats.js';
import { fileCache } from '../src/file-cache.js';

interface BenchmarkResult {
  label: string;
  scanTimeMs: number;
  analysisTimeMs: number;
  formatJsonTimeMs: number;
  formatMarkdownTimeMs: number;
  formatStatsTimeMs: number;
  totalTimeMs: number;
  memoryDeltaMb: number;
  peakMemoryMb: number;
  filesScanned: number;
  directoriesFound: number;
  technologiesDetected: number;
  filesPerSecond: number;
  dirsPerSecond: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  cacheEvictions: number;
  cacheSizeBytes: number;
}

function getMemoryUsageMb(): number {
  return Math.round(process.memoryUsage().heapUsed / (1024 * 1024));
}

async function benchmark(path: string, label: string): Promise<BenchmarkResult> {
  const memBefore = getMemoryUsageMb();
  let peakMemoryMb = memBefore;

  // Periodically sample memory to track peak
  const memInterval = setInterval(() => {
    const current = getMemoryUsageMb();
    if (current > peakMemoryMb) peakMemoryMb = current;
  }, 50);

  // 1. Scan
  const scanStart = performance.now();
  const scanResult = await scanDirectory({
    rootPath: path,
    useGitignore: true,
  });
  const scanEnd = performance.now();

  // 2. Analyze
  const analyzeStart = performance.now();
  const analysis = await analyze({
    files: scanResult.files,
    rootPath: scanResult.rootPath,
    stats: scanResult.stats,
  });
  const analyzeEnd = performance.now();

  // 3. Format (measure each format separately)
  const formatJsonStart = performance.now();
  formatJson(analysis);
  const formatJsonEnd = performance.now();

  const formatMdStart = performance.now();
  formatMarkdown(analysis);
  const formatMdEnd = performance.now();

  const formatStatsStart = performance.now();
  formatStats(analysis);
  const formatStatsEnd = performance.now();

  clearInterval(memInterval);

  const memAfter = getMemoryUsageMb();
  const totalSeconds = (analyzeEnd - scanStart) / 1000;

  const cacheStats = fileCache.stats;

  return {
    label,
    scanTimeMs: Math.round(scanEnd - scanStart),
    analysisTimeMs: Math.round(analyzeEnd - analyzeStart),
    formatJsonTimeMs: Math.round(formatJsonEnd - formatJsonStart),
    formatMarkdownTimeMs: Math.round(formatMdEnd - formatMdStart),
    formatStatsTimeMs: Math.round(formatStatsEnd - formatStatsStart),
    totalTimeMs: Math.round(analyzeEnd - scanStart),
    memoryDeltaMb: memAfter - memBefore,
    peakMemoryMb,
    filesScanned: scanResult.stats.totalFiles,
    directoriesFound: scanResult.stats.totalDirectories,
    technologiesDetected: analysis.technologies.length,
    filesPerSecond: totalSeconds > 0
      ? Math.round(scanResult.stats.totalFiles / totalSeconds)
      : scanResult.stats.totalFiles,
    dirsPerSecond: totalSeconds > 0
      ? Math.round(scanResult.stats.totalDirectories / totalSeconds)
      : scanResult.stats.totalDirectories,
    cacheHits: cacheStats.hits,
    cacheMisses: cacheStats.misses,
    cacheHitRate: cacheStats.hits + cacheStats.misses > 0
      ? Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100)
      : 0,
    cacheEvictions: cacheStats.evictions,
    cacheSizeBytes: cacheStats.sizeBytes,
  };
}

function formatTable(results: BenchmarkResult[]): string {
  const headers = [
    'Path', 'Files', 'Dirs', 'Scan', 'Analyze', 'JSON', 'MD', 'Stats',
    'Total', 'Mem Δ', 'Peak', 'Files/s', 'Cache%',
  ];

  const rows = results.map((r) => [
    r.label,
    String(r.filesScanned),
    String(r.directoriesFound),
    `${r.scanTimeMs}ms`,
    `${r.analysisTimeMs}ms`,
    `${r.formatJsonTimeMs}ms`,
    `${r.formatMarkdownTimeMs}ms`,
    `${r.formatStatsTimeMs}ms`,
    `${r.totalTimeMs}ms`,
    `${r.memoryDeltaMb}MB`,
    `${r.peakMemoryMb}MB`,
    r.filesPerSecond >= 1000 ? `${(r.filesPerSecond / 1000).toFixed(1)}k` : String(r.filesPerSecond),
    `${r.cacheHitRate}%`,
  ]);

  const colWidths = headers.map((_, colIdx) =>
    Math.max(headers[colIdx].length, ...rows.map((row) => row[colIdx].length)),
  );

  const separator = '+' + colWidths.map((w) => '-'.repeat(w + 2)).join('+') + '+';

  const lines: string[] = [separator];
  for (let i = 0; i <= rows.length; i++) {
    const row = i === 0 ? headers : rows[i - 1];
    const line = '| ' + row.map((cell, j) => cell.padEnd(colWidths[j])).join(' | ') + ' |';
    lines.push(line);
    if (i === 0) lines.push(separator);
  }
  lines.push(separator);

  return lines.join('\n');
}

async function main() {
  const targetPath = process.argv[2] || '.';
  console.log(`\n🔬 repo-map Benchmark\n`);
  console.log(`Target: ${targetPath}\n`);

  const result = await benchmark(targetPath, pathLabel(targetPath));

  console.log(formatTable([result]));

  // Detailed cache report
  console.log(`\n📦 Cache Performance`);
  console.log(`   Hits:      ${result.cacheHits}`);
  console.log(`   Misses:    ${result.cacheMisses}`);
  console.log(`   Hit rate:  ${result.cacheHitRate}%`);
  console.log(`   Evictions: ${result.cacheEvictions}`);
  const cacheSizeKb = Math.round(result.cacheSizeBytes / 1024);
  console.log(`   Size:      ${cacheSizeKb} KB`);

  // Summary
  console.log(`\n📊 Summary`);
  console.log(`   Technologies detected: ${result.technologiesDetected}`);
  console.log(`   Memory delta: ${result.memoryDeltaMb} MB (peak: ${result.peakMemoryMb} MB)`);
  console.log(`   Throughput: ${result.filesPerSecond} files/sec, ${result.dirsPerSecond} dirs/sec`);
  console.log(`   Total time: ${result.totalTimeMs}ms`);
  console.log();
}

function pathLabel(p: string): string {
  if (p === '.' || p === './') return '(self)';
  const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] || p;
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
