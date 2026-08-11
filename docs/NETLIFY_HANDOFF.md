# THV Donor Dashboard — Netlify Handoff

The dashboard is prepared as a **Vite frontend with a Netlify serverless tRPC API**. Supabase provides both passwordless email authentication and the production PostgreSQL database. The current live data has been imported and reconciled in Supabase; the original Manus database remains unchanged as a fallback.

| Imported record type | Verified count |
|---|---:|
| Donors | 16 |
| Donations | 19 |
| Interactions | 22 |
| Tasks | 49 |
| Trips | 6 |
| Trip attendees | 3 |
| Initiatives | 4 |

## Netlify configuration

Connect the `main` branch of `whitneysam2007/THVDashboard` to a Netlify site. Netlify reads `netlify.toml`, so use the build command `pnpm run build` and publish directory `dist/public`. The API is handled by `netlify/functions/api.ts`; the configured rewrite routes all `/api/trpc/*` requests to that function.

Set the following environment variables in **Netlify → Site configuration → Environment variables**. Their values must come from **Supabase → Project Settings → API**. The service-role key must be scoped to server functions only and must never be placed in a `VITE_` variable.

| Variable | Scope | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser and functions | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser and functions | Browser-safe Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Functions only | Secured server-side tRPC data access |

## Supabase magic-link configuration

In **Supabase → Authentication → URL Configuration**, set **Site URL** to the final Netlify domain and add that same URL to the permitted **Redirect URLs**. Add the custom domain there as well after it is connected. The login screen calls Supabase `signInWithOtp`, which sends an email link to the approved team addresses.

The approved list is stored in the Supabase `allowed_team_emails` table and is enforced again by the server API after Supabase authenticates a user. The listed addresses include Liz, Lauren, Anna, Brenley, Emily, Amy, and Kirsten’s approved addresses. Unlisted users can request an email link, but cannot access dashboard data through the protected API.

## Before inviting the team

Open the deployed site and send a magic link to one approved email. Confirm that the dashboard loads the 16 migrated donors and that a read-only page refresh preserves the data. Then create and complete one harmless test task to confirm the deployed API can write to Supabase. Delete that test task once verified.

## Data safety

The private migration export resides outside the Git repository at `/home/ubuntu/thv-production-migration/manus-dashboard-export.json`; it is not committed to GitHub. The migration can be safely re-run because records preserve their existing IDs and use upsert behavior. Do not copy that export into the repository.

## References

The deployment and authentication decisions follow the official guides listed in [`production-integration-sources.md`](./production-integration-sources.md).
