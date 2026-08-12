import { createClient } from '@supabase/supabase-js';

const email = 'emary626@gmail.com';
const displayName = 'Liz';
const url = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) throw new Error('Supabase server credentials are required.');

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: users, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw new Error(listError.message);

const owner = users.users.find(user => user.email?.toLowerCase() === email);
if (!owner) throw new Error(`No Supabase auth user found for ${email}.`);

const { data: accessRow, error: accessError } = await supabase
  .from('allowed_team_emails')
  .select('email, display_name, role, is_active')
  .eq('email', email)
  .single();
if (accessError) throw new Error(accessError.message);

console.log(JSON.stringify({
  before: {
    accessDisplayName: accessRow.display_name,
    authDisplayName: owner.user_metadata?.full_name ?? null,
    role: accessRow.role,
    isActive: accessRow.is_active,
  },
}, null, 2));

if (process.env.APPLY !== '1') {
  console.log('Inspection only. Re-run with APPLY=1 to update the owner display name.');
  process.exit(0);
}

const { error: accessUpdateError } = await supabase
  .from('allowed_team_emails')
  .update({ display_name: displayName, updated_at: new Date().toISOString() })
  .eq('email', email);
if (accessUpdateError) throw new Error(accessUpdateError.message);

const { error: authUpdateError } = await supabase.auth.admin.updateUserById(owner.id, {
  user_metadata: { ...owner.user_metadata, full_name: displayName },
});
if (authUpdateError) throw new Error(authUpdateError.message);

console.log(`Updated ${email} to display as ${displayName} in Team Access and Supabase Auth.`);
