# Netlify Blank-Screen Investigation

On 2026-08-11, the live site at `https://thvdonordashboard.netlify.app/` returned the application document title but rendered no visible application elements. Browser inspection found no interactive elements and no emitted console output at that point. The HTML response was saved for asset and environment inspection at `/home/ubuntu/browser_html/thvdonordashboard_netlify_app_page_1786475055311.html`.

The next investigation step is to inspect the deployed entry script and browser network activity, with particular attention to environment variables required by the Supabase browser client.

## Confirmed root cause

The deployed JavaScript bundle contains `const eN=void 0,tN=void 0;throw new Error("Supabase browser configuration is missing.")`. This proves that `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` were unavailable when Netlify built the deployed frontend. Because Vite embeds `VITE_` values at build time, the existing top-level client guard aborts before React can render the sign-in screen, producing the blank page.

The required production action is to add both browser-safe variables in Netlify, then trigger a new deployment. The app should also be changed to render a clear configuration message rather than throwing during module import if values are absent.
