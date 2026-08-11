import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  donors, donorActivities, donorDonations, donorTasks,
  trips, tripAttendees, initiatives,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { taskRowId, taskSlugFromRowId } from '../shared/taskKeys';
import { nextOutstandingManualTask } from '../shared/manualTasks';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Donors ───────────────────────────────────────────────────────────────────

export async function getAllDonors() {
  const db = await getDb();
  if (!db) return [];
  const [donorRows, donationRows, taskRows] = await Promise.all([
    db.select().from(donors).orderBy(desc(donors.createdAt)),
    db.select({ donorId: donorDonations.donorId, date: donorDonations.date, amountCents: donorDonations.amountCents }).from(donorDonations),
    db.select({ id: donorTasks.id, donorId: donorTasks.donorId, label: donorTasks.label, dueDate: donorTasks.dueDate, completedDate: donorTasks.completedDate }).from(donorTasks),
  ]);

  // The dashboard list intentionally avoids returning every donation record. It
  // does, however, need an exact amount for the current calendar-year summary.
  const currentYear = new Date().getFullYear();
  const yearPrefix = `${currentYear}-`;
  const totalsByDonor = new Map<string, number>();
  for (const donation of donationRows) {
    if (donation.date.startsWith(yearPrefix)) {
      totalsByDonor.set(
        donation.donorId,
        (totalsByDonor.get(donation.donorId) ?? 0) + Number(donation.amountCents ?? 0),
      );
    }
  }

  const manualTasksByDonor = new Map<string, typeof taskRows>();
  for (const task of taskRows) {
    const donorTasks = manualTasksByDonor.get(task.donorId) ?? [];
    donorTasks.push(task);
    manualTasksByDonor.set(task.donorId, donorTasks);
  }

  return donorRows.map(donor => ({
    ...donor,
    currentYearDonatedCents: totalsByDonor.get(donor.id) ?? 0,
    nextManualTask: nextOutstandingManualTask(manualTasksByDonor.get(donor.id) ?? []),
  }));
}

export async function getDonorById(id: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(donors).where(eq(donors.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function insertDonor(data: typeof donors.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(donors).values(data);
}

export async function updateDonorById(id: string, data: Partial<typeof donors.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(donors).set(data).where(eq(donors.id, id));
}

export async function deleteDonorById(id: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(donorActivities).where(eq(donorActivities.donorId, id));
  await db.delete(donorDonations).where(eq(donorDonations.donorId, id));
  await db.delete(donorTasks).where(eq(donorTasks.donorId, id));
  await db.delete(donors).where(eq(donors.id, id));
}

// ─── Activities ───────────────────────────────────────────────────────────────

export async function getActivitiesForDonor(donorId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(donorActivities).where(eq(donorActivities.donorId, donorId)).orderBy(desc(donorActivities.date));
}

export async function insertActivity(data: typeof donorActivities.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(donorActivities).values(data);
}

export async function updateActivity(id: string, data: { note?: string; date?: string; author?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(donorActivities).set(data).where(eq(donorActivities.id, id));
}

export async function deleteActivity(id: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(donorActivities).where(eq(donorActivities.id, id));
}

// ─── Donations ────────────────────────────────────────────────────────────────

export async function getDonationsForDonor(donorId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(donorDonations).where(eq(donorDonations.donorId, donorId)).orderBy(desc(donorDonations.date));
}

export async function recalculateDonorTotal(donorId: string) {
  const db = await getDb();
  if (!db) return;
  const rows = await db.select().from(donorDonations).where(eq(donorDonations.donorId, donorId));
  const total = rows.reduce((sum, r) => sum + (r.amountCents ?? 0), 0);
  await db.update(donors).set({ totalDonatedCents: total } as any).where(eq(donors.id, donorId));
}

export async function insertDonation(data: typeof donorDonations.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(donorDonations).values(data);
}

export async function deleteDonation(id: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(donorDonations).where(eq(donorDonations.id, id));
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function getTasksForDonor(donorId: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(donorTasks).where(eq(donorTasks.donorId, donorId));
  // Expose the bare slug to the client so it matches generateAutoTasks() ids,
  // while the DB keeps the donor-scoped primary key.
  return rows.map(r => ({ ...r, id: taskSlugFromRowId(donorId, r.id) }));
}

export async function upsertTask(data: typeof donorTasks.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Scope the primary key by donor so two donors can independently complete the
  // same auto-generated task without overwriting each other's row.
  const row = { ...data, id: taskRowId(data.donorId, data.id) };
  await db.insert(donorTasks).values(row).onDuplicateKeyUpdate({
    set: {
      donorId: row.donorId,
      label: row.label,
      dueDate: row.dueDate,
      completedDate: row.completedDate ?? null,
      completedBy: row.completedBy ?? null,
    },
  });
}

export async function deleteTask(id: string, donorId?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Accept either a bare slug (when donorId is supplied) or an already-scoped key.
  const rowId = donorId ? taskRowId(donorId, id) : id;
  await db.delete(donorTasks).where(eq(donorTasks.id, rowId));
}

export async function getAllTasks() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: donorTasks.id,
      donorId: donorTasks.donorId,
      kind: donorTasks.kind,
      label: donorTasks.label,
      dueDate: donorTasks.dueDate,
      completedDate: donorTasks.completedDate,
      completedBy: donorTasks.completedBy,
      donorName: donors.name,
    })
    .from(donorTasks)
    .leftJoin(donors, eq(donorTasks.donorId, donors.id))
    .orderBy(donorTasks.dueDate);
  // Return the bare slug so the client can match against generateAutoTasks() ids.
  return rows.map(r => ({ ...r, id: taskSlugFromRowId(r.donorId, r.id) }));
}

// ─── Trips ────────────────────────────────────────────────────────────────────

export async function getAllTrips() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trips).orderBy(desc(trips.startDate));
}

export async function insertTrip(data: typeof trips.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(trips).values(data);
}

export async function updateTripById(id: string, data: Partial<typeof trips.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(trips).set(data).where(eq(trips.id, id));
}

export async function deleteTripById(id: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(tripAttendees).where(eq(tripAttendees.tripId, id));
  await db.delete(trips).where(eq(trips.id, id));
}

export async function getAttendeesForTrip(tripId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tripAttendees).where(eq(tripAttendees.tripId, tripId));
}

export async function insertTripAttendee(data: typeof tripAttendees.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(tripAttendees).values(data);
}

export async function updateTripAttendee(id: string, data: Partial<typeof tripAttendees.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tripAttendees).set(data).where(eq(tripAttendees.id, id));
}

export async function deleteTripAttendee(id: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(tripAttendees).where(eq(tripAttendees.id, id));
}

// ─── Initiatives ──────────────────────────────────────────────────────────────

export async function getAllInitiatives() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(initiatives).orderBy(initiatives.startDate);
}

export async function insertInitiative(data: typeof initiatives.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(initiatives).values(data);
}

export async function updateInitiativeById(id: string, data: Partial<typeof initiatives.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(initiatives).set(data).where(eq(initiatives.id, id));
}

export async function deleteInitiativeById(id: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(initiatives).where(eq(initiatives.id, id));
}
