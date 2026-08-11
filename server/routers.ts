import { z } from "zod";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getSupabaseServerClient } from "./supabase";
import { canManageTeamMember, displayNameFromEmail, normalizeTeamEmail, type TeamRole } from "./accessControl";
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

type TeamAccessRow = {
  email: string;
  display_name: string;
  role: TeamRole;
  is_active: boolean;
  created_at: string;
  invited_at: string | null;
  updated_at: string;
};

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
  }),

  teamAccess: router({
    list: adminProcedure.query(async () => {
      const supabase = getSupabaseServerClient();
      const [allowedResult, authResult] = await Promise.all([
        (supabase.from('allowed_team_emails') as any).select('email, display_name, role, is_active, created_at, invited_at, updated_at').order('created_at'),
        supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);
      if (allowedResult.error) throw new Error(allowedResult.error.message);
      if (authResult.error) throw new Error(authResult.error.message);
      const authByEmail = new Map(
        (authResult.data.users ?? [])
          .filter(user => Boolean(user.email))
          .map(user => [normalizeTeamEmail(user.email!), user]),
      );
      return ((allowedResult.data ?? []) as TeamAccessRow[]).map(row => {
        const authUser = authByEmail.get(normalizeTeamEmail(row.email));
        return {
          email: row.email,
          displayName: row.display_name,
          role: row.role as TeamRole,
          isActive: row.is_active,
          createdAt: row.created_at,
          invitedAt: row.invited_at,
          updatedAt: row.updated_at,
          enrolled: Boolean(authUser?.email_confirmed_at),
          lastSignInAt: authUser?.last_sign_in_at ?? null,
        };
      });
    }),

    createAccount: adminProcedure.input(z.object({
      email: z.string().email(),
      displayName: z.string().trim().min(1).max(100).optional(),
      password: z.string().min(14, 'Use a password with at least 14 characters.').max(128),
    })).mutation(async ({ ctx, input }) => {
      const email = normalizeTeamEmail(input.email);
      const supabase = getSupabaseServerClient();
      const displayName = input.displayName || displayNameFromEmail(email);
      const { data: existingAuth, error: existingAuthError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (existingAuthError) throw new Error(existingAuthError.message);
      const existingUser = (existingAuth.users ?? []).find(user => normalizeTeamEmail(user.email ?? '') === email);
      const { error: allowlistError } = await (supabase
        .from('allowed_team_emails') as any)
        .upsert({ email, display_name: displayName, role: 'member', is_active: true, invited_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'email' });
      if (allowlistError) throw new Error(allowlistError.message);

      if (existingUser) {
        const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
          password: input.password,
          email_confirm: true,
          user_metadata: { ...existingUser.user_metadata, full_name: displayName },
        });
        if (error) throw new Error(error.message);
        return { status: 'updated' as const, email };
      }

      const { error } = await supabase.auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: true,
        user_metadata: { full_name: displayName },
      });
      if (error) throw new Error(error.message);
      return { status: 'created' as const, email };
    }),

    setPassword: adminProcedure.input(z.object({
      email: z.string().email(),
      password: z.string().min(14, 'Use a password with at least 14 characters.').max(128),
    })).mutation(async ({ input }) => {
      const email = normalizeTeamEmail(input.email);
      const supabase = getSupabaseServerClient();
      const { data, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) throw new Error(listError.message);
      const member = (data.users ?? []).find(user => normalizeTeamEmail(user.email ?? '') === email);
      if (!member) throw new Error('Create this approved member account before setting a password.');
      const { error } = await supabase.auth.admin.updateUserById(member.id, { password: input.password, email_confirm: true });
      if (error) throw new Error(error.message);
      return { success: true } as const;
    }),

    update: adminProcedure.input(z.object({
      email: z.string().email(),
      displayName: z.string().trim().min(1).max(100).optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      const email = normalizeTeamEmail(input.email);
      if (input.isActive === false && !canManageTeamMember(ctx.user.email ?? '', email)) {
        throw new Error('You cannot deactivate your own owner access.');
      }
      const data: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.displayName !== undefined) data.display_name = input.displayName;
      if (input.isActive !== undefined) data.is_active = input.isActive;
      const { error } = await (getSupabaseServerClient().from('allowed_team_emails') as any).update(data).eq('email', email);
      if (error) throw new Error(error.message);
      return { success: true } as const;
    }),

    remove: adminProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ ctx, input }) => {
      const email = normalizeTeamEmail(input.email);
      if (!canManageTeamMember(ctx.user.email ?? '', email)) {
        throw new Error('You cannot remove your own owner access.');
      }
      const { error } = await (getSupabaseServerClient().from('allowed_team_emails') as any).delete().eq('email', email);
      if (error) throw new Error(error.message);
      return { success: true } as const;
    }),
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
