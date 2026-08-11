import { describe, expect, it } from 'vitest';
import { dashboardAccessGranted } from './accessGate';

describe('dashboard access gate', () => {
  it('allows only a session that the server validates for the same email', () => {
    expect(dashboardAccessGranted({ email: 'liz@thehumblevillage.org' }, { email: 'LIZ@THEHUMBLEVILLAGE.ORG' })).toBe(true);
  });

  it('blocks an inactive or unapproved session when the server returns no allowed user', () => {
    expect(dashboardAccessGranted({ email: 'former-member@example.org' }, null)).toBe(false);
  });

  it('blocks a server result for a different account', () => {
    expect(dashboardAccessGranted({ email: 'liz@thehumblevillage.org' }, { email: 'other@example.org' })).toBe(false);
  });
});

