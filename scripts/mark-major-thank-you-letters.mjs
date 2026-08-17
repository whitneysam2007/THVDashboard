import { createClient } from '@supabase/supabase-js';

const projectUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!projectUrl || !serviceRoleKey) throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const supabase = createClient(projectUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const year = 2026;
const records = [
  { match: ['mike', 'wynn'], date: '2026-08-04', context: 'TY card sent' },
  { match: ['ashton', 'family'], date: '2026-05-30', context: 'Gift sent' },
  { match: ['jami', 'ward'], date: '2026-06-01', context: 'TY card sent (month provided)' },
  { match: ['sean', 'aly', 'johnson'], date: '2026-04-01', context: 'TY card sent (month provided)' },
  { match: ['marriott'], date: '2026-05-30', context: 'Gift sent' },
  { match: ['jen', 'jackson'], date: '2026-05-30', context: 'Gift sent' },
  { match: ['jake', 'marivic'], date: '2026-05-30', context: 'Gift sent' },
  { match: ['fenton'], date: '2026-05-30', context: 'Gift sent' },
  { match: ['ruth', 'steve', 'lowe'], date: '2026-05-30', context: 'Gift sent' },
  { match: ['smith', 'family'], date: '2026-05-30', context: 'Gift sent' },
  { match: ['kirk'], date: '2026-05-30', context: 'Gift sent' },
  { match: ['tuffli'], date: '2026-06-15', context: 'Gift sent' },
  { match: ['tianna', 'murray'], date: '2026-05-30', context: 'Gift sent' },
  { match: ['dean', 'wallace'], date: '2026-07-02', context: 'TY card sent' },
  { match: ['spencer', 'brenley'], date: '2026-06-01', context: 'TY card sent from Lauren (month provided)' },
  { match: ['tom', 'carolyn'], date: '2026-08-04', context: 'TY card sent' },
  { match: ['susan', 'larson'], date: '2026-08-04', context: 'TY card sent; receipt letter sent August 8' },
  { match: ['usana'], date: 'latest-2026-donation', context: 'TY card sent (dated to latest 2026 gift)' },
];

const { data: donors, error } = await supabase.from('donors').select('id,name').order('name');
if (error) throw new Error(error.message);
const normalize = value => String(value ?? '').toLowerCase();
const plan = records.map(record => ({
  ...record,
  matches: (donors ?? []).filter(donor => record.match.every(token => normalize(donor.name).includes(token))),
}));
const unmatched = plan.filter(row => row.matches.length !== 1);
if (unmatched.length) throw new Error(`Ambiguous donor matches: ${JSON.stringify(unmatched.map(row => ({ match: row.match, matches: row.matches.map(donor => donor.name) })))}`);

const usanaRows = plan.filter(row => row.date === 'latest-2026-donation');
for (const row of usanaRows) {
  const { data: latestDonation, error: latestDonationError } = await supabase
    .from('donor_donations').select('date').eq('donorId', row.matches[0].id)
    .gte('date', `${year}-01-01`).lt('date', `${year + 1}-01-01`).order('date', { ascending: false }).limit(1).maybeSingle();
  if (latestDonationError) throw new Error(latestDonationError.message);
  if (!latestDonation?.date) throw new Error(`USANA has no ${year} donation date to use for its thank-you letter.`);
  row.date = String(latestDonation.date);
}

const tasks = plan.map(row => ({
  id: `${row.matches[0].id}_thank-you-letter-${year}`,
  donorId: row.matches[0].id,
  kind: 'onboarding',
  label: `Handwritten thank-you card (${year}) · ${row.context}`,
  dueDate: row.date,
  completedDate: row.date,
  completedBy: 'THV team',
}));

if (process.env.APPLY === '1') {
  const { error: upsertError } = await supabase.from('donor_tasks').upsert(tasks, { onConflict: 'id' });
  if (upsertError) throw new Error(upsertError.message);
}

console.log(JSON.stringify({ applied: process.env.APPLY === '1', marked: tasks.map(task => ({ donorId: task.donorId, date: task.completedDate, label: task.label })) }, null, 2));
