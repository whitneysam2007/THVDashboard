import { describe, expect, it } from 'vitest';
import { validatePasswordChange } from './passwordChange';

describe('validatePasswordChange', () => {
  it('requires the current password, a distinct 14-character new password, and confirmation', () => {
    expect(validatePasswordChange('', 'A safer password!1', 'A safer password!1')).toBe('Enter your current password.');
    expect(validatePasswordChange('Old password!1', 'short', 'short')).toContain('at least 14');
    expect(validatePasswordChange('Old password!1', 'A safer password!1', 'not the same')).toContain('do not match');
    expect(validatePasswordChange('A safer password!1', 'A safer password!1', 'A safer password!1')).toContain('differs');
    expect(validatePasswordChange('Old password!1', 'A safer password!1', 'A safer password!1')).toBeNull();
  });
});
