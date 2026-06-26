import type { Technology, ScanStats, Intelligence, ArchitectureAnalysis } from '../types.js';
import path from 'node:path';
import { formatSize } from '../utils.js';

interface ArchitectureInput {
  rootPath: string;
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  stats: ScanStats;
  technologies: Technology[];
  intelligence: Intelligence;
  tree: string;
  generatedAt: string;
  cliVersion: string;
}

/** Tracks sequential section numbering for the report. */
class SectionCounter {
  private count = 0;

  next(): string {
    this.count++;
    return `## ${this.count}. `;
  }
}

/**
 * Generates a professional audit report from analysis and intelligence data.
 *
 * Pure function — consumes pre-computed data, no I/O.
 * Output resembles a professional repository assessment ready for design review.
 */
export function generateArchitecture(input: ArchitectureInput): string {
  const {
    rootPath,
    totalFiles,
    totalDirectories,
    totalSize,
    stats,
    technologies,
    intelligence,
    tree,
    generatedAt,
    cliVersion,
  } = input;

  const projectName = path.basename(rootPath);
  const lines: string[] = [];
  const s = new SectionCounter();

  appendHeader(lines, projectName, generatedAt, cliVersion, totalFiles, totalDirectories, totalSize);
  appendClassification(lines, intelligence, s);
  appendTechnologyStack(lines, technologies, s);
  appendMaturity(lines, intelligence, s);
  appendHealthScore(lines, intelligence, s);
  appendStatistics(lines, stats, totalFiles, totalDirectories, totalSize, s);
  appendProjectStructure(lines, tree, s);
  appendEntryPoints(lines, intelligence, s);
  appendDirectoryRoles(lines, intelligence, s);
  appendBuildPipeline(lines, intelligence, s);
  appendDependencyAnalysis(lines, intelligence, s);
  appendArchitectureInsights(lines, intelligence, s);
  appendStrengths(lines, intelligence, s);
  appendSuggestions(lines, intelligence, s);

  // Phase 3: Architecture Intelligence sections (pass architecture directly for type narrowing)
  const arch = intelligence.architecture;
  if (arch) {
    appendArchitecturePatterns(lines, arch, s);
    appendDependencyGraphSection(lines, arch, s);
    appendCircularDepsSection(lines, arch, s);
    appendArchitectureSmellsSection(lines, arch, s);
    appendComplexitySection(lines, arch, s);
    appendCouplingSection(lines, arch, s);
    appendLayerViolationsSection(lines, arch, s);
    appendArchScoreSection(lines, arch, s);
    appendRiskReportSection(lines, arch, s);
    appendVisualDepTreeSection(lines, arch, s);
    appendRefactorSuggestionsSection(lines, arch, s);
  }

  return lines.join('\n');
}

function sectionHeader(s: SectionCounter, title: string): string {
  return `${s.next()}${title}`;
}

function appendHeader(
  lines: string[],
  projectName: string,
  generatedAt: string,
  cliVersion: string,
  totalFiles: number,
  totalDirectories: number,
  totalSize: number,
): void {
  lines.push('# Repository Audit Report');
  lines.push('');
  lines.push(`**Project:** ${projectName}  `);
  lines.push(`**Generated:** ${generatedAt}  `);
  lines.push(`**Tool:** repo-map v${cliVersion}  `);
  lines.push('');
  lines.push(`> **${totalFiles}** files · **${totalDirectories}** directories · **${formatSize(totalSize)}** total  `);
  lines.push('');
}

function appendClassification(lines: string[], intelligence: Intelligence, s: SectionCounter): void {
  const { classification } = intelligence;
  lines.push(sectionHeader(s, 'Project Classification'));
  lines.push('');
  lines.push(`**${classification.category}** (${classification.confidence}% confidence)`);
  lines.push('');
  for (const evidence of classification.evidence) {
    lines.push(`- ${evidence}`);
  }
  lines.push('');
}

function appendTechnologyStack(lines: string[], technologies: Technology[], s: SectionCounter): void {
  if (technologies.length === 0) return;

  lines.push(sectionHeader(s, 'Technology Stack'));
  lines.push('');
  lines.push('| Technology | Category | Evidence |');
  lines.push('|---|---|---|');

  const sorted = [...technologies].sort((a, b) => {
    const catOrder: Record<string, number> = { language: 0, framework: 1, tool: 2 };
    const catDiff = (catOrder[a.category] ?? 99) - (catOrder[b.category] ?? 99);
    if (catDiff !== 0) return catDiff;
    return a.name.localeCompare(b.name);
  });

  for (const tech of sorted) {
    const versionStr = tech.version ? ` (${tech.version})` : '';
    lines.push(`| ${tech.name}${versionStr} | ${tech.category} | ${tech.evidence} |`);
  }
  lines.push('');
}

function appendMaturity(lines: string[], intelligence: Intelligence, s: SectionCounter): void {
  const { maturity } = intelligence;
  lines.push(sectionHeader(s, 'Project Maturity'));
  lines.push('');
  lines.push(`**${maturity.level}** (${maturity.confidence}% confidence)`);
  lines.push('');
  lines.push('| Factor | Impact | Detail |');
  lines.push('|---|---|---|');
  for (const factor of maturity.factors) {
    const icon = factor.positive ? '✅ Positive' : '⚠️ Gap';
    lines.push(`| ${factor.factor} | ${icon} | ${factor.detail} |`);
  }
  lines.push('');
}

function appendHealthScore(lines: string[], intelligence: Intelligence, s: SectionCounter): void {
  const { health } = intelligence;
  lines.push(sectionHeader(s, 'Codebase Health Score'));
  lines.push('');
  lines.push(`**Overall: ${health.overall}/${health.maxOverall}**`);
  lines.push('');
  lines.push('| Category | Score |');
  lines.push('|---|---|');
  for (const cat of health.categories) {
    const bar = scoreBar(cat.score);
    lines.push(`| ${cat.name} | ${cat.score}/${cat.maxScore} ${bar} |`);
  }
  lines.push('');

  // Deductions
  const allDeductions = health.categories.flatMap((c) =>
    c.deductions.map((d) => ({ category: c.name, deduction: d })),
  );
  if (allDeductions.length > 0) {
    lines.push('### Deductions');
    lines.push('');
    for (const { category, deduction } of allDeductions) {
      lines.push(`- **${category}:** ${deduction}`);
    }
    lines.push('');
  }
}

function appendStatistics(
  lines: string[],
  stats: ScanStats,
  totalFiles: number,
  totalDirectories: number,
  totalSize: number,
  s: SectionCounter,
): void {
  lines.push(sectionHeader(s, 'Repository Statistics'));
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| Total files | ${totalFiles} |`);
  lines.push(`| Total directories | ${totalDirectories} |`);
  lines.push(`| Total size | ${formatSize(totalSize)} |`);
  lines.push(`| Maximum depth | ${stats.maxDepth} |`);
  lines.push(`| Average files per directory | ${stats.avgFilesPerDirectory} |`);
  if (stats.largestDirectory) {
    lines.push(`| Largest directory | \`${stats.largestDirectory}\` (${stats.largestDirectoryFiles} files) |`);
  }
  if (stats.largestFile) {
    lines.push(`| Largest file | \`${stats.largestFile}\` (${formatSize(stats.largestFileSize)}) |`);
  }
  lines.push('');
}

function appendProjectStructure(lines: string[], tree: string, s: SectionCounter): void {
  if (!tree) return;
  lines.push(sectionHeader(s, 'Project Structure'));
  lines.push('');
  lines.push('```');
  lines.push(tree);
  lines.push('```');
  lines.push('');
}

function appendEntryPoints(lines: string[], intelligence: Intelligence, s: SectionCounter): void {
  const { entryPoints } = intelligence;
  if (entryPoints.length === 0) return;

  lines.push(sectionHeader(s, 'Entry Points'));
  lines.push('');
  lines.push('| Type | Path | Description |');
  lines.push('|---|---|---|');
  for (const ep of entryPoints) {
    lines.push(`| ${ep.type} | \`${ep.path}\` | ${ep.description} |`);
  }
  lines.push('');
}

function appendDirectoryRoles(lines: string[], intelligence: Intelligence, s: SectionCounter): void {
  const { directoryRoles } = intelligence;
  if (directoryRoles.length === 0) return;

  lines.push(sectionHeader(s, 'Directory Roles'));
  lines.push('');
  lines.push('| Directory | Role | Description |');
  lines.push('|---|---|---|');
  for (const role of directoryRoles) {
    lines.push(`| \`${role.path}/\` | ${role.role} | ${role.description} |`);
  }
  lines.push('');
}

function appendBuildPipeline(lines: string[], intelligence: Intelligence, s: SectionCounter): void {
  const { buildPipeline } = intelligence;
  const hasData = Object.values(buildPipeline).some((v) => v.length > 0);
  if (!hasData) return;

  lines.push(sectionHeader(s, 'Build Pipeline'));
  lines.push('');
  lines.push('| Stage | Tool |');
  lines.push('|---|---|');

  if (buildPipeline.buildSystem.length > 0) lines.push(`| Build System | ${buildPipeline.buildSystem.join(', ')} |`);
  if (buildPipeline.packageManager.length > 0) lines.push(`| Package Manager | ${buildPipeline.packageManager.join(', ')} |`);
  if (buildPipeline.bundler.length > 0) lines.push(`| Bundler | ${buildPipeline.bundler.join(', ')} |`);
  if (buildPipeline.compiler.length > 0) lines.push(`| Compiler | ${buildPipeline.compiler.join(', ')} |`);
  if (buildPipeline.testFramework.length > 0) lines.push(`| Testing | ${buildPipeline.testFramework.join(', ')} |`);
  if (buildPipeline.formatter.length > 0) lines.push(`| Formatter | ${buildPipeline.formatter.join(', ')} |`);
  if (buildPipeline.linter.length > 0) lines.push(`| Linter | ${buildPipeline.linter.join(', ')} |`);
  if (buildPipeline.ci.length > 0) lines.push(`| CI | ${buildPipeline.ci.join(', ')} |`);
  if (buildPipeline.releaseAutomation.length > 0) lines.push(`| Release Automation | ${buildPipeline.releaseAutomation.join(', ')} |`);
  if (buildPipeline.publishAutomation.length > 0) lines.push(`| Publish Automation | ${buildPipeline.publishAutomation.join(', ')} |`);

  lines.push('');
}

function appendDependencyAnalysis(lines: string[], intelligence: Intelligence, s: SectionCounter): void {
  const { dependencies } = intelligence;
  if (dependencies.totalCount === 0) return;

  lines.push(sectionHeader(s, 'Dependencies'));
  lines.push('');
  lines.push(`**${dependencies.totalCount} total** (${dependencies.runtimeCount} runtime · ${dependencies.devCount} dev/peer)`);
  lines.push('');

  if (dependencies.largestGroups.length > 0) {
    lines.push('| Group | Count | Key Packages |');
    lines.push('|---|---|---|');
    for (const group of dependencies.largestGroups) {
      lines.push(`| ${group.name} | ${group.count} | ${group.packages.slice(0, 5).join(', ')}${group.packages.length > 5 ? '…' : ''} |`);
    }
    lines.push('');
  }

  if (dependencies.possibleUnused.length > 0) {
    lines.push('### ⚠️ Possibly Unused');
    lines.push('');
    for (const w of dependencies.possibleUnused) {
      lines.push(`- ${w}`);
    }
    lines.push('');
  }

  if (dependencies.outdatedWarnings.length > 0) {
    lines.push('### 🔄 Outdated Architecture');
    lines.push('');
    for (const w of dependencies.outdatedWarnings) {
      lines.push(`- ${w}`);
    }
    lines.push('');
  }
}

function appendArchitectureInsights(lines: string[], intelligence: Intelligence, s: SectionCounter): void {
  const { insights } = intelligence;
  if (insights.length === 0) return;

  lines.push(sectionHeader(s, 'Architecture Insights'));
  lines.push('');
  for (const insight of insights) {
    lines.push(`- **${insight.observation}** — ${insight.detail}`);
  }
  lines.push('');
}

function appendStrengths(lines: string[], intelligence: Intelligence, s: SectionCounter): void {
  const { strengths } = intelligence;
  if (strengths.length === 0) return;

  lines.push(sectionHeader(s, 'Project Strengths'));
  lines.push('');
  for (const str of strengths) {
    lines.push(`- **${str.title}:** ${str.detail}`);
    if (str.evidence.length > 0) {
      lines.push(`  - ${str.evidence.join(', ')}`);
    }
  }
  lines.push('');
}

function appendSuggestions(lines: string[], intelligence: Intelligence, s: SectionCounter): void {
  const { suggestions } = intelligence;
  if (suggestions.length === 0) return;

  lines.push(sectionHeader(s, 'Improvement Suggestions'));
  lines.push('');
  for (const sug of suggestions) {
    const priorityIcon = sug.priority === 'high' ? '🔴' : sug.priority === 'medium' ? '🟡' : '🟢';
    lines.push(`- ${priorityIcon} **${sug.title}** (${sug.priority} priority) — ${sug.detail}`);
  }
  lines.push('');
}

// --- Phase 3 sections (architecture intelligence) — receive ArchitectureAnalysis directly ---

function appendArchitecturePatterns(lines: string[], arch: ArchitectureAnalysis, s: SectionCounter): void {
  if (arch.patterns.length === 0) return;

  lines.push(sectionHeader(s, 'Architecture Patterns'));
  lines.push('');
  lines.push('| Pattern | Confidence | Evidence |');
  lines.push('|---|---|---|');
  for (const p of arch.patterns.slice(0, 5)) {
    lines.push(`| ${p.name} | ${p.confidence}% | ${p.evidence.slice(0, 2).join('; ')} |`);
  }
  lines.push('');
}

function appendDependencyGraphSection(lines: string[], arch: ArchitectureAnalysis, s: SectionCounter): void {
  const { dependencyGraph } = arch;
  if (dependencyGraph.nodes.length === 0) return;

  lines.push(sectionHeader(s, 'Module Dependency Graph'));
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| Total modules | ${dependencyGraph.nodes.length} |`);
  lines.push(`| Internal dependencies | ${dependencyGraph.edges.length} |`);
  lines.push(`| Central modules | ${dependencyGraph.centralModules.length > 0 ? dependencyGraph.centralModules.slice(0, 3).map((m) => '\`' + m.split('/').pop() + '\`').join(', ') : 'None'} |`);
  lines.push(`| Leaf modules | ${dependencyGraph.leafModules.length > 0 ? dependencyGraph.leafModules.slice(0, 3).map((m) => '\`' + m.split('/').pop() + '\`').join(', ') : 'None'} |`);
  lines.push(`| Hub modules | ${dependencyGraph.hubModules.length > 0 ? dependencyGraph.hubModules.slice(0, 3).map((m) => '\`' + m.split('/').pop() + '\`').join(', ') : 'None'} |`);
  lines.push(`| Isolated modules | ${dependencyGraph.isolatedModules.length} |`);
  lines.push('');
}

function appendCircularDepsSection(lines: string[], arch: ArchitectureAnalysis, s: SectionCounter): void {
  const { circularDependencies } = arch;
  if (circularDependencies.length === 0) {
    lines.push(sectionHeader(s, 'Circular Dependencies'));
    lines.push('');
    lines.push('✅ No circular dependencies detected.');
    lines.push('');
    return;
  }

  lines.push(sectionHeader(s, 'Circular Dependencies'));
  lines.push('');
  for (const cycle of circularDependencies.slice(0, 3)) {
    const path = cycle.cycle.map((m) => m.split('/').pop()).join(' → ');
    lines.push(`- 🔄 **${path}** (${cycle.severity} severity, ${cycle.fileCount} files)`);
    lines.push(`  - ${cycle.recommendation}`);
  }
  lines.push('');
}

function appendArchitectureSmellsSection(lines: string[], arch: ArchitectureAnalysis, s: SectionCounter): void {
  if (arch.smells.length === 0) return;

  lines.push(sectionHeader(s, 'Architecture Smells'));
  lines.push('');
  for (const smell of arch.smells.slice(0, 5)) {
    const icon = smell.severity === 'high' ? '🔴' : smell.severity === 'medium' ? '🟡' : '🟢';
    lines.push(`- ${icon} **${smell.type}** (${smell.severity}) — ${smell.detail}`);
  }
  lines.push('');
}

function appendComplexitySection(lines: string[], arch: ArchitectureAnalysis, s: SectionCounter): void {
  if (arch.complexityScores.length === 0) return;

  lines.push(sectionHeader(s, 'File Complexity'));
  lines.push('');
  lines.push('| File | Level | Score | Factors |');
  lines.push('|---|---|---|---|');
  for (const cs of arch.complexityScores.slice(0, 8)) {
    const icon = cs.level === 'Simple' ? '🟢' : cs.level === 'Moderate' ? '🟡' : cs.level === 'Complex' ? '🔴' : '⛔';
    const factors = cs.factors.map((f) => `${f.name}: ${f.value}`).join(', ');
    lines.push(`| ${icon} \`${cs.path.split('/').pop()}\` | ${cs.level} | ${cs.score} | ${factors} |`);
  }
  lines.push('');
}

function appendCouplingSection(lines: string[], arch: ArchitectureAnalysis, s: SectionCounter): void {
  lines.push(sectionHeader(s, 'Coupling & Cohesion'));
  lines.push('');
  const { coupling, cohesion } = arch;
  const couplingIcon = coupling.level === 'Low' ? '🟢' : coupling.level === 'Medium' ? '🟡' : '🔴';
  lines.push(`- **Coupling:** ${couplingIcon} ${coupling.level} (${coupling.score}/100) — ${coupling.explanation}`);
  const cohesionIcon = cohesion.overall === 'High' ? '🟢' : cohesion.overall === 'Medium' ? '🟡' : '🔴';
  lines.push(`- **Cohesion:** ${cohesionIcon} ${cohesion.overall} (${cohesion.score}/100)`);
  lines.push('');
}

function appendLayerViolationsSection(lines: string[], arch: ArchitectureAnalysis, s: SectionCounter): void {
  if (arch.layerViolations.length === 0) return;

  lines.push(sectionHeader(s, 'Layer Violations'));
  lines.push('');
  for (const v of arch.layerViolations.slice(0, 3)) {
    lines.push(`- ❌ **${v.violation}** (${v.files.length} files affected)`);
  }
  lines.push('');
}

function appendArchScoreSection(lines: string[], arch: ArchitectureAnalysis, s: SectionCounter): void {
  const { archScore } = arch;
  lines.push(sectionHeader(s, 'Architecture Quality Score'));
  lines.push('');
  lines.push(`**${archScore.overall}/${archScore.maxScore}**`);
  lines.push('');
  lines.push('| Dimension | Score |');
  lines.push('|---|---|');
  const bar1 = scoreBar(archScore.coupling);
  lines.push(`| Coupling | ${archScore.coupling}/100 ${bar1} |`);
  const bar2 = scoreBar(archScore.cohesion);
  lines.push(`| Cohesion | ${archScore.cohesion}/100 ${bar2} |`);
  const bar3 = scoreBar(archScore.layering);
  lines.push(`| Layering | ${archScore.layering}/100 ${bar3} |`);
  const bar4 = scoreBar(archScore.organization);
  lines.push(`| Organization | ${archScore.organization}/100 ${bar4} |`);
  const bar5 = scoreBar(archScore.separation);
  lines.push(`| Separation | ${archScore.separation}/100 ${bar5} |`);
  const bar6 = scoreBar(archScore.dependencyGraph);
  lines.push(`| Dependency Graph | ${archScore.dependencyGraph}/100 ${bar6} |`);
  lines.push('');
}

function appendRiskReportSection(lines: string[], arch: ArchitectureAnalysis, s: SectionCounter): void {
  const { riskReport } = arch;
  lines.push(sectionHeader(s, 'Risk Report'));
  lines.push('');
  lines.push('| Risk | Level | Detail |');
  lines.push('|---|---|---|');
  const icon = (l: string) => l === 'Low' ? '🟢' : l === 'Medium' ? '🟡' : '🔴';
  lines.push(`| Technical Debt | ${icon(riskReport.technicalDebtRisk.level)} ${riskReport.technicalDebtRisk.level} | ${riskReport.technicalDebtRisk.detail} |`);
  lines.push(`| Maintainability | ${icon(riskReport.maintainabilityRisk.level)} ${riskReport.maintainabilityRisk.level} | ${riskReport.maintainabilityRisk.detail} |`);
  lines.push(`| Scalability | ${icon(riskReport.scalabilityRisk.level)} ${riskReport.scalabilityRisk.level} | ${riskReport.scalabilityRisk.detail} |`);
  lines.push(`| Onboarding | ${icon(riskReport.onboardingDifficulty.level)} ${riskReport.onboardingDifficulty.level} | ${riskReport.onboardingDifficulty.detail} |`);
  lines.push(`| Release | ${icon(riskReport.releaseRisk.level)} ${riskReport.releaseRisk.level} | ${riskReport.releaseRisk.detail} |`);
  lines.push(`| **Overall** | ${icon(riskReport.overall.level)} **${riskReport.overall.level}** | ${riskReport.overall.detail} |`);
  lines.push('');
}

function appendVisualDepTreeSection(lines: string[], arch: ArchitectureAnalysis, s: SectionCounter): void {
  const { visualDepTree } = arch;
  if (!visualDepTree.tree) return;

  lines.push(sectionHeader(s, 'Visual Dependency Tree'));
  lines.push('');
  lines.push(visualDepTree.tree);
}

function appendRefactorSuggestionsSection(lines: string[], arch: ArchitectureAnalysis, s: SectionCounter): void {
  if (arch.refactorSuggestions.length === 0) return;

  lines.push(sectionHeader(s, 'Refactor Suggestions'));
  lines.push('');
  for (const sug of arch.refactorSuggestions) {
    const impactIcon = sug.impact === 'high' ? '🔴' : sug.impact === 'medium' ? '🟡' : '🟢';
    const effortIcon = sug.effort === 'small' ? '⚡' : sug.effort === 'medium' ? '🔧' : '🏗️';
    lines.push(`- ${impactIcon} **${sug.title}** (impact: ${sug.impact}, effort: ${sug.effort} ${effortIcon})`);
    lines.push(`  - ${sug.detail}`);
  }
  lines.push('');
}

function scoreBar(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, empty));
}
