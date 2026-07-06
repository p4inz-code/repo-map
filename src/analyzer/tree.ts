import type { FileEntry } from '../types.js';
import type { TreeNodeData } from '../ui/state/types.js';
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
 * Build a TreeNodeData tree from a flat list of FileEntry items.
 *
 * This produces the interactive tree data structure used by the
 * workspace RepositoryTree component. Directories are opened by
 * default (expanded: true) for a complete initial view.
 */
export function buildTreeNodeData(files: FileEntry[]): TreeNodeData | null {
  if (files.length === 0) return null;

  // Sort: directories first, then alphabetical
  const sorted = [...files].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.relativePath.localeCompare(b.relativePath);
  });

  // Build a nested map structure from relative paths
  interface NodeMap {
    [name: string]: {
      entry?: FileEntry;
      children: NodeMap;
    };
  }

  const root: NodeMap = {};

  for (const entry of sorted) {
    const normalized = entry.relativePath.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = { children: {} };
      }
      if (i === parts.length - 1) {
        current[part].entry = entry;
      }
      current = current[part].children;
    }
  }

  // Recursively convert to TreeNodeData
  function convert(name: string, node: NodeMap[string], depth: number): TreeNodeData {
    const entry = node.entry;
    const isDir = entry ? entry.isDirectory : Object.keys(node.children).length > 0;
    const children = Object.keys(node.children);

    // Determine language from file extension
    let language: string | undefined;
    if (!isDir && name.includes('.')) {
      const ext = name.split('.').pop()?.toLowerCase();
      if (ext) {
        const langMap: Record<string, string> = {
          ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
          py: 'Python', rs: 'Rust', go: 'Go', java: 'Java', rb: 'Ruby',
          cs: 'C#', cpp: 'C++', c: 'C', swift: 'Swift', kt: 'Kotlin',
          html: 'HTML', css: 'CSS', scss: 'SCSS', less: 'Less',
          json: 'JSON', yml: 'YAML', yaml: 'YAML', md: 'Markdown',
          sql: 'SQL', sh: 'Shell', bash: 'Shell',
        };
        language = langMap[ext];
      }
    }

    // Build child nodes
    const childNodes = children.map((childName) =>
      convert(childName, node.children[childName], depth + 1),
    );

    return {
      name,
      path: entry?.relativePath || name,
      type: isDir ? 'directory' : 'file',
      size: entry?.size,
      language,
      expanded: isDir && depth < 2 ? true : undefined,
      depth,
      children: childNodes.length > 0 ? childNodes : undefined,
    };
  }

  // Get the top-level entries
  const names = Object.keys(root);
  if (names.length === 1) {
    // Single root — use it directly
    return convert(names[0], root[names[0]], 0);
  }

  // Multiple roots — create a virtual root
  const children = names.map((name) => convert(name, root[name], 1));
  return {
    name: '/',
    path: '/',
    type: 'directory',
    expanded: true,
    depth: 0,
    children,
  };
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
