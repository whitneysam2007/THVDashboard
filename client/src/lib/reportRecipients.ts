import type { Donor } from './types';

export type ReportKey = 'semi-annual' | 'tax-receipt' | 'annual-report';
export const REPORT_GIVING_DIVIDER_AMOUNT = 5_000;

type ReportDefinition = { title: string; taskId: string; label: string; dueDate: string; givingYear: number; showGivingAmount: boolean; amountLabel?: string; sortByGiving?: boolean; showGivingDivider?: boolean };

const REPORTING_YEAR = new Date().getFullYear();
const FOLLOWING_YEAR = REPORTING_YEAR + 1;

export const REPORTS: Record<ReportKey, ReportDefinition> = {
  'semi-annual': { title: `${REPORTING_YEAR} Semi-Annual / 6-Month Report`, taskId: `semi-annual-report-${REPORTING_YEAR}`, label: `Send ${REPORTING_YEAR} semi-annual / 6-month report`, dueDate: `${REPORTING_YEAR}-08-01`, givingYear: REPORTING_YEAR, showGivingAmount: false, sortByGiving: true, showGivingDivider: true },
  'tax-receipt': { title: `${FOLLOWING_YEAR} Tax Receipt`, taskId: `tax-receipt-${FOLLOWING_YEAR}`, label: `Send ${FOLLOWING_YEAR} tax receipt for ${REPORTING_YEAR} giving`, dueDate: `${FOLLOWING_YEAR}-02-01`, givingYear: REPORTING_YEAR, showGivingAmount: true, amountLabel: `${REPORTING_YEAR} giving` },
  'annual-report': { title: `${FOLLOWING_YEAR} Annual Report (${REPORTING_YEAR} year)`, taskId: `annual-report-${FOLLOWING_YEAR}`, label: `Send ${FOLLOWING_YEAR} annual report (${REPORTING_YEAR} report)`, dueDate: `${FOLLOWING_YEAR}-03-01`, givingYear: REPORTING_YEAR, showGivingAmount: false, sortByGiving: true, showGivingDivider: true },
};

export function reportYearGiving(donor: Pick<Donor, 'donations' | 'donationYearTotals'>, year: number) {
  const reportedTotal = donor.donationYearTotals?.[String(year)];
  if (typeof reportedTotal === 'number') return reportedTotal;
  return donor.donations.filter(donation => donation.date.startsWith(`${year}-`)).reduce((sum, donation) => sum + donation.amount, 0);
}

export function isAtOrBelowReportGivingDivider(donor: Pick<Donor, 'donations' | 'donationYearTotals'>, year: number) {
  return reportYearGiving(donor, year) <= REPORT_GIVING_DIVIDER_AMOUNT;
}

export function sortReportGridRows<T extends { donor: Pick<Donor, 'name' | 'donations' | 'donationYearTotals'>; sent: boolean }>(rows: T[], givingYear: number, sortByGiving = false) {
  return [...rows].sort((left, right) => {
    if (left.sent !== right.sent) return left.sent ? 1 : -1;
    if (sortByGiving) {
      const givingDifference = reportYearGiving(right.donor, givingYear) - reportYearGiving(left.donor, givingYear);
      if (givingDifference !== 0) return givingDifference;
    }
    return left.donor.name.localeCompare(right.donor.name);
  });
}

export function reportGridBccEmails<T extends { donor: Pick<Donor, 'email' | 'donations' | 'donationYearTotals'>; sent: boolean }>(rows: T[], givingYear: number) {
  return Array.from(new Set(rows
    .filter(row => !row.sent && isAtOrBelowReportGivingDivider(row.donor, givingYear))
    .map(row => row.donor.email?.trim())
    .filter((email): email is string => Boolean(email))));
}
