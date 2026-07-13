# Release Notes — v4 Secure Cloud Edition

## Backend

- Supabase email/password authentication and recovery.
- Per-user PostgreSQL state with RLS and forced RLS.
- Atomic revision-based sync RPC with conflict detection.
- Server-side rolling backups.
- Authenticated account-deletion Edge Function with fail-closed origin policy.

## Frontend integration

- Local-first operation and offline continuity.
- Cloud status, account controls, manual sync, and conflict resolution.
- Local safety backups before cloud overwrites.
- Optional Cloudflare Turnstile for Auth abuse protection.
- Strict imported-state normalization and payload limits.

## Platform hardening

- CSP, HSTS, clickjacking protection, referrer restrictions, and Permissions Policy.
- Service Worker excludes all cross-origin API/Auth requests from caching.
- Public config is separated from server-only secrets.

## Deployment target

- Recommended: Cloudflare Pages for the static app and Supabase for Auth/Postgres/Edge Functions.
- The shipped `config.js` is intentionally blank; follow `docs/DEPLOYMENT.md` before cloud features can work.
