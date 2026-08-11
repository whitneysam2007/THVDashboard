import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

describe('Supabase browser data isolation', () => {
  it('does not expose donor rows to an unauthenticated browser client', async () => {
    const projectUrl = process.env.VITE_SUPABASE_URL;
    const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!projectUrl || !publishableKey) throw new Error('Missing Supabase browser credentials for RLS test.');

    const browserClient = createClient(projectUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await browserClient.from('donors').select('id').limit(1);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
