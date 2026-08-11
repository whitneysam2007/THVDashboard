# Team Access and Security Operations

## Access model

The dashboard remains passwordless. Only an **active, approved email address** can access dashboard data. The Netlify server verifies the Supabase identity token and then checks `allowed_team_emails`; browser clients cannot query relationship data directly because Row Level Security remains enabled with no browser-facing table policies.

Liz is the sole **owner**. Owners can open **Team Access** from the dashboard sidebar to invite a person, pause access, restore access, or remove an email from the approved list. Pausing or removing a person takes effect on their next protected API request. The owner cannot pause or remove her own access from the dashboard.

## Invite a new team member

Open **Team Access**, enter the person’s name and email, then select **Send invitation**. The dashboard adds that email to the active access list and uses Supabase’s server-side invitation flow to send a one-time enrollment email. After accepting the invitation, the person signs in normally with an email link.

Use **Pause** for temporary leave or access review. Use **Remove** only when the person should no longer be in the approved access list.

## Required Supabase settings

In **Supabase → Authentication → Providers → Email**, turn off **Allow new users to sign up** after the deployment that includes Team Access is live. This makes the authentication system invitation-first. The dashboard login also sends `shouldCreateUser: false`, so the normal login screen cannot create new users. The owner confirmed this Supabase setting was disabled on 2026-08-11; review it whenever Supabase authentication settings are changed.

Keep the production URL settings below in **Supabase → Authentication → URL Configuration**:

| Setting | Value |
|---|---|
| Site URL | `https://thvdonordashboard.netlify.app` |
| Redirect URL | `https://thvdonordashboard.netlify.app` |
| Redirect URL pattern | `https://thvdonordashboard.netlify.app/**` |

## Optional bot protection

The login screen is ready for **Cloudflare Turnstile**. This protection is optional until it is configured; without its site key, the normal passwordless login remains unchanged.

1. Create a Turnstile widget for `thvdonordashboard.netlify.app` in Cloudflare.
2. In **Supabase → Authentication → Bot and Abuse Protection**, enable CAPTCHA, select Turnstile, paste the Turnstile **secret key**, and save.
3. In **Netlify → Site configuration → Environment variables**, add `VITE_TURNSTILE_SITE_KEY` with the Turnstile **site key**. It is browser-safe, so do not mark it secret.
4. Trigger a new deploy. The verification widget will appear automatically above the login button.

## Session settings

In **Supabase → Authentication → Sessions**, leave the JWT expiration at the default one hour. If the project plan supports session controls, set an **inactivity timeout of 14 days** and a **maximum session lifetime of 30 days**. Leave single-session enforcement off unless THV specifically wants a person’s second device to sign out the first; allowing both a work computer and phone is generally less disruptive for this team.

## Data safety

The `SUPABASE_SERVICE_ROLE_KEY` is server-only. It must remain in Netlify’s secret environment variables and never be given a `VITE_` prefix, placed in frontend code, or pasted into a message.

## Sources

The implementation follows the official Supabase guidance saved in [`access-security-sources.md`](./access-security-sources.md).
