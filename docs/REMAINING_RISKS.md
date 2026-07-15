# Remaining Risks and Redesign Triggers

## Architectural limits

- Cloud sync remains a bounded full-state JSON document (1.3 MB). Migrate to domain tables or an event log before collaboration, shared classrooms, or large datasets.
- XP, credits, streaks, and achievements are client-controlled motivational signals. Move calculation and validation server-side before prizes, rankings, or financial value.
- Conflict handling blocks silent overwrite and shows revisions/timestamps, but it does not merge fields. Add a domain-aware diff/merge workflow before simultaneous collaborative editing.
- `app.js` remains large. Split it into domain services, view modules, and state selectors before adding another major feature area.
- Runtime validation and JSON Schema are present, but the full application is not compiled as TypeScript. Convert incrementally if the codebase becomes multi-developer.
- Trusted Types is not enforced. Keep the strict CSP and safe text rendering, and introduce a tested Trusted Types policy during the UI modularization.

## Deployment-dependent controls

- Turnstile, RLS, SMTP, redirect URLs, Edge Function secrets, Cron, and delayed deletion must be verified against a real staging Supabase project.
- Do not expose public signup until CAPTCHA and email flows pass abuse testing.
- Do not deploy source root. Publish only `dist/` after rebuilding with the final public config.

## Release blockers

Any of the following blocks production release: failed two-account isolation, failed stale-revision rejection, failed backup restore, CSP violation that breaks the app, Service Worker serving mismatched assets, deletion without recent reauthentication, or cloud configuration containing service-role credentials.
