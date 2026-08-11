import { describe, expect, it } from 'vitest';
import { getSupabaseServerClient } from './supabase';

describe('Supabase team access hardening migration', () => {
  it('exposes the active owner-managed allowlist fields', async () => {
    const { data, error } = await (getSupabaseServerClient()
      .from('allowed_team_emails') as any)
      .select('email, role, is_active, invited_at')
      .eq('email', 'liz@thehumblevillage.org')
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toMatchObject({
      email: 'liz@thehumblevillage.org',
      role: 'owner',
      is_active: true,
    });
  });
});
