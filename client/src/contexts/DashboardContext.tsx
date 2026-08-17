// THV Donor Dashboard — Global State Context
// Data is now persisted to the server database via tRPC.
// The context interface is unchanged so all consumers work without modification.

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { DashboardStore, Donor, Trip, Initiative, ActivityEntry, TaskEntry, DonationEntry } from '@/lib/types';
import { computeDonorStatus } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { nanoid } from 'nanoid';
import { portfolioFromTags, tagsWithoutPortfolio } from '@shared/donorPortfolios';

interface DashboardContextValue {
  store: DashboardStore;
  isLoading: boolean;
  addDonor: (donor: Omit<Donor, 'id' | 'activities' | 'status' | 'donations' | 'completedTasks'> & { donations?: DonationEntry[]; completedTasks?: TaskEntry[] }) => Promise<void>;
  updateDonor: (id: string, updates: Partial<Donor>) => Promise<void>;
  deleteDonor: (id: string) => Promise<void>;
  addActivity: (donorId: string, entry: Omit<ActivityEntry, 'id'>) => Promise<void>;
  addDonation: (donorId: string, entry: { date: string; amount: number; note?: string }) => Promise<void>;
  deleteDonation: (donationId: string, donorId: string) => Promise<void>;
  addTrip: (trip: Omit<Trip, 'id'>) => Promise<void>;
  updateTrip: (id: string, updates: Partial<Trip>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  addInitiative: (initiative: Omit<Initiative, 'id'>) => Promise<void>;
  updateInitiative: (id: string, updates: Partial<Initiative>) => Promise<void>;
  deleteInitiative: (id: string) => Promise<void>;
  currentUser: string | null;
  login: (email: string) => void;
  logout: () => void;
}

const EMPTY_STORE: DashboardStore = { donors: [], trips: [], initiatives: [] };

const DashboardContext = createContext<DashboardContextValue | null>(null);

// Helper: map a raw DB donor row to the Donor type used in the UI
function mapDbDonor(row: Record<string, unknown>): Donor {
  return {
    id: row.id as string,
    name: row.name as string,
    contactName: (row.contactName as string) ?? '',
    email: row.email as string | undefined,
    phone: row.phone as string | undefined,
    address: row.address as string | undefined,
    startDate: row.startDate as string,
    portfolio: portfolioFromTags(row.tags),
    type: (row.type as Donor['type']) ?? 'one-time',
    tier: (row.tier as Donor['tier']) ?? 'individual',
    contractEndDate: row.contractEndDate as string | undefined,
    recurringAmount: row.recurringAmount == null ? undefined : Number(row.recurringAmount),
    recurringFrequency: row.recurringFrequency as Donor['recurringFrequency'],
    cadenceDays: (row.cadenceDays as number) ?? 90,
    cadenceDescription: (row.cadenceDescription as string) ?? '',
    lastContactDate: row.lastContactDate as string | undefined,
    status: (row.status as Donor['status']) ?? 'grey',
    naruCircle: Number(row.naruCircle) === 1,
    donorTrip: Number(row.donorTrip) === 1,
    taxReceiptSent: Number(row.taxReceiptSent) === 1,
    newsletterSubscribed: Number(row.newsletterSubscribed) === 1,
    manuallyInactive: Number(row.manuallyInactive) === 1,
    referredBy: row.referredBy as string | undefined,
    nextAction: row.nextAction as string | undefined,
    dismissedTasks: row.dismissedTasks ? JSON.parse(row.dismissedTasks as string) : [],
    notes: row.notes as string | undefined,
    tags: tagsWithoutPortfolio(row.tags),
    tripId: row.tripId as string | undefined,
    completedTasks: [],
    donations: (row as any).totalDonatedCents > 0 ? [{ id: '__total__', date: '', amount: ((row as any).totalDonatedCents ?? 0) / 100, note: undefined }] : [],
    currentYearDonated: Number((row as any).currentYearDonatedCents ?? 0) / 100,
    nextManualTask: (row as any).nextManualTask ?? undefined,
    activities: [],
  };
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { user, logout: authLogout } = useAuth();
  const utils = trpc.useUtils();

  // tRPC queries
  const donorsQuery = trpc.donors.list.useQuery(undefined, { enabled: !!user });
  const tripsQuery = trpc.trips.list.useQuery(undefined, { enabled: !!user });
  const initiativesQuery = trpc.initiatives.list.useQuery(undefined, { enabled: !!user });

  // tRPC mutations — donors
  const createDonorMut = trpc.donors.create.useMutation({ onSuccess: () => utils.donors.list.invalidate() });
  const updateDonorMut = trpc.donors.update.useMutation({
    onMutate: async ({ id, data }) => {
      // Optimistically update the donors list cache so UI reflects immediately
      await utils.donors.list.cancel();
      const prev = utils.donors.list.getData();
      // Convert int flags back to booleans for the cache (mapDbDonor uses Number()===1)
      const mappedData: Record<string, unknown> = { ...data };
      const boolFlags = ['naruCircle','donorTrip','taxReceiptSent','newsletterSubscribed','manuallyInactive'] as const;
      for (const flag of boolFlags) {
        if (flag in mappedData) mappedData[flag] = Number(mappedData[flag]) === 1;
      }
      utils.donors.list.setData(undefined, (old: any) => {
        if (!old) return old;
        return old.map((d: any) => d.id === id ? { ...d, ...mappedData } : d);
      });
      return { prev };
    },
    onError: (_err: any, _vars: any, ctx: any) => {
      if (ctx?.prev) utils.donors.list.setData(undefined, ctx.prev);
    },
    onSettled: () => utils.donors.list.invalidate(),
  });
  const deleteDonorMut = trpc.donors.delete.useMutation({ onSuccess: () => utils.donors.list.invalidate() });
  const addActivityMut = trpc.donors.addActivity.useMutation({ onSuccess: () => utils.donors.list.invalidate() });
  const addDonationMut = trpc.donors.addDonation.useMutation();
  const deleteDonationMut = trpc.donors.deleteDonation.useMutation();
  const upsertTaskMut = trpc.donors.upsertTask.useMutation({
    onSuccess: (_data: any, variables: any) => {
      utils.donors.getWithDetails.invalidate({ id: variables.donorId });
      utils.donors.list.invalidate();
    },
  });
  const deleteTaskMut = trpc.donors.deleteTask.useMutation();

  // tRPC mutations — trips
  const createTripMut = trpc.trips.create.useMutation({ onSuccess: () => utils.trips.list.invalidate() });
  const updateTripMut = trpc.trips.update.useMutation({ onSuccess: () => utils.trips.list.invalidate() });
  const deleteTripMut = trpc.trips.delete.useMutation({ onSuccess: () => utils.trips.list.invalidate() });

  // tRPC mutations — initiatives
  const createInitMut = trpc.initiatives.create.useMutation({ onSuccess: () => utils.initiatives.list.invalidate() });
  const updateInitMut = trpc.initiatives.update.useMutation({ onSuccess: () => utils.initiatives.list.invalidate() });
  const deleteInitMut = trpc.initiatives.delete.useMutation({ onSuccess: () => utils.initiatives.list.invalidate() });

  // Build the store from query data
  const donors: Donor[] = (donorsQuery.data ?? []).map((row: unknown) => {
    const d = mapDbDonor(row as Record<string, unknown>);
    d.status = computeDonorStatus(d);
    return d;
  });

  const trips: Trip[] = (tripsQuery.data ?? []).map(t => ({
    id: t.id,
    name: t.name,
    startDate: t.startDate,
    endDate: t.endDate,
    teamMembers: Array.isArray(t.teamMembers) ? t.teamMembers : [],
    donorAttendees: donors.filter(d => (d as any).tripId === t.id).map(d => d.id),
    attendees: (t.attendees ?? []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      name: a.name as string,
      email: a.email as string | undefined,
      phone: a.phone as string | undefined,
      skills: Array.isArray(a.skills) ? a.skills : [],
      isTeen: Number(a.isTeen) === 1,
      speaksSpanish: Number(a.speaksSpanish) === 1,
      confirmed: Number(a.confirmed) === 1,
      purchasedTicket: Number(a.purchasedTicket) === 1,
      knowsAtTHV: a.knowsAtTHV ? JSON.parse(a.knowsAtTHV as string) : [],
      notes: a.notes as string | undefined,
    })),
    notes: t.notes ?? undefined,
  }));

  const initiatives: Initiative[] = (initiativesQuery.data ?? []).map((i: any) => ({
    id: i.id,
    title: i.title,
    description: i.description ?? undefined,
    startDate: i.startDate,
    endDate: i.endDate,
    owner: i.owner,
    status: i.status as Initiative['status'],
    category: i.category,
  }));

  const store: DashboardStore = { donors, trips, initiatives };
  const isLoading = donorsQuery.isLoading || tripsQuery.isLoading || initiativesQuery.isLoading;

  // ─── Donor operations ─────────────────────────────────────────────────────

  const addDonor = useCallback(async (donor: Omit<Donor, 'id' | 'activities' | 'status' | 'donations' | 'completedTasks'> & { donations?: DonationEntry[]; completedTasks?: TaskEntry[] }) => {
    const { donations, completedTasks, dismissedTasks, tags, tripId, ...rest } = donor as any;
    await createDonorMut.mutateAsync({
      name: rest.name,
      contactName: rest.contactName ?? '',
      email: rest.email,
      phone: rest.phone,
      address: rest.address,
      startDate: rest.startDate,
      portfolio: rest.portfolio ?? 'major',
      type: rest.type ?? 'one-time',
      tier: rest.tier ?? 'individual',
      contractEndDate: rest.contractEndDate,
      recurringAmount: rest.recurringAmount,
      recurringFrequency: rest.recurringFrequency,
      cadenceDays: rest.cadenceDays ?? 90,
      cadenceDescription: rest.cadenceDescription ?? '',
      referredBy: rest.referredBy,
      notes: rest.notes,
    });
  }, [createDonorMut]);

  const updateDonor = useCallback(async (id: string, updates: Partial<Donor>) => {
    // Convert boolean flags to int for DB, handle JSON fields
    const dbData: Record<string, unknown> = { ...updates };
    if ('naruCircle' in dbData) dbData.naruCircle = updates.naruCircle ? 1 : 0;
    if ('donorTrip' in dbData) dbData.donorTrip = updates.donorTrip ? 1 : 0;
    if ('taxReceiptSent' in dbData) dbData.taxReceiptSent = updates.taxReceiptSent ? 1 : 0;
    if ('newsletterSubscribed' in dbData) dbData.newsletterSubscribed = updates.newsletterSubscribed ? 1 : 0;
    if ('manuallyInactive' in dbData) dbData.manuallyInactive = updates.manuallyInactive ? 1 : 0;
    if ('dismissedTasks' in dbData) dbData.dismissedTasks = JSON.stringify(updates.dismissedTasks ?? []);
    if ('tags' in dbData) dbData.tags = JSON.stringify(updates.tags ?? []);
    // Remove fields that are stored in separate tables
    delete dbData.activities;
    delete dbData.donations;
    delete dbData.completedTasks;
    delete dbData.status; // recomputed on load

    // Handle task upserts from completedTasks updates
    if (updates.completedTasks !== undefined) {
      const existing = donors.find(d => d.id === id);
      const existingIds = new Set((existing?.completedTasks ?? []).map(t => t.id));
      for (const task of updates.completedTasks) {
        await upsertTaskMut.mutateAsync({
          id: task.id,
          donorId: id,
          kind: task.kind,
          label: task.label,
          dueDate: task.dueDate,
          completedDate: task.completedDate,
          completedBy: task.completedBy,
        });
      }
    }

    if (Object.keys(dbData).length > 0) {
      await updateDonorMut.mutateAsync({ id, data: dbData });
    }
    // Invalidate both list and detail queries so UI refreshes everywhere
    utils.donors.list.invalidate();
    utils.donors.getWithDetails.invalidate({ id });
  }, [updateDonorMut, upsertTaskMut, donors, utils]);

  const deleteDonor = useCallback(async (id: string) => {
    await deleteDonorMut.mutateAsync({ id });
  }, [deleteDonorMut]);

  const addActivity = useCallback(async (donorId: string, entry: Omit<ActivityEntry, 'id'>) => {
    await addActivityMut.mutateAsync({ donorId, date: entry.date, author: entry.author, note: entry.note });
    utils.donors.list.invalidate();
    utils.donors.getWithDetails.invalidate({ id: donorId });
  }, [addActivityMut, utils]);

  // ─── Trip operations ──────────────────────────────────────────────────────

  const addTrip = useCallback(async (trip: Omit<Trip, 'id'>) => {
    await createTripMut.mutateAsync({
      name: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      teamMembers: trip.teamMembers,
      notes: trip.notes,
    });
  }, [createTripMut]);

  const updateTrip = useCallback(async (id: string, updates: Partial<Trip>) => {
    await updateTripMut.mutateAsync({
      id,
      name: updates.name,
      startDate: updates.startDate,
      endDate: updates.endDate,
      teamMembers: updates.teamMembers,
      notes: updates.notes,
    });
  }, [updateTripMut]);

  const deleteTrip = useCallback(async (id: string) => {
    await deleteTripMut.mutateAsync({ id });
  }, [deleteTripMut]);

  // ─── Initiative operations ────────────────────────────────────────────────

  const addInitiative = useCallback(async (initiative: Omit<Initiative, 'id'>) => {
    await createInitMut.mutateAsync({
      title: initiative.title,
      description: initiative.description,
      startDate: initiative.startDate,
      endDate: initiative.endDate,
      owner: initiative.owner,
      status: initiative.status,
      category: initiative.category,
    });
  }, [createInitMut]);

  const updateInitiative = useCallback(async (id: string, updates: Partial<Initiative>) => {
    await updateInitMut.mutateAsync({ id, ...updates });
  }, [updateInitMut]);

  const deleteInitiative = useCallback(async (id: string) => {
    await deleteInitMut.mutateAsync({ id });
  }, [deleteInitMut]);

  // ─── Auth ─────────────────────────────────────────────────────────────────
  // currentUser is derived from Manus OAuth; login/logout are stubs for compatibility
  const currentUser = user?.email ?? user?.name ?? null;
  const login = useCallback((_email: string) => { /* handled by Manus OAuth */ }, []);
  const logout = useCallback(() => { authLogout(); }, [authLogout]);

  const addDonation = useCallback(async (donorId: string, entry: { date: string; amount: number; note?: string }) => {
    await addDonationMut.mutateAsync({
      donorId,
      date: entry.date,
      amountCents: Math.round(entry.amount * 100),
      note: entry.note,
    });
    utils.donors.list.invalidate();
    utils.donors.getWithDetails.invalidate({ id: donorId });
  }, [addDonationMut, utils]);

  const deleteDonation = useCallback(async (donationId: string, donorId: string) => {
    await deleteDonationMut.mutateAsync({ id: donationId, donorId });
    utils.donors.list.invalidate();
  }, [deleteDonationMut, utils]);

  return (
    <DashboardContext.Provider value={{
      store, isLoading,
      addDonor, updateDonor, deleteDonor, addActivity, addDonation, deleteDonation,
      addTrip, updateTrip, deleteTrip,
      addInitiative, updateInitiative, deleteInitiative,
      currentUser, login, logout,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
