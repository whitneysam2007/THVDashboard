-- Access hardening: owner-managed team access and invitation-first enrollment.

alter table public.allowed_team_emails
  add column if not exists role text not null default 'member'
    check (role in ('owner', 'member')),
  add column if not exists is_active boolean not null default true,
  add column if not exists invited_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.allowed_team_emails
set role = 'owner', is_active = true, updated_at = now()
where email = 'liz@thehumblevillage.org';

-- RLS remains enabled. No browser-facing table policies are added because all
-- dashboard data and team management travel through the authenticated server API.
alter table public.allowed_team_emails enable row level security;

