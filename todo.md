# THV Donor Dashboard — TODO

- [x] Donor card: removed the "2023–2026" year-range label from the Donation History header
- [x] Donor cards: third line consistently shows the total lifetime amount given, including inactive donors
- [x] Auto-generated tax receipt tasks: February receipt appears only for years when the donor started on or before that February
- [x] Donor cards: show an explicit $0 lifetime-giving amount instead of an em dash when no donations are recorded
- [x] Donor dashboard header: show total contributed in the current calendar year, automatically updating each January 1
- [x] Fix donor-card lifetime totals so recorded gifts, including Mike Wynn’s $10,000 donation, display correctly
- [x] Add a header indicator for expected recurring donor annual amount (Recurring donors only; monthly amount × 12 or annual amount × 1)
- [x] Donor card: renamed "Cadence (months)" to "Communication cadence (months)" in both donor edit and add forms
- [x] Annual report auto-tasks: show the preceding reporting year in the label (for example, March 1, 2026 → Annual Report (2025 report))
- [x] Donor Journey recurring tasks: bright fig for outstanding work; greyed fig for future and completed work, with completion denoted only by the existing check/strikethrough/details
- [x] Donor cards: show the earliest outstanding manually added task plus its due date; otherwise fall back to the next-contact date
- [x] Statuses: removed Lapsed from donor status logic and filters; substantially overdue relationships remain At Risk until the team marks them Inactive
- [x] Donor dashboard: added an Upcoming tasks filter that sorts card priority dates from soonest to farthest
- [x] Donor Journey: made the muted fig used for future and completed recurring tasks roughly 40% less greyed out
- [x] Donor cards: replaced the missing-information caution triangle with a muted contact-card icon and small dot
- [x] Opened donor card: kept the missing-information message but used the muted contact-card icon and a gentle warm-yellow banner
- [x] Donor modal: moved the edit form to immediately above Donation History
- [x] Donor dashboard: matched the missing-information contact-card indicator to the opened card’s gentle warm-yellow color treatment
- [x] Pushed the latest checkpointed dashboard code to the connected THVdashboard GitHub repository
- [x] Resumed and completed the GitHub push of the latest dashboard source to THVdashboard
- [x] Audited Manus-specific dependencies before Netlify deployment
- [x] Prepared the Supabase schema and safely migrated current donor, trip, task, and initiative data with exact count reconciliation
- [x] Replaced Manus-only authentication with Supabase passwordless magic-link access for the approved team
- [x] Added Netlify function routing, production environment-variable documentation, and deployment handoff instructions
- [ ] Validate a production build and push the Netlify-ready code to THVDashboard
- [x] Migrated the application from Manus MySQL/OAuth to the connected Supabase PostgreSQL database and magic-link authentication

## Active bug

- [x] Tasks page: per-donor "View completed tasks (n)" button revealing that donor's finished tasks with who + when, plus Reopen and delete; a "View all completed" button at top expands every donor at once
- [x] Donor card timeline: "View completed (n)" button in the Donor Journey header; completed tasks are collapsed out of the timeline by default so the card shows only what still needs doing

- [x] Donors page: removed the five status summary boxes at the top
- [x] Tasks page: removed the duplicated stacked header (page was double-wrapped in DashboardLayout — AuthGuard already provides it)
- [x] Tasks page: added a color legend at the bottom (blue / gold / green / red overdue)
- [x] Initiatives Gantt: single uniform espresso bar color, status legend removed
- [x] Initiatives Gantt: each bar now shows its END DATE above it
- [x] Initiatives Gantt: removed the red today line
- [x] Initiatives Gantt: fixed axis dates — months snap to real boundaries, full year shown, gridlines align with bars, dates parsed as local midnight to stop UTC day-shift

- [x] CRITICAL (recurring, 4+ failed fix attempts): "Mark done" does not cross off a task. FIXED — root cause was unscoped donor_tasks primary keys.
  - [x] Step 1: DB write DOES persist. `donor_tasks` has correctly completed rows.
  - [x] ROOT CAUSE FOUND: auto-task PRIMARY KEY is the bare slug (`newsletter`, `welcome-note`) not scoped by donor. Two donors cannot both complete the same auto-task — the second write overwrites the first row's donorId. Rows collide.
  - [x] Step 2: Read path normalized — getTasksForDonor and getAllTasks now strip the donor scope so client ids match generateAutoTasks() slugs
  - [x] Step 3: upsertTask now writes donor-scoped keys; deleteTask accepts donorId
  - [x] Step 4: 6 vitest tests in server/taskKeys.test.ts + live DB integration check (two donors completed the same slug independently — PASS)
  - [x] Step 5: Migrated 5 existing auto-task rows to scoped keys, no completed work lost
  - [x] Step 6: DonorJourney handleDeleteTask now actually deletes the DB row instead of only filtering local state

## Completed

- [x] MySQL upgrade (8 tables, tRPC CRUD, Manus OAuth)
- [x] Donor cards: status, types, tiers, flags, donation history, journey timeline
- [x] Trips: dates, team members, donor attendees, full attendee CRUD with skills/flags
- [x] Initiatives: Gantt + card list, full CRUD
- [x] Tasks page: all tasks across donors, grouped, collapsible, edit + delete + mark done UI
