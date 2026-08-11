import { isManualTaskId } from './taskKeys';

export type ManualTaskRecord = {
  id: string;
  dueDate: string;
  completedDate?: string | null;
};

/** Return the oldest due, still-open manual task for a donor. */
export function nextOutstandingManualTask<T extends ManualTaskRecord>(tasks: T[]): T | undefined {
  return tasks
    .filter(task => isManualTaskId(task.id) && !task.completedDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
}
