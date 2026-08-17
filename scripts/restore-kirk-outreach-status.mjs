import { createClient } from '@supabase/supabase-js';

const projectUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!projectUrl || !serviceRoleKey) throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const supabase = createClient(projectUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: donors, error: lookupError } = await supabase.from('donors').select('id,name,lastContactDate,manuallyInactive,cadenceDays').ilike('name', '%kirk%');
if (lookupError) throw new Error(lookupError.message);
if (!donors?.length) throw new Error('No Kirk donor record found.');
if (donors.length !== 1) throw new Error(`Expected one Kirk record, found: ${donors.map(donor => donor.name).join(', ')}`);
const donor = donors[0];

if (process.env.APPLY === '1') {
  const { error: updateError } = await supabase
    .from('donors')
    .update({ manuallyInactive: false, lastContactDate: '2026-06-01', updatedAt: new Date().toISOString() })
    .eq('id', donor.id);
  if (updateError) throw new Error(updateError.message);
}

console.log(JSON.stringify({ applied: process.env.APPLY === '1', donor: donor.name, lastContactDate: '2026-06-01', manuallyInactive: false, cadenceDays: donor.cadenceDays }, null, 2));
