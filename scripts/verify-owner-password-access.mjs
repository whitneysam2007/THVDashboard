import { createClient } from '@supabase/supabase-js';

const email = 'emary626@gmail.com';
const password = process.env.INITIAL_OWNER_PASSWORD;
const url = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const appUrl = process.env.APP_URL || 'http://localhost:3000';

if (!password || !url || !publishableKey) throw new Error('Owner password and Supabase browser credentials are required.');

const supabase = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError || !auth.session?.access_token) throw new Error(authError?.message || 'Owner password sign-in returned no access token.');

const input = encodeURIComponent(JSON.stringify({ 0: { json: null } }));
const response = await fetch(`${appUrl}/api/trpc/teamAccess.list?batch=1&input=${input}`, {
  headers: { authorization: `Bearer ${auth.session.access_token}` },
});
const payload = await response.text();
await supabase.auth.signOut();

if (!response.ok) throw new Error(`Owner Team Access API failed (${response.status}): ${payload}`);
if (!payload.includes('emary626@gmail.com')) throw new Error('Owner Team Access response did not include the owner record.');

console.log('Owner password sign-in and Team Access API verification passed.');
