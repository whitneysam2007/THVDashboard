export const MIN_PASSWORD_LENGTH = 14;

export function validatePasswordChange(currentPassword: string, newPassword: string, confirmation: string) {
  if (!currentPassword) return 'Enter your current password.';
  if (newPassword.length < MIN_PASSWORD_LENGTH) return `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (newPassword !== confirmation) return 'New password and confirmation do not match.';
  if (newPassword === currentPassword) return 'Choose a new password that differs from your current password.';
  return null;
}
