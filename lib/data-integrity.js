'use strict';

const CURRENT_DATA_VERSION = 13.4;
const ROLES = new Set(['student', 'support', 'admin']);
const SUBSCRIPTION_STATES = new Set(['free', 'trialing', 'active', 'canceling', 'past_due', 'paused', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired']);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function objectMap(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase().slice(0, 240);
}

function migrateState(input, defaultDb) {
  const base = clone(defaultDb());
  const parsed = clone(objectMap(input));
  const db = {
    ...base,
    ...parsed,
    appSettings: { ...base.appSettings, ...objectMap(parsed.appSettings) },
    users: objectMap(parsed.users),
    sessions: objectMap(parsed.sessions),
    snapshots: objectMap(parsed.snapshots),
    audit: array(parsed.audit),
    securityEvents: array(parsed.securityEvents),
    paymentEvents: array(parsed.paymentEvents),
    checkoutSessions: objectMap(parsed.checkoutSessions),
    invoices: objectMap(parsed.invoices),
    oauthPending: objectMap(parsed.oauthPending),
    emailVerificationTokens: objectMap(parsed.emailVerificationTokens),
    passwordResetTokens: objectMap(parsed.passwordResetTokens),
    authFailures: objectMap(parsed.authFailures),
    mailOutbox: array(parsed.mailOutbox),
    calendarSync: objectMap(parsed.calendarSync),
    idempotencyRecords: objectMap(parsed.idempotencyRecords),
    supportTickets: objectMap(parsed.supportTickets)
  };

  db.createdAt = parsed.createdAt || base.createdAt;
  db.version = CURRENT_DATA_VERSION;

  for (const [id, user] of Object.entries(db.users)) {
    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      delete db.users[id];
      continue;
    }
    user.id = id;
    user.email = cleanEmail(user.email);
    delete user.dateOfBirth;
    delete user.birthDate;
    delete user.nationalId;
    delete user.nationalIdNumber;
    if (!ROLES.has(user.role)) user.role = 'student';
    if (!user.subscription || typeof user.subscription !== 'object' || Array.isArray(user.subscription)) user.subscription = {};
    if (!SUBSCRIPTION_STATES.has(user.subscription.status)) {
      user.subscription.status = user.subscription.plan && user.subscription.plan !== 'free' ? 'incomplete' : 'free';
    }
    if (!user.subscription.plan) user.subscription.plan = 'free';
  }

  // Safe orphan cleanup. These records are unusable without their owning user and
  // retaining them increases privacy exposure after account deletion.
  const userIds = new Set(Object.keys(db.users));
  for (const [hash, session] of Object.entries(db.sessions)) if (!session || !userIds.has(session.userId)) delete db.sessions[hash];
  for (const [hash, token] of Object.entries(db.emailVerificationTokens)) if (!token || !userIds.has(token.userId)) delete db.emailVerificationTokens[hash];
  for (const [hash, token] of Object.entries(db.passwordResetTokens)) if (!token || !userIds.has(token.userId)) delete db.passwordResetTokens[hash];
  for (const [hash, pending] of Object.entries(db.oauthPending)) if (!pending || typeof pending !== 'object') delete db.oauthPending[hash];
  for (const [userId] of Object.entries(db.calendarSync)) if (!userIds.has(userId)) delete db.calendarSync[userId];
  for (const [id, ticket] of Object.entries(db.supportTickets)) if (!ticket || !userIds.has(ticket.userId)) delete db.supportTickets[id];

  assertStateIntegrity(db);
  return db;
}

function assertStateIntegrity(db) {
  if (!db || typeof db !== 'object' || Array.isArray(db)) throw integrityError('DATA_STATE_INVALID_ROOT');
  const seenEmails = new Map();
  for (const [id, user] of Object.entries(objectMap(db.users))) {
    if (!user || user.id !== id) throw integrityError('DATA_USER_ID_MISMATCH', { id, userId: user?.id || '' });
    if (!user.email || !/^\S+@\S+\.\S+$/.test(user.email)) throw integrityError('DATA_USER_EMAIL_INVALID', { id });
    const previous = seenEmails.get(user.email);
    if (previous && previous !== id) throw integrityError('DATA_DUPLICATE_EMAIL', { firstUserId: previous, secondUserId: id });
    seenEmails.set(user.email, id);
    if (!ROLES.has(user.role)) throw integrityError('DATA_ROLE_INVALID', { id, role: user.role });
  }
  for (const [hash, session] of Object.entries(objectMap(db.sessions))) {
    if (!/^[a-f0-9]{64}$/i.test(hash) || !session?.userId || !db.users[session.userId]) {
      throw integrityError('DATA_SESSION_INVALID', { hash: hash.slice(0, 12) });
    }
  }
  return true;
}

function integritySummary(db) {
  assertStateIntegrity(db);
  return {
    ok: true,
    schemaVersion: Number(db.version || CURRENT_DATA_VERSION),
    users: Object.keys(objectMap(db.users)).length,
    sessions: Object.keys(objectMap(db.sessions)).length,
    snapshots: Object.keys(objectMap(db.snapshots)).length,
    invoices: Object.keys(objectMap(db.invoices)).length,
    checkoutSessions: Object.keys(objectMap(db.checkoutSessions)).length,
    supportTickets: Object.keys(objectMap(db.supportTickets)).length,
    checkedAt: new Date().toISOString()
  };
}

function integrityError(code, details = {}) {
  const error = new Error(code);
  error.code = code;
  error.details = details;
  return error;
}

module.exports = {
  CURRENT_DATA_VERSION,
  migrateState,
  assertStateIntegrity,
  integritySummary
};
