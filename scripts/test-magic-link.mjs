import { createClient } from '@supabase/supabase-js';

const email = (process.argv[2] ?? '').trim().toLowerCase();
if (!email) throw new Error('Usage: node scripts/test-magic-link.mjs <email>');

const url = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !publishableKey) throw new Error('Supabase browser credentials are not configured.');

const supabase = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: false,
    emailRedirectTo: 'https://thvdonordashboard.netlify.app',
  },
});

console.log(JSON.stringify(error ? { status: error.status, name: error.name, message: error.message } : { status: 'sent' }));
