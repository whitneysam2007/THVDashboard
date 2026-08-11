import { describe, expect, it } from 'vitest';
import { nextOutstandingManualTask } from '../shared/manualTasks';

describe('nextOutstandingManualTask', () => {
  it('selects the earliest due unfinished manual task', () => {
    const task = nextOutstandingManualTask([
      { id: 'manual-later', dueDate: '2026-12-01', completedDate: null },
      { id: 'manual-sooner', dueDate: '2026-11-15', completedDate: null },
      { id: 'manual-done', dueDate: '2026-10-01', completedDate: '2026-10-01' },
      { id: 'welcome-note', dueDate: '2026-01-01', completedDate: null },
    ]);

    expect(task?.id).toBe('manual-sooner');
  });

  it('returns nothing when the donor has no open manual task', () => {
    expect(nextOutstandingManualTask([
      { id: 'manual-done', dueDate: '2026-10-01', completedDate: '2026-10-01' },
      { id: 'newsletter', dueDate: '2026-01-01', completedDate: null },
    ])).toBeUndefined();
  });
});
