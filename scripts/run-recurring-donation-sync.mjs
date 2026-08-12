import { syncRecurringMonthlyDonations } from '../server/db.ts';

const result = await syncRecurringMonthlyDonations();
console.log(JSON.stringify(result));
