import { scanDirectory } from '../src/scanner/index.js';
import { analyze } from '../src/analyzer/index.js';

async function main() {
  const scanResult = await scanDirectory({
    rootPath: '.',
    useGitignore: true,
  });
  const analysis = await analyze({
    files: scanResult.files,
    rootPath: scanResult.rootPath,
    stats: scanResult.stats,
  });

  // Print JSON
  process.stdout.write('=== JSON OUTPUT ===\n');
  process.stdout.write(JSON.stringify(analysis, null, 2));
  process.stdout.write('\n\n');

  // Print Markdown
  process.stdout.write('=== MARKDOWN OUTPUT ===\n');
  process.stdout.write(analysis.architecture);
}

main().catch(console.error);
