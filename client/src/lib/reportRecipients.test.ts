import { describe, expect, it } from 'vitest';
import { REPORTS, reportYearGiving } from './reportRecipients';

describe('report recipient helpers', () => {
  it('uses current-year giving for the semi-annual report and tax-only amount display', () => {
    const year = new Date().getFullYear();
    expect(REPORTS['semi-annual']).toMatchObject({ givingYear: year, showGivingAmount: false });
    expect(REPORTS['tax-receipt']).toMatchObject({ givingYear: year, showGivingAmount: true, amountLabel: `${year} giving` });
    expect(REPORTS['annual-report']).toMatchObject({ givingYear: year, showGivingAmount: false });
  });

  it('sums only the requested calendar year', () => {
    expect(reportYearGiving({ donations: [{ id: 'a', date: '2025-12-31', amount: 500 }, { id: 'b', date: '2026-01-01', amount: 700 }] }, 2025)).toBe(500);
  });

  it('uses the actual server-provided calendar-year total when recipient rows do not carry donation history', () => {
    expect(reportYearGiving({ donations: [], donationYearTotals: { '2026': 2400 } }, 2026)).toBe(2400);
  });
});
