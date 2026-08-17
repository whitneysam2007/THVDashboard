import { createClient } from '@supabase/supabase-js';

const projectUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!projectUrl || !serviceRoleKey) throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const supabase = createClient(projectUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await supabase
  .from('donors')
  .select('id,name,email,startDate,recurringAmount,recurringFrequency,totalDonatedCents,tags')
  .eq('type', 'recurring')
  .eq('recurringFrequency', 'monthly')
  .order('name');
if (error) throw new Error(error.message);

const monthly = (data ?? []).filter(donor => {
  try { return JSON.parse(donor.tags ?? '[]').includes('thv-portfolio:monthly-giving'); }
  catch { return false; }
});
const totalExpectedAnnual = monthly.reduce((sum, donor) => sum + Number(donor.recurringAmount ?? 0) * 12, 0);
console.log(JSON.stringify({
  monthlyGivingCardCount: monthly.length,
  expectedAnnualRecurringAmount: totalExpectedAnnual,
  donors: monthly.map(donor => ({
    name: donor.name,
    email: donor.email,
    startDate: donor.startDate,
    monthlyAmount: donor.recurringAmount,
    lifetimeImported: Number(donor.totalDonatedCents ?? 0) / 100,
  })),
}, null, 2));
