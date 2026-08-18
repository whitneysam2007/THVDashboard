import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Donor, DonorPortfolio, DonorStatus, TaskEntry, ActivityEntry } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compute the live status of a donor based on cadence compliance */
export function computeDonorStatus(donor: Donor): DonorStatus {
  if (donor.manuallyInactive) return 'grey';
  if (!donor.lastContactDate) return 'grey';
  if (donor.type === 'past') return 'grey';

  const last = new Date(donor.lastContactDate);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  const cadence = donor.cadenceDays;

  if (daysSince <= cadence * 0.9) return 'green';
  if (daysSince <= cadence * 1.1) return 'yellow';
  // At-risk remains the automatic overdue state. The team can explicitly mark
  // a relationship inactive when they choose to stop working it.
  return 'orange';
}

/** Format a date string to a readable format */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Days until next contact is due */
export function daysUntilNextContact(donor: Donor): number {
  if (!donor.lastContactDate) return 0;
  const last = new Date(donor.lastContactDate);
  const due = new Date(last);
  due.setDate(due.getDate() + donor.cadenceDays);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Next contact due date */
export function nextContactDate(donor: Donor): string | null {
  if (!donor.lastContactDate) return null;
  const last = new Date(donor.lastContactDate);
  const due = new Date(last);
  due.setDate(due.getDate() + donor.cadenceDays);
  return due.toISOString().split('T')[0];
}

/** The date displayed as the donor card's next priority: manual task first, then next contact. */
export function donorCardPriorityDate(donor: Donor): string | null {
  return donor.nextManualTask?.dueDate ?? nextContactDate(donor);
}

/** Order donors by their displayed priority date, keeping cards with no date last. */
export function sortDonorsByCardPriority<T extends Donor>(donors: T[]): T[] {
  return [...donors].sort((a, b) => {
    const aDate = donorCardPriorityDate(a);
    const bDate = donorCardPriorityDate(b);
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate.localeCompare(bDate);
  });
}

/** Status label */
export function statusLabel(status: DonorStatus): string {
  const map: Record<DonorStatus, string> = {
    green: 'Active',
    yellow: 'Attention',
    orange: 'At Risk',
    grey: 'Inactive',
  };
  return map[status];
}

/** Status color classes */
export function statusColorClass(status: DonorStatus): string {
  const map: Record<DonorStatus, string> = {
    green: 'status-dot-green',
    yellow: 'status-dot-yellow',
    orange: 'status-dot-orange',
    grey: 'status-dot-grey',
  };
  return map[status];
}

/** Status text color */
export function statusTextColor(status: DonorStatus): string {
  const map: Record<DonorStatus, string> = {
    green: 'text-[oklch(0.45_0.13_145)]',
    yellow: 'text-[oklch(0.55_0.14_88)]',
    orange: 'text-[oklch(0.52_0.16_52)]',
    grey: 'text-[oklch(0.50_0.012_65)]',
  };
  return map[status];
}

/** Status background (light tint) */
export function statusBgClass(status: DonorStatus): string {
  const map: Record<DonorStatus, string> = {
    green: 'bg-[oklch(0.94_0.06_145)]',
    yellow: 'bg-[oklch(0.96_0.06_88)]',
    orange: 'bg-[oklch(0.95_0.07_52)]',
    grey: 'bg-[oklch(0.92_0.005_65)]',
  };
  return map[status];
}

/** Sum all donations for a donor */
export function totalDonated(donor: Donor): number {
  return (donor.donations ?? []).reduce((sum, d) => sum + d.amount, 0);
}

/** Sum a donor's recorded gifts within one calendar year. */
export function donationsInCalendarYear(donor: Donor, year: number): number {
  return (donor.donations ?? [])
    .filter(donation => {
      // Date-only donation values must parse in local time to avoid a UTC year shift.
      const date = new Date(donation.date + (donation.date.length === 10 ? 'T00:00:00' : ''));
      return !Number.isNaN(date.getTime()) && date.getFullYear() === year;
    })
    .reduce((sum, donation) => sum + donation.amount, 0);
}

/** Sum the exact current-year aggregates supplied by the donor-list query. */
export function currentYearContributionTotal(donors: Donor[]): number {
  return donors.reduce((sum, donor) => sum + (donor.currentYearDonated ?? 0), 0);
}

/**
 * The dependable annual base from donors explicitly marked Recurring. Monthly
 * commitments are annualized; yearly commitments are counted once. Potential,
 * potentially-recurring, one-time, and past donors are intentionally excluded.
 */
export function expectedRecurringAnnualAmount(donors: Donor[]): number {
  return donors.reduce((sum, donor) => {
    if (donor.type !== 'recurring' || !donor.recurringAmount || !donor.recurringFrequency) return sum;
    return sum + (donor.recurringFrequency === 'monthly' ? donor.recurringAmount * 12 : donor.recurringAmount);
  }, 0);
}

/** Metrics for a single portfolio; donor records in other portfolios are excluded. */
export function portfolioHeaderMetrics(donors: Donor[], portfolio: DonorPortfolio) {
  const portfolioDonors = donors.filter(donor => donor.portfolio === portfolio);
  return {
    donorCount: portfolioDonors.length,
    currentYearTotal: currentYearContributionTotal(portfolioDonors),
    expectedRecurringAnnualAmount: expectedRecurringAnnualAmount(portfolioDonors),
  };
}

// Donor Journey recurring-task colors. Same fig hue at two strengths: bright
// means a task needs attention now; muted means future or completed.
export const JOURNEY_FIG_BRIGHT = 'oklch(0.52 0.16 350)';
// ~44% more chroma than the original muted fig, so future/completed tasks stay
// visibly fig rather than reading as grey while remaining quieter than bright fig.
export const JOURNEY_FIG_MUTED = 'oklch(0.58 0.065 350)';

export function recurringJourneyColor(isFuture: boolean, isCompleted: boolean): string {
  return isFuture || isCompleted ? JOURNEY_FIG_MUTED : JOURNEY_FIG_BRIGHT;
}

/** Sum donations within the last N years */
export function donationsLastYears(donor: Donor, years: number): number {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return (donor.donations ?? [])
    .filter(d => new Date(d.date) >= cutoff)
    .reduce((sum, d) => sum + d.amount, 0);
}

// ── Timeline utilities ──────────────────────────────────────────────────────

/** Generate all auto-tasks for a donor (onboarding + recurring annual) */
export function generateAutoTasks(donor: Donor): TaskEntry[] {
  const tasks: TaskEntry[] = [];
  // Parse date-only values as local midnight to avoid a UTC day shift.
  const start = new Date(donor.startDate + (donor.startDate.length === 10 ? 'T00:00:00' : ''));
  const today = new Date();

  const isMajorDonor = donor.portfolio === 'major';

  // Major donors retain their high-touch onboarding and February/March annual
  // stewardship. Thank-you cards are tracked separately through a current-year
  // letter indicator, never as a deadline-driven journey task.
  if (isMajorDonor) {
    tasks.push({ id: 'donation-acknowledgment', kind: 'onboarding', label: 'Send donation acknowledgment & tax letter', dueDate: donor.startDate });
    tasks.push({ id: 'newsletter', kind: 'onboarding', label: 'Add to newsletter', dueDate: donor.startDate });
  }

  // Recurring: Tax Receipt Letter — February 1 each year. A donor who begins
  // after that year's February deadline has no receipt task for that year.
  const startYear = start.getFullYear();
  const endYear = today.getFullYear() + 1; // show one year ahead
  for (let yr = startYear; yr <= endYear; yr++) {
    const taxReceiptDue = new Date(yr, 1, 1); // February 1, local time
    if (isMajorDonor && start <= taxReceiptDue) {
      tasks.push({
        id: `tax-receipt-${yr}`,
        kind: 'recurring',
        label: `Tax Receipt Letter (${yr - 1} tax year)`,
        dueDate: `${yr}-02-01`,
      });
    }
    if (isMajorDonor) {
      tasks.push({ id: `annual-report-${yr}`, kind: 'recurring', label: `Annual Report (${yr - 1} report)`, dueDate: `${yr}-03-01` });
    }
  }

  return tasks;
}

export type TimelineItem =
  | { kind: 'activity'; date: string; data: ActivityEntry }
  | { kind: 'task'; date: string; data: TaskEntry; completed: TaskEntry | undefined };

/** Merge activities + auto-tasks + manual tasks into one sorted timeline */
export function buildTimeline(donor: Donor): TimelineItem[] {
  const items: TimelineItem[] = [];
  const completedMap = new Map((donor.completedTasks ?? []).map(t => [t.id, t]));
  const dismissed = new Set(donor.dismissedTasks ?? []);

  // Activities
  for (const a of donor.activities) {
    items.push({ kind: 'activity', date: a.date, data: a });
  }

  // Auto-generated tasks
  for (const t of generateAutoTasks(donor)) {
    if (!dismissed.has(t.id)) {
      const storedTask = completedMap.get(t.id);
      const task = storedTask
        ? { ...t, label: storedTask.label, dueDate: storedTask.dueDate, kind: storedTask.kind }
        : t;
      items.push({ kind: 'task', date: task.dueDate, data: task, completed: storedTask });
    }
  }

  // Manual next-action tasks (stored in completedTasks with kind 'onboarding' and id starting 'manual-')
  // We also need to show uncompleted manual tasks — stored separately
  for (const t of (donor.completedTasks ?? []).filter(t => t.id.startsWith('manual-'))) {
    // Already in completedMap, but we need to show them as timeline items too
    if (!items.find(i => i.kind === 'task' && i.data.id === t.id)) {
      items.push({ kind: 'task', date: t.dueDate, data: t, completed: t.completedDate ? t : undefined });
    }
  }

  // Sort: past first, future last, same date: activities before tasks
  items.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.kind === 'activity' && b.kind !== 'activity') return -1;
    return 1;
  });

  return items;
}

/** Donor type display label */
export function donorTypeLabel(type: string): string {
  const map: Record<string, string> = {
    'recurring': 'Recurring',
    'potentially-recurring': 'Potentially Recurring',
    'one-time': 'One-time',
    'past': 'Past',
    'potential': 'Potential Donor',
  };
  return (map[type] ?? type).replace(/[()]/g, '');
}

/** Tier display label */
export function tierLabel(tier: string): string {
  const map: Record<string, string> = {
    'individual': 'Individual',
    'family-foundation': 'Family Foundation',
    'business': 'Business',
    'institution': 'Institution',
  };
  return (map[tier] ?? tier).replace(/[()]/g, '');
}

/** Format currency */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}
