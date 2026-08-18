import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrpcContext } from './_core/context';

const db = vi.hoisted(() => ({
  upsertTask: vi.fn(),
  getActivitiesForDonor: vi.fn(),
  insertActivity: vi.fn(),
  updateActivity: vi.fn(),
  deleteActivity: vi.fn(),
  recalculateLastContactDate: vi.fn(),
}));

vi.mock('./db', async importOriginal => ({
  ...(await importOriginal<typeof import('./db')>()),
  upsertTask: db.upsertTask,
  getActivitiesForDonor: db.getActivitiesForDonor,
  insertActivity: db.insertActivity,
  updateActivity: db.updateActivity,
  deleteActivity: db.deleteActivity,
  recalculateLastContactDate: db.recalculateLastContactDate,
}));

import { appRouter } from './routers';

function teamContext(): TrpcContext {
  return {
    user: { openId: 'report-test', email: 'team@example.org', name: 'Team Member', loginMethod: 'password', role: 'user' },
    req: { headers: {} } as TrpcContext['req'],
    res: {} as TrpcContext['res'],
  };
}

describe('report task completion', () => {
  beforeEach(() => {
    db.upsertTask.mockReset().mockResolvedValue(undefined);
    db.getActivitiesForDonor.mockReset().mockResolvedValue([]);
    db.insertActivity.mockReset().mockResolvedValue(undefined);
    db.updateActivity.mockReset().mockResolvedValue(undefined);
    db.deleteActivity.mockReset().mockResolvedValue(undefined);
    db.recalculateLastContactDate.mockReset().mockResolvedValue(undefined);
  });

  it('marks a report sent and logs the matching dated donor interaction', async () => {
    const caller = appRouter.createCaller(teamContext());
    await caller.donors.setReportTaskCompletion({ donorId: 'donor-1', taskId: 'semi-annual-report-2026', label: 'Send 2026 semi-annual / 6-month report', dueDate: '2026-08-01', completed: true, completedDate: '2026-08-18', completedBy: 'Liz' });
    expect(db.upsertTask).toHaveBeenCalledWith(expect.objectContaining({ donorId: 'donor-1', completedDate: '2026-08-18', completedBy: 'Liz' }));
    expect(db.insertActivity).toHaveBeenCalledWith({ id: 'report-donor-1-semi-annual-report-2026', donorId: 'donor-1', date: '2026-08-18', author: 'Liz', note: 'Send 2026 semi-annual / 6-month report sent.' });
    expect(db.recalculateLastContactDate).toHaveBeenCalledWith('donor-1');
  });

  it('removes the linked interaction when a sent report is unchecked', async () => {
    const caller = appRouter.createCaller(teamContext());
    await caller.donors.setReportTaskCompletion({ donorId: 'donor-1', taskId: 'semi-annual-report-2026', label: 'Send 2026 semi-annual / 6-month report', dueDate: '2026-08-01', completed: false });
    expect(db.upsertTask).toHaveBeenCalledWith(expect.objectContaining({ donorId: 'donor-1', completedDate: undefined, completedBy: undefined }));
    expect(db.deleteActivity).toHaveBeenCalledWith('report-donor-1-semi-annual-report-2026');
    expect(db.recalculateLastContactDate).toHaveBeenCalledWith('donor-1');
  });
});
