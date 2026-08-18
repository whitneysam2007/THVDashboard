import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrpcContext } from './_core/context';

const storage = vi.hoisted(() => ({
  getProject: vi.fn(),
  saveProject: vi.fn(),
  uploadPdf: vi.fn(),
  signedUrl: vi.fn(),
}));

vi.mock('./usanaStorage', () => ({
  getUsanaProject: storage.getProject,
  saveUsanaProject: storage.saveProject,
  uploadGardenTowerPdf: storage.uploadPdf,
  getGardenTowerPdfDownloadUrl: storage.signedUrl,
}));

import { appRouter } from './routers';

function teamContext(): TrpcContext {
  return {
    user: { openId: 'team-test', email: 'team@example.org', name: 'Team Member', loginMethod: 'password', role: 'user' },
    req: { headers: {} } as TrpcContext['req'],
    res: {} as TrpcContext['res'],
  };
}

function anonymousContext(): TrpcContext {
  return { user: null, req: { headers: {} } as TrpcContext['req'], res: {} as TrpcContext['res'] };
}

describe('USANA routes', () => {
  let persistedProject: Record<string, unknown>;

  beforeEach(() => {
    persistedProject = { contactName: 'Michelle from USANA Foundation' };
    storage.getProject.mockReset().mockImplementation(async () => persistedProject);
    storage.saveProject.mockReset().mockImplementation(async (project: Record<string, unknown>) => {
      persistedProject = { ...project };
      return persistedProject;
    });
    storage.uploadPdf.mockReset().mockResolvedValue({ key: 'usana/garden-tower/trip-1/tower-plan.pdf' });
    storage.signedUrl.mockReset().mockResolvedValue('https://signed.example.org/tower-plan.pdf');
  });

  it('reads, updates, and re-reads the global project through the stable app-level storage module', async () => {
    const caller = appRouter.createCaller(teamContext());
    await expect(caller.usana.get()).resolves.toEqual({ contactName: 'Michelle from USANA Foundation' });
    await expect(caller.usana.update({ contractNumber: 'USANA-12', totalFundsUsd: 40_000, fundsReceived: true, contactName: 'Michelle', contactEmail: 'michelle@example.org' })).resolves.toMatchObject({ contractNumber: 'USANA-12', fundsReceived: true });
    expect(storage.saveProject).toHaveBeenCalledWith(expect.objectContaining({ contractNumber: 'USANA-12', totalFundsUsd: 40_000, fundsReceived: true }));
    await expect(caller.usana.get()).resolves.toMatchObject({ contractNumber: 'USANA-12', contactEmail: 'michelle@example.org' });
  });

  it('passes a decoded document to secured upload storage and returns a controlled download URL', async () => {
    const caller = appRouter.createCaller(teamContext());
    const base64 = Buffer.from('%PDF-1.4').toString('base64');
    await expect(caller.trips.uploadGardenTowerDocument({ tripId: 'trip-1', fileName: 'Garden Tower Plan.pdf', base64 })).resolves.toEqual({ key: 'usana/garden-tower/trip-1/tower-plan.pdf' });
    expect(storage.uploadPdf).toHaveBeenCalledWith('trip-1', 'Garden Tower Plan.pdf', expect.any(Buffer));
    await expect(caller.trips.getGardenTowerDocumentUrl({ key: 'usana/garden-tower/trip-1/tower-plan.pdf' })).resolves.toBe('https://signed.example.org/tower-plan.pdf');
    expect(storage.signedUrl).toHaveBeenCalledWith('usana/garden-tower/trip-1/tower-plan.pdf');
  });

  it('rejects unauthenticated USANA and document operations', async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.usana.get()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(caller.usana.update({ contactName: 'Michelle' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(caller.trips.getGardenTowerDocumentUrl({ key: 'usana/garden-tower/trip-1/plan.pdf' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('rejects an oversized document input before storage is invoked', async () => {
    const caller = appRouter.createCaller(teamContext());
    await expect(caller.trips.uploadGardenTowerDocument({ tripId: 'trip-1', fileName: 'plan.pdf', base64: 'x'.repeat(14_000_001) })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(storage.uploadPdf).not.toHaveBeenCalled();
  });
});
