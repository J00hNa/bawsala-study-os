# Release Notes — 4.0.0 Hardening Rewrite

## Data safety

- IndexedDB transactional storage بدل localStorage state blob.
- namespace منفصل لكل حساب وanonymous profile.
- revisions، multi-tab conflict prevention، verified backups، quarantine، emergency drafts.
- import preview/confirmation/size/schema checks وrollback-safe destructive operations.

## Authentication and cloud

- official Supabase client مع PKCE وtab-scoped session.
- explicit account/anonymous copy flow.
- bounded server schema، sync rate limits، request IDs، 90-day sync audit.
- immutable cloud backups وrestore UI.
- delayed account deletion مع recent reauthentication، cancellation وcron purge.

## Product correctness

- timestamp timer، reload recovery، full-minute rewards.
- flashcard relearning and rescheduling، unbiased shuffle، Unicode Arena exact matching، per-question history.
- 24-hour planner، durations، overlap detection، IDs بدل title matching.
- CRUD/undo، notifications read model، accurate empty profile، timezone setting، targeted rendering/search debounce.

## UI/UX/accessibility

- first-run onboarding.
- responsive mobile planner/dashboard/sidebar.
- keyboard focus management، inert dialogs، skip link، 44px targets، readable minimums.
- light/system/high-contrast/reduced-motion/RTL.
- backup manager، conflict comparisons، privacy explanation، non-blocking confirmations.

## Platform

- strict CSP without unsafe inline styles/scripts.
- exact Supabase connect origin generated from config.
- production `dist/` with content-hashed JS/CSS.
- update-consent Service Worker with a static allowlist.
- ESLint, Vitest, smoke tests, package lock, CI, npm audit and MIT license.
