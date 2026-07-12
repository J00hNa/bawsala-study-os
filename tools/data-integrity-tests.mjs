import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
process.env.BAWSALA_BACKUP_ENCRYPTION_KEY = process.env.BAWSALA_BACKUP_ENCRYPTION_KEY || 'data-integrity-backup-key-32-characters-minimum';
const require = createRequire(import.meta.url);
const { migrateState, assertStateIntegrity, CURRENT_DATA_VERSION } = require('../lib/data-integrity');
const { createStateStore, readBackupFile } = require('../lib/state-store');

function defaultDb() {
  return { version: 1, createdAt: new Date().toISOString(), appSettings: {}, users: {}, sessions: {}, snapshots: {}, audit: [], securityEvents: [], paymentEvents: [], checkoutSessions: {}, invoices: {}, oauthPending: {}, emailVerificationTokens: {}, passwordResetTokens: {}, authFailures: {}, mailOutbox: [], calendarSync: {}, idempotencyRecords: {} };
}
const hash = 'a'.repeat(64);
const migrated = migrateState({ users: { u1: { id: 'wrong', email: 'A@EXAMPLE.COM', role: 'invalid', dateOfBirth: '2008-01-01', nationalIdNumber: 'secret-id' } }, sessions: { [hash]: { userId: 'missing' } } }, defaultDb);
assert.equal(migrated.version, CURRENT_DATA_VERSION);
assert.equal(migrated.users.u1.id, 'u1');
assert.equal(migrated.users.u1.email, 'a@example.com');
assert.equal(migrated.users.u1.role, 'student');
assert.equal('dateOfBirth' in migrated.users.u1, false);
assert.equal('nationalIdNumber' in migrated.users.u1, false);
assert.equal(Object.keys(migrated.sessions).length, 0);
assert.throws(() => assertStateIntegrity({ ...migrated, users: { ...migrated.users, u2: { id: 'u2', email: 'a@example.com', role: 'student' } } }), /DATA_DUPLICATE_EMAIL/);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bawsala-integrity-'));
process.env.BAWSALA_STORAGE = 'json';
const sourceDir = path.join(root, 'source');
const restoreDir = path.join(root, 'restore');
const store = createStateStore({ dataDir: sourceDir, defaultDb });
const state = store.load();
state.users.u1 = { id: 'u1', email: 'a@example.com', role: 'student', subscription: { plan: 'free', status: 'free' } };
store.save(state);
const backup = store.backup('test');
const backupPath = path.join(sourceDir, 'backups', backup.file);
assert.equal(readBackupFile(backupPath, defaultDb).users.u1.email, 'a@example.com');
const restored = createStateStore({ dataDir: restoreDir, defaultDb });
const result = restored.restore(backupPath);
assert.equal(result.ok, true);
assert.equal(restored.load().users.u1.id, 'u1');
assert.equal(restored.integrity().ok, true);
store.close(); restored.close();

let sqliteModule = null;
try { sqliteModule = await import('node:sqlite'); } catch (_) { sqliteModule = null; }
if (sqliteModule?.DatabaseSync) {
  process.env.BAWSALA_STORAGE = 'sqlite';
  const sqliteDir = path.join(root, 'sqlite-normalized');
  const sqliteStore = createStateStore({ dataDir: sqliteDir, defaultDb });
  const sqliteState = sqliteStore.load();
  sqliteState.users.u_sql = { id: 'u_sql', email: 'sqlite@example.com', role: 'student', createdAt: new Date().toISOString(), subscription: { plan: 'free', status: 'free' } };
  sqliteState.sessions['b'.repeat(64)] = { id: 'sess_sql', userId: 'u_sql', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString() };
  sqliteState.snapshots.u_sql = { keys: { 'study:calendar': [{ id: 'cal_sql', title: 'Normalized', type: 'task', date: '2026-07-10', track: 'all' }] }, updatedAt: new Date().toISOString(), schema: 5 };
  sqliteState.calendarSync.u_sql = { connected: true, encryptedRefreshToken: 'encrypted-test-value', updatedAt: new Date().toISOString() };
  sqliteStore.save(sqliteState);
  assert.equal(sqliteStore.info().normalizedSchema, true);
  assert.equal(sqliteStore.info().incrementalWrites, true);
  assert.equal(sqliteStore.integrity().lastSaveStats.inserts >= 3, true);
  const changedState = sqliteStore.load();
  changedState.users.u_sql.name = 'Incremental Update';
  sqliteStore.save(changedState);
  assert.equal(sqliteStore.integrity().lastSaveStats.changedRows, 1, 'A one-user update must not rewrite every normalized table.');
  const firstRate = sqliteStore.consumeRateLimit('test-rate', 60000, 2, 1000);
  const secondRate = sqliteStore.consumeRateLimit('test-rate', 60000, 2, 1001);
  const thirdRate = sqliteStore.consumeRateLimit('test-rate', 60000, 2, 1002);
  assert.equal(firstRate.allowed, true);
  assert.equal(secondRate.allowed, true);
  assert.equal(thirdRate.allowed, false);
  assert.equal(sqliteStore.acquireLease('test-job', 'owner-a', 60000, 2000), true);
  assert.equal(sqliteStore.acquireLease('test-job', 'owner-b', 60000, 2001), false);
  assert.equal(sqliteStore.releaseLease('test-job', 'owner-a'), true);
  assert.equal(sqliteStore.acquireLease('test-job', 'owner-b', 60000, 2002), true);
  assert.equal(sqliteStore.info().wholeStateBlob, false);
  const sqliteIntegrity = sqliteStore.integrity();
  assert.equal(sqliteIntegrity.sqliteOk, true);
  assert.equal(sqliteIntegrity.foreignKeysOk, true);
  assert.equal(sqliteIntegrity.tableCounts.users, 1);
  assert.equal(sqliteIntegrity.tableCounts.sessions, 1);
  sqliteStore.close();

  const dbx = new sqliteModule.DatabaseSync(path.join(sqliteDir, 'bawsala.sqlite'));
  assert.equal(Number(dbx.prepare("SELECT COUNT(*) AS count FROM app_state WHERE key='main'").get().count), 0, 'Normalized storage must not retain the legacy whole-state blob.');
  assert.equal(Number(dbx.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'").get().count) >= 10, true, 'Expected production indexes are missing.');
  assert.throws(() => dbx.prepare('INSERT INTO sessions(token_hash,user_id,data) VALUES(?,?,?)').run('c'.repeat(64), 'missing-user', '{}'), /FOREIGN KEY constraint failed/);
  dbx.close();

  const reopened = createStateStore({ dataDir: sqliteDir, defaultDb });
  assert.equal(reopened.load().users.u_sql.email, 'sqlite@example.com');
  assert.equal(reopened.load().snapshots.u_sql.keys['study:calendar'][0].title, 'Normalized');
  reopened.close();
}

fs.rmSync(root, { recursive: true, force: true });
console.log('Data integrity and backup restore tests passed.');
