import type { InsertUser } from '../drizzle/schema';
import { nextOutstandingManualTask } from '../shared/manualTasks';
import { taskRowId, taskSlugFromRowId } from '../shared/taskKeys';
import { getSupabaseServerClient } from './supabase';

type InsertRow = Record<string, unknown>;
const db = () => getSupabaseServerClient() as any;

const clean = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as T;

const assertSuccess = (result: { error?: { message: string } | null }) => {
  if (result.error) throw new Error(result.error.message);
  return result;
};

export async function getDb() {
  return db();
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error('User openId is required for upsert');
  const values = clean({
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role: user.role ?? 'user',
    lastSignedIn: user.lastSignedIn ?? new Date().toISOString(),
  });
  assertSuccess(await db().from('users').upsert(values, { onConflict: 'openId' }));
}

export async function getUserByOpenId(openId: string) {
  const result = await db().from('users').select('*').eq('openId', openId).maybeSingle();
  assertSuccess(result);
  return result.data ?? undefined;
}

export async function getAllDonors() {
  const [donorResult, donationResult, taskResult] = await Promise.all([
    db().from('donors').select('*').order('createdAt', { ascending: false }),
    db().from('donor_donations').select('donorId,date,amountCents'),
    db().from('donor_tasks').select('id,donorId,label,dueDate,completedDate,kind'),
  ]);
  assertSuccess(donorResult); assertSuccess(donationResult); assertSuccess(taskResult);

  const currentYear = new Date().getFullYear();
  const totalsByDonor = new Map<string, number>();
  for (const donation of donationResult.data ?? []) {
    if (String(donation.date).startsWith(`${currentYear}-`)) {
      totalsByDonor.set(donation.donorId, (totalsByDonor.get(donation.donorId) ?? 0) + Number(donation.amountCents ?? 0));
    }
  }
  const tasksByDonor = new Map<string, any[]>();
  for (const task of taskResult.data ?? []) {
    const tasks = tasksByDonor.get(task.donorId) ?? [];
    tasks.push(task);
    tasksByDonor.set(task.donorId, tasks);
  }
  return (donorResult.data ?? []).map((donor: any) => ({
    ...donor,
    currentYearDonatedCents: totalsByDonor.get(donor.id) ?? 0,
    nextManualTask: nextOutstandingManualTask(tasksByDonor.get(donor.id) ?? []),
  }));
}

export async function getDonorById(id: string) {
  const result = await db().from('donors').select('*').eq('id', id).maybeSingle();
  assertSuccess(result);
  return result.data ?? null;
}

export async function insertDonor(data: InsertRow) {
  assertSuccess(await db().from('donors').insert(clean(data)));
}

export async function updateDonorById(id: string, data: InsertRow) {
  assertSuccess(await db().from('donors').update(clean(data)).eq('id', id));
}

export async function deleteDonorById(id: string) {
  assertSuccess(await db().from('donors').delete().eq('id', id));
}

export async function getActivitiesForDonor(donorId: string) {
  const result = await db().from('donor_activities').select('*').eq('donorId', donorId).order('date', { ascending: false });
  assertSuccess(result);
  return result.data ?? [];
}

export async function insertActivity(data: InsertRow) {
  assertSuccess(await db().from('donor_activities').insert(clean(data)));
}

export async function updateActivity(id: string, data: InsertRow) {
  assertSuccess(await db().from('donor_activities').update(clean(data)).eq('id', id));
}

export async function deleteActivity(id: string) {
  assertSuccess(await db().from('donor_activities').delete().eq('id', id));
}

export async function recalculateLastContactDate(donorId: string) {
  const result = await db().from('donor_activities').select('date').eq('donorId', donorId).order('date', { ascending: false }).limit(1);
  assertSuccess(result);
  const latest = result.data?.[0]?.date ?? null;
  await updateDonorById(donorId, { lastContactDate: latest });
}

export async function getDonationsForDonor(donorId: string) {
  const result = await db().from('donor_donations').select('*').eq('donorId', donorId).order('date', { ascending: false });
  assertSuccess(result);
  return result.data ?? [];
}

export async function recalculateDonorTotal(donorId: string) {
  const result = await db().from('donor_donations').select('amountCents').eq('donorId', donorId);
  assertSuccess(result);
  const total = (result.data ?? []).reduce((sum: number, donation: any) => sum + Number(donation.amountCents ?? 0), 0);
  await updateDonorById(donorId, { totalDonatedCents: total });
}

export async function insertDonation(data: InsertRow) {
  assertSuccess(await db().from('donor_donations').insert(clean(data)));
}

export async function deleteDonation(id: string) {
  assertSuccess(await db().from('donor_donations').delete().eq('id', id));
}

export async function getTasksForDonor(donorId: string) {
  const result = await db().from('donor_tasks').select('*').eq('donorId', donorId);
  assertSuccess(result);
  return (result.data ?? []).map((task: any) => ({ ...task, id: taskSlugFromRowId(donorId, task.id) }));
}

export async function upsertTask(data: InsertRow) {
  const row = { ...data, id: taskRowId(String(data.donorId), String(data.id)) };
  assertSuccess(await db().from('donor_tasks').upsert(clean(row), { onConflict: 'id' }));
}

export async function deleteTask(id: string, donorId?: string) {
  const rowId = donorId ? taskRowId(donorId, id) : id;
  assertSuccess(await db().from('donor_tasks').delete().eq('id', rowId));
}

export async function getAllTasks() {
  const result = await db().from('donor_tasks').select('id,donorId,kind,label,dueDate,completedDate,completedBy,donors(name)');
  assertSuccess(result);
  return (result.data ?? []).map((task: any) => ({
    ...task,
    id: taskSlugFromRowId(task.donorId, task.id),
    donorName: task.donors?.name ?? '',
    donors: undefined,
  }));
}

export async function getAllTrips() {
  const result = await db().from('trips').select('*').order('startDate', { ascending: false });
  assertSuccess(result);
  return result.data ?? [];
}

export async function insertTrip(data: InsertRow) {
  assertSuccess(await db().from('trips').insert(clean(data)));
}

export async function updateTripById(id: string, data: InsertRow) {
  assertSuccess(await db().from('trips').update(clean(data)).eq('id', id));
}

export async function deleteTripById(id: string) {
  assertSuccess(await db().from('trips').delete().eq('id', id));
}

export async function getAttendeesForTrip(tripId: string) {
  const result = await db().from('trip_attendees').select('*').eq('tripId', tripId);
  assertSuccess(result);
  return result.data ?? [];
}

export async function insertTripAttendee(data: InsertRow) {
  assertSuccess(await db().from('trip_attendees').insert(clean(data)));
}

export async function updateTripAttendee(id: string, data: InsertRow) {
  assertSuccess(await db().from('trip_attendees').update(clean(data)).eq('id', id));
}

export async function deleteTripAttendee(id: string) {
  assertSuccess(await db().from('trip_attendees').delete().eq('id', id));
}

export async function getAllInitiatives() {
  const result = await db().from('initiatives').select('*').order('startDate', { ascending: true });
  assertSuccess(result);
  return result.data ?? [];
}

export async function insertInitiative(data: InsertRow) {
  assertSuccess(await db().from('initiatives').insert(clean(data)));
}

export async function updateInitiativeById(id: string, data: InsertRow) {
  assertSuccess(await db().from('initiatives').update(clean(data)).eq('id', id));
}

export async function deleteInitiativeById(id: string) {
  assertSuccess(await db().from('initiatives').delete().eq('id', id));
}
