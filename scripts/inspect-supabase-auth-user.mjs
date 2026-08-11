import { createClient } from '@supabase/supabase-js';

const email = (process.argv[2] ?? '').trim().toLowerCase();
if (!email) throw new Error('Usage: node scripts/inspect-supabase-auth-user.mjs <email>');

const url = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error('Supabase credentials are not configured.');

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (error) throw error;
const user = data.users.find(candidate => candidate.email?.toLowerCase() === email);

console.log(JSON.stringify(user ? {
  id: user.id,
  email: user.email,
  confirmedAt: user.confirmed_at,
  invitedAt: user.invited_at,
  lastSignInAt: user.last_sign_in_at,
  bannedUntil: user.banned_until,
} : null));
