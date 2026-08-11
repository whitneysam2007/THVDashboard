import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

describe('initial owner password', () => {
  it('authenticates the approved owner through Supabase password sign-in', async () => {
    const password = process.env.INITIAL_OWNER_PASSWORD;
    const url = process.env.VITE_SUPABASE_URL;
    const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    expect(password).toBeTruthy();
    expect(url).toBeTruthy();
    expect(publishableKey).toBeTruthy();

    const supabase = createClient(url!, publishableKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'emary626@gmail.com',
      password: password!,
    });

    expect(error).toBeNull();
    expect(data.user?.email).toBe('emary626@gmail.com');
    await supabase.auth.signOut();
  });
});
