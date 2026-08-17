import { createClient } from '@supabase/supabase-js';

const projectUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!projectUrl || !serviceRoleKey) throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const supabase = createClient(projectUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const year = 2026;
const { data: allTasks, error: allError } = await supabase
  .from('donor_tasks')
  .select('id,donorId,label,dueDate,completedDate,completedBy')
  .gte('completedDate', `${year}-01-01`)
  .lte('completedDate', `${year}-12-31`);
if (allError) throw new Error(allError.message);

const rows = (allTasks ?? []).filter(task =>
  /thank[- ]you card sent|handwritten thank[- ]you card/i.test(task.label ?? '')
  && Boolean(task.completedDate),
).map(task => ({
  id: `${task.donorId}_thank-you-letter-${year}`,
  donorId: task.donorId,
  kind: 'onboarding',
  label: `Handwritten thank-you card (${year})`,
  dueDate: task.completedDate,
  completedDate: task.completedDate,
  completedBy: task.completedBy ?? 'THV team',
}));

if (rows.length && process.env.APPLY === '1') {
  const { error: upsertError } = await supabase.from('donor_tasks').upsert(rows, { onConflict: 'id' });
  if (upsertError) throw new Error(upsertError.message);
}

console.log(JSON.stringify({ found: rows.length, applied: process.env.APPLY === '1', migrated: rows.map(row => ({ donorId: row.donorId, date: row.completedDate })) }, null, 2));
