#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createStateStore, readBackupFile } = require('../lib/state-store');

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}
function defaultDb() {
  return {
    version: 13.4,
    createdAt: new Date().toISOString(),
    appSettings: {}, users: {}, sessions: {}, snapshots: {}, audit: [], securityEvents: [], paymentEvents: [],
    checkoutSessions: {}, invoices: {}, oauthPending: {}, emailVerificationTokens: {}, passwordResetTokens: {},
    authFailures: {}, mailOutbox: [], calendarSync: {}, idempotencyRecords: {}
  };
}

const backup = path.resolve(arg('--backup') || '');
const dataDir = path.resolve(arg('--data-dir') || process.env.BAWSALA_DATA_DIR || '');
const force = process.argv.includes('--force');
if (!backup || !dataDir || !force) {
  console.error('Usage: node tools/restore-backup.mjs --backup /absolute/backup.json --data-dir /absolute/data-dir --force');
  process.exit(2);
}
if (!fs.existsSync(backup)) {
  console.error(JSON.stringify({ ok: false, error: 'BACKUP_NOT_FOUND', backup }));
  process.exit(2);
}
try {
  readBackupFile(backup, defaultDb);
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const store = createStateStore({ dataDir, defaultDb });
  const result = store.restore(backup);
  store.close?.();
  console.log(JSON.stringify({ ...result, dataDir }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.code || error.message || 'RESTORE_FAILED' }));
  process.exit(1);
}
