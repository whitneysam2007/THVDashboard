# The Humble Village — Donor Relations Dashboard

Internal donor relationship management dashboard for The Humble Village team.

## Stack

- React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Wouter (client-side routing)
- localStorage persistence (no backend required)
- Vite build system

## Local Development

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

### Netlify (recommended)

1. Connect this repo to Netlify
2. Build command: `pnpm run build`
3. Publish directory: `dist/public`
4. Add environment variables from `.env.example` in Netlify site settings
5. Push to `main` to trigger automatic deploys

### GitHub Actions (included)

The `.github/workflows/deploy.yml` workflow auto-deploys on push to `main`.
Add these secrets to your GitHub repo settings:
- `NETLIFY_AUTH_TOKEN` — from Netlify user settings
- `NETLIFY_SITE_ID` — from Netlify site settings

## Auth

v1 uses a simple email gate stored in `localStorage`. Any email entered grants access.
For production hardening, replace with Netlify Identity or Supabase magic links.

## Data

All data is stored in `localStorage` under the key `thv-dashboard-v1`.
When the real donor spreadsheet is ready, populate `client/src/lib/data.ts` with the actual records.

## Team

Authorized users: Liz, Lauren, Anna, Bradley

