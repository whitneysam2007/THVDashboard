import { describe, expect, it } from 'vitest';
import { REPORTS, isAtOrBelowReportGivingDivider, reportGridBccEmails, reportYearGiving, sortReportGridRows } from './reportRecipients';

describe('report recipient helpers', () => {
  it('uses current-year giving for the semi-annual report and tax-only amount display', () => {
    const year = new Date().getFullYear();
    expect(REPORTS['semi-annual']).toMatchObject({ givingYear: year, showGivingAmount: false, sortByGiving: true, showGivingDivider: true });
    expect(REPORTS['tax-receipt']).toMatchObject({ givingYear: year, showGivingAmount: true, amountLabel: `${year} giving` });
    expect(REPORTS['annual-report']).toMatchObject({ givingYear: year, showGivingAmount: false, sortByGiving: true, showGivingDivider: true });
  });

  it('sums only the requested calendar year', () => {
    expect(reportYearGiving({ donations: [{ id: 'a', date: '2025-12-31', amount: 500 }, { id: 'b', date: '2026-01-01', amount: 700 }] }, 2025)).toBe(500);
  });

  it('uses the actual server-provided calendar-year total when recipient rows do not carry donation history', () => {
    expect(reportYearGiving({ donations: [], donationYearTotals: { '2026': 2400 } }, 2026)).toBe(2400);
  });

  it('orders six-month and annual report rows by giving while preserving sent rows at the bottom', () => {
    const rows = sortReportGridRows([
      { donor: { name: 'Cedar', donations: [], donationYearTotals: { '2026': 1_200 } }, sent: false },
      { donor: { name: 'Aspen', donations: [], donationYearTotals: { '2026': 8_500 } }, sent: false },
      { donor: { name: 'Birch', donations: [], donationYearTotals: { '2026': 5_000 } }, sent: false },
      { donor: { name: 'Done first', donations: [], donationYearTotals: { '2026': 12_000 } }, sent: true },
    ], 2026, true);
    expect(rows.map(row => row.donor.name)).toEqual(['Aspen', 'Birch', 'Cedar', 'Done first']);
  });

  it('places the visual-divider boundary below donors giving more than $5,000', () => {
    expect(isAtOrBelowReportGivingDivider({ donations: [], donationYearTotals: { '2026': 5_000 } }, 2026)).toBe(true);
    expect(isAtOrBelowReportGivingDivider({ donations: [], donationYearTotals: { '2026': 5_001 } }, 2026)).toBe(false);
  });

  it('returns only unsent, below-threshold recipient emails for direct BCC pasting', () => {
    expect(reportGridBccEmails([
      { donor: { email: 'higher@example.org', donations: [], donationYearTotals: { '2026': 5_001 } }, sent: false },
      { donor: { email: 'eligible@example.org', donations: [], donationYearTotals: { '2026': 5_000 } }, sent: false },
      { donor: { email: 'sent@example.org', donations: [], donationYearTotals: { '2026': 200 } }, sent: true },
      { donor: { email: ' eligible@example.org ', donations: [], donationYearTotals: { '2026': 100 } }, sent: false },
      { donor: { email: '', donations: [], donationYearTotals: { '2026': 100 } }, sent: false },
    ], 2026)).toEqual(['eligible@example.org']);
  });
});
