# Access Security Sources

## Supabase invitation-only enrollment

Supabase documents that invitations are an administrative action. An authorized server using the secret key can call `supabase.auth.admin.inviteUserByEmail()` and set the invite redirect URL. This creates an unconfirmed user for an invited email; the invite link expires according to the email OTP expiration setting, which defaults to one hour. The secret/service-role key bypasses Row Level Security and must never be exposed to browser code. [Supabase Users documentation](https://supabase.com/docs/guides/auth/users)

## CAPTCHA / bot protection

Supabase supports hCaptcha and Cloudflare Turnstile for sign-in, sign-up, and password reset flows. The project owner enables CAPTCHA under **Settings → Authentication → Bot and Abuse Protection**, configures the provider secret key, and the browser passes the resulting CAPTCHA token as `captchaToken` in its authentication request. [Supabase CAPTCHA documentation](https://supabase.com/docs/guides/auth/auth-captcha)

## Session controls

Supabase documents that sessions are persistent by default. Pro plans and above can enforce a maximum session lifetime, inactivity timeout, and a single active session per user. Supabase recommends keeping access tokens at least five minutes and generally at the default one-hour duration. [Supabase Sessions documentation](https://supabase.com/docs/guides/auth/sessions)

## Implementation decision

The THV dashboard will retain passwordless email links for invited and active team members only. Owner-managed allowlist status will be enforced by the Netlify server API. CAPTCHA is prepared as a configuration-backed optional gate so it can be enabled after the owner creates a Cloudflare Turnstile or hCaptcha site key.
