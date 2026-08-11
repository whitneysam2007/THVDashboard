export function magicLinkErrorMessage(error: { status?: number; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? '';
  if (error?.status === 429 || message.includes('rate limit')) {
    return 'Sign-in email limit reached. Please wait before requesting another link, or contact the dashboard owner.';
  }
  if (message.includes('signups not allowed') || message.includes('signup is disabled')) {
    return 'This email needs an owner invitation before it can sign in.';
  }
  return 'We could not send an access link. Please contact the dashboard owner if you need access.';
}

export function passwordLoginErrorMessage(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? '';
  if (message.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (message.includes('email not confirmed')) return 'This account must be confirmed by the dashboard owner.';
  return 'We could not sign you in. Please contact the dashboard owner if you need access.';
}
