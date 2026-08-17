// THV Donor Dashboard — Core Data Types

export type DonorStatus = 'green' | 'yellow' | 'orange' | 'grey';
export type DonorType = 'recurring' | 'potentially-recurring' | 'one-time' | 'past' | 'potential';
export type DonorTier = 'individual' | 'family-foundation' | 'business' | 'institution';
export type DonorPortfolio = 'major' | 'donors-500-5k' | 'monthly-giving';

// A completable task on the donor journey timeline
export interface TaskEntry {
  id: string;           // e.g. 'welcome-note', 'newsletter', 'tax-receipt-2026', 'annual-report-2026'
  kind: 'onboarding' | 'recurring';
  label: string;
  dueDate: string;      // ISO date
  completedDate?: string;
  completedBy?: string;
}

export interface ActivityEntry {
  id: string;
  date: string; // ISO date string
  author: string;
  note: string;
}

export interface DonationEntry {
  id: string;
  date: string; // ISO date string
  amount: number;
  note?: string;
}

export interface Donor {
  id: string;
  name: string;
  contactName: string;
  email?: string;
  phone?: string;
  address?: string;
  startDate: string;
  portfolio: DonorPortfolio;
  type: DonorType;
  tier: DonorTier;
  contractEndDate?: string;
  // Recurring gift fields
  recurringAmount?: number;
  recurringFrequency?: 'monthly' | 'yearly';
  cadenceDays: number;
  cadenceDescription: string;
  lastContactDate?: string;
  status: DonorStatus;
  naruCircle: boolean;
  donorTrip: boolean;
  taxReceiptSent: boolean; // for current calendar year
  newsletterSubscribed: boolean;
  manuallyInactive: boolean; // user-set override; bypasses cadence auto-status
  referredBy?: string; // who introduced or connected this donor
  nextAction?: string; // short note for next contact; auto-clears when a journey entry is logged
  completedTasks: TaskEntry[];
  dismissedTasks?: string[];
  tripId?: string; // which trip this donor is attending
  donations: DonationEntry[];
  // Derived from the database for the donor-list dashboard header; not persisted
  // on the donor record itself.
  currentYearDonated?: number;
  currentYearLatestDonation?: { amount: number; date: string };
  // Derived from the donor task log for the current year’s handwritten thank-you card.
  thankYouLetterForCurrentYear?: { completedDate: string; completedBy?: string };
  // Derived for the donor card: earliest open manually added task, if any.
  nextManualTask?: Pick<TaskEntry, 'id' | 'label' | 'dueDate'>;
  notes?: string;
  activities: ActivityEntry[];
  tags?: string[];
}

export interface TripAttendee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  skills: string[];
  isTeen?: boolean;
  speaksSpanish?: boolean;
  knowsAtTHV?: string[];
  confirmed?: boolean;
  purchasedTicket?: boolean;
  notes?: string;
}

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  teamMembers: string[];
  donorAttendees: string[]; // donor IDs
  attendees?: TripAttendee[]; // non-donor trip participants
  notes?: string;
}

export interface Initiative {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  owner: string;
  status: 'not-started' | 'in-progress' | 'complete' | 'delayed';
  category: string;
}

export interface DashboardStore {
  donors: Donor[];
  trips: Trip[];
  initiatives: Initiative[];
}
