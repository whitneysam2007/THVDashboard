import { createClient } from '@supabase/supabase-js';

const projectUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!projectUrl || !serviceRoleKey) throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const supabase = createClient(projectUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: donors, error } = await supabase.from('donors').select('id,name,email,address,totalDonatedCents,referredBy,tags').order('name');
if (error) throw new Error(error.message);
const portfolioDonors = (donors ?? []).filter(donor => {
  try { return JSON.parse(donor.tags ?? '[]').includes('thv-portfolio:donors-500-5k'); }
  catch { return false; }
});
const donorIds = portfolioDonors.map(donor => donor.id);
const [{ data: donations, error: donationError }, { data: tasks, error: taskError }] = await Promise.all([
  supabase.from('donor_donations').select('donorId,amountCents').in('donorId', donorIds),
  supabase.from('donor_tasks').select('donorId,id,completedDate').in('donorId', donorIds),
]);
if (donationError) throw new Error(donationError.message);
if (taskError) throw new Error(taskError.message);
console.log(JSON.stringify({
  donors500To4999Count: portfolioDonors.length,
  totalImportedDonations: (donations ?? []).reduce((sum, donation) => sum + Number(donation.amountCents ?? 0), 0) / 100,
  completedImportedThankYouCards: (tasks ?? []).filter(task => task.id.startsWith('manual-import-thank-you-') && task.completedDate).length,
  donors: portfolioDonors.map(donor => ({ name: donor.name, email: donor.email, address: donor.address, total: Number(donor.totalDonatedCents ?? 0) / 100, connectedBy: donor.referredBy })),
}, null, 2));
