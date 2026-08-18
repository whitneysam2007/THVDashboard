import type { Donor } from './types';

export type ReportKey = 'semi-annual-2026' | 'tax-receipt-2027' | 'annual-report-2027';

export const REPORTS: Record<ReportKey, { title: string; taskId: string; label: string; dueDate: string; amountYear: number; amountLabel: string }> = {
  'semi-annual-2026': { title: '2026 Semi-Annual / 6-Month Report', taskId: 'semi-annual-report-2026', label: 'Send 2026 semi-annual / 6-month report', dueDate: '2026-08-01', amountYear: 2025, amountLabel: '2025 giving' },
  'tax-receipt-2027': { title: '2027 Tax Receipt', taskId: 'tax-receipt-2027', label: 'Send 2027 tax receipt for 2026 giving', dueDate: '2027-02-01', amountYear: 2026, amountLabel: '2026 giving' },
  'annual-report-2027': { title: '2027 Annual Report (2026 year)', taskId: 'annual-report-2027', label: 'Send 2027 annual report (2026 report)', dueDate: '2027-03-01', amountYear: 2026, amountLabel: '2026 giving' },
};

export function reportYearGiving(donor: Pick<Donor, 'donations' | 'donationYearTotals'>, year: number) {
  const reportedTotal = donor.donationYearTotals?.[String(year)];
  if (typeof reportedTotal === 'number') return reportedTotal;
  return donor.donations.filter(donation => donation.date.startsWith(`${year}-`)).reduce((sum, donation) => sum + donation.amount, 0);
}
