import type { FileEntry } from '../types.js';
import { sanitizeFilePath } from '../ui/utils/ansi.js';

interface TreeNode {
  name: string;
  children: TreeNode[];
  isDirectory: boolean;
}

/**
 * Builds a tree from file paths. Directories are created implicitly from
 * path segments. Only truly empty directories (from FileEntry.isDirectory)
 * need explicit handling — they are added as leaf nodes.
 */
function buildTreeNodes(
  filePaths: string[],
): TreeNode[] {
  const dirContents = new Map<string, string[]>();
  const rootNames: string[] = [];

  for (const p of filePaths) {
    const normalized = p.replace(/\\/g, '/');
    const slashIdx = normalized.indexOf('/');

    if (slashIdx === -1) {
      if (normalized.length > 0) rootNames.push(normalized);
    } else {
      const top = normalized.slice(0, slashIdx);
      const rest = normalized.slice(slashIdx + 1);
      if (!dirContents.has(top)) dirContents.set(top, []);
      dirContents.get(top)!.push(rest);
    }
  }

  const nodes: TreeNode[] = [];

  // Directories (sorted)
  for (const [name, children] of [...dirContents.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    nodes.push({
      name,
      isDirectory: true,
      children: buildTreeNodes(children),
    });
  }

  // Files (sorted, after directories)
  for (const name of rootNames.sort()) {
    nodes.push({ name, isDirectory: false, children: [] });
  }

  return nodes;
}

/**
 * Renders tree nodes. When `useConnectors` is false (root level),
 * items are listed without box-drawing prefixes.
 */
function renderNodes(
  nodes: TreeNode[],
  prefix = '',
  useConnectors = false,
): string {
  let result = '';

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const suffix = node.isDirectory ? '/' : '';

    if (useConnectors) {
      const connector = isLast ? '└── ' : '├── ';
      const safeName = sanitizeFilePath(node.name);
      result += prefix + connector + safeName + suffix + '\n';
    } else {
      result += sanitizeFilePath(node.name) + suffix + '\n';
    }

    if (node.children.length > 0) {
      const childPrefix = useConnectors
        ? prefix + (isLast ? '    ' : '│   ')
        : '';
      result += renderNodes(node.children, childPrefix, true);
    }
  }

  return result;
}

/**
 * Generates an ASCII directory tree from a flat list of scanned files.
 *
 * Only file entries (not pure directory entries) are used to build the
 * tree structure. Empty directories without any files are omitted.
 *
 * @param files - File entries from the scanner (post-filtering)
 * @returns ASCII tree string, e.g. "src/\n├── index.ts\n└── cli.ts\n"
 */
export function generateTree(files: FileEntry[]): string {
  const paths = files
    .filter((f) => !f.isDirectory)
    .map((f) => f.relativePath)
    .filter((p) => p.length > 0);

  if (paths.length === 0) return '';

  const nodes = buildTreeNodes(paths);
  return renderNodes(nodes, '', false);
}
