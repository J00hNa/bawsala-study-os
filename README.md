# Bawsala Study OS v16.0.1 — Focused Daily Loop

Bawsala is an Arabic-first study web application. Version 16 keeps the focused product boundary and hardens the daily loop so the same rules drive the dashboard, study room, and persistent context rail:

1. define one mission;
2. run a focus session;
3. record one actionable error;
4. close the day and prepare the next step.

Secondary tools still exist in a separate library. They are support tools, not the product’s main navigation.

## What changed in v16.0.1

- Added a shared cross-page study context. A homework, note, resource, calendar event, error, or due-card queue now remains attached while the student moves between pages.
- Added `GET /api/study/overview` for a single authoritative view of today and `POST /api/study/transactions` for atomic, idempotent study mutations.
- Rebuilt the global study rail to show the active context, next action, four-step progress, sync truth, and warnings instead of disconnected counters.
- Added an execution journey card to the dashboard and contextual “start as a session” actions across resources, notebook, calendar, flashcards, and homework.
- Fixed daily semantics: yesterday’s mission, errors, and sessions no longer close today’s loop.
- Added domain, journey, idempotency, profile-scope, and end-to-end backend tests.

## Product boundaries

The repository includes accounts, local-first study data, optional server synchronization, calendar, billing hooks, administration, backups, and operational endpoints. Their presence does not prove product-market fit or production readiness.

The focused product promise is the daily execution loop. Maps, flashcards, notes, calculators, BTEC references, and external resources are a secondary library.

## Requirements

- Node.js 22 or newer
- A persistent writable volume for production SQLite
- One application instance when using the bundled SQLite state store
- HTTPS and a reverse proxy for public production deployment
- Node.js 22 is the pinned production baseline (`.nvmrc` and Docker); Node.js 24 is also exercised in CI

## Install and run

```bash
npm install
npm run build
npm test
npm run check
npm start
```

The default development address is printed by the server. Production configuration should be based on `.env.example`.

## Verification

```bash
npm run check:all
npm run test:security
npm run test:integration
npm run release:check
```

Browser tests require a working Chromium installation. `npm run release:check` now runs real Chromium layout/interaction checks plus production-hardening and server smoke tests; a browser failure or timeout fails the release command.

## Deployment constraints

The bundled persistence architecture is single-instance SQLite. Do not deploy multiple application instances against the same data directory. Public signup should remain disabled until email delivery, abuse controls, privacy text, and account-recovery flows are verified in the target environment.

Supported deployment: a long-running Node.js process or the included container with a persistent volume. The repository intentionally does not ship a Vercel/serverless configuration because the bundled stateful SQLite architecture is incompatible with ephemeral multi-instance execution.

Required production controls include:

- persistent writable `BAWSALA_DATA_DIR`;
- explicit public origin and Host allowlist;
- independent high-entropy secrets, including `BAWSALA_BACKUP_ENCRYPTION_KEY`;
- a one-time `X-Bawsala-Setup-Token` bootstrap with `BAWSALA_ALLOW_ADMIN_BOOTSTRAP_HEADER=true`, disabled immediately after the first administrator is created;
- trusted-proxy configuration matching the actual proxy;
- tested encrypted off-site backups;
- provider webhook verification for billing and mail;
- monitoring and alert delivery tested outside the application process.

See `.env.example` for the configuration surface.

## Data and privacy

Signup requires only the fields needed for account creation and study personalization. Phone is optional. The public signup flow does not collect a full date of birth or national ID. Users must confirm they are at least 13. This code change reduces collection; it is not a substitute for a jurisdiction-specific privacy and child-safety review.

SchoolMind opens an external domain. Bawsala does not claim to control it or synchronize data with it. Users should review that service separately before entering personal or school information.

## Backup and restore

The server supports local encrypted backup artifacts and optional off-site upload. A backup feature is not evidence of recoverability. Before launch, operators must create a backup, restore it into an isolated environment, verify record counts and authentication behavior, and document the rollback procedure.

Use the provided restore command only with a reviewed backup:

```bash
npm run backup:restore -- /path/to/backup-file
```

## API documentation

Generate the OpenAPI document with:

```bash
npm run docs:generate
```

The generated file is `docs/openapi.json`.

## Repository contract

The release archive intentionally keeps two Markdown documents: this README and `PRODUCTION_READINESS.md`. Generated bundles are under `assets/dist/`; source assets remain under `assets/css/` and `assets/js/`.

## Health and monitoring

The server exposes liveness, readiness, storage, and operational health endpoints. Detailed health output must be protected with the configured token. Treat these endpoints as signals, not as a replacement for external uptime checks, log collection, and alert ownership.
