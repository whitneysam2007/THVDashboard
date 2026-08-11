import { describe, expect, it } from 'vitest';
import { magicLinkErrorMessage } from './authErrors';
import { passwordLoginErrorMessage } from './authErrors';

describe('magic-link error messages', () => {
  it('explains Supabase email throttling without implying access was revoked', () => {
    expect(magicLinkErrorMessage({ status: 429, message: 'email rate limit exceeded' })).toContain('limit reached');
  });

  it('explains invitation-only enrollment failures', () => {
    expect(magicLinkErrorMessage({ message: 'Signups not allowed' })).toContain('owner invitation');
  });

  it('uses a neutral message for invalid password credentials', () => {
    expect(passwordLoginErrorMessage({ message: 'Invalid login credentials' })).toBe('Email or password is incorrect.');
  });
});
