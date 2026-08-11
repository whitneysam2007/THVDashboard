import { createClient } from '@supabase/supabase-js';

const email = 'emary626@gmail.com';
const password = process.env.INITIAL_OWNER_PASSWORD;
const url = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!password || password.length < 14) throw new Error('INITIAL_OWNER_PASSWORD must be set and at least 14 characters.');
if (!url || !serviceRoleKey) throw new Error('Supabase server credentials are required.');

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: users, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw new Error(listError.message);
const owner = users.users.find(user => user.email?.toLowerCase() === email);
if (!owner) throw new Error(`No Supabase auth user found for ${email}.`);

const { error: updateError } = await supabase.auth.admin.updateUserById(owner.id, {
  password,
  email_confirm: true,
});
if (updateError) throw new Error(updateError.message);

console.log(`Password authentication configured for ${email}.`);

