import { createClient } from '@supabase/supabase-js';

const baseUrl = process.env.APP_URL || 'http://localhost:3000';
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerPassword = process.env.INITIAL_OWNER_PASSWORD;
const ownerEmail = 'emary626@gmail.com';
const testEmail = `thv-password-flow-${Date.now()}@example.invalid`;
const firstPassword = `Temporary-${crypto.randomUUID()}!`;
const secondPassword = `Reset-${crypto.randomUUID()}!`;

if (!supabaseUrl || !publishableKey || !serviceRoleKey || !ownerPassword) throw new Error('Missing Supabase or owner-password configuration.');

const browserClient = createClient(supabaseUrl, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function callOwnerProcedure(path, input, token) {
  const response = await fetch(`${baseUrl}/api/trpc/${path}?batch=1`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ 0: { json: input } }),
  });
  const payload = await response.text();
  if (!response.ok || payload.includes('error')) throw new Error(`${path} failed (${response.status}): ${payload}`);
  return payload;
}

try {
  const { data: ownerAuth, error: ownerError } = await browserClient.auth.signInWithPassword({ email: ownerEmail, password: ownerPassword });
  if (ownerError || !ownerAuth.session?.access_token) throw new Error(ownerError?.message || 'Owner password sign-in failed.');
  const ownerToken = ownerAuth.session.access_token;

  await callOwnerProcedure('teamAccess.createAccount', { email: testEmail, displayName: 'Password Flow Test', password: firstPassword }, ownerToken);
  const { error: firstSignInError } = await browserClient.auth.signInWithPassword({ email: testEmail, password: firstPassword });
  if (firstSignInError) throw new Error(`Created password account could not sign in: ${firstSignInError.message}`);

  await callOwnerProcedure('teamAccess.setPassword', { email: testEmail, password: secondPassword }, ownerToken);
  await browserClient.auth.signOut();
  const { error: secondSignInError } = await browserClient.auth.signInWithPassword({ email: testEmail, password: secondPassword });
  if (secondSignInError) throw new Error(`Reset password could not sign in: ${secondSignInError.message}`);

  console.log('Owner account creation and password reset verification passed.');
} finally {
  const { data: users } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const testUser = (users?.users ?? []).find(user => user.email?.toLowerCase() === testEmail);
  if (testUser) await adminClient.auth.admin.deleteUser(testUser.id);
  await adminClient.from('allowed_team_emails').delete().eq('email', testEmail);
  await browserClient.auth.signOut();
}
