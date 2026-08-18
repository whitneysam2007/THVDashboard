import { describe, expect, it } from 'vitest';
import { REPORTS, reportYearGiving } from './reportRecipients';

describe('report recipient helpers', () => {
  it('uses prior-year giving for the 2026 semi-annual recipient grid', () => {
    expect(REPORTS['semi-annual-2026']).toMatchObject({ amountYear: 2025, amountLabel: '2025 giving' });
  });

  it('sums only the requested calendar year', () => {
    expect(reportYearGiving({ donations: [{ id: 'a', date: '2025-12-31', amount: 500 }, { id: 'b', date: '2026-01-01', amount: 700 }] }, 2025)).toBe(500);
  });
});
