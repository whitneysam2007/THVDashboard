import { createClient } from '@supabase/supabase-js';

const projectUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!projectUrl || !serviceRoleKey) throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const supabase = createClient(projectUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const touchpointDate = '2026-06-01';

const { data: donors, error: donorError } = await supabase
  .from('donors')
  .select('id,name,lastContactDate')
  .ilike('name', '%kirk%');
if (donorError) throw new Error(donorError.message);
if (!donors?.length) throw new Error('Could not find a donor matching “Kirk”.');
if (donors.length > 1) throw new Error(`More than one donor matches “Kirk”: ${donors.map(donor => donor.name).join(', ')}`);
const donor = donors[0];
const activityId = `activity-${donor.id}-${touchpointDate}-donor-packet`;

const { error: activityError } = await supabase.from('donor_activities').upsert({
  id: activityId,
  donorId: donor.id,
  date: touchpointDate,
  author: 'THV team',
  note: 'Sent donor packet',
}, { onConflict: 'id' });
if (activityError) throw new Error(activityError.message);

const [{ data: activities, error: activitiesError }, { data: tasks, error: tasksError }] = await Promise.all([
  supabase.from('donor_activities').select('date').eq('donorId', donor.id),
  supabase.from('donor_tasks').select('id,completedDate').eq('donorId', donor.id),
]);
if (activitiesError) throw new Error(activitiesError.message);
if (tasksError) throw new Error(tasksError.message);

const dates = [
  ...(activities ?? []).map(activity => activity.date),
  ...(tasks ?? [])
    .filter(task => task.completedDate && (task.id.startsWith('manual-') || task.id.includes('_brenley-annual-thank-you-')))
    .map(task => task.completedDate),
].filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date));
const lastContactDate = dates.sort().at(-1) ?? touchpointDate;
const { error: updateError } = await supabase.from('donors').update({ lastContactDate, updatedAt: new Date().toISOString() }).eq('id', donor.id);
if (updateError) throw new Error(updateError.message);

console.log(JSON.stringify({ donor: donor.name, loggedInteraction: { date: touchpointDate, note: 'Sent donor packet' }, lastContactDate }, null, 2));
