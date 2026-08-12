const MOUNTAIN_TIMEZONE = 'America/Denver';
export const AUTOMATED_RECURRING_NOTE = 'Automatic monthly recurring donation';

type DateParts = { year: number; month: number; day: number };

function parseDateOnly(value: string): DateParts {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) throw new Error(`Invalid date: ${value}`);
  return { year, month, day };
}

function formatDate({ year, month, day }: DateParts) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function mountainDateToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MOUNTAIN_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** Due monthly dates from a donor's start-date anniversary through the supplied Mountain-date. */
export function dueMonthlyDonationDates(startDate: string, throughDate: string) {
  const start = parseDateOnly(startDate);
  const through = parseDateOnly(throughDate);
  const dates: string[] = [];
  let year = start.year;
  let month = start.month;
  while (year < through.year || (year === through.year && month <= through.month)) {
    const day = Math.min(start.day, daysInMonth(year, month));
    const candidate = formatDate({ year, month, day });
    if (candidate >= startDate && candidate <= throughDate) dates.push(candidate);
    month += 1;
    if (month === 13) { year += 1; month = 1; }
  }
  return dates;
}

export function recurringDonationId(donorId: string, date: string) {
  return `recurring-${donorId}-${date}`;
}
