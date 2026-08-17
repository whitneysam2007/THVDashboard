import { createClient } from '@supabase/supabase-js';

const projectUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!projectUrl || !serviceRoleKey) throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const supabase = createClient(projectUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const year = '2026';
const { data: donors, error: donorError } = await supabase
  .from('donors')
  .select('id,name,contactName,lastContactDate,cadenceDays,manuallyInactive,type,tier,recurringAmount,recurringFrequency,tags')
  .order('name');
if (donorError) throw new Error(donorError.message);
const major = (donors ?? []).filter(donor => {
  try { return !JSON.parse(donor.tags ?? '[]').some(tag => String(tag).startsWith('thv-portfolio:')); } catch { return true; }
});
const ids = major.map(donor => donor.id);
const [{ data: donations, error: donationError }, { data: tasks, error: taskError }] = await Promise.all([
  supabase.from('donor_donations').select('donorId,amountCents,date').in('donorId', ids).gte('date', `${year}-01-01`).lt('date', `${Number(year) + 1}-01-01`),
  supabase.from('donor_tasks').select('donorId,id,completedDate').in('donorId', ids).like('id', `%thank-you-letter-${year}`),
]);
if (donationError || taskError) throw new Error((donationError ?? taskError).message);
const donated = new Set((donations ?? []).filter(donation => donation.amountCents > 0).map(donation => donation.donorId));
const green = new Set((tasks ?? []).filter(task => task.completedDate).map(task => task.donorId));

console.log(JSON.stringify({
  kirk: major.filter(donor => /kirk/i.test(donor.name)),
  jill: major.filter(donor => /jill|connely|connelly/i.test(`${donor.name} ${donor.contactName ?? ''}`)),
  elligibleWithoutLetter: major.filter(donor => donated.has(donor.id) && !green.has(donor.id)).map(donor => donor.name),
  currentYearGiftCount: donated.size,
  greenLetterCount: green.size,
}, null, 2));
