import { describe, expect, it } from 'vitest';
import { getSupabaseServerClient } from './supabase';

describe('owner password-account access', () => {
  it('keeps the approved owner active without coupling automated validation to a private password', async () => {
    const { data, error } = await (getSupabaseServerClient()
      .from('allowed_team_emails') as any)
      .select('email, role, is_active')
      .eq('email', 'emary626@gmail.com')
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toMatchObject({
      email: 'emary626@gmail.com',
      role: 'owner',
      is_active: true,
    });
  });
});
