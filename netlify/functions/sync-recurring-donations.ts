import { syncRecurringMonthlyDonations } from '../../server/db';

export default async () => {
  const result = await syncRecurringMonthlyDonations();
  console.info('[recurring-donations] synchronized', result);
  return new Response(null, { status: 204 });
};

// 1:15am Mountain Daylight Time (12:15am Mountain Standard Time) each day.
export const config = { schedule: '15 7 * * *' };
