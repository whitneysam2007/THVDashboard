import { createClient } from '@supabase/supabase-js';

const projectUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!projectUrl || !serviceRoleKey) throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const supabase = createClient(projectUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const startDate = '2025-12-01';
const { data: donor, error: donorError } = await supabase
  .from('donors')
  .select('id,name,totalDonatedCents')
  .eq('email', 'seanandaly17@gmail.com')
  .single();
if (donorError) throw new Error(donorError.message);

const donationId = `recurring-${donor.id}-${startDate}`;
const { data: existingDonation, error: existingError } = await supabase
  .from('donor_donations')
  .select('id')
  .eq('id', donationId)
  .maybeSingle();
if (existingError) throw new Error(existingError.message);

const { error: donorUpdateError } = await supabase
  .from('donors')
  .update({ startDate, recurringAmount: 500, recurringFrequency: 'monthly', updatedAt: new Date().toISOString() })
  .eq('id', donor.id);
if (donorUpdateError) throw new Error(donorUpdateError.message);

if (!existingDonation) {
  const { error: donationError } = await supabase.from('donor_donations').insert({
    id: donationId,
    donorId: donor.id,
    date: startDate,
    amountCents: 50_000,
    note: 'Automated monthly recurring gift',
  });
  if (donationError) throw new Error(donationError.message);
}

const { data: donations, error: totalsError } = await supabase
  .from('donor_donations')
  .select('amountCents')
  .eq('donorId', donor.id);
if (totalsError) throw new Error(totalsError.message);
const totalDonatedCents = (donations ?? []).reduce((sum, donation) => sum + Number(donation.amountCents ?? 0), 0);
const { error: totalUpdateError } = await supabase.from('donors').update({ totalDonatedCents }).eq('id', donor.id);
if (totalUpdateError) throw new Error(totalUpdateError.message);

console.log(JSON.stringify({ donor: donor.name, startDate, decemberDonationCreated: !existingDonation, totalDonated: totalDonatedCents / 100 }, null, 2));
