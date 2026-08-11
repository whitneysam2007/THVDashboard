# Production Integration Sources

- [Supabase Passwordless Email Logins](https://supabase.com/docs/guides/auth/auth-email-passwordless): Magic Links are enabled by default. Configure the production Site URL and redirect URLs, and use `signInWithOtp` with an email redirect URL for passwordless access.
- [Netlify Environment Variables](https://docs.netlify.com/build/configure-builds/environment-variables/): Configure values in the Netlify UI rather than committing them. Runtime secrets should be accessed through serverless functions rather than embedded in browser code.
- [Netlify Express Deployment](https://docs.netlify.com/build/frameworks/framework-setup-guides/express/): Express APIs can run as Netlify Functions with `serverless-http` and API rewrites in `netlify.toml`.
- [Netlify Identity Setup](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/get-started/): Netlify Identity provides email invitation and password flows; this dashboard uses Supabase Auth instead because the approved team requested passwordless magic links.
- [Netlify Supabase Integration](https://docs.netlify.com/extend/install-and-use/setup-guides/supabase-integration/): A connected Supabase project supplies production environment variables to a Netlify site.
- [TiDB Cloud with Netlify](https://docs.pingcap.com/tidbcloud/integrate-tidbcloud-with-netlify/): Reviewed as an alternative MySQL-compatible route. Not selected because the connected Supabase project provides the required magic-link authentication and PostgreSQL database.
