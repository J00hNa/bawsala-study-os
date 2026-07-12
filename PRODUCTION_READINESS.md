# Bawsala v16.0.1 Production Readiness

**Decision: conditional, not production-approved by repository evidence alone.**

No numeric readiness score is used. A number would imply measurement precision that the repository cannot establish. This document separates verified code evidence from environment-dependent proof.

## v16 continuity verification

- The study journey has an authoritative backend overview and atomic transaction endpoint.
- Idempotency is tested so a retried session transaction cannot duplicate records.
- Contextual actions are wired from resources, notes, homework, calendar events, errors, and flashcards into the same daily loop.
- Browser-visible sync state distinguishes local-only, syncing, pending, and synchronized states.
- Daily state is date-aware; stale records do not falsely complete today.

## Approved scope

The codebase is suitable for local development, controlled demonstrations, and a staging deployment after configuration. A limited single-instance pilot may proceed only after the conditional checklist below is completed and recorded by the operator.

## Not approved

The repository by itself does not approve:

- an unrestricted public launch;
- multi-instance deployment with the bundled SQLite store;
- claims that payments, email, Google OAuth, Calendar synchronization, alerts, or off-site backups work in a specific production account;
- claims of legal compliance or suitability for collecting minors’ data;
- claims of product-market fit, retention, educational impact, or community activity.

## Verified code evidence

The release contains concrete controls and automated checks for:

- session, CSRF, CSP, Host validation, request limits, and security logging;
- SQLite foreign keys, WAL configuration, incremental persistence, and backup hooks;
- one consolidated CSS source and deterministic generated bundles;
- local-reference, accessibility-marker, syntax, sanitizer, and storage-key checks;
- unit, study-engine, data-integrity, architecture, security, hardening, and server smoke suites;
- a focused four-step study loop driven by one shared decision engine and a separated secondary library;
- optional phone collection, no full date-of-birth collection in public signup, and explicit 13+ confirmation;
- honest labeling of local groups and external SchoolMind usage.

Static marker checks are kept separate from runtime proof. The release command runs real Chromium and backend integration suites, but external providers still require evidence from their actual accounts.

## Architecture boundary

The bundled state store is a **single-instance architecture**. `BAWSALA_INSTANCE_COUNT` must remain `1` unless persistence and coordination are replaced with services designed for multiple writers. The data directory must be persistent, writable, backed up, and monitored.

## Conditional GO checklist

A pilot may be approved only when all items are evidenced in the target environment:

1. Build, unit, security, integration, and browser suites complete without skipped mandatory paths.
2. HTTPS, canonical origin, Host allowlist, proxy trust, cookies, and security headers are verified from outside the network.
3. Signup, login, logout, password reset/recovery, export, deletion, and session revocation are tested with real accounts.
4. Mail, billing, OAuth, Calendar, alerts, and webhooks are either proven end to end or disabled and hidden.
5. A backup is uploaded off site, restored into isolation, and checked for integrity.
6. Privacy, terms, retention, support, and incident procedures are reviewed for the launch jurisdiction and audience.
7. Load and soak tests cover expected concurrency, slow storage, provider failures, and restart recovery.
8. Monitoring has an owner, actionable thresholds, and a tested notification route.

## Known unproven evidence

Real-provider delivery, production DNS and proxy behavior, browser automation in the target image, off-site restore, multi-device conflict recovery, load capacity, and legal review remain unproven until tested in the deployment environment.

The active static-asset budget is 64 KB gzip per JavaScript or CSS asset and 20 KB gzip per HTML page. Passing this transfer budget does not prove runtime responsiveness on low-end devices.
- Route budget: 500 KB raw / 140 KB gzip per route, including directly referenced local assets.

## Remaining risks

- Browser automation depends on a functioning Chromium runtime and can time out in constrained environments.
- A large `server.js` remains a maintainability risk even though backend tests cover important paths.
- Several optional providers cannot be proven without real credentials and external dashboards.
- Local-first and synchronized states still require conflict and recovery testing across multiple devices.
- The product still contains more secondary tools than the focused loop requires; usage data should determine what is removed next.
- A 13+ confirmation reduces accidental collection but does not replace age-assurance or legal review.

## Test evidence

Run from a clean checkout with the intended Node.js version:

```bash
npm run build
npm test
npm run check
npm run test:security
npm run test:integration
npm run test:frontend
npm run release:check
```

Record the date, commit/archive checksum, operating system, Node and Chromium versions, environment flags, and complete command output. Any timeout, skipped provider, or unavailable browser remains unproven evidence.

## Rollback

Before deployment, retain the previous application artifact and a verified database backup. Rollback must restore a version-compatible application and data snapshot together. Test the process in staging; do not invent it during an incident.

## External-provider proof

Mail, Stripe or another payment provider, Google OAuth, Calendar synchronization, alert webhooks, and off-site backup upload require external-provider proof. Source code and mock tests cannot establish account permissions, DNS, webhook routing, secret validity, quotas, or provider availability.

## Final judgment

Version 16 is materially more reliable and internally consistent than the previous release: the primary journey is smaller, the CSS cascade is consolidated, privacy collection is reduced, and circular scoring has been removed. It is still a staging-grade product until the conditional checklist is completed in the actual deployment environment.
