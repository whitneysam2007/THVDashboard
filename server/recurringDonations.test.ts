import { describe, expect, it } from 'vitest';
import { dueMonthlyDonationDates, recurringDonationId } from './recurringDonations';

describe('monthly recurring donation dates', () => {
  it('creates one due entry on each start-date anniversary through today', () => {
    expect(dueMonthlyDonationDates('2025-12-01', '2026-03-11')).toEqual([
      '2025-12-01', '2026-01-01', '2026-02-01', '2026-03-01',
    ]);
  });

  it('uses the final valid day in shorter months and never creates dates before the start date', () => {
    expect(dueMonthlyDonationDates('2026-01-31', '2026-04-03')).toEqual([
      '2026-01-31', '2026-02-28', '2026-03-31',
    ]);
  });

  it('uses a deterministic record ID for safe repeated synchronizations', () => {
    expect(recurringDonationId('donor-1', '2026-03-01')).toBe('recurring-donor-1-2026-03-01');
  });
});
