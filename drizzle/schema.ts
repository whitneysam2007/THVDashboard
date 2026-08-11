import { int, mysqlTable, text, timestamp, varchar, mysqlEnum } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── THV Donor Dashboard Tables ───────────────────────────────────────────────

export const donors = mysqlTable("donors", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }).notNull().default(''),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 64 }),
  address: text("address"),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  type: varchar("type", { length: 32 }).notNull().default('one-time'),
  tier: varchar("tier", { length: 32 }).notNull().default('individual'),
  contractEndDate: varchar("contractEndDate", { length: 10 }),
  recurringAmount: int("recurringAmount"),
  recurringFrequency: varchar("recurringFrequency", { length: 16 }),
  cadenceDays: int("cadenceDays").notNull().default(90),
  cadenceDescription: varchar("cadenceDescription", { length: 255 }).notNull().default(''),
  lastContactDate: varchar("lastContactDate", { length: 10 }),
  status: varchar("status", { length: 16 }).notNull().default('grey'),
  naruCircle: int("naruCircle").notNull().default(0),
  donorTrip: int("donorTrip").notNull().default(0),
  taxReceiptSent: int("taxReceiptSent").notNull().default(0),
  newsletterSubscribed: int("newsletterSubscribed").notNull().default(0),
  manuallyInactive: int("manuallyInactive").notNull().default(0),
  referredBy: varchar("referredBy", { length: 255 }),
  nextAction: text("nextAction"),
  dismissedTasks: text("dismissedTasks"),
  notes: text("notes"),
  tags: text("tags"),
  tripId: varchar("tripId", { length: 36 }),
  totalDonatedCents: int("totalDonatedCents").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const donorActivities = mysqlTable("donor_activities", {
  id: varchar("id", { length: 36 }).primaryKey(),
  donorId: varchar("donorId", { length: 36 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  author: varchar("author", { length: 128 }).notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const donorDonations = mysqlTable("donor_donations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  donorId: varchar("donorId", { length: 36 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  amountCents: int("amountCents").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const donorTasks = mysqlTable("donor_tasks", {
  id: varchar("id", { length: 64 }).primaryKey(),
  donorId: varchar("donorId", { length: 36 }).notNull(),
  kind: varchar("kind", { length: 16 }).notNull().default('onboarding'),
  label: varchar("label", { length: 255 }).notNull(),
  dueDate: varchar("dueDate", { length: 10 }).notNull(),
  completedDate: varchar("completedDate", { length: 10 }),
  completedBy: varchar("completedBy", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const trips = mysqlTable("trips", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  endDate: varchar("endDate", { length: 10 }).notNull(),
  teamMembers: text("teamMembers").notNull().default('[]'),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const tripAttendees = mysqlTable("trip_attendees", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tripId: varchar("tripId", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 64 }),
  skills: text("skills").notNull().default('[]'),
  isTeen: int("isTeen").default(0),
  speaksSpanish: int("speaksSpanish").default(0),
  confirmed: int("confirmed").default(0),
  purchasedTicket: int("purchasedTicket").default(0),
  knowsAtTHV: text("knowsAtTHV"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const initiatives = mysqlTable("initiatives", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  endDate: varchar("endDate", { length: 10 }).notNull(),
  owner: varchar("owner", { length: 128 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default('not-started'),
  category: varchar("category", { length: 128 }).notNull().default(''),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
