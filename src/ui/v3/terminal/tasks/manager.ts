/**
 * TaskManager — background task orchestration for the Terminal Ecosystem.
 *
 * Manages async operations with:
 * - Task lifecycle (queued → running → completed/failed/cancelled)
 * - Progress tracking (0 to 1)
 * - EventBus integration for UI updates
 * - Concurrent task limiting
 * - Queue management
 * - Future Veris compatibility
 */

import type { EventBus } from '../../event-bus/bus.js';
import type { BackgroundTask, TaskManagerState, TaskProgressUpdate, TaskStatus, TaskType } from './types.js';

// ─── TaskManager ────────────────────────────────────────────────────

export class TaskManager {
  private readonly _eventBus: EventBus;

  /** All tracked tasks. */
  private readonly _tasks: Map<string, BackgroundTask> = new Map();

  /** Maximum concurrent running tasks. */
  private readonly _maxConcurrent: number = 3;

  /** Currently running task IDs. */
  private readonly _running: Set<string> = new Set();

  /** Queued task IDs. */
  private readonly _queued: string[] = [];

  /** Maximum completed tasks to keep. */
  private readonly _maxCompleted: number = 20;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
  }

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Create and queue a new background task.
   * @returns The created task ID.
   */
  createTask(params: {
    id: string;
    label: string;
    description?: string;
    type?: TaskType;
    priority?: number;
    cancellable?: boolean;
  }): string {
    const id = params.id;
    const task: BackgroundTask = {
      id,
      label: params.label,
      description: params.description ?? params.label,
      status: 'queued',
      progress: 0,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      error: null,
      type: params.type ?? 'other',
      priority: params.priority ?? 100,
      cancellable: params.cancellable ?? true,
    };

    this._tasks.set(id, task);
    this._queued.push(id);
    this._processQueue();
    return id;
  }

  /**
   * Update a task's progress.
   */
  updateProgress(taskId: string, update: Partial<TaskProgressUpdate>): boolean {
    const task = this._tasks.get(taskId);
    if (!task || task.status !== 'running') return false;

    if (update.progress !== undefined) {
      task.progress = Math.max(0, Math.min(1, update.progress));
    }
    if (update.label) {
      task.label = update.label;
    }
    if (update.status && update.status !== 'running') {
      this._setTaskStatus(taskId, update.status);
    }
    if (update.error) {
      task.error = update.error;
    }

    return true;
  }

  /**
   * Mark a task as running.
   */
  startTask(taskId: string): boolean {
    const task = this._tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'queued') {
      this._setTaskStatus(taskId, 'running');
      task.startedAt = Date.now();
      task.progress = 0;
      this._running.add(taskId);
      this._queued.splice(this._queued.indexOf(taskId), 1);
      return true;
    }
    return false;
  }

  /**
   * Mark a task as completed.
   */
  completeTask(taskId: string): boolean {
    const task = this._tasks.get(taskId);
    if (!task) return false;

    this._setTaskStatus(taskId, 'completed');
    task.completedAt = Date.now();
    task.progress = 1;
    this._running.delete(taskId);
    this._trimCompleted();
    this._processQueue();
    return true;
  }

  /**
   * Mark a task as failed.
   */
  failTask(taskId: string, error: string): boolean {
    const task = this._tasks.get(taskId);
    if (!task) return false;

    this._setTaskStatus(taskId, 'failed');
    task.completedAt = Date.now();
    task.error = error;
    this._running.delete(taskId);
    // Remove from queue if still queued
    const qIdx = this._queued.indexOf(taskId);
    if (qIdx !== -1) this._queued.splice(qIdx, 1);
    this._processQueue();

    this._eventBus.emit('error', {
      message: `Task failed: ${task.label}`,
      error: new Error(error),
      suggestion: 'Check the task details for more information.',
    }, 'tasks');

    return true;
  }

  /**
   * Cancel a task (running or queued).
   */
  cancelTask(taskId: string): boolean {
    const task = this._tasks.get(taskId);
    if (!task) return false;
    if (!task.cancellable) return false;

    this._setTaskStatus(taskId, 'cancelled');
    task.completedAt = Date.now();
    this._running.delete(taskId);
    const qIdx = this._queued.indexOf(taskId);
    if (qIdx !== -1) this._queued.splice(qIdx, 1);
    this._processQueue();
    return true;
  }

  /**
   * Get the current task manager state.
   */
  getState(): TaskManagerState {
    const all: BackgroundTask[] = Array.from(this._tasks.values());
    return {
      tasks: all,
      running: all.filter((t) => t.status === 'running'),
      queued: all.filter((t) => t.status === 'queued'),
      completed: all.filter((t) => t.status === 'completed'),
      failed: all.filter((t) => t.status === 'failed'),
      totalCount: all.length,
      hasActive: this._running.size > 0 || this._queued.length > 0,
    };
  }

  /**
   * Get a specific task.
   */
  getTask(taskId: string): BackgroundTask | undefined {
    return this._tasks.get(taskId);
  }

  /**
   * Get all tasks of a given status.
   */
  getTasksByStatus(status: TaskStatus): BackgroundTask[] {
    return Array.from(this._tasks.values()).filter((t) => t.status === status);
  }

  /**
   * Clear all completed and cancelled tasks.
   */
  clearCompleted(): void {
    for (const [id, task] of this._tasks) {
      if (task.status === 'completed' || task.status === 'cancelled') {
        this._tasks.delete(id);
      }
    }
  }

  /**
   * Clear all tasks.
   */
  clearAll(): void {
    this._tasks.clear();
    this._running.clear();
    this._queued.length = 0;
  }

  // ── Internal ──────────────────────────────────────────────────

  private _processQueue(): void {
    while (this._running.size < this._maxConcurrent && this._queued.length > 0) {
      // Sort queue by priority (lower = higher priority)
      this._queued.sort((a, b) => {
        const ta = this._tasks.get(a);
        const tb = this._tasks.get(b);
        return (ta?.priority ?? 100) - (tb?.priority ?? 100);
      });

      const nextId = this._queued.shift()!;
      this._running.add(nextId);

      const task = this._tasks.get(nextId)!;
      this._setTaskStatus(nextId, 'running');
      task.startedAt = Date.now();
    }
  }

  private _setTaskStatus(taskId: string, status: TaskStatus): void {
    const task = this._tasks.get(taskId);
    if (!task) return;
    task.status = status;
  }

  private _trimCompleted(): void {
    const completed = Array.from(this._tasks.values())
      .filter((t) => t.status === 'completed' || t.status === 'cancelled')
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

    if (completed.length > this._maxCompleted) {
      const toRemove = completed.slice(this._maxCompleted);
      for (const task of toRemove) {
        this._tasks.delete(task.id);
      }
    }
  }
}
