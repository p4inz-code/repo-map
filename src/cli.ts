import { Command } from 'commander';
import { CLI_VERSION } from './types.js';
import type { CliOptions } from './types.js';

function parseDepth(value: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 0) {
    throw new Error(
      `Invalid depth: "${value}". Must be a non-negative integer.`,
    );
  }
  return parsed;
}

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

export function parseCliArgs(argv: string[]): CliOptions {
  const program = new Command();

  program
    .name('repo-map')
    .version(CLI_VERSION)
    .description(
      'Scan a repository, generate a folder tree, detect technologies, and output architecture summaries',
    )
    .argument('[path]', 'Path to the repository to scan', '.')
    .option('--json', 'Output in JSON format')
    .option('-o, --output <file>', 'Write output to file')
    .option('--depth <number>', 'Maximum directory depth', parseDepth)
    .option('--no-ignore', 'Do not respect .gitignore files')
    .option(
      '--exclude <pattern>',
      'Exclude files matching pattern (can be specified multiple times)',
      collect,
      [],
    )
    .option(
      '--include <pattern>',
      'Only include files matching pattern (can be specified multiple times)',
      collect,
      [],
    )
    .option('--stats', 'Show quick repository statistics')
    .option('--suggest', 'Show improvement suggestions')
    .option('--no-color', 'Disable ANSI color output')
    .parse(argv);

  const opts = program.opts();
  const pathArg = program.args[0] || '.';

  return {
    path: pathArg,
    format: opts.json ? 'json' : 'markdown',
    depth: opts.depth,
    output: opts.output,
    useGitignore: opts.ignore !== false,
    exclude: opts.exclude?.length ? opts.exclude : undefined,
    include: opts.include?.length ? opts.include : undefined,
    stats: opts.stats ?? undefined,
    suggest: opts.suggest ?? undefined,
    color: opts.color !== false,
  };
}
