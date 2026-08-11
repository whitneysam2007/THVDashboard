import { describe, expect, it } from 'vitest';
import { canManageTeamMember, displayNameFromEmail, isActiveAllowedMember, normalizeTeamEmail } from './accessControl';

describe('team access controls', () => {
  it('normalizes approved emails before evaluating access', () => {
    expect(normalizeTeamEmail('  Liz@TheHumbleVillage.org ')).toBe('liz@thehumblevillage.org');
  });

  it('does not allow an owner to remove or disable their own access', () => {
    expect(canManageTeamMember('liz@thehumblevillage.org', 'LIZ@THEHUMBLEVILLAGE.ORG')).toBe(false);
    expect(canManageTeamMember('liz@thehumblevillage.org', 'anna@thehumblevillage.org')).toBe(true);
  });

  it('creates a readable default display name for a new invite', () => {
    expect(displayNameFromEmail('lauren.foulger@example.org')).toBe('Lauren Foulger');
  });

  it('rejects inactive and missing allowlist entries', () => {
    expect(isActiveAllowedMember({ is_active: true })).toBe(true);
    expect(isActiveAllowedMember({ is_active: false })).toBe(false);
    expect(isActiveAllowedMember(null)).toBe(false);
  });
});
