/**
 * BackgroundTask types for the Terminal Ecosystem.
 *
 * Tasks are async operations that run in the background:
 * - Repository scanning
 * - Analysis generation
 * - Export operations
 * - Search indexing
 * - Plugin operations
 * - Future Veris operations
 */

// ─── Task Status ────────────────────────────────────────────────────

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

// ─── Task Definition ────────────────────────────────────────────────

export interface BackgroundTask {
  /** Unique task ID. */
  readonly id: string;
  /** Human-readable label (mutable, can be updated with progress info). */
  label: string;
  /** Detailed description. */
  readonly description: string;
  /** Current status. */
  status: TaskStatus;
  /** Progress from 0 to 1 (only meaningful when status is 'running'). */
  progress: number;
  /** Timestamp when the task was created. */
  readonly createdAt: number;
  /** Timestamp when the task started running. */
  startedAt: number | null;
  /** Timestamp when the task completed/failed. */
  completedAt: number | null;
  /** Error message if the task failed. */
  error: string | null;
  /** Task type for categorization. */
  readonly type: TaskType;
  /** Priority (lower = higher priority). */
  readonly priority: number;
  /** Whether this is cancellable. */
  readonly cancellable: boolean;
}

// ─── Task Types ─────────────────────────────────────────────────────

export type TaskType =
  | 'scan'
  | 'analysis'
  | 'export'
  | 'search-index'
  | 'plugin'
  | 'other';

// ─── Task Manager State ─────────────────────────────────────────────

export interface TaskManagerState {
  /** All tasks. */
  readonly tasks: BackgroundTask[];
  /** Currently running tasks. */
  readonly running: BackgroundTask[];
  /** Queued tasks awaiting execution. */
  readonly queued: BackgroundTask[];
  /** Recently completed tasks. */
  readonly completed: BackgroundTask[];
  /** Failed tasks. */
  readonly failed: BackgroundTask[];
  /** Total task count. */
  readonly totalCount: number;
  /** Whether there are any active (running or queued) tasks. */
  readonly hasActive: boolean;
}

// ─── Task Progress ──────────────────────────────────────────────────

export interface TaskProgressUpdate {
  readonly taskId: string;
  readonly progress: number;
  readonly status: TaskStatus;
  readonly label?: string;
  readonly error?: string;
}
