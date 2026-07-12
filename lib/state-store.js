'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { migrateState, assertStateIntegrity, integritySummary, CURRENT_DATA_VERSION } = require('./data-integrity');

const JSON_FILE = 'db.json';
const SQLITE_FILE = 'bawsala.sqlite';
const LEGACY_STATE_KEY = 'main';
const STORAGE_MODE = 'normalized-v2';
const BACKUP_DIR = 'backups';
const BACKUP_KEEP = Math.max(3, Math.min(100, Number(process.env.BAWSALA_BACKUP_KEEP || 20)));
const BACKUP_MAX_BYTES = Math.max(1024 * 256, Math.min(1024 * 1024 * 25, Number(process.env.BAWSALA_BACKUP_MAX_BYTES || 1024 * 1024 * 8)));
const BACKUP_SECRET = String(process.env.BAWSALA_BACKUP_ENCRYPTION_KEY || '');
const ALLOW_LEGACY_PLAINTEXT_BACKUPS = String(process.env.BAWSALA_ALLOW_LEGACY_PLAINTEXT_BACKUPS || '').toLowerCase() === 'true';

function nowIso() { return new Date().toISOString(); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function sha256(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }
function json(value) { return JSON.stringify(value ?? null); }
function parseJson(value, fallback) {
  try { return value === null || value === undefined || value === '' ? fallback : JSON.parse(value); }
  catch (_) { return fallback; }
}
function objectMap(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function array(value) { return Array.isArray(value) ? value : []; }
function safeLabel(value) { return String(value || 'manual').replace(/[^a-zA-Z0-9_.-]/g, '-').replace(/-+/g, '-').slice(0, 60) || 'manual'; }

function atomicWriteFile(file, payload) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  try { fs.chmodSync(path.dirname(file), 0o700); } catch (_) {}
  const tmp = file + '.tmp.' + process.pid + '.' + Date.now();
  let fd = null;
  try {
    fd = fs.openSync(tmp, 'w', 0o600);
    fs.writeFileSync(fd, payload);
    fs.fsyncSync(fd);
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
  try {
    const dfd = fs.openSync(path.dirname(file), 'r');
    try { fs.fsyncSync(dfd); } finally { fs.closeSync(dfd); }
  } catch (_) {}
}

function backupDirectory(dataDir) { return path.join(dataDir, BACKUP_DIR); }
function backupFileName(label) { return `state-${new Date().toISOString().replace(/[:.]/g, '-')}-${safeLabel(label)}.json`; }

function localBackupKey() {
  if (BACKUP_SECRET.length < 32) return null;
  return crypto.createHash('sha256').update(`bawsala-local-backup-v2|${BACKUP_SECRET}`).digest();
}
function backupAad(createdAt) {
  return Buffer.from(JSON.stringify({ app: 'bawsala', format: 'bawsala-state-backup-v2', createdAt: String(createdAt || '') }), 'utf8');
}
function decryptBackupV2(payload) {
  const key = localBackupKey();
  if (!key) throw Object.assign(new Error('BACKUP_ENCRYPTION_KEY_MISSING'), { code: 'BACKUP_ENCRYPTION_KEY_MISSING' });
  const encryption = payload?.encryption || {};
  if (encryption.algorithm !== 'aes-256-gcm' || !payload.ciphertext || !encryption.iv || !encryption.authTag) throw new Error('BACKUP_FORMAT_INVALID');
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(encryption.iv, 'base64url'));
    const aad = encryption.aad ? Buffer.from(encryption.aad, 'base64url') : backupAad(payload.createdAt);
    decipher.setAAD(aad);
    decipher.setAuthTag(Buffer.from(encryption.authTag, 'base64url'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, 'base64url')), decipher.final()]).toString('utf8'));
  } catch (error) {
    throw Object.assign(new Error('BACKUP_DECRYPTION_FAILED'), { cause: error });
  }
}
function readBackupFile(file, defaultDb) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > BACKUP_MAX_BYTES) throw new Error('BACKUP_FILE_INVALID_OR_TOO_LARGE');
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (payload?.format === 'bawsala-state-backup-v2') {
    const state = decryptBackupV2(payload);
    if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('BACKUP_FORMAT_INVALID');
    return normalizeDb(state, defaultDb);
  }
  if (payload?.format === 'bawsala-state-backup-v1' && ALLOW_LEGACY_PLAINTEXT_BACKUPS) {
    if (!payload.state || typeof payload.state !== 'object') throw new Error('BACKUP_FORMAT_INVALID');
    const expected = `sha256:${sha256(JSON.stringify(payload.state))}`;
    if (payload.checksum !== expected) throw new Error('BACKUP_CHECKSUM_MISMATCH');
    return normalizeDb(payload.state, defaultDb);
  }
  throw new Error(payload?.format === 'bawsala-state-backup-v1' ? 'LEGACY_PLAINTEXT_BACKUP_DISABLED' : 'BACKUP_FORMAT_INVALID');
}

function createBackupFile(dataDir, db, label = 'manual', defaultDb) {
  const key = localBackupKey();
  if (!key) throw Object.assign(new Error('BACKUP_ENCRYPTION_KEY_MISSING'), { status: 503, code: 'BACKUP_ENCRYPTION_KEY_MISSING' });
  const normalized = normalizeDb(db, defaultDb);
  const clear = Buffer.from(JSON.stringify(normalized), 'utf8');
  const createdAt = nowIso();
  const aad = backupAad(createdAt);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(clear), cipher.final()]);
  const encryptedDigest = `sha256:${sha256(ciphertext.toString('base64url'))}`;
  const finalPayload = JSON.stringify({
    format: 'bawsala-state-backup-v2',
    createdAt,
    digest: encryptedDigest,
    encryption: {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'sha256-context-v2',
      iv: iv.toString('base64url'),
      authTag: cipher.getAuthTag().toString('base64url'),
      aad: aad.toString('base64url')
    },
    ciphertext: ciphertext.toString('base64url')
  }, null, 2);
  if (Buffer.byteLength(finalPayload, 'utf8') > BACKUP_MAX_BYTES) {
    const err = new Error('BACKUP_TOO_LARGE');
    err.status = 413;
    throw err;
  }
  const dir = backupDirectory(dataDir);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(dir, 0o700); } catch (_) {}
  const file = path.join(dir, backupFileName(label));
  atomicWriteFile(file, finalPayload);
  pruneBackupFiles(dataDir, BACKUP_KEEP);
  const stat = fs.statSync(file);
  return { file: path.basename(file), sizeBytes: stat.size, createdAt: stat.mtime.toISOString(), checksum: encryptedDigest, encrypted: true, format: 'bawsala-state-backup-v2' };
}

function listBackupFiles(dataDir) {
  const dir = backupDirectory(dataDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => /^state-[a-zA-Z0-9_.-]+\.json$/.test(name))
    .map(name => {
      const file = path.join(dir, name);
      const stat = fs.statSync(file);
      return { file: name, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function pruneBackupFiles(dataDir, keep = BACKUP_KEEP) {
  const backups = listBackupFiles(dataDir);
  const removed = [];
  for (const item of backups.slice(Math.max(0, keep))) {
    try { fs.rmSync(path.join(backupDirectory(dataDir), item.file), { force: true }); removed.push(item.file); } catch (_) {}
  }
  return removed;
}

function normalizeDb(input, defaultDb) { return migrateState(input, defaultDb); }
function readJsonFile(file, defaultDb) {
  if (!fs.existsSync(file)) return null;
  return normalizeDb(JSON.parse(fs.readFileSync(file, 'utf8')), defaultDb);
}
function writeJsonFile(file, db) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const bak = file + '.bak';
  const payload = JSON.stringify(db, null, 2);
  JSON.parse(payload);
  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, bak); } catch (_) {}
  }
  atomicWriteFile(file, payload);
}

function loadNodeSqlite() {
  try { return require('node:sqlite'); }
  catch (_) { return null; }
}

function chooseEngine() {
  const requested = String(process.env.BAWSALA_STORAGE || 'auto').toLowerCase();
  if (requested === 'json') return 'json';
  if (requested === 'sqlite') {
    if (!loadNodeSqlite()) throw new Error('SQLITE_ENGINE_UNAVAILABLE');
    return 'sqlite';
  }
  if (requested !== 'auto') throw new Error('STORAGE_ENGINE_INVALID');
  return loadNodeSqlite() ? 'sqlite' : 'json';
}

function openSqliteStore(dataDir, defaultDb) {
  const sqlite = loadNodeSqlite();
  if (!sqlite) throw new Error('SQLITE_ENGINE_UNAVAILABLE');

  const sqlitePath = path.join(dataDir, SQLITE_FILE);
  const jsonPath = path.join(dataDir, JSON_FILE);
  const dbx = new sqlite.DatabaseSync(sqlitePath);
  try { fs.chmodSync(sqlitePath, 0o600); } catch (_) {}

  dbx.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA wal_autocheckpoint = 1000;

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('student','support','admin')),
      created_at TEXT,
      updated_at TEXT,
      data TEXT NOT NULL CHECK(json_valid(data))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY CHECK(length(token_hash) = 64),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT,
      absolute_expires_at TEXT,
      last_seen_at TEXT,
      data TEXT NOT NULL CHECK(json_valid(data))
    );
    CREATE TABLE IF NOT EXISTS snapshots (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      revision TEXT,
      updated_at TEXT,
      data TEXT NOT NULL CHECK(json_valid(data))
    );
    CREATE TABLE IF NOT EXISTS checkout_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT,
      status TEXT,
      expires_at TEXT,
      created_at TEXT,
      data TEXT NOT NULL CHECK(json_valid(data))
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      provider_invoice_id TEXT UNIQUE,
      status TEXT,
      created_at TEXT,
      data TEXT NOT NULL CHECK(json_valid(data))
    );
    CREATE TABLE IF NOT EXISTS oauth_pending (
      token_hash TEXT PRIMARY KEY,
      expires_at TEXT,
      data TEXT NOT NULL CHECK(json_valid(data))
    );
    CREATE TABLE IF NOT EXISTS auth_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK(kind IN ('email-verification','password-reset')),
      expires_at TEXT,
      data TEXT NOT NULL CHECK(json_valid(data))
    );
    CREATE TABLE IF NOT EXISTS auth_failures (
      identity_hash TEXT PRIMARY KEY,
      locked_until TEXT,
      data TEXT NOT NULL CHECK(json_valid(data))
    );
    CREATE TABLE IF NOT EXISTS mail_outbox (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      status TEXT,
      next_attempt_at TEXT,
      created_at TEXT,
      data TEXT NOT NULL CHECK(json_valid(data))
    );
    CREATE TABLE IF NOT EXISTS calendar_sync (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      connected INTEGER NOT NULL DEFAULT 0 CHECK(connected IN (0,1)),
      updated_at TEXT,
      data TEXT NOT NULL CHECK(json_valid(data))
    );
    CREATE TABLE IF NOT EXISTS idempotency_records (
      record_key TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      route_id TEXT,
      expires_at TEXT,
      data TEXT NOT NULL CHECK(json_valid(data))
    );
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data TEXT NOT NULL CHECK(json_valid(data))
    );
    CREATE TABLE IF NOT EXISTS event_log (
      channel TEXT NOT NULL CHECK(channel IN ('audit','security','payment')),
      position INTEGER NOT NULL,
      at TEXT,
      type TEXT,
      actor TEXT,
      data TEXT NOT NULL CHECK(json_valid(data)),
      PRIMARY KEY(channel, position)
    );
    CREATE TABLE IF NOT EXISTS storage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      type TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(details))
    );
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      bucket_key TEXT PRIMARY KEY,
      window_started_at INTEGER NOT NULL,
      count INTEGER NOT NULL CHECK(count >= 0),
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS job_leases (
      lease_name TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      acquired_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_role_created ON users(role, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_expiry ON sessions(user_id, expires_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_absolute_expiry ON sessions(absolute_expires_at);
    CREATE INDEX IF NOT EXISTS idx_checkout_user_created ON checkout_sessions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_checkout_status_expiry ON checkout_sessions(status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_invoices_user_created ON invoices(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_kind ON auth_tokens(user_id, kind, expires_at);
    CREATE INDEX IF NOT EXISTS idx_mail_status_retry ON mail_outbox(status, next_attempt_at);
    CREATE INDEX IF NOT EXISTS idx_idempotency_user_expiry ON idempotency_records(user_id, expires_at);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_user_created ON support_tickets(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_status_updated ON support_tickets(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_event_log_channel_at ON event_log(channel, at DESC);
    CREATE INDEX IF NOT EXISTS idx_rate_limit_expiry ON rate_limit_buckets(expires_at);
    CREATE INDEX IF NOT EXISTS idx_job_leases_expiry ON job_leases(expires_at);
  `);

  const getMeta = dbx.prepare('SELECT value FROM app_meta WHERE key = ?');
  const putMeta = dbx.prepare(`INSERT INTO app_meta(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`);
  const getLegacy = dbx.prepare('SELECT value FROM app_state WHERE key = ?');
  const insertEvent = dbx.prepare('INSERT INTO storage_events(at,type,details) VALUES(?,?,?)');
  const latestEvent = dbx.prepare('SELECT at,type,details FROM storage_events WHERE type=? ORDER BY id DESC LIMIT 1');
  const pruneEvents = dbx.prepare('DELETE FROM storage_events WHERE id NOT IN (SELECT id FROM storage_events ORDER BY id DESC LIMIT ?)');
  const recordMigration = dbx.prepare('INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(?,?)');
  recordMigration.run(String(CURRENT_DATA_VERSION), nowIso());

  const upsertUser = dbx.prepare(`INSERT INTO users(id,email,role,created_at,updated_at,data) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,role=excluded.role,created_at=excluded.created_at,updated_at=excluded.updated_at,data=excluded.data`);
  const upsertSession = dbx.prepare(`INSERT INTO sessions(token_hash,user_id,expires_at,absolute_expires_at,last_seen_at,data) VALUES(?,?,?,?,?,?) ON CONFLICT(token_hash) DO UPDATE SET user_id=excluded.user_id,expires_at=excluded.expires_at,absolute_expires_at=excluded.absolute_expires_at,last_seen_at=excluded.last_seen_at,data=excluded.data`);
  const upsertSnapshot = dbx.prepare(`INSERT INTO snapshots(user_id,revision,updated_at,data) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision,updated_at=excluded.updated_at,data=excluded.data`);
  const upsertCheckout = dbx.prepare(`INSERT INTO checkout_sessions(id,user_id,provider,status,expires_at,created_at,data) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,provider=excluded.provider,status=excluded.status,expires_at=excluded.expires_at,created_at=excluded.created_at,data=excluded.data`);
  const upsertInvoice = dbx.prepare(`INSERT INTO invoices(id,user_id,provider_invoice_id,status,created_at,data) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,provider_invoice_id=excluded.provider_invoice_id,status=excluded.status,created_at=excluded.created_at,data=excluded.data`);
  const upsertOauth = dbx.prepare(`INSERT INTO oauth_pending(token_hash,expires_at,data) VALUES(?,?,?) ON CONFLICT(token_hash) DO UPDATE SET expires_at=excluded.expires_at,data=excluded.data`);
  const upsertToken = dbx.prepare(`INSERT INTO auth_tokens(token_hash,user_id,kind,expires_at,data) VALUES(?,?,?,?,?) ON CONFLICT(token_hash) DO UPDATE SET user_id=excluded.user_id,kind=excluded.kind,expires_at=excluded.expires_at,data=excluded.data`);
  const upsertFailure = dbx.prepare(`INSERT INTO auth_failures(identity_hash,locked_until,data) VALUES(?,?,?) ON CONFLICT(identity_hash) DO UPDATE SET locked_until=excluded.locked_until,data=excluded.data`);
  const upsertMail = dbx.prepare(`INSERT INTO mail_outbox(id,user_id,status,next_attempt_at,created_at,data) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,status=excluded.status,next_attempt_at=excluded.next_attempt_at,created_at=excluded.created_at,data=excluded.data`);
  const upsertCalendar = dbx.prepare(`INSERT INTO calendar_sync(user_id,connected,updated_at,data) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET connected=excluded.connected,updated_at=excluded.updated_at,data=excluded.data`);
  const upsertIdempotency = dbx.prepare(`INSERT INTO idempotency_records(record_key,user_id,route_id,expires_at,data) VALUES(?,?,?,?,?) ON CONFLICT(record_key) DO UPDATE SET user_id=excluded.user_id,route_id=excluded.route_id,expires_at=excluded.expires_at,data=excluded.data`);
  const upsertSupportTicket = dbx.prepare(`INSERT INTO support_tickets(id,user_id,status,priority,created_at,updated_at,data) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,status=excluded.status,priority=excluded.priority,created_at=excluded.created_at,updated_at=excluded.updated_at,data=excluded.data`);
  const insertLog = dbx.prepare('INSERT INTO event_log(channel,position,at,type,actor,data) VALUES(?,?,?,?,?,?)');
  const deleteByKey = Object.fromEntries([
    ['users', 'id'], ['sessions', 'token_hash'], ['snapshots', 'user_id'], ['checkout_sessions', 'id'], ['invoices', 'id'],
    ['oauth_pending', 'token_hash'], ['auth_failures', 'identity_hash'], ['mail_outbox', 'id'], ['calendar_sync', 'user_id'], ['idempotency_records', 'record_key'], ['support_tickets', 'id']
  ].map(([table, key]) => [table, dbx.prepare(`DELETE FROM ${table} WHERE ${key}=?`)]));
  const deleteToken = dbx.prepare('DELETE FROM auth_tokens WHERE token_hash=? AND kind=?');
  const deleteLogChannel = dbx.prepare('DELETE FROM event_log WHERE channel=?');
  const selectRateBucket = dbx.prepare('SELECT window_started_at,count,expires_at FROM rate_limit_buckets WHERE bucket_key=?');
  const upsertRateBucket = dbx.prepare(`INSERT INTO rate_limit_buckets(bucket_key,window_started_at,count,expires_at) VALUES(?,?,?,?) ON CONFLICT(bucket_key) DO UPDATE SET window_started_at=excluded.window_started_at,count=excluded.count,expires_at=excluded.expires_at`);
  const deleteExpiredRateBuckets = dbx.prepare('DELETE FROM rate_limit_buckets WHERE expires_at < ?');
  const selectLease = dbx.prepare('SELECT owner_id,acquired_at,expires_at FROM job_leases WHERE lease_name=?');
  const upsertLease = dbx.prepare(`INSERT INTO job_leases(lease_name,owner_id,acquired_at,expires_at) VALUES(?,?,?,?) ON CONFLICT(lease_name) DO UPDATE SET owner_id=excluded.owner_id,acquired_at=excluded.acquired_at,expires_at=excluded.expires_at`);
  const deleteLease = dbx.prepare('DELETE FROM job_leases WHERE lease_name=? AND owner_id=?');
  const deleteExpiredLeases = dbx.prepare('DELETE FROM job_leases WHERE expires_at < ?');

  let state = null;
  let lastSaveStats = { inserts: 0, updates: 0, deletes: 0, logChannels: 0, changedRows: 0, durationMs: 0 };
  function sameValue(a, b) { return json(a) === json(b); }
  function syncObject(previous, next, { table, upsert, args, deferDeletes = false }) {
    previous = objectMap(previous); next = objectMap(next);
    let inserts = 0, updates = 0, deletes = 0;
    for (const [key, value] of Object.entries(next)) {
      if (Object.prototype.hasOwnProperty.call(previous, key) && sameValue(previous[key], value)) continue;
      upsert.run(...args(key, value));
      if (Object.prototype.hasOwnProperty.call(previous, key)) updates += 1; else inserts += 1;
    }
    const removed = Object.keys(previous).filter(key => !Object.prototype.hasOwnProperty.call(next, key));
    if (!deferDeletes) for (const key of removed) { deleteByKey[table].run(key); deletes += 1; }
    return { inserts, updates, deletes, removed };
  }
  function mergeStats(target, current) {
    target.inserts += current.inserts || 0;
    target.updates += current.updates || 0;
    target.deletes += current.deletes || 0;
  }
  function tokenMap(source, kind) { return Object.fromEntries(Object.entries(objectMap(source)).map(([key, value]) => [key, { ...value, __kind: kind }])); }
  function mailMap(source) { return Object.fromEntries(array(source).filter(item => item?.id).map(item => [item.id, item])); }

  function persistNormalized(input) {
    const normalized = normalizeDb(input, defaultDb);
    assertStateIntegrity(normalized);
    const previous = state || normalizeDb(null, defaultDb);
    const stamp = nowIso();
    const started = Date.now();
    const stats = { inserts: 0, updates: 0, deletes: 0, logChannels: 0, changedRows: 0, durationMs: 0 };
    dbx.exec('BEGIN IMMEDIATE');
    try {
      putMeta.run('storage_mode', STORAGE_MODE, stamp);
      putMeta.run('version', String(normalized.version), stamp);
      putMeta.run('created_at', String(normalized.createdAt || stamp), stamp);
      if (!sameValue(previous.appSettings, normalized.appSettings)) putMeta.run('app_settings', json(normalized.appSettings || {}), stamp);

      const usersResult = syncObject(previous.users, normalized.users, { table: 'users', upsert: upsertUser, deferDeletes: true, args: (id, user) => [id, user.email, user.role, user.createdAt || null, user.updatedAt || null, json(user)] });
      mergeStats(stats, usersResult);
      mergeStats(stats, syncObject(previous.sessions, normalized.sessions, { table: 'sessions', upsert: upsertSession, args: (hash, item) => [hash, item.userId, item.expiresAt || null, item.absoluteExpiresAt || null, item.lastSeenAt || null, json(item)] }));
      mergeStats(stats, syncObject(previous.snapshots, normalized.snapshots, { table: 'snapshots', upsert: upsertSnapshot, args: (userId, item) => [userId, item.revision || null, item.updatedAt || null, json(item)] }));
      mergeStats(stats, syncObject(previous.checkoutSessions, normalized.checkoutSessions, { table: 'checkout_sessions', upsert: upsertCheckout, args: (id, item) => [id, item.userId, item.provider || null, item.status || null, item.expiresAt || null, item.createdAt || null, json(item)] }));
      mergeStats(stats, syncObject(previous.invoices, normalized.invoices, { table: 'invoices', upsert: upsertInvoice, args: (id, item) => [id, normalized.users[item.userId] ? item.userId : null, item.providerInvoiceId || null, item.status || null, item.createdAt || null, json(item)] }));
      mergeStats(stats, syncObject(previous.oauthPending, normalized.oauthPending, { table: 'oauth_pending', upsert: upsertOauth, args: (hash, item) => [hash, item.expiresAt || null, json(item)] }));
      mergeStats(stats, syncObject(previous.authFailures, normalized.authFailures, { table: 'auth_failures', upsert: upsertFailure, args: (key, item) => [key, item.blockedUntil || item.lockedUntil || null, json(item)] }));
      mergeStats(stats, syncObject(mailMap(previous.mailOutbox), mailMap(normalized.mailOutbox), { table: 'mail_outbox', upsert: upsertMail, args: (id, item) => [id, normalized.users[item.userId] ? item.userId : null, item.status || null, item.nextAttemptAt || null, item.createdAt || null, json(item)] }));
      mergeStats(stats, syncObject(previous.calendarSync, normalized.calendarSync, { table: 'calendar_sync', upsert: upsertCalendar, args: (userId, item) => [userId, item.connected === true || !!item.encryptedRefreshToken ? 1 : 0, item.updatedAt || item.lastSyncAt || null, json(item)] }));
      mergeStats(stats, syncObject(previous.idempotencyRecords, normalized.idempotencyRecords, { table: 'idempotency_records', upsert: upsertIdempotency, args: (key, item) => [key, item.userId, item.routeId || null, item.expiresAt || null, json(item)] }));
      mergeStats(stats, syncObject(previous.supportTickets, normalized.supportTickets, { table: 'support_tickets', upsert: upsertSupportTicket, args: (id, item) => [id, item.userId, item.status || 'new', item.priority || 'normal', item.createdAt || stamp, item.updatedAt || item.createdAt || stamp, json(item)] }));

      for (const [kind, beforeSource, afterSource] of [['email-verification', previous.emailVerificationTokens, normalized.emailVerificationTokens], ['password-reset', previous.passwordResetTokens, normalized.passwordResetTokens]]) {
        const before = tokenMap(beforeSource, kind), after = tokenMap(afterSource, kind);
        for (const [hash, item] of Object.entries(after)) {
          if (Object.prototype.hasOwnProperty.call(before, hash) && sameValue(before[hash], item)) continue;
          const cleanItem = { ...item }; delete cleanItem.__kind;
          upsertToken.run(hash, cleanItem.userId, kind, cleanItem.expiresAt || null, json(cleanItem));
          if (Object.prototype.hasOwnProperty.call(before, hash)) stats.updates += 1; else stats.inserts += 1;
        }
        for (const hash of Object.keys(before)) if (!Object.prototype.hasOwnProperty.call(after, hash)) { deleteToken.run(hash, kind); stats.deletes += 1; }
      }

      for (const [channel, beforeEntries, afterEntries] of [['audit', previous.audit, normalized.audit], ['security', previous.securityEvents, normalized.securityEvents], ['payment', previous.paymentEvents, normalized.paymentEvents]]) {
        if (sameValue(array(beforeEntries), array(afterEntries))) continue;
        deleteLogChannel.run(channel);
        array(afterEntries).forEach((item, position) => insertLog.run(channel, position, item?.at || null, item?.type || null, item?.actor || null, json(item)));
        stats.logChannels += 1;
        stats.updates += array(afterEntries).length;
      }

      for (const id of usersResult.removed) { deleteByKey.users.run(id); stats.deletes += 1; }
      dbx.exec('COMMIT');
      state = normalized;
      stats.changedRows = stats.inserts + stats.updates + stats.deletes;
      stats.durationMs = Date.now() - started;
      lastSaveStats = stats;
      return normalized;
    } catch (error) {
      try { dbx.exec('ROLLBACK'); } catch (_) {}
      throw error;
    }
  }

  function consumeRateLimit(bucketKey, windowMs, limit, nowMs = Date.now()) {
    const key = String(bucketKey || '').slice(0, 160);
    const window = Math.max(1000, Number(windowMs) || 60000);
    const max = Math.max(1, Number(limit) || 1);
    dbx.exec('BEGIN IMMEDIATE');
    try {
      const current = selectRateBucket.get(key);
      const expired = !current || Number(current.expires_at || 0) <= nowMs;
      const startedAt = expired ? nowMs : Number(current.window_started_at || nowMs);
      const count = expired ? 1 : Number(current.count || 0) + 1;
      const expiresAt = expired ? nowMs + window : Number(current.expires_at || nowMs + window);
      upsertRateBucket.run(key, startedAt, count, expiresAt);
      if (Math.random() < 0.01) deleteExpiredRateBuckets.run(nowMs - window);
      dbx.exec('COMMIT');
      return { allowed: count <= max, count, limit: max, remaining: Math.max(0, max - count), resetSeconds: Math.max(1, Math.ceil((expiresAt - nowMs) / 1000)), windowStartedAt: startedAt, expiresAt };
    } catch (error) {
      try { dbx.exec('ROLLBACK'); } catch (_) {}
      throw error;
    }
  }

  function acquireLease(name, ownerId, ttlMs, nowMs = Date.now()) {
    const leaseName = String(name || '').slice(0, 160), owner = String(ownerId || '').slice(0, 160);
    const ttl = Math.max(1000, Number(ttlMs) || 30000);
    dbx.exec('BEGIN IMMEDIATE');
    try {
      const current = selectLease.get(leaseName);
      const available = !current || Number(current.expires_at || 0) <= nowMs || current.owner_id === owner;
      if (available) upsertLease.run(leaseName, owner, nowMs, nowMs + ttl);
      if (Math.random() < 0.02) deleteExpiredLeases.run(nowMs - ttl);
      dbx.exec('COMMIT');
      return available;
    } catch (error) {
      try { dbx.exec('ROLLBACK'); } catch (_) {}
      throw error;
    }
  }
  function releaseLease(name, ownerId) { return deleteLease.run(String(name || '').slice(0, 160), String(ownerId || '').slice(0, 160)).changes > 0; }

  function loadNormalized() {
    const base = normalizeDb(null, defaultDb);
    const mode = getMeta.get('storage_mode')?.value;
    if (mode !== STORAGE_MODE) return null;
    base.version = Number(getMeta.get('version')?.value || CURRENT_DATA_VERSION);
    base.createdAt = getMeta.get('created_at')?.value || base.createdAt;
    base.appSettings = { ...base.appSettings, ...parseJson(getMeta.get('app_settings')?.value, {}) };

    for (const row of dbx.prepare('SELECT id,data FROM users').all()) base.users[row.id] = parseJson(row.data, {});
    for (const row of dbx.prepare('SELECT token_hash,data FROM sessions').all()) base.sessions[row.token_hash] = parseJson(row.data, {});
    for (const row of dbx.prepare('SELECT user_id,data FROM snapshots').all()) base.snapshots[row.user_id] = parseJson(row.data, {});
    for (const row of dbx.prepare('SELECT id,data FROM checkout_sessions').all()) base.checkoutSessions[row.id] = parseJson(row.data, {});
    for (const row of dbx.prepare('SELECT id,data FROM invoices').all()) base.invoices[row.id] = parseJson(row.data, {});
    for (const row of dbx.prepare('SELECT token_hash,data FROM oauth_pending').all()) base.oauthPending[row.token_hash] = parseJson(row.data, {});
    for (const row of dbx.prepare("SELECT token_hash,data FROM auth_tokens WHERE kind='email-verification'").all()) base.emailVerificationTokens[row.token_hash] = parseJson(row.data, {});
    for (const row of dbx.prepare("SELECT token_hash,data FROM auth_tokens WHERE kind='password-reset'").all()) base.passwordResetTokens[row.token_hash] = parseJson(row.data, {});
    for (const row of dbx.prepare('SELECT identity_hash,data FROM auth_failures').all()) base.authFailures[row.identity_hash] = parseJson(row.data, {});
    base.mailOutbox = dbx.prepare('SELECT data FROM mail_outbox ORDER BY created_at DESC').all().map(row => parseJson(row.data, {}));
    for (const row of dbx.prepare('SELECT user_id,data FROM calendar_sync').all()) base.calendarSync[row.user_id] = parseJson(row.data, {});
    for (const row of dbx.prepare('SELECT record_key,data FROM idempotency_records').all()) base.idempotencyRecords[row.record_key] = parseJson(row.data, {});
    for (const row of dbx.prepare('SELECT id,data FROM support_tickets').all()) base.supportTickets[row.id] = parseJson(row.data, {});
    for (const channel of ['audit', 'security', 'payment']) {
      const values = dbx.prepare('SELECT data FROM event_log WHERE channel=? ORDER BY position').all(channel).map(row => parseJson(row.data, {}));
      if (channel === 'audit') base.audit = values;
      if (channel === 'security') base.securityEvents = values;
      if (channel === 'payment') base.paymentEvents = values;
    }
    return normalizeDb(base, defaultDb);
  }

  state = loadNormalized();
  let migratedFrom = '';
  if (!state) {
    const legacyRow = getLegacy.get(LEGACY_STATE_KEY);
    let initialState;
    if (legacyRow?.value) {
      initialState = normalizeDb(JSON.parse(legacyRow.value), defaultDb);
      migratedFrom = 'sqlite-single-blob';
    } else {
      const migratedJson = readJsonFile(jsonPath, defaultDb);
      initialState = migratedJson || normalizeDb(null, defaultDb);
      migratedFrom = migratedJson ? 'json' : 'default';
    }
    state = null;
    persistNormalized(initialState);
    insertEvent.run(nowIso(), 'migrated-to-normalized-v2', json({ from: migratedFrom }));
  }

  function recordOperationalEvent(type, details = {}) {
    insertEvent.run(nowIso(), String(type || 'event').slice(0, 120), json(details));
    pruneEvents.run(500);
    return true;
  }
  function latestOperationalEvent(type) {
    const row = latestEvent.get(String(type || '').slice(0, 120));
    return row ? { at: row.at, type: row.type, details: parseJson(row.details, {}) } : null;
  }

  function integrity() {
    const quick = dbx.prepare('PRAGMA quick_check').all();
    const sqliteOk = Array.isArray(quick) && quick.every(row => Object.values(row).includes('ok'));
    const foreignKeyRows = dbx.prepare('PRAGMA foreign_key_check').all();
    const tableCounts = Object.fromEntries(['users','sessions','snapshots','checkout_sessions','invoices','auth_tokens','mail_outbox','calendar_sync','idempotency_records','support_tickets']
      .map(table => [table, Number(dbx.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count || 0)]));
    return {
      ...integritySummary(state),
      engine: 'sqlite',
      sqliteOk,
      foreignKeysOk: foreignKeyRows.length === 0,
      normalizedSchema: true,
      tableCounts,
      lastSaveStats
    };
  }

  return {
    engine: 'sqlite',
    path: sqlitePath,
    load: () => normalizeDb(state, defaultDb),
    save: persistNormalized,
    consumeRateLimit,
    acquireLease,
    releaseLease,
    recordOperationalEvent,
    latestOperationalEvent,
    backup: label => createBackupFile(dataDir, state, label, defaultDb),
    restore: file => {
      const restored = readBackupFile(file, defaultDb);
      const preRestore = createBackupFile(dataDir, state, 'pre-restore', defaultDb);
      persistNormalized(restored);
      insertEvent.run(nowIso(), 'restored-backup', json({ source: path.basename(file), preRestore: preRestore.file }));
      return { ok: true, source: path.basename(file), preRestore, integrity: integrity() };
    },
    listBackups: () => listBackupFiles(dataDir),
    pruneBackups: keep => pruneBackupFiles(dataDir, keep),
    integrity,
    close: () => dbx.close(),
    info: () => ({
      engine: 'sqlite',
      file: SQLITE_FILE,
      mode: 'normalized-relational-wal',
      schemaVersion: CURRENT_DATA_VERSION,
      normalizedSchema: true,
      wholeStateBlob: false,
      foreignKeys: true,
      indexedTables: 12,
      incrementalWrites: true,
      durableRateLimits: true,
      durableJobLeases: true,
      singleWriter: true,
      migratedFrom: migratedFrom || null,
      atomicWrites: true,
      backupKeep: BACKUP_KEEP
    })
  };
}

function openJsonStore(dataDir, defaultDb) {
  const jsonPath = path.join(dataDir, JSON_FILE);
  const operationalEvents = [];
  let state = readJsonFile(jsonPath, defaultDb);
  if (!state) {
    state = normalizeDb(null, defaultDb);
    writeJsonFile(jsonPath, state);
  }
  return {
    engine: 'json',
    path: jsonPath,
    load: () => normalizeDb(state, defaultDb),
    save: db => { state = normalizeDb(db, defaultDb); writeJsonFile(jsonPath, state); },
    recordOperationalEvent: (type, details={}) => { operationalEvents.unshift({ at: nowIso(), type: String(type||'event').slice(0,120), details: clone(details) }); operationalEvents.length=Math.min(operationalEvents.length,500); return true; },
    latestOperationalEvent: type => operationalEvents.find(item=>item.type===String(type||'')) || null,
    backup: label => createBackupFile(dataDir, state, label, defaultDb),
    restore: file => {
      const restored = readBackupFile(file, defaultDb);
      const preRestore = createBackupFile(dataDir, state, 'pre-restore', defaultDb);
      state = restored;
      writeJsonFile(jsonPath, state);
      return { ok: true, source: path.basename(file), preRestore, integrity: integritySummary(state) };
    },
    listBackups: () => listBackupFiles(dataDir),
    pruneBackups: keep => pruneBackupFiles(dataDir, keep),
    integrity: () => ({ ...integritySummary(state), engine: 'json', sqliteOk: null, foreignKeysOk: null, normalizedSchema: false }),
    close: () => {},
    info: () => ({ engine: 'json', file: JSON_FILE, mode: 'fallback-atomic-file', schemaVersion: CURRENT_DATA_VERSION, normalizedSchema: false, wholeStateBlob: true, atomicWrites: true, backupFile: fs.existsSync(jsonPath + '.bak'), backupKeep: BACKUP_KEEP })
  };
}

function createStateStore({ dataDir, defaultDb }) {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(dataDir, 0o700); } catch (_) {}
  const engine = chooseEngine();
  return engine === 'sqlite' ? openSqliteStore(dataDir, defaultDb) : openJsonStore(dataDir, defaultDb);
}

module.exports = { createStateStore, normalizeDb, readBackupFile };
