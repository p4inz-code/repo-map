/**
 * Symbol token definitions for the repo-map UI.
 *
 * Every symbol has a Unicode and ASCII fallback variant.
 * No emoji. Professional engineering aesthetic only.
 */

export type SymbolToken =
  | 'check'
  | 'cross'
  | 'warning'
  | 'arrow'
  | 'bullet'
  | 'pointer'
  | 'ellipsis'
  | 'arrowUp'
  | 'arrowDown'
  | 'separator'
  | 'filled'
  | 'empty'

  // Professional icons
  | 'repo'
  | 'file'
  | 'folder'
  | 'folderOpen'
  | 'code'
  | 'branch'
  | 'commit'
  | 'issue'
  | 'tag'
  | 'star'
  | 'search'
  | 'setting'

  // Category icons
  | 'language'
  | 'framework'
  | 'test'
  | 'tool'
  | 'database'
  | 'package'
  | 'doc'
  | 'config'
  | 'script'
  | 'docker'
  | 'ci'
  | 'deploy'

  // Status icons
  | 'success'
  | 'error'
  | 'info'
  | 'time'
  | 'stats';

const UNICODE_SYMBOLS: Record<SymbolToken, string> = {
  // Basic
  check: '✓',
  cross: '✗',
  warning: '⚠',
  arrow: '→',
  bullet: '·',
  pointer: '▸',
  ellipsis: '…',
  arrowUp: '↑',
  arrowDown: '↓',
  separator: '─',
  filled: '█',
  empty: '░',

  // Professional icons
  repo: '⊞',
  file: '⊡',
  folder: '▣',
  folderOpen: '◫',
  code: '⟨⟩',
  branch: '⊸',
  commit: '◆',
  issue: '⊘',
  tag: '⌗',
  star: '★',
  search: '⌕',
  setting: '⚙',

  // Category icons
  language: '◎',
  framework: '◈',
  test: '☷',
  tool: '⚒',
  database: '⌂',
  package: '◉',
  doc: '⊏',
  config: '⚙',
  script: '⌘',
  docker: '⊟',
  ci: '↻',
  deploy: '⇧',

  // Status icons
  success: '✓',
  error: '✗',
  info: 'ℹ',
  time: '⏱',
  stats: '▤',
};

const ASCII_SYMBOLS: Record<SymbolToken, string> = {
  // Basic
  check: '[ok]',
  cross: '[!]',
  warning: '[!]',
  arrow: '->',
  bullet: '*',
  pointer: '>',
  ellipsis: '...',
  arrowUp: '^',
  arrowDown: 'v',
  separator: '-',
  filled: '#',
  empty: '.',

  // Professional icons
  repo: '[R]',
  file: '[f]',
  folder: '[D]',
  folderOpen: '[D]',
  code: '<>',
  branch: '->',
  commit: '*',
  issue: '[!]',
  tag: '#',
  star: '*',
  search: '?',
  setting: '[S]',

  // Category icons
  language: '(L)',
  framework: '(F)',
  test: '(T)',
  tool: '(t)',
  database: '(D)',
  package: '(p)',
  doc: '[d]',
  config: '[c]',
  script: '$',
  docker: '[D]',
  ci: '[C]',
  deploy: '^',

  // Status icons
  success: '[ok]',
  error: '[!]',
  info: '(i)',
  time: '[t]',
  stats: '[#]',
};

/**
 * Detect whether the terminal supports Unicode characters.
 *
 * Windows CMD (non-Windows Terminal) has limited Unicode support.
 * CI and piped output use ASCII fallback by default.
 */
export function detectUnicodeSupport(): boolean {
  // When stdout is not a TTY, assume no Unicode support for safety
  if (!process.stdout.isTTY) return false;

  // Windows legacy console (CMD) — limited Unicode
  if (process.platform === 'win32' && !process.env.WT_SESSION) {
    return false;
  }

  return true;
}

/**
 * Resolve a symbol token to its display character.
 *
 * @param token - The symbol to resolve
 * @param unicode - Whether to use Unicode (true) or ASCII fallback (false)
 * @returns The display character
 */
export function resolveSymbol(token: SymbolToken, unicode: boolean): string {
  return unicode ? UNICODE_SYMBOLS[token] : ASCII_SYMBOLS[token];
}
