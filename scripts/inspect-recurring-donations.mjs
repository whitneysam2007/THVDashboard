import { getSupabaseServerClient } from '../server/supabase.ts';

const db = getSupabaseServerClient();
const { data: donors, error: donorError } = await db
  .from('donors')
  .select('id,name,startDate,recurringAmount,recurringFrequency,totalDonatedCents')
  .eq('type', 'recurring')
  .eq('recurringFrequency', 'monthly');
if (donorError) throw donorError;

for (const donor of donors ?? []) {
  const { data: donations, error: donationError } = await db
    .from('donor_donations')
    .select('id,date,amountCents,note')
    .eq('donorId', donor.id)
    .order('date', { ascending: true });
  if (donationError) throw donationError;
  console.log(JSON.stringify({ donor, donations }));
}
