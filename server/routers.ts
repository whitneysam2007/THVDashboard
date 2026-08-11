import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getAllDonors, getDonorById, insertDonor, updateDonorById, deleteDonorById,
  getActivitiesForDonor, insertActivity, updateActivity, deleteActivity,
  getDonationsForDonor, insertDonation, deleteDonation, recalculateDonorTotal,
  getTasksForDonor, upsertTask, deleteTask, getAllTasks,
  getAllTrips, insertTrip, updateTripById, deleteTripById,
  getAttendeesForTrip, insertTripAttendee, updateTripAttendee, deleteTripAttendee,
  getAllInitiatives, insertInitiative, updateInitiativeById, deleteInitiativeById, recalculateLastContactDate,
} from "./db";
import { nanoid } from "nanoid";

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
  }),

  donors: router({
    list: protectedProcedure.query(async () => getAllDonors()),

    create: protectedProcedure.input(z.object({
      name: z.string(),
      contactName: z.string().default(''),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      startDate: z.string(),
      type: z.string().default('one-time'),
      tier: z.string().default('individual'),
      contractEndDate: z.string().optional(),
      recurringAmount: z.number().optional(),
      recurringFrequency: z.string().optional(),
      cadenceDays: z.number().default(90),
      cadenceDescription: z.string().default(''),
      referredBy: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const id = nanoid();
      await insertDonor({ ...input, id, status: 'grey' });
      return { id };
    }),

    update: protectedProcedure.input(z.object({
      id: z.string(),
      data: z.record(z.string(), z.unknown()),
    })).mutation(async ({ input }) => {
      await updateDonorById(input.id, input.data as any);
      return { success: true };
    }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await deleteDonorById(input.id);
      return { success: true };
    }),

    getWithDetails: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
      const [donor, activities, donations, tasks] = await Promise.all([
        getDonorById(input.id),
        getActivitiesForDonor(input.id),
        getDonationsForDonor(input.id),
        getTasksForDonor(input.id),
      ]);
      if (!donor) return null;
      return { donor, activities, donations, tasks };
    }),

    addActivity: protectedProcedure.input(z.object({
      donorId: z.string(),
      date: z.string(),
      author: z.string(),
      note: z.string(),
    })).mutation(async ({ input }) => {
      const id = nanoid();
      await insertActivity({ ...input, id });
      await recalculateLastContactDate(input.donorId);
      return { id };
    }),

    updateActivity: protectedProcedure.input(z.object({
      id: z.string(),
      note: z.string().optional(),
      date: z.string().optional(),
      author: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateActivity(id, data);
      return { success: true };
    }),

    deleteActivity: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await deleteActivity(input.id);
      return { success: true };
    }),

    addDonation: protectedProcedure.input(z.object({
      donorId: z.string(),
      date: z.string(),
      amountCents: z.number(),
      note: z.string().optional(),
    })).mutation(async ({ input }) => {
      const id = nanoid();
      await insertDonation({ ...input, id });
      // Keep the donor-list lifetime total in sync with every new gift.
      await recalculateDonorTotal(input.donorId);
      return { id };
    }),

    deleteDonation: protectedProcedure.input(z.object({ id: z.string(), donorId: z.string() })).mutation(async ({ input }) => {
      await deleteDonation(input.id);
      await recalculateDonorTotal(input.donorId);
      return { success: true };
    }),

    upsertTask: protectedProcedure.input(z.object({
      id: z.string(),
      donorId: z.string(),
      kind: z.string(),
      label: z.string(),
      dueDate: z.string(),
      completedDate: z.string().optional(),
      completedBy: z.string().optional(),
    })).mutation(async ({ input }) => {
      await upsertTask(input);
      return { success: true };
    }),

    deleteTask: protectedProcedure.input(z.object({ id: z.string(), donorId: z.string().optional() })).mutation(async ({ input }) => {
      await deleteTask(input.id, input.donorId);
      return { success: true };
    }),

    allTasks: protectedProcedure.query(async () => {
      return getAllTasks();
    }),
  }),

  trips: router({
    list: protectedProcedure.query(async () => {
      const allTrips = await getAllTrips();
      return Promise.all(allTrips.map(async (t: any) => ({
        ...t,
        teamMembers: JSON.parse(t.teamMembers || '[]') as string[],
        attendees: (await getAttendeesForTrip(t.id)).map((a: any) => ({
          ...a,
          skills: JSON.parse(a.skills || '[]') as string[],
        })),
      })));
    }),

    create: protectedProcedure.input(z.object({
      name: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      teamMembers: z.array(z.string()).default([]),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const id = nanoid();
      await insertTrip({ ...input, id, teamMembers: JSON.stringify(input.teamMembers) });
      return { id };
    }),

    update: protectedProcedure.input(z.object({
      id: z.string(),
      name: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      teamMembers: z.array(z.string()).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, teamMembers, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (teamMembers !== undefined) data.teamMembers = JSON.stringify(teamMembers);
      await updateTripById(id, data as any);
      return { success: true };
    }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await deleteTripById(input.id);
      return { success: true };
    }),

    addAttendee: protectedProcedure.input(z.object({
      tripId: z.string(),
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      skills: z.array(z.string()).default([]),
      isTeen: z.boolean().optional(),
      speaksSpanish: z.boolean().optional(),
      confirmed: z.boolean().optional(),
      purchasedTicket: z.boolean().optional(),
      knowsAtTHV: z.array(z.string()).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const id = nanoid();
      const { knowsAtTHV, isTeen, speaksSpanish, confirmed, purchasedTicket, ...rest } = input;
      await insertTripAttendee({
        ...rest,
        id,
        skills: JSON.stringify(rest.skills),
        isTeen: isTeen ? 1 : 0,
        speaksSpanish: speaksSpanish ? 1 : 0,
        confirmed: confirmed ? 1 : 0,
        purchasedTicket: purchasedTicket ? 1 : 0,
        knowsAtTHV: knowsAtTHV ? JSON.stringify(knowsAtTHV) : null,
      });
      return { id };
    }),

    updateAttendee: protectedProcedure.input(z.object({
      id: z.string(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      skills: z.array(z.string()).optional(),
      isTeen: z.boolean().optional(),
      speaksSpanish: z.boolean().optional(),
      confirmed: z.boolean().optional(),
      purchasedTicket: z.boolean().optional(),
      knowsAtTHV: z.array(z.string()).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, knowsAtTHV, isTeen, speaksSpanish, confirmed, purchasedTicket, skills, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (skills !== undefined) data.skills = JSON.stringify(skills);
      if (isTeen !== undefined) data.isTeen = isTeen ? 1 : 0;
      if (speaksSpanish !== undefined) data.speaksSpanish = speaksSpanish ? 1 : 0;
      if (confirmed !== undefined) data.confirmed = confirmed ? 1 : 0;
      if (purchasedTicket !== undefined) data.purchasedTicket = purchasedTicket ? 1 : 0;
      if (knowsAtTHV !== undefined) data.knowsAtTHV = JSON.stringify(knowsAtTHV);
      await updateTripAttendee(id, data as any);
      return { success: true };
    }),
    deleteAttendee: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await deleteTripAttendee(input.id);
      return { success: true };
    }),
  }),

  initiatives: router({
    list: protectedProcedure.query(async () => getAllInitiatives()),

    create: protectedProcedure.input(z.object({
      title: z.string(),
      description: z.string().optional(),
      startDate: z.string(),
      endDate: z.string(),
      owner: z.string(),
      status: z.string().default('not-started'),
      category: z.string().default(''),
    })).mutation(async ({ input }) => {
      const id = nanoid();
      await insertInitiative({ ...input, id });
      return { id };
    }),

    update: protectedProcedure.input(z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      owner: z.string().optional(),
      status: z.string().optional(),
      category: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateInitiativeById(id, data as any);
      return { success: true };
    }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      await deleteInitiativeById(input.id);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
