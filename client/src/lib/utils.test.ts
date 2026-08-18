import { describe, expect, it } from 'vitest';
import { computeDonorStatus, currentYearContributionTotal, donationsInCalendarYear, donorCardPriorityDate, expectedRecurringAnnualAmount, generateAutoTasks, JOURNEY_FIG_BRIGHT, JOURNEY_FIG_MUTED, portfolioHeaderMetrics, recurringJourneyColor, sortDonorsByCardPriority } from './utils';
import type { Donor } from './types';

function donorStartingOn(startDate: string): Donor {
  return {
    id: 'test-donor',
    name: 'Test Donor',
    contactName: '',
    startDate,
    portfolio: 'major',
    type: 'one-time',
    tier: 'individual',
    cadenceDays: 90,
    cadenceDescription: 'every 3 months',
    status: 'green',
    naruCircle: false,
    donorTrip: false,
    taxReceiptSent: false,
    newsletterSubscribed: false,
    manuallyInactive: false,
    completedTasks: [],
    donations: [],
    activities: [],
  };
}

describe('generateAutoTasks tax receipt eligibility', () => {
  it('does not create that calendar year’s February receipt when the donor begins after February', () => {
    const tasks = generateAutoTasks(donorStartingOn('2025-12-15'));

    expect(tasks.some(task => task.id === 'tax-receipt-2025')).toBe(false);
    expect(tasks.some(task => task.id === 'tax-receipt-2026')).toBe(true);
  });

  it('does create that calendar year’s February receipt when the donor begins on or before February 1', () => {
    const tasks = generateAutoTasks(donorStartingOn('2025-02-01'));

    expect(tasks.some(task => task.id === 'tax-receipt-2025')).toBe(true);
  });

  it('labels a March annual report with the preceding reporting year', () => {
    const tasks = generateAutoTasks(donorStartingOn('2025-01-01'));
    const annualReport = tasks.find(task => task.id === 'annual-report-2026');

    expect(annualReport).toMatchObject({
      dueDate: '2026-03-01',
      label: 'Annual Report (2025 report)',
    });
  });

  it('gives lower-tier donors no automatic onboarding or annual thank-you deadline tasks', () => {
    const donor = donorStartingOn('2026-01-01');
    donor.portfolio = 'monthly-giving';
    const tasks = generateAutoTasks(donor);

    expect(tasks.some(task => task.id.includes('thank-you'))).toBe(false);
    expect(tasks.some(task => task.id === 'welcome-note')).toBe(false);
    expect(tasks.some(task => task.id === 'tax-receipt-2026')).toBe(false);
  });

  it('gives a new major donor only an acknowledgment and newsletter task', () => {
    const tasks = generateAutoTasks(donorStartingOn('2026-04-18'));

    expect(tasks.map(task => task.id)).toContain('donation-acknowledgment');
    expect(tasks.map(task => task.id)).toContain('newsletter');
    expect(tasks.some(task => task.id === 'welcome-note')).toBe(false);
  });
});

describe('donationsInCalendarYear', () => {
  it('counts only gifts dated in the requested calendar year', () => {
    const donor = donorStartingOn('2025-01-01');
    donor.donations = [
      { id: 'prior', date: '2025-12-31', amount: 10_000 },
      { id: 'first', date: '2026-01-01', amount: 20_000 },
      { id: 'second', date: '2026-08-11', amount: 30_000 },
    ];

    expect(donationsInCalendarYear(donor, 2025)).toBe(10_000);
    expect(donationsInCalendarYear(donor, 2026)).toBe(50_000);
  });

  it('returns zero for a donor with no gifts in the requested year', () => {
    expect(donationsInCalendarYear(donorStartingOn('2025-01-01'), 2026)).toBe(0);
  });
});

describe('currentYearContributionTotal', () => {
  it('uses the exact current-year aggregate returned by the donor list', () => {
    const first = donorStartingOn('2025-01-01');
    first.currentYearDonated = 67_000;
    const second = donorStartingOn('2025-01-01');
    second.currentYearDonated = 14_500;

    expect(currentYearContributionTotal([first, second])).toBe(81_500);
  });
});

describe('expectedRecurringAnnualAmount', () => {
  it('annualizes monthly recurring gifts and includes yearly recurring gifts once', () => {
    const monthly = donorStartingOn('2025-01-01');
    monthly.type = 'recurring';
    monthly.recurringAmount = 500;
    monthly.recurringFrequency = 'monthly';
    const yearly = donorStartingOn('2025-01-01');
    yearly.type = 'recurring';
    yearly.recurringAmount = 10_000;
    yearly.recurringFrequency = 'yearly';

    expect(expectedRecurringAnnualAmount([monthly, yearly])).toBe(16_000);
  });

  it('excludes potentially recurring, one-time, and incomplete recurring records', () => {
    const potential = donorStartingOn('2025-01-01');
    potential.type = 'potentially-recurring';
    potential.recurringAmount = 5_000;
    potential.recurringFrequency = 'yearly';
    const incomplete = donorStartingOn('2025-01-01');
    incomplete.type = 'recurring';

    expect(expectedRecurringAnnualAmount([potential, incomplete])).toBe(0);
  });
});

describe('portfolioHeaderMetrics', () => {
  it('keeps donor counts, 2026 gifts, and recurring commitments within the selected portfolio', () => {
    const major = donorStartingOn('2025-01-01');
    major.portfolio = 'major';
    major.currentYearDonated = 10_000;
    major.type = 'recurring';
    major.recurringAmount = 2_000;
    major.recurringFrequency = 'yearly';
    const monthly = donorStartingOn('2025-01-01');
    monthly.portfolio = 'monthly-giving';
    monthly.currentYearDonated = 1_200;
    monthly.type = 'recurring';
    monthly.recurringAmount = 100;
    monthly.recurringFrequency = 'monthly';

    expect(portfolioHeaderMetrics([major, monthly], 'major')).toEqual({ donorCount: 1, currentYearTotal: 10_000, expectedRecurringAnnualAmount: 2_000 });
    expect(portfolioHeaderMetrics([major, monthly], 'monthly-giving')).toEqual({ donorCount: 1, currentYearTotal: 1_200, expectedRecurringAnnualAmount: 1_200 });
  });
});

describe('recurringJourneyColor', () => {
  it('uses bright fig only for an outstanding recurring task that is due now or overdue', () => {
    expect(recurringJourneyColor(false, false)).toBe(JOURNEY_FIG_BRIGHT);
  });

  it('uses the same muted fig for future and completed recurring tasks', () => {
    expect(recurringJourneyColor(true, false)).toBe(JOURNEY_FIG_MUTED);
    expect(recurringJourneyColor(false, true)).toBe(JOURNEY_FIG_MUTED);
  });
});

describe('computeDonorStatus without lapsed', () => {
  it('keeps a substantially overdue donor at risk until the team marks the relationship inactive', () => {
    const donor = donorStartingOn('2025-01-01');
    const veryOldContact = new Date();
    veryOldContact.setDate(veryOldContact.getDate() - 365);
    donor.lastContactDate = veryOldContact.toISOString().slice(0, 10);
    donor.cadenceDays = 30;

    expect(computeDonorStatus(donor)).toBe('orange');

    donor.manuallyInactive = true;
    expect(computeDonorStatus(donor)).toBe('grey');
  });
});

describe('donor card priority dates', () => {
  it('uses an open manual task date before the next contact date', () => {
    const donor = donorStartingOn('2025-01-01');
    donor.lastContactDate = '2026-08-01';
    donor.cadenceDays = 90;
    donor.nextManualTask = { id: 'manual-1', label: 'Ask about expeditions', dueDate: '2026-11-15' };

    expect(donorCardPriorityDate(donor)).toBe('2026-11-15');
  });

  it('sorts donors by card priority date and puts cards without a date last', () => {
    const later = donorStartingOn('2025-01-01');
    later.id = 'later';
    later.nextManualTask = { id: 'manual-later', label: 'Later', dueDate: '2026-12-01' };
    const sooner = donorStartingOn('2025-01-01');
    sooner.id = 'sooner';
    sooner.nextManualTask = { id: 'manual-sooner', label: 'Sooner', dueDate: '2026-11-15' };
    const noDate = donorStartingOn('2025-01-01');
    noDate.id = 'none';

    expect(sortDonorsByCardPriority([later, noDate, sooner]).map(donor => donor.id)).toEqual(['sooner', 'later', 'none']);
  });
});
