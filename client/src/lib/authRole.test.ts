import { describe, expect, it } from 'vitest';
import { dashboardRoleForProfile } from './authRole';

describe('dashboardRoleForProfile', () => {
  it('preserves the server-verified admin role for owner navigation', () => {
    expect(dashboardRoleForProfile({ role: 'admin' })).toBe('admin');
  });

  it('defaults missing or non-owner profiles to member access', () => {
    expect(dashboardRoleForProfile(null)).toBe('user');
    expect(dashboardRoleForProfile({ role: 'user' })).toBe('user');
  });
});
