# repo-map

Scan a repository, generate a folder tree, detect technologies, and output architecture summaries.

## Installation

```bash
npm install -g @p4inz-code/repo-map
```

Or run directly without installing:

```bash
npx @p4inz-code/repo-map [path]
```

## Usage

```bash
# Scan current directory (markdown output)
repo-map

# Scan specific path
repo-map /path/to/project

# Output as JSON
repo-map --json

# Show quick repository statistics
repo-map --stats

# Show statistics as JSON (for CI pipelines)
repo-map --stats --json

# Limit directory depth
repo-map --depth 3

# Write output to file
repo-map -o architecture.md

# Ignore .gitignore rules (include all files)
repo-map --no-ignore

# Exclude files matching a pattern
repo-map --exclude node_modules --exclude dist

# Only include files matching a pattern
repo-map --include "src/**"

# Combine exclude and include
repo-map --exclude "*.test.ts" --include "src/**"
```

## Options

| Option | Description |
|--------|-------------|
| `[path]` | Path to repository (default: `.`) |
| `--json` | Output in JSON format |
| `-o, --output <file>` | Write output to file |
| `--depth <number>` | Maximum directory depth |
| `--stats` | Show quick repository statistics (file counts, language breakdown) |
| `--exclude <pattern>` | Exclude files matching pattern (can be specified multiple times) |
| `--include <pattern>` | Only include files matching pattern (can be specified multiple times) |
| `--no-ignore` | Do not respect .gitignore files |
| `-V, --version` | Output version number |
| `-h, --help` | Display help |

## Output

### Markdown (default)

Generates a Markdown document with:

- Project statistics (files, directories, total size)
- Technology stack detection (languages, frameworks, tools)
- ASCII directory tree
- Project summary

### JSON (`--json`)

Generates a JSON object with all analysis data:

```json
{
  "schemaVersion": "1.0.0",
  "projectName": "my-project",
  "generatedAt": "2025-01-01T00:00:00.000Z",
  "cliVersion": "0.2.0",
  "stats": {
    "totalFiles": 42,
    "totalDirectories": 12,
    "totalSize": 15360,
    "scannedPath": "/path/to/project"
  },
  "technologies": [...],
  "tree": "src/\n├── index.ts\n└── cli.ts\n",
  "architecture": "# Project Architecture..."
}
```

### Stats (`--stats`)

A compact summary with file counts, directory counts, total size, and a language breakdown:

```text
Files: 42  |  Dirs: 12  |  Size: 15.0 KB
TypeScript         30 files  ( 71.4%)
JavaScript          8 files  ( 19.0%)
JSON                4 files  (  9.5%)
```

Combine with `--json` for structured output:

```json
{
  "projectName": "my-project",
  "scannedPath": "/path/to/project",
  "totalFiles": 42,
  "totalDirectories": 12,
  "totalSize": 15360,
  "generatedAt": "2025-01-01T00:00:00.000Z",
  "languages": [
    { "name": "TypeScript", "files": 30, "percentage": 71.4 },
    { "name": "JavaScript", "files": 8, "percentage": 19.0 },
    { "name": "JSON", "files": 4, "percentage": 9.5 }
  ]
}
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run in development mode
npm run dev -- /path/to/project

# Build
npm run build

# Lint
npm run lint
```

## License

MIT
