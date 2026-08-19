import type { Donor } from './types';

export type ReportKey = 'semi-annual' | 'tax-receipt' | 'annual-report';

const REPORTING_YEAR = new Date().getFullYear();
const FOLLOWING_YEAR = REPORTING_YEAR + 1;

export const REPORTS: Record<ReportKey, { title: string; taskId: string; label: string; dueDate: string; givingYear: number; showGivingAmount: boolean; amountLabel?: string }> = {
  'semi-annual': { title: `${REPORTING_YEAR} Semi-Annual / 6-Month Report`, taskId: `semi-annual-report-${REPORTING_YEAR}`, label: `Send ${REPORTING_YEAR} semi-annual / 6-month report`, dueDate: `${REPORTING_YEAR}-08-01`, givingYear: REPORTING_YEAR, showGivingAmount: false },
  'tax-receipt': { title: `${FOLLOWING_YEAR} Tax Receipt`, taskId: `tax-receipt-${FOLLOWING_YEAR}`, label: `Send ${FOLLOWING_YEAR} tax receipt for ${REPORTING_YEAR} giving`, dueDate: `${FOLLOWING_YEAR}-02-01`, givingYear: REPORTING_YEAR, showGivingAmount: true, amountLabel: `${REPORTING_YEAR} giving` },
  'annual-report': { title: `${FOLLOWING_YEAR} Annual Report (${REPORTING_YEAR} year)`, taskId: `annual-report-${FOLLOWING_YEAR}`, label: `Send ${FOLLOWING_YEAR} annual report (${REPORTING_YEAR} report)`, dueDate: `${FOLLOWING_YEAR}-03-01`, givingYear: REPORTING_YEAR, showGivingAmount: false },
};

export function reportYearGiving(donor: Pick<Donor, 'donations' | 'donationYearTotals'>, year: number) {
  const reportedTotal = donor.donationYearTotals?.[String(year)];
  if (typeof reportedTotal === 'number') return reportedTotal;
  return donor.donations.filter(donation => donation.date.startsWith(`${year}-`)).reduce((sum, donation) => sum + donation.amount, 0);
}
