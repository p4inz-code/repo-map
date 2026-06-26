import fs from 'node:fs/promises';

/** Default maximum cached content size: 200 MB. */
const DEFAULT_MAX_BYTES = 200 * 1024 * 1024;

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  sizeBytes: number;
  maxBytes: number;
  entryCount: number;
  hitRate: number;
}

interface CacheEntry {
  key: string;
  content: string;
  size: number;
  /** Linked-list pointers for LRU ordering. */
  prev: CacheEntry | null;
  next: CacheEntry | null;
}

/**
 * LRU file content cache with bounded memory.
 *
 * Eliminates duplicate filesystem reads when multiple analysis modules
 * need the same file content. Automatically evicts least-recently-used
 * entries when the total cached content exceeds maxBytes.
 *
 * Eviction is O(1) via a doubly-linked list with keys stored in each entry.
 */
export class FileContentCache {
  private readonly maxBytes: number;
  private cache = new Map<string, CacheEntry>();
  private _sizeBytes = 0;
  private _hits = 0;
  private _misses = 0;
  private _evictions = 0;

  /** Most recently used entry (head of linked list). */
  private head: CacheEntry | null = null;
  /** Least recently used entry (tail of linked list). */
  private tail: CacheEntry | null = null;

  constructor(maxBytes = DEFAULT_MAX_BYTES) {
    this.maxBytes = maxBytes;
  }

  /**
   * Read a file, returning cached content if available.
   * Returns empty string on error (permission denied, unreadable, etc.).
   */
  async read(filePath: string): Promise<string> {
    const existing = this.cache.get(filePath);
    if (existing !== undefined) {
      this._hits++;
      this.moveToHead(existing);
      return existing.content;
    }

    this._misses++;

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const size = Buffer.byteLength(content, 'utf-8');
      this.setEntry(filePath, content, size);
      return content;
    } catch {
      // Cache negative result so we don't retry
      this.setEntry(filePath, '', 0);
      return '';
    }
  }

  /** Current cache statistics. */
  get stats(): CacheStats {
    const total = this._hits + this._misses;
    return {
      hits: this._hits,
      misses: this._misses,
      evictions: this._evictions,
      sizeBytes: this._sizeBytes,
      maxBytes: this.maxBytes,
      entryCount: this.cache.size,
      hitRate: total > 0 ? Math.round((this._hits / total) * 100) : 0,
    };
  }

  /** Hit rate as a percentage (0-100). Returns 0 if no requests made. */
  get hitRate(): number {
    const total = this._hits + this._misses;
    return total > 0 ? Math.round((this._hits / total) * 100) : 0;
  }

  /** Clear the cache entirely (between analysis runs). */
  clear(): void {
    this.cache.clear();
    this._sizeBytes = 0;
    this._hits = 0;
    this._misses = 0;
    this._evictions = 0;
    this.head = null;
    this.tail = null;
  }

  /** Total size of cached content in bytes. */
  get sizeBytes(): number {
    return this._sizeBytes;
  }

  /**
   * Manually insert content into the cache (testing/benchmarking).
   * Skips filesystem — useful for unit tests and cache benchmarks.
   */
  set(key: string, content: string): void {
    const size = Buffer.byteLength(content, 'utf-8');
    this.setEntry(key, content, size);
  }

  private setEntry(key: string, content: string, size: number): void {
    // If key already exists, remove old size accounting before overwriting
    const existing = this.cache.get(key);
    if (existing) {
      this._sizeBytes -= existing.size;
      this.removeFromList(existing);
    }

    // Evict entries until we have room
    while (this._sizeBytes + size > this.maxBytes && this.tail) {
      this.evictLru();
    }

    const entry: CacheEntry = { key, content, size, prev: null, next: null };
    this.cache.set(key, entry);
    this._sizeBytes += size;
    this.addToHead(entry);
  }

  private moveToHead(entry: CacheEntry): void {
    if (entry === this.head) return;

    this.removeFromList(entry);
    this.addToHead(entry);
  }

  private addToHead(entry: CacheEntry): void {
    entry.next = this.head;
    entry.prev = null;
    if (this.head) {
      this.head.prev = entry;
    }
    this.head = entry;
    if (!this.tail) {
      this.tail = entry;
    }
  }

  private removeFromList(entry: CacheEntry): void {
    if (entry.prev) {
      entry.prev.next = entry.next;
    }
    if (entry.next) {
      entry.next.prev = entry.prev;
    }
    if (entry === this.head) {
      this.head = entry.next;
    }
    if (entry === this.tail) {
      this.tail = entry.prev;
    }
    entry.prev = null;
    entry.next = null;
  }

  private evictLru(): void {
    const entry = this.tail;
    if (!entry) return;

    // O(1) eviction using key stored in entry
    this.cache.delete(entry.key);
    this.removeFromList(entry);
    this._sizeBytes -= entry.size;
    this._evictions++;
  }
}

/** Singleton instance shared across the analysis pipeline. */
export const fileCache = new FileContentCache();
