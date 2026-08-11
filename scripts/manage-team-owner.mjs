import { createClient } from '@supabase/supabase-js';

const email = (process.argv[2] ?? '').trim().toLowerCase();
const action = process.argv[3] ?? 'inspect';

if (!email || !['inspect', 'promote'].includes(action)) {
  throw new Error('Usage: node scripts/manage-team-owner.mjs <email> <inspect|promote>');
}

const url = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error('Supabase credentials are not configured.');

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

if (action === 'promote') {
  const { error } = await supabase
    .from('allowed_team_emails')
    .update({ role: 'owner', is_active: true })
    .eq('email', email);
  if (error) throw error;
}

const { data, error } = await supabase
  .from('allowed_team_emails')
  .select('email, display_name, role, is_active')
  .eq('email', email)
  .maybeSingle();
if (error) throw error;
if (!data) throw new Error(`No approved team record found for ${email}.`);

console.log(JSON.stringify(data));
