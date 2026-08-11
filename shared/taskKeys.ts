// Auto-generated task slugs (newsletter, welcome-note, annual-report-2026, ...)
// are the SAME string for every donor. The donor_tasks primary key must therefore
// be scoped by donor, otherwise donor B completing "newsletter" overwrites the
// single existing row and silently steals it from donor A — which is exactly the
// bug that made "Mark done" appear not to work.
//
// Manual tasks already carry a globally unique nanoid ("manual-xxxx") and must be
// left untouched.

export const MANUAL_PREFIX = 'manual-';

export function isManualTaskId(id: string): boolean {
  return id.startsWith(MANUAL_PREFIX);
}

/** The database primary key for a task row. */
export function taskRowId(donorId: string, taskId: string): string {
  if (isManualTaskId(taskId)) return taskId;
  if (taskId.startsWith(donorId + '_')) return taskId; // already scoped
  return `${donorId}_${taskId}`;
}

/** Strip the donor scope back off to recover the bare auto-task slug. */
export function taskSlugFromRowId(donorId: string, rowId: string): string {
  if (isManualTaskId(rowId)) return rowId;
  const prefix = donorId + '_';
  return rowId.startsWith(prefix) ? rowId.slice(prefix.length) : rowId;
}
