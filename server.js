'use strict';

const http = require('http');
const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dns = require('dns').promises;
const { URL, domainToASCII } = require('url');
const snapshotSchema = require('./lib/snapshot-schema');
const STATIC_POLICY = require('./config/static-policy.json');
const { createStateStore } = require('./lib/state-store');
const networkSecurity = require('./lib/network-security');
const apiContract = require('./lib/api-contract');
const apiErrors = require('./lib/api-errors');
const { createRuntimeMetrics } = require('./lib/runtime-metrics');
const { parsePagination, paginate } = require('./lib/pagination');
const studyDomain = require('./lib/study-domain');
const timezone = require('./lib/timezone');

const ROOT = __dirname;
const ROOT_REAL = fs.realpathSync(ROOT);
const APP_VERSION = '16.0.1';
const LEGAL_VERSION = '2026-07-launch-v1';
const DATA_DIR = path.resolve(process.env.BAWSALA_DATA_DIR || path.join(ROOT, 'data'));
const PORT = Number(process.env.PORT || 8080);
const RUNTIME_ENV = String(process.env.NODE_ENV || 'development').toLowerCase();
const PRODUCTION_MODE = RUNTIME_ENV === 'production';
const BIND_HOST = String(process.env.BAWSALA_BIND_HOST || (PRODUCTION_MODE ? '0.0.0.0' : '127.0.0.1')).trim();
const ALLOW_PUBLIC_DEV_BIND = String(process.env.BAWSALA_ALLOW_PUBLIC_DEV_BIND || '').toLowerCase() === 'true';
const ALLOW_DEV_ADMIN_BOOTSTRAP = !PRODUCTION_MODE && String(process.env.BAWSALA_ALLOW_DEV_ADMIN_BOOTSTRAP || '').toLowerCase() === 'true';
const ALLOW_ADMIN_BOOTSTRAP_HEADER = String(process.env.BAWSALA_ALLOW_ADMIN_BOOTSTRAP_HEADER || '').toLowerCase() === 'true';
const ALLOW_DEV_RESET_LINKS = !PRODUCTION_MODE && String(process.env.BAWSALA_ALLOW_DEV_RESET_LINKS || '').toLowerCase() === 'true';
const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_ABSOLUTE_MS = 24 * 60 * 60 * 1000;
const SESSION_COOKIE_MAX_AGE = Math.floor(SESSION_ABSOLUTE_MS / 1000);
const MAX_BODY = 1024 * 1024 * 4;
const MAX_SNAPSHOT = Math.floor(1024 * 1024 * 2.5);
const MAX_SYNC_KEYS = 800;
const CSRF_DAYS = 1;
const AUTH_IDENTITY_RATE_LIMIT = 6;
const SETUP_ADMIN_TOKEN = process.env.BAWSALA_SETUP_ADMIN_TOKEN || process.env.SETUP_ADMIN_TOKEN || '';
const GOOGLE_CLIENT_ID = process.env.BAWSALA_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.BAWSALA_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.BAWSALA_GOOGLE_REDIRECT_URI || '';
const GOOGLE_PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const GOOGLE_STATE_MAX_AGE_SECONDS = 10 * 60;
const GOOGLE_CALENDAR_ENABLED = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && process.env.BAWSALA_GOOGLE_CALENDAR_ENABLED === 'true');
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_CALENDAR_ID = process.env.BAWSALA_GOOGLE_CALENDAR_ID || 'primary';
const OAUTH_ENCRYPTION_SECRET = process.env.BAWSALA_OAUTH_ENCRYPTION_KEY || process.env.BAWSALA_SECURITY_PEPPER || '';
const MFA_ENCRYPTION_SECRET = process.env.BAWSALA_MFA_ENCRYPTION_KEY || (!PRODUCTION_MODE ? OAUTH_ENCRYPTION_SECRET : '');
const GOOGLE_SYNC_PAST_DAYS = Math.max(0, Math.min(365, Number(process.env.BAWSALA_GOOGLE_SYNC_PAST_DAYS || 30)));
const GOOGLE_SYNC_FUTURE_DAYS = Math.max(30, Math.min(1095, Number(process.env.BAWSALA_GOOGLE_SYNC_FUTURE_DAYS || 365)));
const CALENDAR_MAX_EVENTS = 500;
const PUBLIC_BASE_URL_RAW = process.env.BAWSALA_PUBLIC_BASE_URL || process.env.BAWSALA_PUBLIC_URL || '';
const PUBLIC_BASE_URL = networkSecurity.normalizePublicBaseUrl(PUBLIC_BASE_URL_RAW, { production: PRODUCTION_MODE });
const ALLOWED_HOSTS = configuredAllowedHosts();
const SESSION_COOKIE_NAME = PRODUCTION_MODE ? '__Host-bawsala_session' : 'bawsala_session';
const MAIL_PROVIDER = (process.env.BAWSALA_MAIL_PROVIDER || '').toLowerCase();
const MAIL_WEBHOOK_URL = process.env.BAWSALA_MAIL_WEBHOOK_URL || '';
const MAIL_WEBHOOK_TOKEN = process.env.BAWSALA_MAIL_WEBHOOK_TOKEN || '';
const MAIL_FROM = process.env.BAWSALA_MAIL_FROM || '';
const MAIL_MAX_ATTEMPTS = Math.max(1, Math.min(10, Number(process.env.BAWSALA_MAIL_MAX_ATTEMPTS || 5)));
const MAIL_MAX_PENDING = Math.max(100, Math.min(50000, Number(process.env.BAWSALA_MAIL_MAX_PENDING || 5000)));
const MAIL_LEASE_MS = Math.max(60_000, Math.min(30 * 60_000, Number(process.env.BAWSALA_MAIL_LEASE_MS || 5 * 60_000)));
const MAIL_SENT_RETENTION_MS = Math.max(24 * 60 * 60_000, Math.min(365 * 24 * 60 * 60_000, Number(process.env.BAWSALA_MAIL_SENT_RETENTION_DAYS || 30) * 24 * 60 * 60_000));
const REMINDER_MAX_LATE_MS = Math.max(5 * 60_000, Math.min(7 * 24 * 60 * 60_000, Number(process.env.BAWSALA_REMINDER_MAX_LATE_MINUTES || 1440) * 60_000));
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_RESEND_MS = 5 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;
const PASSWORD_RESET_RESEND_MS = 5 * 60 * 1000;
const LOGIN_LOCK_AFTER = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const PASSWORD_HISTORY_LIMIT = 5;
const PAYMENT_PROVIDER = (process.env.BAWSALA_PAYMENT_PROVIDER || '').toLowerCase();
const PAYMENT_CHECKOUT_API_URL = process.env.BAWSALA_PAYMENT_CHECKOUT_API_URL || '';
const PAYMENT_PORTAL_API_URL = process.env.BAWSALA_PAYMENT_PORTAL_API_URL || '';
const PAYMENT_WEBHOOK_TOLERANCE_SECONDS = Math.max(60, Math.min(900, Number(process.env.BAWSALA_PAYMENT_WEBHOOK_TOLERANCE_SECONDS || 300)));
const PAYMENT_WEBHOOK_SECRET = process.env.BAWSALA_PAYMENT_WEBHOOK_SECRET || process.env.BAWSALA_STRIPE_WEBHOOK_SECRET || '';
const STRIPE_SECRET_KEY = process.env.BAWSALA_STRIPE_SECRET_KEY || '';
const STRIPE_PRICE_IDS = Object.freeze({
  'plus-monthly': process.env.BAWSALA_STRIPE_PRICE_PLUS_MONTHLY || '',
  'plus-yearly': process.env.BAWSALA_STRIPE_PRICE_PLUS_YEARLY || ''
});
const STRIPE_WEBHOOK_TOLERANCE_SECONDS = Math.max(60, Math.min(900, Number(process.env.BAWSALA_STRIPE_WEBHOOK_TOLERANCE_SECONDS || 300)));
const BILLING_CURRENCY = 'JOD';
const CURRENCY_MINOR_UNITS = Object.freeze({ BIF:0, CLP:0, DJF:0, GNF:0, JPY:0, KMF:0, KRW:0, MGA:0, PYG:0, RWF:0, UGX:0, VND:0, VUV:0, XAF:0, XOF:0, XPF:0, BHD:3, IQD:3, JOD:3, KWD:3, LYD:3, OMR:3, TND:3 });
function currencyMinorUnit(currency) { return CURRENCY_MINOR_UNITS[String(currency || '').toUpperCase()] ?? 2; }
const BILLING_PLANS = [
  { id: 'free', name: 'Free', badge: 'Free', paid: false, priceMinor: 0, priceCents: 0, minorUnit: currencyMinorUnit(BILLING_CURRENCY), currency: BILLING_CURRENCY, interval: 'none', intervalLabel: 'دائماً', summary: 'الأدوات الأساسية بدون دفع.', features: ['تقويم داخلي', 'دفاتر ومهام', 'مصادر مجانية أولاً', 'مزامنة حساب أساسية'], entitlements: ['basic-calendar','basic-resources','ads-supported'] },
  { id: 'plus-monthly', name: 'Plus Monthly', badge: 'Monthly', paid: true, priceMinor: 4990, priceCents: 4990, minorUnit: currencyMinorUnit(BILLING_CURRENCY), currency: BILLING_CURRENCY, interval: 'monthly', intervalLabel: 'شهرياً', summary: 'خطة شهرية مرنة للميزات المتقدمة.', features: ['إزالة الإعلانات', 'تقارير أعمق', 'تنبيهات أكثر', 'أولوية دعم'], entitlements: ['no-ads','premium-resources','advanced-reports','priority-support','expanded-reminders'] },
  { id: 'plus-yearly', name: 'Plus Yearly', badge: 'Best value', paid: true, priceMinor: 49990, priceCents: 49990, minorUnit: currencyMinorUnit(BILLING_CURRENCY), currency: BILLING_CURRENCY, interval: 'yearly', intervalLabel: 'سنوياً', summary: 'أرخص شهرياً بحوالي 16.5% من الدفع الشهري.', features: ['كل مزايا Plus', 'خصم سنوي منطقي', 'استقرار فوترة', 'أولوية دعم'], entitlements: ['no-ads','premium-resources','advanced-reports','priority-support','expanded-reminders','annual-discount'] }
];
const ROLE_SET = new Set(['student', 'support', 'admin']);
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 160;
const AUTH_RATE_LIMIT = Math.max(10, Math.min(1000, Number(process.env.BAWSALA_AUTH_RATE_LIMIT || 40)));
const RATE_LIMITS = {
  general: { windowMs: 5 * 60_000, limit: 120 },
  auth: { windowMs: 15 * 60_000, limit: AUTH_RATE_LIMIT },
  signupSuccess: { windowMs: 60 * 60_000, limit: 3 },
  'payment-read': { windowMs: 60_000, limit: 90 },
  payment: { windowMs: 60_000, limit: 12 },
  'payment-webhook': { windowMs: 60_000, limit: 120 },
  sync: { windowMs: 60_000, limit: 45 },
  admin: { windowMs: 60_000, limit: 60 },
  health: { windowMs: 60_000, limit: 90 }
};
const MAX_JSON_BODY = 1024 * 1024;
const MAX_AUTH_BODY = 128 * 1024;
const MAX_ADMIN_BODY = 512 * 1024;
const MAX_BILLING_WEBHOOK_BODY = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ACTIVE_REQUESTS = Math.max(20, Math.min(5000, Number(process.env.BAWSALA_MAX_ACTIVE_REQUESTS || 250)));
const RESPONSE_SECURITY_SAMPLE_RATE = 0.01;
const STRICT_SESSION_BINDING = String(process.env.BAWSALA_STRICT_SESSION_BINDING || '').toLowerCase() === 'true';
const BACKUP_KEEP = Math.max(3, Math.min(100, Number(process.env.BAWSALA_BACKUP_KEEP || 20)));
const SERVER_INSTANCE_ID = crypto.randomBytes(8).toString('hex');
const runtimeMetrics = createRuntimeMetrics({
  maxSamples: Math.max(100, Math.min(5000, Number(process.env.BAWSALA_METRICS_SAMPLES || 800))),
  maxRecent: Math.max(20, Math.min(300, Number(process.env.BAWSALA_METRICS_RECENT || 100))),
  slowRequestMs: Math.max(100, Math.min(10000, Number(process.env.BAWSALA_SLOW_REQUEST_MS || 750)))
});
const HASH_PEPPER = process.env.BAWSALA_SECURITY_PEPPER || process.env.BAWSALA_AUDIT_HASH_PEPPER || SERVER_INSTANCE_ID;
const SECURITY_LOG_FILE = path.join(DATA_DIR, 'security-events.jsonl');
const SECURITY_EVENT_LIMIT = 300;
const TRUST_PROXY = String(process.env.TRUST_PROXY || '').toLowerCase() === 'true';
const TRUSTED_PROXY_RULES = new Set(String(process.env.BAWSALA_TRUSTED_PROXY_IPS || '').split(',').map(v => v.trim()).filter(Boolean));
const TRUST_PROXY_HOPS = Math.max(1, Math.min(10, Number(process.env.BAWSALA_TRUST_PROXY_HOPS || 1)));
const ADMIN_IP_ALLOWLIST = new Set(String(process.env.BAWSALA_ADMIN_IP_ALLOWLIST || process.env.BAWSALA_ADMIN_ALLOWED_IPS || '').split(',').map(v => v.trim()).filter(Boolean));
const DISABLE_PUBLIC_SIGNUPS = String(process.env.BAWSALA_DISABLE_PUBLIC_SIGNUPS || '').toLowerCase() === 'true';
const STRICT_FETCH_METADATA = String(process.env.BAWSALA_STRICT_FETCH_METADATA || 'true').toLowerCase() !== 'false';
const SECURITY_LOG_JSONL = String(process.env.BAWSALA_SECURITY_LOG_JSONL || 'true').toLowerCase() !== 'false';
const SECURITY_LOG_MAX_BYTES = Math.max(1024 * 256, Math.min(1024 * 1024 * 10, Number(process.env.BAWSALA_SECURITY_LOG_MAX_BYTES || 1024 * 1024 * 2)));
const MAX_RATE_BUCKETS = 3000;
const MAX_SESSIONS_PER_USER = Math.max(2, Math.min(50, Number(process.env.BAWSALA_MAX_SESSIONS_PER_USER || 10)));
const PASSWORD_PEPPER = process.env.BAWSALA_PASSWORD_PEPPER || '';
const HEALTH_DETAILS_TOKEN = process.env.BAWSALA_HEALTH_DETAILS_TOKEN || '';
const LOG_RETENTION_DAYS = Math.max(7, Math.min(3650, Number(process.env.BAWSALA_LOG_RETENTION_DAYS || 90)));
const BACKUP_SCHEDULE = String(process.env.BAWSALA_BACKUP_SCHEDULE || 'daily').toLowerCase();
const BACKUP_UPLOAD_URL = process.env.BAWSALA_BACKUP_UPLOAD_URL || '';
const BACKUP_UPLOAD_TOKEN = process.env.BAWSALA_BACKUP_UPLOAD_TOKEN || '';
const BACKUP_ENCRYPTION_KEY = process.env.BAWSALA_BACKUP_ENCRYPTION_KEY || '';
const REQUIRE_OFFSITE_BACKUPS = String(process.env.BAWSALA_REQUIRE_OFFSITE_BACKUPS || '').toLowerCase() === 'true';
const BACKUP_UPLOAD_TIMEOUT_MS = Math.max(3000, Math.min(60000, Number(process.env.BAWSALA_BACKUP_UPLOAD_TIMEOUT_MS || 15000)));
const ALERT_WEBHOOK_URL = process.env.BAWSALA_ALERT_WEBHOOK_URL || '';
const ALERT_WEBHOOK_TOKEN = process.env.BAWSALA_ALERT_WEBHOOK_TOKEN || '';
const ENFORCE_PRODUCTION_CONFIG = String(process.env.BAWSALA_ENFORCE_PRODUCTION_CONFIG || 'true').toLowerCase() !== 'false';
const SYNC_ALLOWED_BASE_KEYS = snapshotSchema.SYNC_ALLOWED_BASE_KEYS;
const PROFILE_SYNC_RE = /^profile\.[a-zA-Z0-9:_-]{1,90}\.(.+)$/;
const SNAPSHOT_SCHEMA = 'filtered-v3-tombstoned';
const CALENDAR_SYNC_KEY = 'study:calendar';
const PUBLIC_STATIC_PREFIXES = ['/assets/', '/pages/'];
const PUBLIC_STATIC_FILES = new Set([
  '/index.html', '/manifest.webmanifest', '/service-worker.js', '/robots.txt', '/_headers'
]);
const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const MAX_URL_LENGTH = 2048;
const MAX_HEADER_BYTES = 16 * 1024;
const MAX_COOKIE_BYTES = 4096;
const MAX_QUERY_PARAMS = 80;
const STATIC_IMMUTABLE_EXT = new Set(['.png', '.jpg', '.jpeg', '.svg']);
const STATIC_CACHE_MAX_BYTES = Math.max(1024 * 1024, Math.min(64 * 1024 * 1024, Number(process.env.BAWSALA_STATIC_CACHE_MAX_BYTES || 12 * 1024 * 1024)));
let staticAssetCacheBytes = 0;
const STATIC_FRESH_EXT = new Set(['.html', '.css', '.js', '.webmanifest']);
const SENSITIVE_STATIC_EXT = new Set(['.env', '.log', '.sqlite', '.db', '.bak', '.tmp']);
const ADMIN_PROTECTED_PAGES = new Set(STATIC_POLICY.adminProtectedPages || []);
const AUTH_PROTECTED_PAGES = new Set(STATIC_POLICY.authProtectedPages || []);
const TEXT_STATIC_EXT = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.svg', '.txt', '.md']);
const staticAssetCache = new Map();

function storageWriteProbe(dir) {
  const probe = path.join(dir, '.bawsala-write-probe');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(probe, String(Date.now()));
  fs.rmSync(probe, { force: true });
  return true;
}
function ensureDataDirectory(dir) {
  try {
    storageWriteProbe(dir);
  } catch (err) {
    console.error(JSON.stringify({ app: 'bawsala', level: 'fatal', type: 'storage-not-writable', dataDir: dir, code: err.code || 'UNKNOWN', message: err.message }));
    throw Object.assign(new Error('DATA_DIR_NOT_WRITABLE'), { cause: err });
  }
}
ensureDataDirectory(DATA_DIR);

function defaultDb() {
  return {
    version: 13.4,
    createdAt: new Date().toISOString(),
    appSettings: {
      brandArabic: 'بوصلة',
      brandEnglish: 'Bawsala',
      tagline: 'قرار اليوم أولاً. الأدوات تخدم التنفيذ، لا الهروب.',
      whatsapp: '962792305585',
      announcement: '',
      showAnnouncement: false,
      maintenance: false
    },
    users: {},
    sessions: {},
    snapshots: {},
    audit: [],
    securityEvents: [],
    paymentEvents: [],
    checkoutSessions: {},
    invoices: {},
    oauthPending: {},
    emailVerificationTokens: {},
    passwordResetTokens: {},
    authFailures: {},
    mailOutbox: [],
    calendarSync: {},
    idempotencyRecords: {},
    supportTickets: {}
  };
}

const stateStore = createStateStore({ dataDir: DATA_DIR, defaultDb });
let db = stateStore.load();
normalizeDbShape();
db.oauthPending = db.oauthPending || {};
db.paymentEvents = db.paymentEvents || [];
db.checkoutSessions = db.checkoutSessions || {};
db.invoices = db.invoices || {};
db.emailVerificationTokens = db.emailVerificationTokens || {};
db.passwordResetTokens = db.passwordResetTokens || {};
db.authFailures = db.authFailures || {};
const authFailureCache = new Map(Object.entries(db.authFailures));
db.mailOutbox = Array.isArray(db.mailOutbox) ? db.mailOutbox : [];
db.calendarSync = db.calendarSync || {};
db.idempotencyRecords = db.idempotencyRecords || {};
db.supportTickets = db.supportTickets || {};
const googleCalendarSyncLocks = new Set();
db.audit = db.audit || [];
db.securityEvents = Array.isArray(db.securityEvents) ? db.securityEvents : [];
let writeTimer = null;
let lastPersistAt = null;
let lastPersistError = null;
let pendingPersist = false;
function persistNow({ throwOnError = false } = {}) {
  clearTimeout(writeTimer);
  writeTimer = null;
  pendingPersist = false;
  try {
    stateStore.save(db);
    lastPersistAt = new Date().toISOString();
    lastPersistError = null;
    return true;
  } catch (err) {
    lastPersistError = { at: new Date().toISOString(), code: err.code || 'PERSIST_FAILED', message: cleanText(err.message || 'Persistence failed', 200) };
    structuredLog('error', 'state-persist-failed', lastPersistError);
    sendOperationalAlert('state-persist-failed', lastPersistError);
    if (throwOnError) throw err;
    return false;
  }
}
function persistSoon() {
  clearTimeout(writeTimer);
  pendingPersist = true;
  writeTimer = setTimeout(() => persistNow(), 80);
  writeTimer.unref?.();
}
function audit(type, actor, details = {}) {
  db.audit.unshift({ at: new Date().toISOString(), type, actor: actor || 'system', details: scrub(details) });
  db.audit = db.audit.slice(0, 500);
  persistSoon();
}

function structuredLog(level, type, details = {}) {
  const entry = {
    at: new Date().toISOString(),
    level: cleanText(level, 20) || 'info',
    type: cleanText(type, 80) || 'event',
    details: scrub(details)
  };
  try { console.log(JSON.stringify({ app: 'bawsala', version: APP_VERSION, ...entry })); } catch (_) { /* console may be unavailable in embedded runtimes */ }
  return entry;
}
async function assertSafeOutboundUrl(url) {
  if (!isProduction()) return null;
  if (networkSecurity.isLocalHostname(url.hostname)) throw Object.assign(new Error('OUTBOUND_DESTINATION_BLOCKED'), { status: 503 });
  const literal = networkSecurity.normalizeIp(url.hostname);
  if (literal) {
    if (networkSecurity.isPrivateOrReservedIp(literal.text)) throw Object.assign(new Error('OUTBOUND_DESTINATION_BLOCKED'), { status: 503 });
    return { address: literal.text, family: literal.version };
  }
  let addresses;
  try { addresses = await dns.lookup(url.hostname, { all: true, verbatim: true }); }
  catch (_) { throw Object.assign(new Error('OUTBOUND_DNS_FAILED'), { status: 503 }); }
  if (!addresses.length || addresses.some(entry => networkSecurity.isPrivateOrReservedIp(entry.address))) throw Object.assign(new Error('OUTBOUND_DESTINATION_BLOCKED'), { status: 503 });
  const selected = addresses[Math.floor(Math.random() * addresses.length)];
  return { address: selected.address, family: selected.family };
}
async function outboundRequest(target, { method = 'POST', headers = {}, body = '', timeoutMs = 10000, maxBytes = 1024 * 1024 } = {}) {
  let url;
  try { url = new URL(String(target || '')); }
  catch (_) { throw Object.assign(new Error('OUTBOUND_URL_INVALID'), { status: 503 }); }
  if (!['http:', 'https:'].includes(url.protocol) || (isProduction() && url.protocol !== 'https:')) {
    throw Object.assign(new Error('OUTBOUND_URL_INSECURE'), { status: 503 });
  }
  const pinnedAddress = await assertSafeOutboundUrl(url);
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const requestOptions = { method, headers, timeout: timeoutMs, maxRedirects: 0 };
    if (pinnedAddress) {
      requestOptions.lookup = (_hostname, _options, callback) => callback(null, pinnedAddress.address, pinnedAddress.family);
      if (url.protocol === 'https:') requestOptions.servername = url.hostname;
    }
    const request = transport.request(url, requestOptions, response => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        raw += chunk;
        if (Buffer.byteLength(raw, 'utf8') > maxBytes) request.destroy(Object.assign(new Error('OUTBOUND_RESPONSE_TOO_LARGE'), { status: 502 }));
      });
      response.on('end', () => {
        let data = null;
        const type = String(response.headers['content-type'] || '');
        if (raw && type.includes('json')) {
          try { data = JSON.parse(raw); } catch (_) { data = null; }
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return reject(Object.assign(new Error('OUTBOUND_PROVIDER_ERROR'), { status: 502, providerStatus: response.statusCode, response: scrub(data || raw) }));
        }
        resolve({ status: response.statusCode, headers: response.headers, data, raw });
      });
    });
    request.on('timeout', () => request.destroy(Object.assign(new Error('OUTBOUND_TIMEOUT'), { status: 504 })));
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}


let alertInFlight = false;
function sendOperationalAlert(type, details = {}) {
  if (!ALERT_WEBHOOK_URL || alertInFlight) return false;
  alertInFlight = true;
  const payload = JSON.stringify({
    app: 'bawsala',
    version: APP_VERSION,
    instanceId: SERVER_INSTANCE_ID,
    environment: isProduction() ? 'production' : 'development',
    at: new Date().toISOString(),
    type: cleanText(type, 80),
    details: scrub(details)
  });
  const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) };
  if (ALERT_WEBHOOK_TOKEN) headers.Authorization = `Bearer ${ALERT_WEBHOOK_TOKEN}`;
  outboundRequest(ALERT_WEBHOOK_URL, { headers, body: payload, timeoutMs: 6000, maxBytes: 128 * 1024 })
    .catch(err => structuredLog('warn', 'alert-delivery-failed', { type, code: err.message || 'ALERT_FAILED' }))
    .finally(() => { alertInFlight = false; });
  return true;
}

let securityLogChainHead = null;
function securityLogCandidateFiles() {
  try {
    const dir = path.dirname(SECURITY_LOG_FILE);
    const base = path.basename(SECURITY_LOG_FILE);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(name => name === base || (name.startsWith(base + '.') && name.endsWith('.old')))
      .map(name => path.join(dir, name))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  } catch (_) { return []; }
}
function initializeSecurityLogChain() {
  if (securityLogChainHead !== null) return securityLogChainHead;
  securityLogChainHead = '';
  for (const file of securityLogCandidateFiles()) {
    try {
      const lines = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
      if (!lines.length) continue;
      const parsed = JSON.parse(lines.at(-1));
      if (typeof parsed.checksum === 'string' && parsed.checksum.startsWith('sha256:')) {
        securityLogChainHead = parsed.checksum;
        break;
      }
    } catch (_) { /* a malformed historical line must not break runtime logging */ }
  }
  return securityLogChainHead;
}
function rotateSecurityLogIfNeeded() {
  if (!SECURITY_LOG_JSONL) return;
  try {
    if (fs.existsSync(SECURITY_LOG_FILE) && fs.statSync(SECURITY_LOG_FILE).size > SECURITY_LOG_MAX_BYTES) {
      const rotated = SECURITY_LOG_FILE + '.' + new Date().toISOString().replace(/[:.]/g, '-') + '.old';
      fs.renameSync(SECURITY_LOG_FILE, rotated);
    }
  } catch (_) { /* logging must never bring the app down */ }
}
function appendSecurityLog(entry) {
  if (!SECURITY_LOG_JSONL) return;
  try {
    fs.mkdirSync(path.dirname(SECURITY_LOG_FILE), { recursive: true, mode: 0o700 });
    try { fs.chmodSync(path.dirname(SECURITY_LOG_FILE), 0o700); } catch (_) {}
    rotateSecurityLogIfNeeded();
    const previousHash = initializeSecurityLogChain() || null;
    const chained = { ...entry, previousHash };
    const checksum = 'sha256:' + safeHash(stableStringify(chained), 'security-log-chain');
    const payload = JSON.stringify({ ...chained, checksum }) + '\n';
    fs.appendFileSync(SECURITY_LOG_FILE, payload, { mode: 0o600 });
    try { fs.chmodSync(SECURITY_LOG_FILE, 0o600); } catch (_) {}
    securityLogChainHead = checksum;
  } catch (_) { /* best effort append-only incident trail */ }
}
function securityEvent(type, actor, details = {}) {
  const entry = structuredLog('security', type, { actor: actor || 'system', ...details });
  db.securityEvents.unshift(entry);
  db.securityEvents = db.securityEvents.slice(0, SECURITY_EVENT_LIMIT);
  appendSecurityLog(entry);
  persistSoon();
  return entry;
}

function scrub(value, depth = 0) {
  if (depth > 5) return null;
  if (typeof value === 'string') return cleanText(value, 600);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 100).map(v => scrub(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value).slice(0, 120)) {
      const key = cleanKey(k);
      if (!key || /password|token|secret/i.test(key)) continue;
      out[key] = scrub(v, depth + 1);
    }
    return out;
  }
  return null;
}

function cleanSnapshotString(value, max = 25000) {
  // Snapshot text is user study data. Do not use the audit scrubber here: it is intentionally lossy.
  // Keep multiline notes/reports intact while still removing control characters and bounding size.
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ').slice(0, max);
}
function sanitizeSnapshotValue(value, depth = 0) {
  if (depth > 8) return null;
  if (typeof value === 'string') return cleanSnapshotString(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 1000).map(v => sanitizeSnapshotValue(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value).slice(0, 1000)) {
      const key = cleanKey(k);
      if (!key || /password|token|secret/i.test(key)) continue;
      out[key] = sanitizeSnapshotValue(v, depth + 1);
    }
    return out;
  }
  return null;
}
function isProduction() {
  return PRODUCTION_MODE;
}
function isLoopbackHost(value) {
  const host = String(value || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  return host === '127.0.0.1' || host === '::1' || host === 'localhost';
}
function assertRuntimeExposure() {
  if (!['development', 'test', 'production'].includes(RUNTIME_ENV)) throw new Error('NODE_ENV_INVALID');
  if (!isProduction() && !ALLOW_PUBLIC_DEV_BIND && !isLoopbackHost(BIND_HOST)) {
    throw new Error('PUBLIC_DEVELOPMENT_BIND_BLOCKED');
  }
}

function mailProviderConfig() {
  const webhookUrl = configuredExternalUrl(MAIL_WEBHOOK_URL);
  const webhookConfigured = MAIL_PROVIDER === 'webhook' && !!webhookUrl && !!MAIL_FROM;
  return {
    provider: MAIL_PROVIDER || 'none',
    configured: webhookConfigured,
    webhookConfigured,
    fromConfigured: !!MAIL_FROM,
    mode: webhookConfigured ? 'webhook' : (!isProduction() && MAIL_PROVIDER ? 'development-only' : 'disabled')
  };
}

function criticalProductionConfigurationErrors() {
  if (!isProduction()) return [];
  const errors = [];
  if (!process.env.BAWSALA_DATA_DIR) errors.push('BAWSALA_DATA_DIR_NOT_SET');
  if (!PUBLIC_BASE_URL) errors.push(PUBLIC_BASE_URL_RAW ? 'PUBLIC_BASE_URL_INVALID_OR_INSECURE' : 'PUBLIC_BASE_URL_NOT_CONFIGURED');
  if (!ALLOWED_HOSTS.size) errors.push('ALLOWED_HOSTS_NOT_CONFIGURED');
  if (String(process.env.BAWSALA_SECURITY_PEPPER || '').length < 32) errors.push('SECURITY_PEPPER_TOO_SHORT_OR_MISSING');
  if (PASSWORD_PEPPER.length < 32) errors.push('PASSWORD_PEPPER_TOO_SHORT_OR_MISSING');
  if (userCount() === 0) {
    if (String(SETUP_ADMIN_TOKEN || '').length < 32) errors.push('SETUP_ADMIN_TOKEN_TOO_SHORT_OR_MISSING');
    if (!ALLOW_ADMIN_BOOTSTRAP_HEADER) errors.push('ADMIN_BOOTSTRAP_HEADER_NOT_ENABLED');
  }
  if (!DISABLE_PUBLIC_SIGNUPS && !mailProviderConfig().configured) errors.push('MAIL_DELIVERY_NOT_CONFIGURED');
  if (TRUST_PROXY && !TRUSTED_PROXY_RULES.size) errors.push('TRUSTED_PROXY_IPS_NOT_CONFIGURED');
  const billing = billingProviderConfig();
  if (PAYMENT_PROVIDER && PAYMENT_PROVIDER !== 'none' && !billing.configured) errors.push('PAYMENT_PROVIDER_INCOMPLETE');
  const storage = stateStore.info();
  if (storage.engine !== 'sqlite' || storage.normalizedSchema !== true) errors.push('NORMALIZED_SQLITE_REQUIRED');
  if (Number(process.env.BAWSALA_INSTANCE_COUNT || 1) !== 1) errors.push('SINGLE_INSTANCE_REQUIRED');
  if (GOOGLE_CALENDAR_ENABLED && OAUTH_ENCRYPTION_SECRET.length < 32) errors.push('OAUTH_ENCRYPTION_KEY_TOO_SHORT_OR_MISSING');
  const offsite = offsiteBackupConfig();
  if (REQUIRE_OFFSITE_BACKUPS && !offsite.uploadUrl) errors.push('OFFSITE_BACKUP_URL_INVALID_OR_MISSING');
  if (!offsite.encryptionConfigured) errors.push('BACKUP_ENCRYPTION_KEY_TOO_SHORT_OR_MISSING');
  return errors;
}

function assertProductionConfiguration() {
  const errors = criticalProductionConfigurationErrors();
  if (errors.length && ENFORCE_PRODUCTION_CONFIG) {
    const err = new Error('PRODUCTION_CONFIGURATION_INVALID');
    err.details = errors;
    structuredLog('fatal', 'production-configuration-invalid', { errors });
    throw err;
  }
  return errors;
}

function healthDetailsAllowed(req) {
  const user = currentUser(req);
  if (user?.role === 'admin') return true;
  const supplied = String(req.headers['x-bawsala-health-token'] || '');
  return !!HEALTH_DETAILS_TOKEN && networkSecurity.safeEqualSecret(supplied, HEALTH_DETAILS_TOKEN);
}

function requirePublicBaseUrl() {
  if (isProduction() && !PUBLIC_BASE_URL) throw Object.assign(new Error('PUBLIC_BASE_URL_NOT_CONFIGURED'), { status: 503 });
}
function adminCount() {
  return Object.values(db.users).filter(u => u.role === 'admin').length;
}

function runtimeWarnings() {
  const warnings = [];
  if (isProduction() && !process.env.BAWSALA_DATA_DIR) warnings.push('BAWSALA_DATA_DIR_NOT_SET');
  if (isProduction() && userCount() === 0) {
    if (!SETUP_ADMIN_TOKEN) warnings.push('SETUP_ADMIN_TOKEN_NOT_SET');
    if (!ALLOW_ADMIN_BOOTSTRAP_HEADER) warnings.push('ADMIN_BOOTSTRAP_HEADER_NOT_ENABLED');
  }
  if (isProduction() && !PUBLIC_BASE_URL) warnings.push(PUBLIC_BASE_URL_RAW ? 'PUBLIC_BASE_URL_INVALID_OR_INSECURE' : 'PUBLIC_BASE_URL_NOT_CONFIGURED');
  if (isProduction() && !ALLOWED_HOSTS.size) warnings.push('ALLOWED_HOSTS_NOT_CONFIGURED');
  if (isProduction() && !mailProviderConfig().configured) warnings.push('MAIL_DELIVERY_NOT_CONFIGURED');
  if (PAYMENT_PROVIDER && PAYMENT_PROVIDER !== 'none' && !billingProviderConfig().configured) warnings.push('PAYMENT_PROVIDER_INCOMPLETE');
  if (PAYMENT_CHECKOUT_API_URL && !configuredExternalUrl(PAYMENT_CHECKOUT_API_URL)) warnings.push('PAYMENT_CHECKOUT_API_URL_INVALID_OR_INSECURE');
  if (PAYMENT_PORTAL_API_URL && !configuredExternalUrl(PAYMENT_PORTAL_API_URL)) warnings.push('PAYMENT_PORTAL_API_URL_INVALID_OR_INSECURE');
  if (GOOGLE_CLIENT_ID && (!GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI)) warnings.push('GOOGLE_OAUTH_PARTIAL_CONFIG');
  const storage = stateStore.info();
  if (storage.engine !== 'sqlite') warnings.push('JSON_STORAGE_FALLBACK_DEVELOPMENT_ONLY');
  if (storage.engine === 'sqlite' && storage.normalizedSchema !== true) warnings.push('SQLITE_SCHEMA_NOT_NORMALIZED');
  if (Number(process.env.BAWSALA_INSTANCE_COUNT || 1) !== 1) warnings.push('MULTI_INSTANCE_UNSUPPORTED_SHARED_STATE');
  if (GOOGLE_CALENDAR_ENABLED && OAUTH_ENCRYPTION_SECRET.length < 32) warnings.push('OAUTH_ENCRYPTION_KEY_TOO_SHORT_OR_MISSING');
  const offsite = offsiteBackupConfig();
  if (REQUIRE_OFFSITE_BACKUPS && !offsite.uploadUrl) warnings.push('OFFSITE_BACKUP_URL_INVALID_OR_MISSING');
  if (isProduction() && !offsite.encryptionConfigured) warnings.push('BACKUP_ENCRYPTION_KEY_TOO_SHORT_OR_MISSING');
  if (!REQUIRE_OFFSITE_BACKUPS && isProduction() && !offsite.configured) warnings.push('OFFSITE_BACKUP_NOT_CONFIGURED');
  if (!isStorageWritable()) warnings.push('DATA_DIR_NOT_WRITABLE');
  if (isProduction() && String(process.env.BAWSALA_SECURITY_PEPPER || '').length < 32) warnings.push('SECURITY_PEPPER_TOO_SHORT_OR_MISSING');
  if (isProduction() && PASSWORD_PEPPER.length < 32) warnings.push('PASSWORD_PEPPER_TOO_SHORT_OR_MISSING');
  if (TRUST_PROXY && !TRUSTED_PROXY_RULES.size) warnings.push('TRUSTED_PROXY_IPS_NOT_CONFIGURED');
  if (ADMIN_IP_ALLOWLIST.size) warnings.push('ADMIN_IP_ALLOWLIST_ACTIVE');
  if (DISABLE_PUBLIC_SIGNUPS) warnings.push('PUBLIC_SIGNUPS_DISABLED');
  if (!isProduction()) warnings.push('NODE_ENV_NOT_PRODUCTION');
  return warnings;
}

function normalizeDbShape() {
  db.users = db.users && typeof db.users === 'object' && !Array.isArray(db.users) ? db.users : {};
  db.sessions = db.sessions && typeof db.sessions === 'object' && !Array.isArray(db.sessions) ? db.sessions : {};
  db.snapshots = db.snapshots && typeof db.snapshots === 'object' && !Array.isArray(db.snapshots) ? db.snapshots : {};
  db.audit = Array.isArray(db.audit) ? db.audit : [];
  db.securityEvents = Array.isArray(db.securityEvents) ? db.securityEvents : [];
  db.paymentEvents = Array.isArray(db.paymentEvents) ? db.paymentEvents : [];
  db.checkoutSessions = db.checkoutSessions && typeof db.checkoutSessions === 'object' && !Array.isArray(db.checkoutSessions) ? db.checkoutSessions : {};
  db.invoices = db.invoices && typeof db.invoices === 'object' && !Array.isArray(db.invoices) ? db.invoices : {};
  db.oauthPending = db.oauthPending && typeof db.oauthPending === 'object' && !Array.isArray(db.oauthPending) ? db.oauthPending : {};
  db.emailVerificationTokens = db.emailVerificationTokens && typeof db.emailVerificationTokens === 'object' && !Array.isArray(db.emailVerificationTokens) ? db.emailVerificationTokens : {};
  db.passwordResetTokens = db.passwordResetTokens && typeof db.passwordResetTokens === 'object' && !Array.isArray(db.passwordResetTokens) ? db.passwordResetTokens : {};
  db.authFailures = db.authFailures && typeof db.authFailures === 'object' && !Array.isArray(db.authFailures) ? db.authFailures : {};
  db.mailOutbox = Array.isArray(db.mailOutbox) ? db.mailOutbox : [];
  db.calendarSync = db.calendarSync && typeof db.calendarSync === 'object' && !Array.isArray(db.calendarSync) ? db.calendarSync : {};
  db.idempotencyRecords = db.idempotencyRecords && typeof db.idempotencyRecords === 'object' && !Array.isArray(db.idempotencyRecords) ? db.idempotencyRecords : {};
}

function syncBaseKey(key) {
  return snapshotSchema.syncBaseKey(key);
}
function isSyncKeyAllowed(key) {
  return snapshotSchema.isSyncKeyAllowed(key);
}
function filterSnapshotKeys(keys, options = {}) {
  const entries = Object.entries(keys || {});
  if (options.strict && entries.length > MAX_SYNC_KEYS) {
    throw Object.assign(new Error('TOO_MANY_SYNC_KEYS'), { status: 413 });
  }
  const safeKeys = {};
  for (const [key, value] of entries) {
    const clean = cleanKey(key);
    if (!isSyncKeyAllowed(clean)) continue;
    if (Object.keys(safeKeys).length >= MAX_SYNC_KEYS) {
      if (options.strict) throw Object.assign(new Error('TOO_MANY_SYNC_KEYS'), { status: 413 });
      break;
    }
    const cleanValue = snapshotSchema.sanitizeForBaseKey(syncBaseKey(clean), value, undefined);
    if (cleanValue === undefined || cleanValue === null) continue;
    safeKeys[clean] = cleanValue;
  }
  return safeKeys;
}
function itemTime(item) {
  const raw = item && (item.deletedAt || item.updatedAt || item.reviewedAt || item.finishedAt || item.createdAt || item.date || item.dueAt);
  const t = raw ? parseTime(raw) : 0;
  return Number.isFinite(t) ? t : 0;
}
function mergeArrayById(existing, incoming) {
  const map = new Map();
  for (const item of Array.isArray(existing) ? existing : []) {
    if (item && typeof item === 'object' && item.id) map.set(String(item.id), item);
    else map.set(`_old_${map.size}`, item);
  }
  for (const item of Array.isArray(incoming) ? incoming : []) {
    if (item && typeof item === 'object' && item.id) {
      const id = String(item.id);
      const old = map.get(id);
      map.set(id, !old || itemTime(item) >= itemTime(old) ? item : old);
    } else {
      map.set(`_new_${map.size}`, item);
    }
  }
  return Array.from(map.values()).slice(0, 1000);
}
function mergeValue(existing, incoming) {
  if (Array.isArray(existing) && Array.isArray(incoming)) return mergeArrayById(existing, incoming);
  if (existing && incoming && typeof existing === 'object' && typeof incoming === 'object' && !Array.isArray(existing) && !Array.isArray(incoming)) {
    const oldTime = itemTime(existing);
    const newTime = itemTime(incoming);
    if (oldTime || newTime) return newTime >= oldTime ? { ...existing, ...incoming } : { ...incoming, ...existing };
    return { ...existing, ...incoming };
  }
  return incoming;
}
function mergeSnapshotKeys(existing, incoming) {
  const out = { ...(existing || {}) };
  for (const [key, value] of Object.entries(incoming || {})) out[key] = key in out ? mergeValue(out[key], value) : value;
  return out;
}

function snapshotStats(keys) {
  let totalKeys = 0;
  let tombstones = 0;
  let arrayRecords = 0;
  for (const value of Object.values(keys || {})) {
    totalKeys += 1;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object') {
          arrayRecords += 1;
          if (item._deleted === true && item.deletedAt) tombstones += 1;
        }
      }
    }
  }
  return { totalKeys, arrayRecords, tombstones };
}

function safeSnapshotForUser(userId) {
  const snap = db.snapshots[userId] || { keys: {}, updatedAt: null, schema: SNAPSHOT_SCHEMA };
  const keys = filterSnapshotKeys(snap.keys || {});
  const revision = snapshotRevision(keys);
  return { keys, updatedAt: snap.updatedAt || null, schema: SNAPSHOT_SCHEMA, revision, stats: snapshotStats(keys) };
}

function cleanText(value, max = 2000) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/<\s*script/gi, '&lt;script')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:/gi, '')
    .trim()
    .slice(0, max);
}
function cleanKey(value) {
  return String(value ?? '').replace(/[^a-zA-Z0-9:_\-.]/g, '').slice(0, 180);
}
function cleanEmail(email) {
  return cleanText(email, 240).toLowerCase();
}
function isValidEmailAddress(value) {
  const email = cleanEmail(value);
  if (!email || email.length > 254 || /[\s\u0000-\u001f\u007f]/.test(email)) return false;
  const at = email.lastIndexOf('@');
  if (at <= 0 || at !== email.indexOf('@') || at > 64 || at === email.length - 1) return false;
  const local = email.slice(0, at);
  const asciiDomain = domainToASCII(email.slice(at + 1));
  if (!asciiDomain || asciiDomain.length > 253 || !asciiDomain.includes('.')) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (!/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+$/i.test(local)) return false;
  return asciiDomain.split('.').every(label => label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label));
}
function cleanId(value) {
  return String(value ?? '').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 90);
}
function jsonSafe(value, maxBytes = MAX_SNAPSHOT) {
  const raw = JSON.stringify(value || {});
  if (Buffer.byteLength(raw, 'utf8') > maxBytes) throw Object.assign(new Error('PAYLOAD_TOO_LARGE'), { status: 413 });
  return JSON.parse(raw);
}
function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    track: user.track || 'academic',
    specialization: user.specialization || '',
    grade: user.grade || 'tawjihi',
    goal: user.goal || 85,
    language: user.language || 'ar',
    theme: user.theme || 'dark',
    phone: user.phone || '',
    subscription: publicSubscription(user),
    authProvider: user.authProvider || (user.providers?.google ? 'google' : 'password'),
    hasPassword: !!user.passwordHash,
    emailVerified: !!user.emailVerifiedAt || !!user.providers?.google?.emailVerifiedAt,
    emailVerificationRequired: !(!!user.emailVerifiedAt || !!user.providers?.google?.emailVerifiedAt),
    emailVerificationSentAt: user.emailVerification?.sentAt || null,
    legalAcceptedAt: user.privacyAcceptedAt || null,
    legalVersion: user.legalVersion || null,
    currentLegalVersion: LEGAL_VERSION,
    legalConsentRequired: user.legalVersion !== LEGAL_VERSION,
    profileComplete: !!(user.track && user.specialization),
    mfaEnabled: !!user.mfa?.enabled,
    mfaRequired: user.role === 'admin' && !user.mfa?.enabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}
function adminUserListItem(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.deletedAt ? 'deleted' : (user.disabledAt ? 'disabled' : 'active'),
    emailVerified: !!user.emailVerifiedAt || !!user.providers?.google?.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}
function supportTicketDto(ticket, { admin = false } = {}) {
  if (!ticket) return null;
  const base = {
    id: ticket.id,
    status: ticket.status || 'جديدة',
    priority: ticket.priority || 'normal',
    category: ticket.category || 'technical',
    title: ticket.title || 'طلب دعم',
    details: ticket.details || '',
    adminNote: ticket.adminNote || '',
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    closedAt: ticket.closedAt || null,
    history: Array.isArray(ticket.history)
      ? ticket.history.slice(-30).map(entry => admin ? entry : {
          at: entry?.at || null,
          action: entry?.action || 'updated',
          status: entry?.status || ticket.status || 'جديدة',
          actor: entry?.actor === 'user' ? 'user' : 'support'
        })
      : []
  };
  return admin ? { ...base, userId: ticket.userId, ownerName: ticket.ownerName || '', ownerEmail: ticket.ownerEmail || '' } : base;
}
function passwordMaterial(password, peppered = false) {
  return peppered && PASSWORD_PEPPER ? `${String(password)}\u0000${PASSWORD_PEPPER}` : String(password);
}
function scryptHash(password, salt, { peppered = false } = {}) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(passwordMaterial(password, peppered), salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, derived) => err ? reject(err) : resolve(derived.toString('hex')));
  });
}
async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const peppered = !!PASSWORD_PEPPER;
  const hash = await scryptHash(password, salt, { peppered });
  return { salt, hash, algorithm: 'scrypt-v2', peppered };
}
async function verifyPassword(password, user) {
  if (!user?.passwordHash || !user?.passwordSalt) return false;
  const peppered = user.passwordPeppered === true;
  const attempt = Buffer.from(await scryptHash(password, user.passwordSalt, { peppered }), 'hex');
  const stored = Buffer.from(user.passwordHash, 'hex');
  const valid = stored.length === attempt.length && crypto.timingSafeEqual(stored, attempt);
  if (valid && PASSWORD_PEPPER && !peppered) {
    const upgraded = await hashPassword(password);
    user.passwordSalt = upgraded.salt;
    user.passwordHash = upgraded.hash;
    user.passwordAlgorithm = upgraded.algorithm;
    user.passwordPeppered = upgraded.peppered;
    rememberPassword(user, upgraded.salt, upgraded.hash, upgraded.algorithm, upgraded.peppered);
    user.updatedAt = new Date().toISOString();
    persistSoon();
  }
  return valid;
}
async function burnLoginHash(password) {
  try { await scryptHash(password || 'invalid-login-attempt', 'bawsala-dummy-login-salt-v13', { peppered: !!PASSWORD_PEPPER }); } catch (_) {}
}
async function verifyPasswordCredential(password, credential) {
  if (!credential?.hash || !credential?.salt) return false;
  const attempt = Buffer.from(await scryptHash(password, credential.salt, { peppered: credential.peppered === true }), 'hex');
  const stored = Buffer.from(credential.hash, 'hex');
  return stored.length === attempt.length && crypto.timingSafeEqual(stored, attempt);
}
function rememberPassword(user, salt, hash, algorithm = 'scrypt-v2', peppered = !!PASSWORD_PEPPER) {
  const history = Array.isArray(user.passwordHistory) ? user.passwordHistory : [];
  user.passwordHistory = [{ salt, hash, algorithm, peppered, createdAt: new Date().toISOString() }, ...history]
    .filter(item => item && item.salt && item.hash)
    .slice(0, PASSWORD_HISTORY_LIMIT);
}
async function isPasswordReused(user, password) {
  if (!user || !password) return false;
  const credentials = [];
  if (user.passwordSalt && user.passwordHash) credentials.push({ salt: user.passwordSalt, hash: user.passwordHash });
  if (Array.isArray(user.passwordHistory)) credentials.push(...user.passwordHistory);
  for (const credential of credentials) {
    if (await verifyPasswordCredential(password, credential)) return true;
  }
  return false;
}
function newId(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(14).toString('hex')}`;
}
function parseTime(value, fallback = 0) {
  if (value === undefined || value === null || value === '' || value === false || value === 0) return fallback;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : fallback;
}
function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}
function safeHash(value, context = 'generic') {
  return sha256(`${HASH_PEPPER}|${context}|${String(value || '')}`);
}
function oauthCryptoKey() {
  if (OAUTH_ENCRYPTION_SECRET.length < 32) return null;
  return crypto.createHash('sha256').update(`bawsala-oauth-v1|${OAUTH_ENCRYPTION_SECRET}`).digest();
}
function sealSecret(value) {
  const key = oauthCryptoKey();
  if (!key || !value) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}
function openSecret(value) {
  const key = oauthCryptoKey();
  const parts = String(value || '').split('.');
  if (!key || parts.length !== 4 || parts[0] !== 'v1') return '';
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parts[1], 'base64url'));
    decipher.setAuthTag(Buffer.from(parts[2], 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8');
  } catch (_) { return ''; }
}
function mfaCryptoKey() {
  if (MFA_ENCRYPTION_SECRET.length < 32) return null;
  return crypto.createHash('sha256').update(`bawsala-mfa-v1|${MFA_ENCRYPTION_SECRET}`).digest();
}
function sealMfaSecret(value) {
  const key = mfaCryptoKey();
  if (!key || !value) throw Object.assign(new Error('MFA_NOT_CONFIGURED'), { status: 503 });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}
function openMfaSecret(value) {
  const key = mfaCryptoKey();
  const parts = String(value || '').split('.');
  if (!key || parts.length !== 4 || parts[0] !== 'v1') return '';
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parts[1], 'base64url'));
    decipher.setAuthTag(Buffer.from(parts[2], 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8');
  } catch (_) { return ''; }
}
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(buffer) {
  let bits = 0, value = 0, output = '';
  for (const byte of buffer) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}
function base32Decode(value) {
  const clean = String(value || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, current = 0; const bytes = [];
  for (const char of clean) { const index = BASE32_ALPHABET.indexOf(char); if (index < 0) continue; current = (current << 5) | index; bits += 5; if (bits >= 8) { bytes.push((current >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(bytes);
}
function hotp(secret, counter) {
  const key = base32Decode(secret); const buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', key).update(buffer).digest(); const offset = digest[digest.length - 1] & 15;
  const number = ((digest[offset] & 127) << 24) | ((digest[offset + 1] & 255) << 16) | ((digest[offset + 2] & 255) << 8) | (digest[offset + 3] & 255);
  return String(number % 1_000_000).padStart(6, '0');
}
function verifyTotp(secret, code, now = Date.now()) {
  const clean = String(code || '').replace(/\D/g, ''); if (clean.length !== 6) return false;
  const counter = Math.floor(now / 30_000);
  for (let drift = -1; drift <= 1; drift++) if (networkSecurity.safeEqualSecret(hotp(secret, counter + drift), clean)) return true;
  return false;
}
function issueRecoveryCodes() {
  const codes = Array.from({ length: 8 }, () => crypto.randomBytes(6).toString('base64url').toUpperCase());
  return { codes, hashes: codes.map(code => sha256(`mfa-recovery|${code}`)) };
}
function consumeRecoveryCode(user, code) {
  const normalized = cleanText(code, 80).toUpperCase(); if (!normalized) return false;
  const hash = sha256(`mfa-recovery|${normalized}`); const list = Array.isArray(user.mfa?.recoveryCodeHashes) ? user.mfa.recoveryCodeHashes : [];
  const index = list.findIndex(value => networkSecurity.safeEqualSecret(value, hash)); if (index < 0) return false;
  list.splice(index, 1); user.mfa.recoveryCodeHashes = list; user.updatedAt = new Date().toISOString(); persistSoon(); audit('mfa-recovery-code-used', user.id, { remaining: list.length }); return true;
}
function verifyMfaCredential(user, code) {
  if (!user?.mfa?.enabled) return false;
  const secret = openMfaSecret(user.mfa.encryptedSecret);
  return (!!secret && verifyTotp(secret, code)) || consumeRecoveryCode(user, code);
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}
function snapshotRevision(keys) {
  return 'sha256:' + sha256(stableStringify(keys || {})).slice(0, 32);
}
function normalizeHostname(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || /[\/\s]/.test(raw)) return '';
  try { return new URL(`http://${raw}`).hostname.toLowerCase().replace(/\.$/, ''); }
  catch (_) { return ''; }
}
function configuredAllowedHosts() {
  const hosts = new Set(String(process.env.BAWSALA_ALLOWED_HOSTS || '').split(',').map(normalizeHostname).filter(Boolean));
  if (PUBLIC_BASE_URL) {
    try { hosts.add(new URL(PUBLIC_BASE_URL).hostname.toLowerCase()); } catch (_) {}
  }
  if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
    hosts.add('localhost'); hosts.add('127.0.0.1'); hosts.add('::1');
  }
  return hosts;
}
function sessionToken(req) {
  const cookies = parseCookies(req);
  return String(cookies[SESSION_COOKIE_NAME] || cookies.bawsala_session || '');
}
function assertAllowedHost(req) {
  const hostname = normalizeHostname(req.headers.host || '');
  if (hostname && ALLOWED_HOSTS.has(hostname)) return;
  securityEvent('host-header-rejected', 'anonymous', { host: cleanText(req.headers.host || 'missing', 180) });
  throw Object.assign(new Error('MISDIRECTED_REQUEST'), { status: 421 });
}
function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > -1) {
      const name = part.slice(0, i).trim();
      try { out[name] = decodeURIComponent(part.slice(i + 1)); }
      catch (_) { out[name] = ''; }
    }
  });
  return out;
}
function appendSetCookie(res, value) {
  const current = res.getHeader('Set-Cookie');
  if (!current) return res.setHeader('Set-Cookie', value);
  if (Array.isArray(current)) return res.setHeader('Set-Cookie', [...current, value]);
  return res.setHeader('Set-Cookie', [current, value]);
}
function cookie(name, value, opts = {}) {
  const pieces = [`${name}=${encodeURIComponent(value)}`];
  if (opts.httpOnly !== false) pieces.push('HttpOnly');
  pieces.push('Path=/');
  pieces.push(`SameSite=${opts.sameSite || 'Lax'}`);
  if (opts.maxAge !== undefined) pieces.push(`Max-Age=${opts.maxAge}`);
  if (opts.secure) pieces.push('Secure');
  pieces.push(`Priority=${opts.priority || 'High'}`);
  return pieces.join('; ');
}
function validTokenShape(value) {
  return /^[a-zA-Z0-9_-]{32,128}$/.test(String(value || ''));
}
function issueCsrfToken(res) {
  const token = crypto.randomBytes(32).toString('base64url');
  appendSetCookie(res, cookie('bawsala_csrf', token, {
    maxAge: CSRF_DAYS * 86400,
    secure: isProduction(),
    httpOnly: false,
    sameSite: 'Strict'
  }));
  return token;
}
function getOrIssueCsrfToken(req, res) {
  const existing = parseCookies(req).bawsala_csrf;
  return validTokenShape(existing) ? existing : issueCsrfToken(res);
}
function hasValidCsrf(req) {
  if (!hasApiGuardHeader(req)) return false;
  const header = String(req.headers['x-bawsala-csrf'] || '');
  const token = String(parseCookies(req).bawsala_csrf || '');
  if (!validTokenShape(header) || !validTokenShape(token) || header.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(token));
}
function isEmailVerified(user) {
  return !!(user?.emailVerifiedAt || user?.providers?.google?.emailVerifiedAt);
}
function currentUser(req) {
  const token = sessionToken(req);
  if (!token) return null;
  const hash = sha256(token);
  const session = db.sessions[hash];
  if (!session) return null;
  const now = Date.now();
  const createdAt = parseTime(session.createdAt || 0) || now;
  const idleExpiresAt = parseTime(session.expiresAt || 0) || 0;
  const absoluteExpiresAt = parseTime(session.absoluteExpiresAt || 0) || (createdAt + SESSION_ABSOLUTE_MS);
  if (idleExpiresAt < now || absoluteExpiresAt < now) {
    delete db.sessions[hash];
    persistSoon();
    return null;
  }
  const user = db.users[session.userId];
  if (!user) return null;
  const fingerprint = sessionFingerprint(req);
  if (session.fingerprint && session.fingerprint !== fingerprint) {
    const strictFingerprint = STRICT_SESSION_BINDING || user.role === 'admin';
    securityEvent('session-fingerprint-mismatch', session.userId, { sessionId: session.id, strict: strictFingerprint });
    if (strictFingerprint) {
      delete db.sessions[hash];
      persistSoon();
      return null;
    }
  } else if (!session.fingerprint) {
    session.fingerprint = fingerprint;
  }
  const nowIso = new Date(now).toISOString();
  const previousSeen = parseTime(session.lastSeenAt || session.createdAt || 0) || 0;
  session.lastSeenAt = nowIso;
  session.expiresAt = new Date(Math.min(now + SESSION_IDLE_MS, absoluteExpiresAt)).toISOString();
  session.absoluteExpiresAt = new Date(absoluteExpiresAt).toISOString();
  if (Date.now() - previousSeen > 60_000) persistSoon();
  return user;
}
function requireUser(req) {
  const user = currentUser(req);
  if (!user) throw Object.assign(new Error('UNAUTHORIZED'), { status: 401 });
  return user;
}
function requireVerifiedUser(req) {
  const user = requireUser(req);
  if (!isEmailVerified(user)) throw Object.assign(new Error('EMAIL_VERIFICATION_REQUIRED'), { status: 403 });
  if (user.legalVersion !== LEGAL_VERSION) throw Object.assign(new Error('LEGAL_CONSENT_REQUIRED'), { status: 428 });
  return user;
}
function requireRole(req, roles) {
  const user = requireVerifiedUser(req);
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
  return user;
}
function assertAdminNetwork(req, actor = 'admin') {
  if (!ADMIN_IP_ALLOWLIST.size) return;
  const ip = clientIp(req);
  if (!networkSecurity.ipMatchesAllowlist(ip, ADMIN_IP_ALLOWLIST)) {
    securityEvent('admin-ip-denied', actor || 'anonymous', { ipHash: safeHash(ip, 'admin-ip').slice(0, 18), rules: ADMIN_IP_ALLOWLIST.size });
    throw Object.assign(new Error('ADMIN_IP_NOT_ALLOWED'), { status: 403 });
  }
}
function sessionForRequest(req) { const token = sessionToken(req); return token ? db.sessions[sha256(token)] || null : null; }
function requireAdmin(req) {
  const user = requireRole(req, ['admin']);
  if (!user.mfa?.enabled) throw Object.assign(new Error('ADMIN_MFA_SETUP_REQUIRED'), { status: 428 });
  const session = sessionForRequest(req);
  if (!session?.mfaVerifiedAt) throw Object.assign(new Error('MFA_REQUIRED'), { status: 401 });
  assertAdminNetwork(req, user.id);
  return user;
}
function requireSupportOrAdmin(req) {
  const user = requireRole(req, ['support', 'admin']);
  if (user.role === 'admin') {
    if (!user.mfa?.enabled) throw Object.assign(new Error('ADMIN_MFA_SETUP_REQUIRED'), { status: 428 });
    const session = sessionForRequest(req);
    if (!session?.mfaVerifiedAt) throw Object.assign(new Error('MFA_REQUIRED'), { status: 401 });
  }
  assertAdminNetwork(req, user.id);
  return user;
}
function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  return networkSecurity.sameOrigin(origin, publicOrigin(req));
}
function isUnsafeMethod(method) { return !['GET', 'HEAD', 'OPTIONS'].includes(method); }
function hasApiGuardHeader(req) { return req.headers['x-bawsala-request'] === '1'; }
function clientIp(req) {
  const ip = networkSecurity.clientIp(req, { trustProxy: TRUST_PROXY, trustedProxyRules: TRUSTED_PROXY_RULES, proxyHops: TRUST_PROXY_HOPS });
  return cleanText(ip, 80).replace(/[^a-zA-Z0-9:._-]/g, '') || 'local';
}
function ipPrefix(ip) {
  const value = String(ip || '');
  if (value.includes(':')) return value.split(':').slice(0, 4).join(':');
  return value.split('.').slice(0, 3).join('.');
}
function sessionFingerprint(req) {
  const ua = cleanText(req?.headers?.['user-agent'] || '', 120).toLowerCase().replace(/\d+([._]\d+)*/g, 'x');
  return sha256(`${ua}|${ipPrefix(clientIp(req))}`).slice(0, 24);
}
const rateMap = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateMap) if (now - bucket.start > Math.max(bucket.windowMs || RATE_WINDOW_MS, RATE_WINDOW_MS) * 3) rateMap.delete(key);
}, RATE_WINDOW_MS).unref?.();
function takeRateBucket(key, windowMs, limit, meta = {}) {
  const now = Date.now();
  let bucket;
  if (typeof stateStore.consumeRateLimit === 'function') {
    try {
      bucket = stateStore.consumeRateLimit(`rl:${safeHash(key, 'durable-rate-limit')}`, windowMs, limit, now);
    } catch (error) {
      structuredLog('warn', 'durable-rate-limit-fallback', { code: error.code || error.message || 'RATE_LIMIT_STORE_FAILED' });
    }
  }
  if (!bucket) {
    bucket = rateMap.get(key) || { start: now, count: 0, windowMs };
    if (now - bucket.start > windowMs) { bucket.start = now; bucket.count = 0; bucket.windowMs = windowMs; }
    bucket.count += 1;
    bucket.allowed = bucket.count <= limit;
    bucket.remaining = Math.max(0, limit - bucket.count);
    bucket.resetSeconds = Math.max(1, Math.ceil((windowMs - (now - bucket.start)) / 1000));
    rateMap.set(key, bucket);
    if (rateMap.size > MAX_RATE_BUCKETS) rateMap.delete(rateMap.keys().next().value);
  }
  const resetSeconds = Math.max(1, Number(bucket.resetSeconds || 1));
  const info = { limit, remaining: Math.max(0, Number(bucket.remaining ?? (limit - Number(bucket.count || 0)))), resetSeconds, category: meta.category || 'general', durable: typeof stateStore.consumeRateLimit === 'function' };
  if (bucket.allowed === false || Number(bucket.count || 0) > limit) {
    securityEvent('rate-limit-exceeded', 'anonymous', { keyHash: safeHash(key, 'rate-limit').slice(0, 18), limit, windowMs, durable: info.durable, ...meta });
    throw Object.assign(new Error('RATE_LIMITED'), { status: 429, retryAfterSeconds: resetSeconds, rateLimit: info });
  }
  return { bucket, info };
}
function acquireJobLease(name, ttlMs = 60000) {
  if (typeof stateStore.acquireLease !== 'function') return true;
  try { return stateStore.acquireLease(`job:${name}`, SERVER_INSTANCE_ID, ttlMs); }
  catch (error) { structuredLog('warn', 'job-lease-acquire-failed', { name, code: error.code || error.message || 'LEASE_FAILED' }); return false; }
}
function releaseJobLease(name) {
  if (typeof stateStore.releaseLease !== 'function') return true;
  try { return stateStore.releaseLease(`job:${name}`, SERVER_INSTANCE_ID); }
  catch (error) { structuredLog('warn', 'job-lease-release-failed', { name, code: error.code || error.message || 'LEASE_RELEASE_FAILED' }); return false; }
}
function rateCategoryForPath(pathName) {
  if (pathName.startsWith('/api/health')) return 'health';
  if (pathName.startsWith('/api/admin')) return 'admin';
  if (pathName.startsWith('/api/auth')) return 'auth';
  if (pathName.startsWith('/api/billing')) return 'payment';
  if (pathName.startsWith('/api/sync') || pathName.startsWith('/api/calendar')) return 'sync';
  return 'general';
}
function rateLimit(req, category = 'general') {
  const config = RATE_LIMITS[category] || RATE_LIMITS.general || { windowMs: RATE_WINDOW_MS, limit: RATE_LIMIT };
  const route = category === 'general' ? 'all' : category;
  const { bucket, info } = takeRateBucket(`${clientIp(req)}:${route}`, config.windowMs, config.limit, { category });
  req._rateLimit = info;
  return bucket;
}
function authIdentityLimit(identifier) {
  const clean = cleanEmail(identifier || 'unknown');
  const key = `auth-id:${sha256(clean || 'unknown')}`;
  return takeRateBucket(key, RATE_WINDOW_MS * 5, AUTH_IDENTITY_RATE_LIMIT, { category: 'auth-identity' }).bucket;
}
function signupSuccessLimit(req) {
  return takeRateBucket(`${clientIp(req)}:signup-success`, RATE_LIMITS.signupSuccess.windowMs, RATE_LIMITS.signupSuccess.limit, { category: 'signup-success' }).bucket;
}

function authIdentityHash(email) {
  return safeHash(cleanEmail(email || 'unknown'), 'auth-identity').slice(0, 48);
}
function authFailureKey(email, req = null) {
  const identity = cleanEmail(email || 'unknown');
  const source = req ? clientIp(req) : 'unknown';
  return safeHash(`${identity}|${source}`, 'auth-failure').slice(0, 48);
}
function storeAuthFailureRecord(key, record) {
  const clean = {
    identityHash: cleanText(record?.identityHash || '', 64),
    count: Math.max(0, Number(record?.count) || 0),
    firstAt: record?.firstAt || null,
    lastAt: record?.lastAt || null,
    blockedUntil: record?.blockedUntil || null
  };
  authFailureCache.set(key, Object.freeze({ ...clean }));
  db.authFailures[key] = { ...clean };
  return { ...clean };
}
function authFailureRecord(email, req = null) {
  const key = authFailureKey(email, req);
  db.authFailures = db.authFailures || {};
  const source = authFailureCache.get(key) || db.authFailures[key] || {
    identityHash: authIdentityHash(email), count: 0, firstAt: null, lastAt: null, blockedUntil: null
  };
  const record = { ...source, identityHash: source.identityHash || authIdentityHash(email) };
  const blockedUntil = parseTime(record.blockedUntil || source.lockedUntil || 0) || 0;
  if (blockedUntil && blockedUntil < Date.now()) {
    record.count = Math.max(0, Math.floor(Number(record.count || 0) / 2));
    record.blockedUntil = null;
  }
  return storeAuthFailureRecord(key, record);
}
function assertLoginNotLocked(email, req = null) {
  const record = authFailureRecord(email, req);
  const blockedUntil = parseTime(record.blockedUntil || 0) || 0;
  if (blockedUntil > Date.now()) {
    const retryAfter = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 1000));
    throw Object.assign(new Error('LOGIN_THROTTLED'), { status: 429, retryAfter });
  }
}
function recordLoginFailure(email, req = null, user = null) {
  const key = authFailureKey(email, req);
  const record = authFailureRecord(email, req);
  const now = new Date().toISOString();
  record.count = (Number(record.count) || 0) + 1;
  record.firstAt = record.firstAt || now;
  record.lastAt = now;
  if (user) {
    user.failedLoginCount = (Number(user.failedLoginCount) || 0) + 1;
    user.lastFailedLoginAt = now;
  }
  const delaySeconds = record.count < LOGIN_LOCK_AFTER ? 0 : Math.min(600, 2 ** Math.min(9, record.count - LOGIN_LOCK_AFTER + 2));
  if (delaySeconds) record.blockedUntil = new Date(Date.now() + delaySeconds * 1000).toISOString();
  storeAuthFailureRecord(key, record);
  const details = { identityIpHash: key, count: record.count, retryAfterSeconds: delaySeconds };
  audit(delaySeconds ? 'login-throttled' : 'login-failed', user?.id || 'anonymous', details);
  securityEvent(delaySeconds ? 'login-throttled' : 'login-failed', user?.id || 'anonymous', details);
  persistSoon();
}
function resetLoginFailures(email, req = null, user = null) {
  const identityHash = authIdentityHash(email);
  if (req) {
    const key = authFailureKey(email, req);
    authFailureCache.delete(key);
    if (db.authFailures?.[key]) delete db.authFailures[key];
  } else {
    for (const [key, record] of authFailureCache) {
      if (record?.identityHash === identityHash) {
        authFailureCache.delete(key);
        if (db.authFailures?.[key]) delete db.authFailures[key];
      }
    }
  }
  if (user) { user.failedLoginCount = 0; user.lastFailedLoginAt = null; }
}

function revokeUserSessions(userId, exceptHash = '') {
  for (const [sid, sess] of Object.entries(db.sessions || {})) {
    if (sess.userId === userId && sid !== exceptHash) delete db.sessions[sid];
  }
}

function requestIdFrom(req) {
  const supplied = cleanText(req.headers['x-request-id'] || '', 80).replace(/[^a-zA-Z0-9_.:-]/g, '');
  return supplied && supplied.length >= 8 ? supplied.slice(0, 80) : `req_${crypto.randomBytes(9).toString('base64url')}`;
}
function attachRequestContext(req, res) {
  const requestId = requestIdFrom(req);
  req.requestId = requestId;
  res._bawsalaRequestId = requestId;
  res.setHeader('X-Request-Id', requestId);
}
function assertRequestShape(req) {
  const method = String(req.method || '').toUpperCase();
  if (!ALLOWED_METHODS.has(method)) throw Object.assign(new Error('METHOD_NOT_ALLOWED'), { status: 405, allow: Array.from(ALLOWED_METHODS).join(', ') });
  const rawUrl = String(req.url || '/');
  if (rawUrl.length > MAX_URL_LENGTH) throw Object.assign(new Error('URI_TOO_LONG'), { status: 414 });
  if (/^https?:\/\//i.test(rawUrl)) throw Object.assign(new Error('ABSOLUTE_FORM_URL_NOT_ALLOWED'), { status: 400 });
  if (rawUrl.includes('\\') || /%00/i.test(rawUrl)) throw Object.assign(new Error('BAD_REQUEST_PATH'), { status: 400 });
  const query = rawUrl.split('?')[1] || '';
  if (query && query.split('&').filter(Boolean).length > MAX_QUERY_PARAMS) throw Object.assign(new Error('TOO_MANY_QUERY_PARAMS'), { status: 414 });
  const cookieBytes = Buffer.byteLength(String(req.headers.cookie || ''));
  if (cookieBytes > MAX_COOKIE_BYTES) throw Object.assign(new Error('COOKIES_TOO_LARGE'), { status: 431 });
  const headerBytes = Object.entries(req.headers || {}).reduce((sum, [k, v]) => sum + Buffer.byteLength(String(k)) + Buffer.byteLength(Array.isArray(v) ? v.join(',') : String(v || '')), 0);
  if (headerBytes > MAX_HEADER_BYTES) throw Object.assign(new Error('HEADERS_TOO_LARGE'), { status: 431 });
}
function assertFetchMetadata(req, pathName, method) {
  if (!STRICT_FETCH_METADATA) return;
  const site = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (!site || site === 'same-origin' || site === 'same-site' || site === 'none') return;
  if (site === 'cross-site' && (pathName.startsWith('/api/') || isUnsafeMethod(method))) {
    securityEvent('fetch-metadata-rejected', 'anonymous', { path: cleanText(pathName, 160), site, method });
    throw Object.assign(new Error('BAD_FETCH_SITE'), { status: 403 });
  }
}
function isStorageWritable() {
  try { return storageWriteProbe(DATA_DIR); } catch (_) { return false; }
}
function runtimeHealth() {
  const storage = stateStore.info();
  const storageWritable = isStorageWritable();
  let integrity;
  try { integrity = stateStore.integrity(); }
  catch (err) { integrity = { ok: false, code: cleanText(err.code || err.message || 'INTEGRITY_CHECK_FAILED', 120) }; }
  return {
    version: APP_VERSION,
    instanceId: SERVER_INSTANCE_ID,
    storage,
    storageWritable,
    integrity,
    dataDirConfigured: !!process.env.BAWSALA_DATA_DIR,
    userCount: Object.keys(db.users || {}).length,
    sessionCount: Object.keys(db.sessions || {}).length,
    backupCount: backupSummary().length,
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    persistence: { pending: pendingPersist, lastPersistAt, lastError: lastPersistError },
    requests: runtimeMetrics.snapshot(),
    warnings: runtimeWarnings()
  };
}
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Origin-Agent-Cluster', '?1');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'accelerometer=(), ambient-light-sensor=(), autoplay=(), camera=(), clipboard-read=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-Robots-Tag', 'noai, noimageai');
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "media-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ];
  if (isProduction()) csp.push('upgrade-insecure-requests');
  res.setHeader('Content-Security-Policy', csp.join('; '));
  if (isProduction()) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}
function requiresJsonBody(req) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(req.method || '').toUpperCase());
}
function assertJsonContentType(req) {
  if (!requiresJsonBody(req)) return;
  const contentLength = Number(req.headers['content-length'] || 0);
  const transferEncoding = req.headers['transfer-encoding'];
  if (!contentLength && !transferEncoding) return;
  const type = String(req.headers['content-type'] || '').toLowerCase();
  if (!type.includes('application/json')) {
    securityEvent('unsupported-media-type', 'anonymous', { path: cleanText(req.url || '', 180), contentType: type || 'missing' });
    throw Object.assign(new Error('UNSUPPORTED_MEDIA_TYPE'), { status: 415 });
  }
}
function sendJson(res, status, body, extra = {}) {
  const requestMethod = String(res.req?.method || '').toUpperCase();
  if (pendingPersist && status < 500 && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(requestMethod)) {
    try { persistNow({ throwOnError: true }); }
    catch (error) {
      return sendError(res, Object.assign(new Error('PERSISTENCE_UNAVAILABLE'), { status: 503, cause: error }));
    }
  }
  setSecurityHeaders(res);
  const responseBody = body && typeof body === 'object' && !Array.isArray(body)
    ? { requestId: res._bawsalaRequestId || undefined, ...body }
    : body;
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra };
  const rate = res.req?._rateLimit;
  if (rate) {
    headers['RateLimit-Limit'] = String(rate.limit);
    headers['RateLimit-Remaining'] = String(rate.remaining);
    headers['RateLimit-Reset'] = String(rate.resetSeconds);
  }
  headers['X-Backend-Version'] = APP_VERSION;
  if (status === 204 || String(res.req?.method || '').toUpperCase() === 'HEAD') {
    res.writeHead(status, headers);
    res.end();
    return;
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(responseBody));
}
function sendText(res, status, body, contentType = 'text/plain; charset=utf-8', extra = {}) {
  setSecurityHeaders(res);
  const payload = String(body || '');
  const headers = { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(payload), 'X-Backend-Version': APP_VERSION, ...extra };
  res.writeHead(status, headers);
  res.end(String(res.req?.method || '').toUpperCase() === 'HEAD' ? undefined : payload);
}
function sendError(res, err) {
  const publicError = apiErrors.normalize(err);
  const headers = {};
  const payload = { ok: false, error: publicError.code, message: publicError.message, retryable: publicError.retryable };
  if (err.allow) headers.Allow = err.allow;
  if (publicError.status === 429) headers['Retry-After'] = String(err.retryAfter || err.retryAfterSeconds || err.rateLimit?.resetSeconds || 60);
  if (publicError.code === 'SYNC_CONFLICT') {
    const revision = cleanText(err.currentRevision || '', 120);
    if (/^sha256:[a-f0-9]{64}$/i.test(revision)) {
      payload.currentRevision = revision;
      headers.ETag = `"${revision}"`;
    }
  }
  if (publicError.status >= 500) structuredLog('error', 'server-error', { requestId: res._bawsalaRequestId, code: publicError.code, message: err.message || 'unknown' });
  sendJson(res, publicError.status, payload, headers);
}
function assertNoDangerousJsonKeys(value, depth = 0) {
  if (!value || typeof value !== 'object') return;
  if (depth > 20) throw Object.assign(new Error('JSON_TOO_DEEP'), { status: 400 });
  const keys = Object.keys(value);
  if (keys.length > 2000) throw Object.assign(new Error('JSON_TOO_WIDE'), { status: 413 });
  for (const key of keys) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
      throw Object.assign(new Error('BAD_JSON_KEY'), { status: 400 });
    }
    assertNoDangerousJsonKeys(value[key], depth + 1);
  }
}
function bodyLimitForPath(pathName, method) {
  if (!requiresJsonBody({ method })) return 0;
  if (pathName === '/api/billing/webhook') return MAX_BILLING_WEBHOOK_BODY;
  if (pathName.startsWith('/api/auth/')) return MAX_AUTH_BODY;
  if (pathName.startsWith('/api/admin/')) return MAX_ADMIN_BODY;
  if (pathName.startsWith('/api/sync/')) return MAX_SNAPSHOT + 1024 * 128;
  return MAX_JSON_BODY;
}
function readJson(req, maxBytes = req._bodyLimit || MAX_JSON_BODY) {
  assertJsonContentType(req);
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength && contentLength > maxBytes) throw Object.assign(new Error('PAYLOAD_TOO_LARGE'), { status: 413 });
  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = '';
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) { reject(Object.assign(new Error('PAYLOAD_TOO_LARGE'), { status: 413 })); req.destroy(); return; }
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { const body = JSON.parse(raw); if (!body || typeof body !== 'object' || Array.isArray(body)) throw Object.assign(new Error('BAD_JSON_ROOT'), { status: 400 }); assertNoDangerousJsonKeys(body); resolve(body); }
      catch (err) { reject(err.status ? err : Object.assign(new Error('BAD_JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}
function validatePassword(password, context = {}) {
  const p = String(password || '');
  if (p.length < 12 || p.length > 128) return false;
  if (/^(password|12345678|qwerty|111111|000000|letmein|admin|bawsala)/i.test(p)) return false;
  if (/(.)\1{5,}/.test(p)) return false;
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return false;
  const lower = p.toLowerCase();
  const fragments = [];
  const email = cleanEmail(context.email || '');
  if (email.includes('@')) fragments.push(email.split('@')[0]);
  for (const part of cleanText(context.name || '', 120).toLowerCase().split(/\s+/)) if (part.length >= 4) fragments.push(part);
  for (const frag of fragments) if (frag.length >= 4 && lower.includes(frag)) return false;
  return true;
}
function findUserByEmail(email) {
  return Object.values(db.users).find(u => u.email === email);
}
function createSession(user, res, req = null, options = {}) {
  const token = crypto.randomBytes(32).toString('base64url');
  const hash = sha256(token);
  const now = Date.now();
  db.sessions[hash] = {
    id: newId('sess'),
    userId: user.id,
    createdAt: new Date(now).toISOString(),
    lastSeenAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_IDLE_MS).toISOString(),
    absoluteExpiresAt: new Date(now + SESSION_ABSOLUTE_MS).toISOString(),
    userAgent: cleanText(req?.headers?.['user-agent'] || '', 180),
    ipHash: req ? safeHash(clientIp(req), 'session-ip').slice(0, 18) : '',
    authAt: new Date(now).toISOString(),
    fingerprint: req ? sessionFingerprint(req) : '',
    mfaVerifiedAt: options.mfaVerified ? new Date(now).toISOString() : null
  };
  const userSessions = Object.entries(db.sessions)
    .filter(([, session]) => session.userId === user.id)
    .sort((a, b) => parseTime(b[1].createdAt || 0) - parseTime(a[1].createdAt || 0));
  for (const [oldHash] of userSessions.slice(MAX_SESSIONS_PER_USER)) delete db.sessions[oldHash];
  persistSoon();
  const secure = String(process.env.NODE_ENV).toLowerCase() === 'production';
  appendSetCookie(res, cookie(SESSION_COOKIE_NAME, token, { maxAge: SESSION_COOKIE_MAX_AGE, secure, sameSite: 'Strict' }));
  if (SESSION_COOKIE_NAME !== 'bawsala_session') appendSetCookie(res, cookie('bawsala_session', '', { maxAge: 0, secure: true, sameSite: 'Strict' }));
}
function clearSession(req, res) {
  const token = sessionToken(req);
  if (token) delete db.sessions[sha256(token)];
  appendSetCookie(res, cookie(SESSION_COOKIE_NAME, '', { maxAge: 0, secure: isProduction(), sameSite: 'Strict' }));
  if (SESSION_COOKIE_NAME !== 'bawsala_session') appendSetCookie(res, cookie('bawsala_session', '', { maxAge: 0, secure: true, sameSite: 'Strict' }));
  persistSoon();
}
function userCount() { return Object.keys(db.users).length; }

function cleanPhone(value) {
  return cleanText(value, 40).replace(/[^0-9+]/g, '').slice(0, 20);
}
function cleanDate(value) {
  const raw = cleanText(value, 40);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  const parsed = new Date(raw + 'T00:00:00Z');
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10) === raw ? raw : '';
}
function validTrack(track) { return ['academic', 'btec'].includes(track); }
function validSpecialization(track, value) {
  const academic = new Set(['medical-health','law','engineering','business','it','arts-humanities','science','other']);
  const btec = new Set(['it','business-admin','engineering','design-creative','hospitality','other']);
  const set = track === 'btec' ? btec : academic;
  return set.has(value) ? value : 'other';
}
function defaultSubscription() {
  return {
    plan: 'free',
    status: 'free',
    adsRemoved: false,
    renewal: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    provider: PAYMENT_PROVIDER || 'none',
    providerCustomerId: null,
    providerSubscriptionId: null,
    paymentFailureCount: 0,
    nextRetryAt: null,
    graceEndsAt: null,
    pendingPlanChange: null,
    updatedAt: new Date().toISOString()
  };
}
function publicSubscription(user) {
  const sub = user?.subscription || defaultSubscription();
  const plan = planById(sub.plan) || planById('free');
  return {
    plan: sub.plan || 'free',
    planName: plan?.name || 'Free',
    status: sub.status || 'free',
    paid: !!plan?.paid && (['active','canceling'].includes(sub.status || '') || ((sub.status === 'past_due') && parseTime(sub.graceEndsAt || 0) > Date.now())),
    adsRemoved: !!sub.adsRemoved,
    renewal: sub.renewal || sub.currentPeriodEnd || null,
    currentPeriodStart: sub.currentPeriodStart || null,
    currentPeriodEnd: sub.currentPeriodEnd || null,
    cancelAtPeriodEnd: !!sub.cancelAtPeriodEnd,
    provider: sub.provider || (PAYMENT_PROVIDER || 'none'),
    providerSubscriptionId: sub.providerSubscriptionId || null,
    paymentFailureCount: Number(sub.paymentFailureCount || 0),
    nextRetryAt: sub.nextRetryAt || null,
    graceEndsAt: sub.graceEndsAt || null,
    pendingPlanChange: sub.pendingPlanChange || null,
    updatedAt: sub.updatedAt || null
  };
}

function calendarEventsForUser(userId, includeDeleted = false) {
  const snap = db.snapshots[userId] || (db.snapshots[userId] = { keys: {}, updatedAt: new Date().toISOString(), schema: SNAPSHOT_SCHEMA });
  const clean = snapshotSchema.sanitizeForBaseKey(CALENDAR_SYNC_KEY, snap.keys[CALENDAR_SYNC_KEY] || [], []);
  snap.keys[CALENDAR_SYNC_KEY] = clean.slice(0, CALENDAR_MAX_EVENTS);
  return includeDeleted ? snap.keys[CALENDAR_SYNC_KEY] : snap.keys[CALENDAR_SYNC_KEY].filter(item => !(item && item._deleted === true));
}
function persistCalendarEvents(userId, events) {
  const snap = db.snapshots[userId] || (db.snapshots[userId] = { keys: {}, updatedAt: new Date().toISOString(), schema: SNAPSHOT_SCHEMA });
  const clean = snapshotSchema.sanitizeForBaseKey(CALENDAR_SYNC_KEY, events || [], []);
  snap.keys[CALENDAR_SYNC_KEY] = clean.slice(0, CALENDAR_MAX_EVENTS);
  snap.updatedAt = new Date().toISOString();
  snap.schema = SNAPSHOT_SCHEMA;
  snap.revision = snapshotRevision(filterSnapshotKeys(snap.keys || {}));
  persistSoon();
  return snap.keys[CALENDAR_SYNC_KEY].filter(item => !(item && item._deleted === true));
}
function cleanTime(value) {
  const raw = cleanText(value, 8);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw) ? raw : '';
}
function cleanTimezone(value) {
  const raw = cleanText(value, 80) || 'Asia/Amman';
  return timezone.isValidTimeZone(raw) ? raw : 'Asia/Amman';
}
function cleanIsoLike(value) {
  const raw = cleanText(value, 60);
  if (!raw) return '';
  const parsed = parseTime(raw);
  if (!Number.isFinite(parsed)) return '';
  return new Date(parsed).toISOString();
}
function deriveStartTime(date, time, timeZone = 'Asia/Amman') {
  const d = cleanDate(date);
  if (!d) return '';
  const t = cleanTime(time) || '00:00';
  const instant = timezone.wallTimeToInstant(d, `${t}:00`, cleanTimezone(timeZone), { disambiguation: 'earlier' });
  return Number.isFinite(instant) ? new Date(instant).toISOString() : '';
}
function eventStartMs(event) {
  const raw = cleanIsoLike(event?.startTime) || deriveStartTime(event?.date, event?.time, event?.timezone);
  const t = parseTime(raw || 0);
  return Number.isFinite(t) ? t : 0;
}
function eventEndMs(event) {
  if (event?.allDay === true) {
    const zone = cleanTimezone(event?.timezone);
    const endDate = cleanDate(event?.endDate) || timezone.addDays(cleanDate(event?.date), 1);
    const end = endDate ? timezone.wallTimeToInstant(endDate, '00:00:00', zone) : null;
    return Number.isFinite(end) ? end : 0;
  }
  const raw = cleanIsoLike(event?.endTime);
  const t = parseTime(raw || 0);
  if (Number.isFinite(t)) return t;
  const start = eventStartMs(event);
  const duration = Math.max(15, Math.min(480, Number(event?.duration || 60)));
  return start ? start + duration * 60_000 : 0;
}
function reminderMinutesFromLegacy(value, fallback = null) {
  const raw = cleanText(value, 20);
  if (raw === 'same-day') return 0;
  if (raw === 'day-before') return 1440;
  if (raw === 'week-before') return 10080;
  if (raw === 'none') return null;
  return fallback;
}
function legacyReminderFromMinutes(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 'none';
  if (n >= 10080) return 'week-before';
  if (n >= 1440) return 'day-before';
  return 'same-day';
}
function reminderConfigurationChanged(body, existing) {
  if (!existing || !body) return false;
  return ['date','time','startTime','start_time','endTime','end_time','duration','timezone','reminder','reminderMinutes','reminder_minutes','allDay','endDate']
    .some(key => Object.prototype.hasOwnProperty.call(body, key));
}
function normalizeCalendarEvent(body, existing = null) {
  const now = new Date().toISOString();
  const zone = cleanTimezone(body?.timezone || existing?.timezone);
  const allDay = body?.allDay === true || (body?.allDay === undefined && existing?.allDay === true);
  const date = cleanDate(body?.date) || cleanDate(existing?.date);
  const time = allDay ? '' : (cleanTime(body?.time) || cleanTime(existing?.time));
  const dateOrTimeChanged = body && ['date','time','timezone','allDay'].some(key => Object.prototype.hasOwnProperty.call(body, key));
  const inputStart = cleanIsoLike(body?.startTime || body?.start_time) || (dateOrTimeChanged ? '' : cleanIsoLike(existing?.startTime));
  const startTime = inputStart || deriveStartTime(date, allDay ? '00:00' : time, zone);
  if (!startTime) throw Object.assign(new Error('INVALID_CALENDAR_START'), { status: 400 });
  const duration = Math.max(0, Math.min(480, Number(body?.duration ?? existing?.duration ?? 60) || 0));
  const durationChanged = body && Object.prototype.hasOwnProperty.call(body, 'duration');
  const requestedEndDate = cleanDate(body?.endDate) || (!dateOrTimeChanged ? cleanDate(existing?.endDate) : '');
  let endTime = '';
  let endDate = '';
  if (allDay) {
    endDate = requestedEndDate || timezone.addDays(date, 1);
    const endInstant = timezone.wallTimeToInstant(endDate, '00:00:00', zone);
    endTime = Number.isFinite(endInstant) ? new Date(endInstant).toISOString() : '';
  } else {
    const inputEnd = cleanIsoLike(body?.endTime || body?.end_time) || ((dateOrTimeChanged || durationChanged) ? '' : cleanIsoLike(existing?.endTime));
    endTime = inputEnd || new Date(parseTime(startTime) + Math.max(15, duration || 60) * 60_000).toISOString();
  }
  if (!endTime || parseTime(endTime) <= parseTime(startTime)) throw Object.assign(new Error('INVALID_CALENDAR_RANGE'), { status: 400 });
  const wall = timezone.instantToWallTime(parseTime(startTime), zone);
  const actualDate = date || wall?.date || startTime.slice(0, 10);
  const actualTime = allDay ? '' : (time || wall?.time || startTime.slice(11, 16));
  const reminderFromBody = body?.reminderMinutes ?? body?.reminder_minutes;
  let reminderMinutes = Number.isFinite(Number(reminderFromBody)) ? Math.max(0, Math.min(10080, Math.floor(Number(reminderFromBody)))) : reminderMinutesFromLegacy(body?.reminder, reminderMinutesFromLegacy(existing?.reminder, existing?.reminderMinutes ?? null));
  if (body?.reminder === 'none') reminderMinutes = null;
  const resetReminder = reminderConfigurationChanged(body, existing);
  const candidate = {
    ...(existing || {}),
    ...body,
    id: cleanId(existing?.id || body?.id) || newId('cal'),
    title: cleanText(body?.title, 140) || cleanText(existing?.title, 140) || 'حدث دراسي',
    description: cleanText(body?.description ?? body?.notes ?? existing?.description ?? existing?.notes, 2000),
    notes: cleanText(body?.notes ?? body?.description ?? existing?.notes ?? existing?.description, 2000),
    type: ['deadline', 'exam', 'session', 'task', 'reminder'].includes(cleanText(body?.type, 30)) ? cleanText(body?.type, 30) : (existing?.type || 'task'),
    date: actualDate,
    time: actualTime,
    allDay,
    endDate: allDay ? endDate : undefined,
    startTime,
    endTime,
    duration: allDay ? 0 : Math.max(0, Math.round((parseTime(endTime) - parseTime(startTime)) / 60_000)),
    timezone: zone,
    track: ['all', 'academic', 'btec'].includes(cleanText(body?.track, 20)) ? cleanText(body?.track, 20) : (existing?.track || 'all'),
    subject: cleanText(body?.subject, 80) || existing?.subject || 'عام',
    color: ['red', 'blue', 'green', 'teal', 'purple', 'gray'].includes(cleanText(body?.color, 20)) ? cleanText(body?.color, 20) : (existing?.color || ''),
    reminder: reminderMinutes === null ? 'none' : legacyReminderFromMinutes(reminderMinutes),
    reminderMinutes: reminderMinutes === null ? undefined : reminderMinutes,
    reminderSentAt: resetReminder ? undefined : (cleanIsoLike(existing?.reminderSentAt || body?.reminderSentAt) || undefined),
    googleEventId: cleanText(body?.googleEventId || existing?.googleEventId, 160),
    googleEtag: cleanText(body?.googleEtag || existing?.googleEtag, 240) || undefined,
    googleUpdatedAt: cleanIsoLike(body?.googleUpdatedAt || existing?.googleUpdatedAt) || undefined,
    externalProvider: cleanText(existing?.externalProvider || body?.externalProvider, 40) || undefined,
    externalSyncStatus: cleanText(existing?.externalSyncStatus || body?.externalSyncStatus, 40) || undefined,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  return snapshotSchema.sanitizeForBaseKey(CALENDAR_SYNC_KEY, [candidate], [])[0];
}
function calendarSort(a, b) {
  return eventStartMs(a) - eventStartMs(b) || String(a.title || '').localeCompare(String(b.title || ''));
}
function filterCalendarEvents(events, url) {
  const startRaw = cleanText(url.searchParams.get('start') || url.searchParams.get('from') || '', 40);
  const endRaw = cleanText(url.searchParams.get('end') || url.searchParams.get('to') || '', 40);
  const type = cleanText(url.searchParams.get('type') || '', 30);
  const track = cleanText(url.searchParams.get('track') || '', 20);
  const zone = cleanTimezone(url.searchParams.get('timezone') || 'Asia/Amman');
  const startBounds = cleanDate(startRaw) ? timezone.zonedDayBounds(cleanDate(startRaw), zone) : null;
  const endBounds = cleanDate(endRaw) ? timezone.zonedDayBounds(cleanDate(endRaw), zone) : null;
  const startMs = startBounds?.start ?? (startRaw ? parseTime(startRaw) : 0);
  const endMs = endBounds?.endExclusive ? endBounds.endExclusive - 1 : (endRaw ? parseTime(endRaw) : 0);
  return events.filter(event => {
    if (type && type !== 'all' && event.type !== type) return false;
    if (track && track !== 'all' && event.track !== 'all' && event.track !== track) return false;
    const evStart = eventStartMs(event);
    const evEnd = eventEndMs(event);
    if (startMs && evEnd <= startMs) return false;
    if (endMs && evStart > endMs) return false;
    return true;
  });
}
function googleCalendarStatusForUser(user) {
  const sync = user ? (db.calendarSync[user.id] || {}) : {};
  const configured = !!(GOOGLE_CALENDAR_ENABLED && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI && oauthCryptoKey());
  const connected = !!(configured && user && sync.connected === true && openSecret(sync.encryptedRefreshToken));
  return {
    enabled: GOOGLE_CALENDAR_ENABLED,
    configured,
    authenticated: !!user,
    connected,
    mode: connected ? 'managed-two-way-sync' : (configured ? 'ready-to-connect' : 'disabled'),
    scopes: [GOOGLE_CALENDAR_SCOPE],
    calendarId: GOOGLE_CALENDAR_ID === 'primary' ? 'primary' : 'configured',
    syncPolicy: 'Only Bawsala-managed Google events are synchronized; unrelated personal calendar events are not imported.',
    lastSyncAt: sync.lastSyncAt || null,
    lastAttemptAt: sync.lastAttemptAt || null,
    lastError: sync.lastError || null,
    lastResult: sync.lastResult || null,
    message: !configured
      ? 'Google Calendar is disabled until OAuth credentials, a redirect URI, and a 32+ character OAuth encryption key are configured.'
      : (connected ? 'Google Calendar is connected. Bawsala-managed events can sync in both directions.' : 'Google Calendar is configured. Connect this account to grant calendar access.')
  };
}
function publicCalendarSync(user) {
  return googleCalendarStatusForUser(user);
}
function pruneMailOutbox(now = Date.now()) {
  db.mailOutbox = (db.mailOutbox || []).filter(item => {
    if (!item) return false;
    if (item.status === 'sent' && parseTime(item.sentAt || item.createdAt || 0) < now - MAIL_SENT_RETENTION_MS) return false;
    return true;
  });
}
function queueMail({ to, subject, body, type, userId, meta = {} }) {
  const provider = mailProviderConfig();
  pruneMailOutbox();
  const pendingCount = db.mailOutbox.filter(item => item && ['queued','retry','sending'].includes(item.status)).length;
  if (pendingCount >= MAIL_MAX_PENDING) {
    sendOperationalAlert('mail-outbox-backpressure', { pendingCount, limit: MAIL_MAX_PENDING, type: cleanText(type, 60) });
    throw Object.assign(new Error('MAIL_OUTBOX_FULL'), { status: 503, retryable: true });
  }
  const item = {
    id: newId('mail'),
    type: cleanText(type, 60) || 'notification',
    userId: cleanId(userId),
    to: cleanEmail(to),
    from: cleanEmail(MAIL_FROM),
    subject: cleanText(subject, 160),
    body: cleanText(body, 4000),
    provider: provider.provider,
    status: provider.configured ? 'queued' : 'dev-logged',
    attempts: 0,
    nextAttemptAt: new Date().toISOString(),
    leaseExpiresAt: null,
    meta: scrub(meta),
    createdAt: new Date().toISOString()
  };
  db.mailOutbox.unshift(item);
  if (!isProduction() || !provider.configured) console.log(`[Bawsala mail:${item.type}] ${item.to}: ${item.subject}`);
  persistSoon();
  if (provider.configured) setImmediate(() => processMailOutbox().catch(err => structuredLog('error', 'mail-worker-failed', { code: err.message || 'MAIL_WORKER_FAILED' })));
  return item;
}

let mailWorkerRunning = false;
async function deliverMailItem(item) {
  const payload = JSON.stringify({
    id: item.id,
    idempotencyKey: item.id,
    from: MAIL_FROM,
    to: item.to,
    subject: item.subject,
    text: item.body,
    type: item.type,
    metadata: item.meta || {}
  });
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Idempotency-Key': item.id,
    'X-Bawsala-Message-Id': item.id
  };
  if (MAIL_WEBHOOK_TOKEN) headers.Authorization = `Bearer ${MAIL_WEBHOOK_TOKEN}`;
  return outboundRequest(MAIL_WEBHOOK_URL, { headers, body: payload, timeoutMs: 10000, maxBytes: 256 * 1024 });
}

function recoverStaleMailLeases(now = Date.now()) {
  let recovered = 0;
  for (const item of db.mailOutbox || []) {
    if (item?.status !== 'sending') continue;
    const expiresAt = parseTime(item.leaseExpiresAt || 0);
    if (expiresAt && expiresAt > now) continue;
    item.status = Number(item.attempts || 0) >= MAIL_MAX_ATTEMPTS ? 'failed' : 'retry';
    item.nextAttemptAt = new Date(now).toISOString();
    item.leaseExpiresAt = null;
    item.lastError = item.lastError || 'STALE_DELIVERY_LEASE_RECOVERED';
    recovered += 1;
  }
  return recovered;
}

async function processMailOutbox() {
  if (mailWorkerRunning || !mailProviderConfig().configured) return { processed: 0 };
  if (!acquireJobLease('mail-outbox', 5 * 60_000)) return { processed: 0, skipped: 'lease-held' };
  mailWorkerRunning = true;
  let processed = 0;
  try {
    const recovered = recoverStaleMailLeases();
    pruneMailOutbox();
    if (recovered) persistNow();
    for (const item of db.mailOutbox) {
      if (processed >= 100) break;
      if (!item || !['queued', 'retry'].includes(item.status)) continue;
      if (parseTime(item.nextAttemptAt || 0) > Date.now()) continue;
      item.status = 'sending';
      item.attempts = Number(item.attempts || 0) + 1;
      item.lastAttemptAt = new Date().toISOString();
      item.leaseExpiresAt = new Date(Date.now() + MAIL_LEASE_MS).toISOString();
      persistNow();
      try {
        const delivered = await deliverMailItem(item);
        item.status = 'sent';
        item.sentAt = new Date().toISOString();
        item.providerMessageId = cleanText(delivered.data?.id || delivered.data?.messageId || '', 160);
        item.lastError = '';
        item.leaseExpiresAt = null;
        structuredLog('info', 'mail-delivered', { mailId: item.id, type: item.type, attempts: item.attempts });
      } catch (err) {
        item.lastError = cleanText(err.message || 'MAIL_DELIVERY_FAILED', 160);
        item.leaseExpiresAt = null;
        if (item.attempts >= MAIL_MAX_ATTEMPTS) {
          item.status = 'dead-letter';
          item.failedAt = new Date().toISOString();
          sendOperationalAlert('mail-delivery-exhausted', { mailId: item.id, type: item.type, attempts: item.attempts, error: item.lastError });
        } else {
          item.status = 'retry';
          const delayMinutes = Math.min(60, 2 ** Math.max(0, item.attempts - 1));
          item.nextAttemptAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();
        }
        structuredLog('warn', 'mail-delivery-failed', { mailId: item.id, type: item.type, attempts: item.attempts, final: item.status === 'dead-letter', code: item.lastError });
      }
      processed += 1;
      persistNow();
    }
    pruneMailOutbox();
    if (processed) persistNow();
    return { processed };
  } finally {
    mailWorkerRunning = false;
    releaseJobLease('mail-outbox');
  }
}

function dispatchCalendarReminders(user, options = {}) {
  const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
  const existing = calendarEventsForUser(user.id, true);
  const due = [];
  const updated = existing.map(event => {
    if (!event || event._deleted === true || event.reminder === 'none' || event.reminderSentAt) return event;
    const reminderMinutes = Number.isFinite(Number(event.reminderMinutes)) ? Number(event.reminderMinutes) : reminderMinutesFromLegacy(event.reminder, null);
    if (reminderMinutes === null) return event;
    const sendAt = eventStartMs(event) - reminderMinutes * 60_000;
    if (!sendAt || sendAt > nowMs || nowMs - sendAt > REMINDER_MAX_LATE_MS) return event;
    const mail = queueMail({
      to: user.email,
      userId: user.id,
      type: 'calendar-reminder',
      subject: `تذكير بوصلة: ${event.title}`,
      body: `لديك حدث في التقويم: ${event.title} — ${event.date || ''} ${event.time || ''}.`,
      meta: { eventId: event.id, eventType: event.type, startTime: event.startTime, reminderMinutes }
    });
    due.push({ eventId: event.id, mailId: mail.id, startTime: event.startTime, reminderMinutes, deliveryStatus: mail.status });
    return { ...event, reminderSentAt: new Date(nowMs).toISOString(), updatedAt: new Date(nowMs).toISOString() };
  });
  if (due.length) {
    persistCalendarEvents(user.id, updated);
    persistNow();
    audit('calendar-reminders-dispatched', user.id, { count: due.length, mailConfigured: mailProviderConfig().configured });
  }
  return due;
}
function dispatchAllCalendarReminders() {
  if (!acquireJobLease('calendar-reminders', 2 * 60_000)) return { users: 0, reminders: 0, skipped: 'lease-held' };
  let users = 0, reminders = 0;
  try {
    for (const user of Object.values(db.users || {})) {
      if (!user?.email || !isEmailVerified(user)) continue;
      users += 1;
      reminders += dispatchCalendarReminders(user).length;
    }
    return { users, reminders };
  } finally { releaseJobLease('calendar-reminders'); }
}
function backupUser(user) {
  const out = { ...user };
  delete out.passwordSalt;
  delete out.passwordHash;
  delete out.passwordHistory;
  delete out.passwordReset;
  delete out.lockedUntil;
  delete out.emailVerification;
  if (out.providers?.google) out.providers = { ...out.providers, google: { linkedAt: out.providers.google.linkedAt || null, emailVerifiedAt: out.providers.google.emailVerifiedAt || null } };
  return out;
}
function publicBackup() {
  const users = {};
  for (const [id, user] of Object.entries(db.users || {})) users[id] = backupUser(user);
  return {
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    storage: stateStore.info(),
    warning: 'Sensitive operational backup. Store encrypted. Sessions, password hashes, reset tokens, verification tokens, and pending OAuth states are intentionally excluded.',
    db: {
      version: db.version,
      createdAt: db.createdAt,
      appSettings: db.appSettings,
      users,
      snapshots: db.snapshots,
      audit: db.audit,
      securityEvents: db.securityEvents || [],
      paymentEvents: db.paymentEvents || [],
      invoices: db.invoices || {},
      checkoutSessions: db.checkoutSessions || {}
    }
  };
}
function planById(id) { return BILLING_PLANS.find(plan => plan.id === cleanText(id, 40)); }

function planPriceMath() {
  const monthly = planById('plus-monthly');
  const yearly = planById('plus-yearly');
  const annualizedMonthly = (monthly?.priceMinor ?? monthly?.priceCents ?? 0) * 12;
  const yearlyCents = yearly?.priceMinor ?? yearly?.priceCents ?? 0;
  const yearlyDiscountPercent = annualizedMonthly ? Math.round((1 - yearlyCents / annualizedMonthly) * 1000) / 10 : 0;
  return {
    currency: BILLING_CURRENCY,
    minorUnit: currencyMinorUnit(BILLING_CURRENCY),
    monthlyMinor: monthly?.priceMinor ?? monthly?.priceCents ?? 0,
    monthlyCents: monthly?.priceMinor ?? monthly?.priceCents ?? 0,
    yearlyMinor: yearlyCents,
    yearlyCents,
    annualizedMonthlyMinor: annualizedMonthly,
    annualizedMonthlyCents: annualizedMonthly,
    yearlyEffectiveMonthlyMinor: yearlyCents ? Math.round(yearlyCents / 12) : 0,
    yearlyEffectiveMonthlyCents: yearlyCents ? Math.round(yearlyCents / 12) : 0,
    yearlyDiscountPercent
  };
}
function configuredExternalUrl(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)) return '';
    if (isProduction() && url.protocol !== 'https:') return '';
    if (isProduction() && (networkSecurity.isLocalHostname(url.hostname) || networkSecurity.isPrivateOrReservedIp(url.hostname))) return '';
    return url.toString();
  } catch (_) { return ''; }
}
function legalCommerceConfig() {
  const entityName = cleanText(process.env.BAWSALA_LEGAL_ENTITY_NAME || '', 180);
  const entityAddress = cleanText(process.env.BAWSALA_LEGAL_ENTITY_ADDRESS || '', 300);
  const jurisdiction = cleanText(process.env.BAWSALA_LEGAL_JURISDICTION || '', 120);
  const taxId = cleanText(process.env.BAWSALA_LEGAL_TAX_ID || '', 120);
  const contactEmail = cleanEmail(process.env.BAWSALA_LEGAL_CONTACT_EMAIL || '');
  const refundPolicyVersion = cleanText(process.env.BAWSALA_REFUND_POLICY_VERSION || '', 80);
  const refundWindowRaw = String(process.env.BAWSALA_REFUND_WINDOW_DAYS ?? '').trim();
  const refundWindowDays = Number(refundWindowRaw);
  const refundWindowConfigured = refundWindowRaw !== '' && Number.isInteger(refundWindowDays) && refundWindowDays >= 0 && refundWindowDays <= 365;
  const complete = !!(entityName && entityAddress && jurisdiction && taxId && contactEmail && refundPolicyVersion && refundWindowConfigured);
  return { complete, entityName, entityAddress, jurisdiction, taxId, contactEmail, refundPolicyVersion, refundWindowDays: refundWindowConfigured ? refundWindowDays : null };
}
function billingProviderConfig() {
  const provider = PAYMENT_PROVIDER || 'none';
  const checkoutApiUrl = configuredExternalUrl(PAYMENT_CHECKOUT_API_URL);
  const portalApiUrl = configuredExternalUrl(PAYMENT_PORTAL_API_URL);
  const stripePricesConfigured = Object.values(STRIPE_PRICE_IDS).every(Boolean);
  const legal = legalCommerceConfig();
  const stripeConfigured = provider === 'stripe' && !!STRIPE_SECRET_KEY && !!PAYMENT_WEBHOOK_SECRET && stripePricesConfigured && (!isProduction() || !!PUBLIC_BASE_URL) && legal.complete;
  const genericConfigured = provider !== 'stripe' && provider !== 'none' && !!PAYMENT_WEBHOOK_SECRET && !!checkoutApiUrl && (!isProduction() || !!PUBLIC_BASE_URL) && legal.complete;
  const configured = stripeConfigured || genericConfigured;
  return {
    provider,
    configured,
    checkoutConfigured: provider === 'stripe' ? stripeConfigured : !!checkoutApiUrl && legal.complete,
    webhookConfigured: !!PAYMENT_WEBHOOK_SECRET,
    portalConfigured: provider === 'stripe' ? !!STRIPE_SECRET_KEY : !!portalApiUrl,
    providerSecretPresent: provider === 'stripe' ? !!STRIPE_SECRET_KEY : false,
    priceIdsConfigured: provider === 'stripe' ? stripePricesConfigured : null,
    legalConfigured: legal.complete,
    mode: stripeConfigured ? 'stripe-api' : (genericConfigured ? 'external-provider-api' : 'disabled'),
    warning: configured ? '' : (!legal.complete ? 'Billing is disabled until the legal entity, address, jurisdiction, and refund policy version are configured.' : 'Billing is disabled until provider credentials, price identifiers, a trusted public origin, and signed webhooks are configured.')
  };
}
function publicFeatureGates(user) {
  const subscription = publicSubscription(user);
  const graceActive = subscription.status === 'past_due' && parseTime(subscription.graceEndsAt || 0) > Date.now();
  const paidActive = (['active','canceling'].includes(subscription.status) || graceActive) && subscription.plan !== 'free';
  return {
    plan: subscription.plan,
    status: subscription.status,
    adsEnabled: !paidActive,
    premiumResources: paidActive,
    advancedReports: paidActive,
    expandedReminders: paidActive,
    prioritySupport: paidActive,
    billingRequiredFor: ['premiumResources','advancedReports','expandedReminders','prioritySupport']
  };
}
function billingHistoryForUser(userId) {
  const invoices = Object.values(db.invoices || {}).filter(inv => inv.userId === userId).sort((a,b) => parseTime(b.createdAt || 0) - parseTime(a.createdAt || 0)).slice(0, 50);
  const events = (db.paymentEvents || []).filter(evt => evt.userId === userId).slice(0, 50);
  const sessions = Object.values(db.checkoutSessions || {}).filter(sess => sess.userId === userId).sort((a,b) => parseTime(b.createdAt || 0) - parseTime(a.createdAt || 0)).slice(0, 20).map(sess => ({ id: sess.id, planId: sess.planId, status: sess.status, provider: sess.provider, createdAt: sess.createdAt, expiresAt: sess.expiresAt }));
  return { invoices, events, checkoutSessions: sessions };
}
function addUtcMonthsClamped(from, months) {
  const source = new Date(from);
  const targetYear = source.getUTCFullYear();
  const targetMonth = source.getUTCMonth() + months;
  const day = source.getUTCDate();
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const result = new Date(source.getTime());
  result.setUTCDate(1);
  result.setUTCFullYear(targetYear, targetMonth, Math.min(day, lastDay));
  return result;
}
function periodEndForPlan(plan, from = Date.now()) {
  const d = new Date(from);
  if (plan?.interval === 'yearly') return addUtcMonthsClamped(d, 12).toISOString();
  if (plan?.interval === 'monthly') return addUtcMonthsClamped(d, 1).toISOString();
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString();
}
function createBillingInvoice(user, plan, status = 'paid', source = {}) {
  const providerInvoiceId = cleanText(source.providerInvoiceId || source.invoiceId || '', 120);
  if (providerInvoiceId) {
    const existing = Object.values(db.invoices || {}).find(invoice => invoice.providerInvoiceId === providerInvoiceId);
    if (existing) return existing;
  }
  const amountMinor = Number(source.amountMinor ?? source.amountCents ?? plan.priceMinor ?? plan.priceCents ?? 0);
  const id = cleanText(providerInvoiceId || newId('inv'), 120);
  const now = new Date().toISOString();
  const invoice = {
    id,
    number: cleanText(source.number || `BAW-${now.slice(0,10).replace(/-/g,'')}-${String(Object.keys(db.invoices || {}).length + 1).padStart(5, '0')}`, 80),
    userId: user.id,
    planId: plan.id,
    amountMinor,
    amountCents: amountMinor,
    minorUnit: currencyMinorUnit(source.currency || plan.currency || BILLING_CURRENCY),
    currency: cleanText(source.currency || plan.currency || BILLING_CURRENCY, 12),
    status: cleanText(status, 40),
    provider: PAYMENT_PROVIDER || cleanText(source.provider, 40) || 'external',
    providerInvoiceId,
    createdAt: cleanText(source.createdAt || now, 80),
    periodStart: cleanText(source.periodStart || now, 80),
    periodEnd: cleanText(source.periodEnd || periodEndForPlan(plan), 80),
    hostedInvoiceUrl: cleanText(source.hostedInvoiceUrl || '', 500),
    receiptUrl: cleanText(source.receiptUrl || '', 500)
  };
  db.invoices[invoice.id] = invoice;
  audit('billing-invoice-created', user.id, { invoiceId: invoice.id, plan: plan.id, amountCents: invoice.amountCents, status: invoice.status });
  return invoice;
}
function queueBillingNotice(user, subject, body) {
  return queueMail({ to: user.email, userId: user.id, type: 'billing', subject, body });
}
function requestIdempotencyKey(req) {
  const raw = cleanText(req.headers['idempotency-key'] || '', 160).replace(/[^a-zA-Z0-9_.:-]/g, '');
  return raw.length >= 8 ? raw : '';
}

function requireIdempotencyKey(req) {
  const key = requestIdempotencyKey(req);
  if (!key) throw Object.assign(new Error('IDEMPOTENCY_KEY_REQUIRED'), { status: 428 });
  return key;
}
function idempotencyRecordKey(userId, routeId, key) {
  return sha256(`${userId}|${routeId}|${key}`);
}
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value === undefined ? null : value);
}
function idempotencyFingerprint(body) {
  return sha256(canonicalJson(body || {}));
}
function readIdempotencyRecord(userId, routeId, key, fingerprint = '') {
  if (!key) return null;
  const recordKey = idempotencyRecordKey(userId, routeId, key);
  const record = db.idempotencyRecords?.[recordKey];
  if (!record) return null;
  if (parseTime(record.expiresAt || 0) <= Date.now()) {
    delete db.idempotencyRecords[recordKey];
    return null;
  }
  if (record.fingerprint && fingerprint && record.fingerprint !== fingerprint) {
    throw Object.assign(new Error('IDEMPOTENCY_CONFLICT'), { status: 409 });
  }
  return record;
}
function writeIdempotencyRecord(userId, routeId, key, fingerprint, response, { persist = true } = {}) {
  if (!key) return;
  const now = Date.now();
  db.idempotencyRecords[idempotencyRecordKey(userId, routeId, key)] = {
    userId,
    routeId,
    fingerprint,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    response: scrub(response)
  };
  if (persist) persistSoon();
}

async function stripeRequest(pathname, params = {}) {
  if (!STRIPE_SECRET_KEY) throw Object.assign(new Error('PAYMENT_PROVIDER_NOT_CONFIGURED'), { status: 503 });
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    form.set(key, String(value));
  }
  const body = form.toString();
  const response = await outboundRequest(`https://api.stripe.com${pathname}`, {
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    },
    body,
    timeoutMs: 12000,
    maxBytes: 1024 * 1024
  });
  if (!response.data || typeof response.data !== 'object') throw Object.assign(new Error('PAYMENT_PROVIDER_BAD_RESPONSE'), { status: 502 });
  return response.data;
}

async function createCheckoutSession(user, plan, req) {
  const now = Date.now();
  const session = {
    id: newId('chk'),
    userId: user.id,
    email: user.email,
    planId: plan.id,
    amountMinor: plan.priceMinor ?? plan.priceCents,
    amountCents: plan.priceMinor ?? plan.priceCents,
    minorUnit: currencyMinorUnit(plan.currency || BILLING_CURRENCY),
    currency: plan.currency || BILLING_CURRENCY,
    provider: PAYMENT_PROVIDER || 'external',
    status: 'pending',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 30 * 60 * 1000).toISOString()
  };
  db.checkoutSessions[session.id] = session;
  let checkoutUrl = '';
  try {
    if (PAYMENT_PROVIDER === 'stripe') {
      const priceId = STRIPE_PRICE_IDS[plan.id];
      if (!priceId) throw Object.assign(new Error('PAYMENT_PRICE_NOT_CONFIGURED'), { status: 503 });
      const origin = publicOrigin(req);
      const remote = await stripeRequest('/v1/checkout/sessions', {
        mode: 'subscription',
        success_url: `${origin}/pages/billing.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pages/billing.html?checkout=cancelled`,
        customer_email: user.email,
        client_reference_id: session.id,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': 1,
        'metadata[userId]': user.id,
        'metadata[planId]': plan.id,
        'metadata[checkoutSessionId]': session.id,
        'subscription_data[metadata][userId]': user.id,
        'subscription_data[metadata][planId]': plan.id,
        allow_promotion_codes: 'true'
      });
      session.providerSessionId = cleanText(remote.id, 160);
      session.expiresAt = remote.expires_at ? new Date(Number(remote.expires_at) * 1000).toISOString() : session.expiresAt;
      checkoutUrl = configuredExternalUrl(remote.url);
      if (!checkoutUrl) throw Object.assign(new Error('PAYMENT_PROVIDER_BAD_CHECKOUT_URL'), { status: 502 });
    } else {
      const checkoutApiUrl = configuredExternalUrl(PAYMENT_CHECKOUT_API_URL);
      if (!checkoutApiUrl) throw Object.assign(new Error('PAYMENT_PROVIDER_NOT_CONFIGURED'), { status: 503 });
      const providerPayload = JSON.stringify({
        clientReferenceId: session.id,
        planId: plan.id,
        amountMinor: session.amountMinor,
        currency: session.currency,
        customer: { id: user.id, email: user.email },
        successUrl: `${publicOrigin(req)}/pages/billing.html?checkout=success`,
        cancelUrl: `${publicOrigin(req)}/pages/billing.html?checkout=cancelled`
      });
      const remote = await outboundRequest(checkoutApiUrl, { headers: { 'Content-Type':'application/json','Accept':'application/json','Content-Length':Buffer.byteLength(providerPayload),'Idempotency-Key':session.id }, body: providerPayload, timeoutMs: 12000, maxBytes: 512 * 1024 });
      checkoutUrl = configuredExternalUrl(remote.data?.url || remote.data?.checkoutUrl || '');
      session.providerSessionId = cleanText(remote.data?.id || remote.data?.sessionId || '', 160);
      if (!checkoutUrl) throw Object.assign(new Error('PAYMENT_PROVIDER_BAD_CHECKOUT_URL'), { status: 502 });
    }
    return { session, checkoutUrl };
  } catch (err) {
    session.status = 'failed';
    session.updatedAt = new Date().toISOString();
    session.failureCode = cleanText(err.message || 'PAYMENT_PROVIDER_ERROR', 120);
    persistSoon();
    throw err;
  }
}

async function createBillingPortalSession(user, req) {
  if (PAYMENT_PROVIDER === 'stripe') {
    const customer = cleanText(user.subscription?.providerCustomerId || '', 160);
    if (!customer) throw Object.assign(new Error('BILLING_CUSTOMER_NOT_FOUND'), { status: 409 });
    const remote = await stripeRequest('/v1/billing_portal/sessions', {
      customer,
      return_url: `${publicOrigin(req)}/pages/billing.html`
    });
    const portalUrl = configuredExternalUrl(remote.url);
    if (!portalUrl) throw Object.assign(new Error('PAYMENT_PROVIDER_BAD_PORTAL_URL'), { status: 502 });
    return portalUrl;
  }
  const portalApiUrl = configuredExternalUrl(PAYMENT_PORTAL_API_URL);
  if (!portalApiUrl) return '';
  const payload = JSON.stringify({ customerId: user.subscription?.providerCustomerId || '', userId: user.id, email: user.email, returnUrl: `${publicOrigin(req)}/pages/billing.html` });
  const remote = await outboundRequest(portalApiUrl, { headers: { 'Content-Type':'application/json','Accept':'application/json','Content-Length':Buffer.byteLength(payload),'Idempotency-Key':`portal-${user.id}` }, body: payload, timeoutMs: 12000, maxBytes: 512 * 1024 });
  const portalUrl = configuredExternalUrl(remote.data?.url || remote.data?.portalUrl || '');
  if (!portalUrl) throw Object.assign(new Error('PAYMENT_PROVIDER_BAD_PORTAL_URL'), { status: 502 });
  return portalUrl;
}

function markCheckoutSession(body, status) {
  const id = cleanId(body.checkoutSessionId || body.client_reference_id || body.metadata?.checkoutSessionId || body.metadata?.client_reference_id);
  if (id && db.checkoutSessions?.[id]) {
    db.checkoutSessions[id].status = status;
    db.checkoutSessions[id].updatedAt = new Date().toISOString();
  }
}
function applyBillingWebhook(user, plan, body) {
  const type = cleanText(body.type, 80);
  const now = new Date().toISOString();
  const provider = PAYMENT_PROVIDER || cleanText(body.provider, 40) || 'external';
  const providerStatus = cleanText(body.status || '', 40).toLowerCase();
  const paymentStatus = cleanText(body.paymentStatus || '', 40).toLowerCase();
  const checkoutPaid = type !== 'checkout.session.completed' || ['paid', 'no_payment_required'].includes(paymentStatus);
  const subscriptionActive = !['customer.subscription.created', 'customer.subscription.updated'].includes(type) || ['active', 'trialing', ''].includes(providerStatus);
  const active = ['checkout.session.completed', 'invoice.paid', 'customer.subscription.created', 'customer.subscription.updated', 'subscription.active'].includes(type) && checkoutPaid && subscriptionActive;
  const failed = ['invoice.payment_failed', 'subscription.payment_failed'].includes(type) || (type === 'customer.subscription.updated' && providerStatus === 'past_due');
  const permanentFailure = ['invoice.payment_failed_permanent', 'customer.subscription.unpaid', 'subscription.unpaid'].includes(type) || (type === 'customer.subscription.updated' && ['unpaid', 'incomplete_expired'].includes(providerStatus));
  const canceled = ['customer.subscription.deleted', 'subscription.canceled'].includes(type) || (type === 'customer.subscription.updated' && providerStatus === 'canceled');
  if (active) {
    const periodStart = cleanText(body.periodStart || now, 80);
    const periodEnd = cleanText(body.renewal || body.periodEnd || periodEndForPlan(plan), 80);
    user.subscription = {
      ...(user.subscription || defaultSubscription()),
      plan: plan.id,
      status: body.cancelAtPeriodEnd ? 'canceling' : 'active',
      adsRemoved: true,
      renewal: periodEnd,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: !!body.cancelAtPeriodEnd,
      provider,
      providerCustomerId: cleanText(body.customerId || body.customer || user.subscription?.providerCustomerId || '', 120),
      providerSubscriptionId: cleanText(body.subscriptionId || body.providerSubscriptionId || body.subscription || user.subscription?.providerSubscriptionId || '', 120),
      paymentFailureCount: 0,
      nextRetryAt: null,
      graceEndsAt: null,
      pendingPlanChange: null,
      updatedAt: now
    };
    markCheckoutSession(body, 'completed');
    if (body.providerInvoiceId || String(type).startsWith('invoice.')) createBillingInvoice(user, plan, cleanText(body.invoiceStatus || 'paid', 40), { ...body, periodStart, periodEnd, amountMinor: body.amountMinor ?? body.amountCents ?? plan.priceMinor ?? plan.priceCents });
    queueBillingNotice(user, 'Bawsala subscription active', `Your ${plan.name} subscription is active until ${periodEnd}.`);
    return 'active';
  }
  if (failed) {
    const failureCount = Number(body.failureCount || user.subscription?.paymentFailureCount || 0) + 1;
    const nextRetryAt = new Date(Date.now() + Math.min(failureCount, 3) * 24 * 60 * 60 * 1000).toISOString();
    const graceEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    user.subscription = { ...(user.subscription || defaultSubscription()), status: 'past_due', adsRemoved: true, paymentFailureCount: failureCount, nextRetryAt, graceEndsAt, updatedAt: now };
    createBillingInvoice(user, plan, 'payment_failed', { ...body, amountMinor: body.amountMinor ?? body.amountCents ?? plan.priceMinor ?? plan.priceCents });
    queueBillingNotice(user, 'Bawsala payment failed', `Payment failed for ${plan.name}. Retry ${failureCount}/3 is scheduled before downgrade.`);
    audit('billing-payment-failed', user.id, { plan: plan.id, failureCount, nextRetryAt });
    if (failureCount >= 3) {
      user.subscription = { ...defaultSubscription(), previousPlan: plan.id, downgradedAt: now, updatedAt: now };
      queueBillingNotice(user, 'Bawsala subscription downgraded', 'Your subscription was downgraded to Free after repeated payment failures.');
      audit('billing-subscription-downgraded', user.id, { previousPlan: plan.id, reason: 'payment_failed' });
      return 'downgraded';
    }
    return 'past_due';
  }
  if (permanentFailure) {
    user.subscription = { ...defaultSubscription(), previousPlan: plan.id, downgradedAt: now, updatedAt: now };
    createBillingInvoice(user, plan, 'unpaid', { ...body, amountMinor: body.amountMinor ?? body.amountCents ?? plan.priceMinor ?? plan.priceCents });
    queueBillingNotice(user, 'Bawsala subscription downgraded', 'Your subscription was downgraded to Free after permanent payment failure.');
    audit('billing-subscription-downgraded', user.id, { previousPlan: plan.id, reason: type });
    return 'downgraded';
  }
  if (canceled) {
    user.subscription = { ...defaultSubscription(), canceledAt: now, previousPlan: plan.id, updatedAt: now };
    queueBillingNotice(user, 'Bawsala subscription canceled', `Your ${plan.name} subscription has been canceled.`);
    return 'canceled';
  }
  return 'ignored';
}

function publicOrigin(req) {
  return networkSecurity.requestOrigin(req, {
    publicOrigin: PUBLIC_BASE_URL,
    production: isProduction(),
    trustProxy: TRUST_PROXY,
    trustedProxyRules: TRUSTED_PROXY_RULES,
    port: PORT
  });
}
function cleanupEmailVerificationTokens() {
  const now = Date.now();
  for (const [hash, item] of Object.entries(db.emailVerificationTokens || {})) {
    if (!item || item.consumedAt || parseTime(item.expiresAt || 0) < now) delete db.emailVerificationTokens[hash];
  }
}
function buildEmailVerificationUrl(req, token) {
  return `${publicOrigin(req)}/api/auth/verify-email/confirm?token=${encodeURIComponent(token)}`;
}
function emailVerificationClientPayload(user, token, req) {
  const configured = mailProviderConfig().configured;
  return {
    required: !(!!user.emailVerifiedAt || !!user.providers?.google?.emailVerifiedAt),
    email: user.email,
    sentAt: user.emailVerification?.sentAt || null,
    expiresAt: user.emailVerification?.expiresAt || null,
    provider: configured ? MAIL_PROVIDER : 'console',
    mailConfigured: configured,
    devVerificationUrl: ALLOW_DEV_RESET_LINKS && token ? buildEmailVerificationUrl(req, token) : '',
    message: configured
      ? 'Verification email queued. User must confirm before the account is trusted.'
      : 'Mail provider is not configured. In development the verification link is returned and logged; in production this must be configured before public launch.'
  };
}
function issueEmailVerification(user, req, { force = false } = {}) {
  if (!user || !user.email) throw Object.assign(new Error('USER_NOT_FOUND'), { status: 404 });
  if (user.emailVerifiedAt || user.providers?.google?.emailVerifiedAt) return { token: '', payload: emailVerificationClientPayload(user, '', req) };
  const last = parseTime(user.emailVerification?.sentAt || 0) || 0;
  if (!force && last && Date.now() - last < EMAIL_VERIFICATION_RESEND_MS) {
    throw Object.assign(new Error('EMAIL_VERIFY_RESEND_TOO_SOON'), { status: 429 });
  }
  cleanupEmailVerificationTokens();
  for (const [hash, item] of Object.entries(db.emailVerificationTokens || {})) {
    if (item?.userId === user.id && !item.consumedAt) delete db.emailVerificationTokens[hash];
  }
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = sha256(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS).toISOString();
  db.emailVerificationTokens[tokenHash] = {
    userId: user.id,
    email: user.email,
    createdAt: now.toISOString(),
    expiresAt,
    purpose: 'email-verification'
  };
  user.emailVerification = { sentAt: now.toISOString(), expiresAt, provider: MAIL_PROVIDER || 'console' };
  user.updatedAt = now.toISOString();
  const url = buildEmailVerificationUrl(req, token);
  queueMail({ to: user.email, userId: user.id, type: 'email-verification', subject: 'Confirm your Bawsala email', body: `Confirm your email address by opening this link: ${url}`, meta: { expiresAt } });
  audit('email-verification-issued', user.id, { mailConfigured: mailProviderConfig().configured, expiresAt });
  persistSoon();
  return { token, payload: emailVerificationClientPayload(user, token, req) };
}
function confirmEmailVerificationToken(token) {
  if (!validTokenShape(token)) throw Object.assign(new Error('INVALID_EMAIL_VERIFICATION_TOKEN'), { status: 400 });
  cleanupEmailVerificationTokens();
  const tokenHash = sha256(token);
  const record = db.emailVerificationTokens?.[tokenHash];
  if (!record || record.purpose !== 'email-verification') throw Object.assign(new Error('INVALID_EMAIL_VERIFICATION_TOKEN'), { status: 400 });
  if (parseTime(record.expiresAt || 0) < Date.now()) {
    delete db.emailVerificationTokens[tokenHash];
    persistSoon();
    throw Object.assign(new Error('EMAIL_VERIFICATION_EXPIRED'), { status: 410 });
  }
  const user = db.users[record.userId];
  if (!user || user.email !== record.email) throw Object.assign(new Error('EMAIL_VERIFICATION_TARGET_MISMATCH'), { status: 409 });
  const now = new Date().toISOString();
  user.emailVerifiedAt = user.emailVerifiedAt || now;
  user.emailVerification = { ...(user.emailVerification || {}), verifiedAt: user.emailVerifiedAt, expiresAt: record.expiresAt, provider: user.emailVerification?.provider || MAIL_PROVIDER || 'console' };
  user.updatedAt = now;
  delete db.emailVerificationTokens[tokenHash];
  persistSoon();
  audit('email-verified', user.id);
  return user;
}

function cleanupPasswordResetTokens() {
  const now = Date.now();
  for (const [hash, item] of Object.entries(db.passwordResetTokens || {})) {
    if (!item || item.consumedAt || parseTime(item.expiresAt || 0) < now) delete db.passwordResetTokens[hash];
  }
}
function buildPasswordResetUrl(req, token) {
  return `${publicOrigin(req)}/pages/reset-password.html?token=${encodeURIComponent(token)}`;
}
function passwordResetClientPayload(email, token, req, exists) {
  const configured = mailProviderConfig().configured;
  return {
    accepted: true,
    email: cleanEmail(email),
    provider: configured ? MAIL_PROVIDER : 'console',
    mailConfigured: configured,
    expiresInMinutes: 15,
    devResetUrl: exists && ALLOW_DEV_RESET_LINKS && token ? buildPasswordResetUrl(req, token) : '',
    message: configured
      ? 'If the account exists, a password reset email will be queued.'
      : 'Mail provider is not configured. In development, existing accounts receive a reset URL in the response and server log.'
  };
}
function issuePasswordReset(emailInput, req) {
  const email = cleanEmail(emailInput);
  if (!isValidEmailAddress(email)) throw Object.assign(new Error('INVALID_EMAIL'), { status: 400 });
  cleanupPasswordResetTokens();
  const user = findUserByEmail(email);
  if (!user) {
    audit('password-reset-requested', 'anonymous', { emailHash: authFailureKey(email), exists: false });
    return passwordResetClientPayload(email, '', req, false);
  }
  const last = parseTime(user.passwordReset?.sentAt || 0) || 0;
  if (last && Date.now() - last < PASSWORD_RESET_RESEND_MS) {
    return passwordResetClientPayload(email, '', req, true);
  }
  for (const [hash, item] of Object.entries(db.passwordResetTokens || {})) {
    if (item?.userId === user.id && !item.consumedAt) delete db.passwordResetTokens[hash];
  }
  const token = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS).toISOString();
  db.passwordResetTokens[sha256(token)] = { userId: user.id, email, createdAt: now.toISOString(), expiresAt, purpose: 'password-reset' };
  user.passwordReset = { sentAt: now.toISOString(), expiresAt, provider: MAIL_PROVIDER || 'console' };
  user.updatedAt = now.toISOString();
  const url = buildPasswordResetUrl(req, token);
  queueMail({ to: user.email, userId: user.id, type: 'password-reset', subject: 'Reset your Bawsala password', body: `Reset your password by opening this link. It expires in 15 minutes: ${url}`, meta: { expiresAt } });
  audit('password-reset-issued', user.id, { mailConfigured: mailProviderConfig().configured, expiresAt });
  persistSoon();
  return passwordResetClientPayload(email, token, req, true);
}
async function confirmPasswordResetToken(token, newPassword) {
  if (!validTokenShape(token)) throw Object.assign(new Error('INVALID_PASSWORD_RESET_TOKEN'), { status: 400 });
  cleanupPasswordResetTokens();
  const tokenHash = sha256(token);
  const record = db.passwordResetTokens?.[tokenHash];
  if (!record || record.purpose !== 'password-reset') throw Object.assign(new Error('INVALID_PASSWORD_RESET_TOKEN'), { status: 400 });
  if (parseTime(record.expiresAt || 0) < Date.now()) {
    delete db.passwordResetTokens[tokenHash];
    persistSoon();
    throw Object.assign(new Error('PASSWORD_RESET_EXPIRED'), { status: 410 });
  }
  const user = db.users[record.userId];
  if (!user || user.email !== record.email) throw Object.assign(new Error('PASSWORD_RESET_TARGET_MISMATCH'), { status: 409 });
  if (!validatePassword(newPassword, { email: user.email, name: user.name })) throw Object.assign(new Error('WEAK_PASSWORD'), { status: 400 });
  if (await isPasswordReused(user, newPassword)) throw Object.assign(new Error('PASSWORD_REUSED'), { status: 400 });
  const { salt, hash, algorithm, peppered } = await hashPassword(newPassword);
  user.passwordSalt = salt;
  user.passwordHash = hash;
  user.passwordAlgorithm = algorithm;
  user.passwordPeppered = peppered;
  rememberPassword(user, salt, hash, algorithm, peppered);
  user.authProvider = user.authProvider || 'password';
  user.passwordReset = { ...(user.passwordReset || {}), resetAt: new Date().toISOString(), provider: user.passwordReset?.provider || MAIL_PROVIDER || 'console' };
  user.updatedAt = new Date().toISOString();
  delete db.passwordResetTokens[tokenHash];
  resetLoginFailures(user.email, null, user);
  revokeUserSessions(user.id);
  audit('password-reset-completed', user.id);
  persistSoon();
  return user;
}
function publicSecurityLog(userId) {
  const allowed = new Set(['user-signup','email-verification-issued','email-verified','user-login','user-logout','login-failed','login-throttled','account-login-locked','password-changed','password-reset-issued','password-reset-completed','session-revoked','account-updated','account-exported','billing-checkout-created','billing-cancel-requested','billing-plan-change-requested','billing-webhook-applied','billing-payment-failed','billing-subscription-downgraded','billing-invoice-created']);
  return (db.audit || [])
    .filter(item => item.actor === userId && allowed.has(item.type))
    .slice(0, 80)
    .map(item => ({ at: item.at, type: item.type, details: scrub(item.details || {}) }));
}

function cleanupExpiredRecords(reason = 'scheduled') {
  const now = Date.now();
  let sessions = 0, oauth = 0, emailTokens = 0, resetTokens = 0, authFailures = 0, checkoutSessions = 0, idempotencyRecords = 0, auditLogs = 0, securityLogs = 0, paymentLogs = 0, mailItems = 0, rotatedLogFiles = 0;
  for (const [hash, session] of Object.entries(db.sessions || {})) {
    const idle = parseTime(session.expiresAt || 0) || 0;
    const absolute = parseTime(session.absoluteExpiresAt || 0) || 0;
    if ((idle && idle < now) || (absolute && absolute < now)) { delete db.sessions[hash]; sessions += 1; }
  }
  for (const [hash, pending] of Object.entries(db.oauthPending || {})) {
    if (parseTime(pending.expiresAt || 0) < now) { delete db.oauthPending[hash]; oauth += 1; }
  }
  for (const [hash, token] of Object.entries(db.emailVerificationTokens || {})) {
    if (token?.consumedAt || parseTime(token.expiresAt || 0) < now) { delete db.emailVerificationTokens[hash]; emailTokens += 1; }
  }
  for (const [hash, token] of Object.entries(db.passwordResetTokens || {})) {
    if (token?.consumedAt || parseTime(token.expiresAt || 0) < now) { delete db.passwordResetTokens[hash]; resetTokens += 1; }
  }
  for (const [key, record] of Object.entries(db.authFailures || {})) {
    const last = parseTime(record.lastAt || record.firstAt || 0) || 0;
    const locked = parseTime(record.blockedUntil || record.lockedUntil || 0) || 0;
    if (!locked && last && now - last > 24 * 60 * 60 * 1000) { delete db.authFailures[key]; authFailures += 1; }
  }
  for (const [id, session] of Object.entries(db.checkoutSessions || {})) {
    if (session.status === 'pending' && parseTime(session.expiresAt || 0) < now) { session.status = 'expired'; session.updatedAt = new Date(now).toISOString(); checkoutSessions += 1; }
  }
  for (const [key, record] of Object.entries(db.idempotencyRecords || {})) {
    if (parseTime(record.expiresAt || 0) < now) { delete db.idempotencyRecords[key]; idempotencyRecords += 1; }
  }
  const retentionCutoff = now - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const beforeAudit = (db.audit || []).length;
  db.audit = (db.audit || []).filter(item => !parseTime(item?.at || 0) || parseTime(item.at) >= retentionCutoff);
  auditLogs = beforeAudit - db.audit.length;
  const beforeSecurity = (db.securityEvents || []).length;
  db.securityEvents = (db.securityEvents || []).filter(item => !parseTime(item?.at || 0) || parseTime(item.at) >= retentionCutoff);
  securityLogs = beforeSecurity - db.securityEvents.length;
  const beforePayments = (db.paymentEvents || []).length;
  db.paymentEvents = (db.paymentEvents || []).filter(item => !parseTime(item?.at || 0) || parseTime(item.at) >= retentionCutoff);
  paymentLogs = beforePayments - db.paymentEvents.length;
  const beforeMail = (db.mailOutbox || []).length;
  db.mailOutbox = (db.mailOutbox || []).filter(item => !['sent','failed','dev-logged'].includes(item?.status) || !parseTime(item?.sentAt || item?.failedAt || item?.createdAt || 0) || parseTime(item.sentAt || item.failedAt || item.createdAt) >= retentionCutoff);
  mailItems = beforeMail - db.mailOutbox.length;
  try {
    const dir = path.dirname(SECURITY_LOG_FILE);
    if (fs.existsSync(dir)) for (const name of fs.readdirSync(dir)) {
      if (!name.startsWith(path.basename(SECURITY_LOG_FILE) + '.') || !name.endsWith('.old')) continue;
      const file = path.join(dir, name);
      if (fs.statSync(file).mtimeMs < retentionCutoff) { fs.rmSync(file, { force: true }); rotatedLogFiles += 1; }
    }
  } catch (_) { /* best-effort retention cleanup */ }
  const removed = { sessions, oauth, emailTokens, resetTokens, authFailures, checkoutSessions, idempotencyRecords, auditLogs, securityLogs, paymentLogs, mailItems, rotatedLogFiles };
  const changed = Object.values(removed).some(Boolean);
  if (changed) {
    structuredLog('info', 'cleanup-expired-records', { reason, removed });
    persistSoon();
  }
  return { changed, removed };
}
function accountSessions(userId, req) {
  const currentHash = sha256(sessionToken(req) || '');
  return Object.entries(db.sessions || {})
    .filter(([, sess]) => sess.userId === userId)
    .map(([hash, sess]) => ({
      id: sess.id,
      current: hash === currentHash,
      createdAt: sess.createdAt || null,
      lastSeenAt: sess.lastSeenAt || null,
      expiresAt: sess.expiresAt || null,
      absoluteExpiresAt: sess.absoluteExpiresAt || null,
      userAgent: sess.userAgent || '',
      ipHash: sess.ipHash || ''
    }))
    .sort((a, b) => String(b.lastSeenAt || b.createdAt || '').localeCompare(String(a.lastSeenAt || a.createdAt || '')));
}
function revokeSessionByPublicId(userId, sessionId, keepCurrentHash = '') {
  let revoked = 0;
  for (const [hash, sess] of Object.entries(db.sessions || {})) {
    if (sess.userId === userId && sess.id === sessionId && hash !== keepCurrentHash) { delete db.sessions[hash]; revoked += 1; }
  }
  if (revoked) persistSoon();
  return revoked;
}
function createAdminBackup(label = 'manual') {
  persistNow();
  if (typeof stateStore.backup !== 'function') throw Object.assign(new Error('BACKUP_UNAVAILABLE'), { status: 501 });
  return stateStore.backup(label);
}
function backupSummary() {
  return typeof stateStore.listBackups === 'function' ? stateStore.listBackups().slice(0, 100) : [];
}
function offsiteBackupConfig() {
  const uploadUrl = configuredExternalUrl(BACKUP_UPLOAD_URL);
  const keyReady = BACKUP_ENCRYPTION_KEY.length >= 32;
  return {
    configured: !!uploadUrl && keyReady,
    uploadUrl,
    tokenConfigured: !!BACKUP_UPLOAD_TOKEN,
    encryptionConfigured: keyReady,
    required: REQUIRE_OFFSITE_BACKUPS
  };
}
function backupCryptoKey() {
  if (BACKUP_ENCRYPTION_KEY.length < 32) return null;
  return crypto.createHash('sha256').update(`bawsala-backup-v1|${BACKUP_ENCRYPTION_KEY}`).digest();
}
function encryptedBackupEnvelope(backup) {
  const key = backupCryptoKey();
  if (!key) throw Object.assign(new Error('BACKUP_ENCRYPTION_KEY_MISSING'), { status: 503 });
  const safeFile = path.basename(String(backup?.file || ''));
  if (!/^state-[a-zA-Z0-9_.-]+\.json$/.test(safeFile)) throw Object.assign(new Error('BACKUP_FILE_INVALID'), { status: 400 });
  const file = path.join(DATA_DIR, 'backups', safeFile);
  const raw = fs.readFileSync(file);
  let storedMetadata = {};
  try { storedMetadata = JSON.parse(raw.toString('utf8')); } catch (_) {}
  const iv = crypto.randomBytes(12);
  const aadObject = { app: 'bawsala', version: APP_VERSION, file: safeFile, checksum: String(backup.checksum || storedMetadata.checksum || ''), createdAt: String(backup.createdAt || storedMetadata.createdAt || '') };
  const aad = Buffer.from(stableStringify(aadObject), 'utf8');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(raw), cipher.final()]);
  return {
    format: 'bawsala-encrypted-backup-v1',
    createdAt: new Date().toISOString(),
    source: aadObject,
    encryption: {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'sha256-context-v1',
      iv: iv.toString('base64url'),
      authTag: cipher.getAuthTag().toString('base64url'),
      aad: aad.toString('base64url')
    },
    ciphertext: ciphertext.toString('base64url')
  };
}
async function uploadBackupOffsite(backup, reason = 'scheduled') {
  const config = offsiteBackupConfig();
  if (!config.configured) {
    if (config.required) throw Object.assign(new Error('OFFSITE_BACKUP_NOT_CONFIGURED'), { status: 503 });
    return { uploaded: false, skipped: 'not-configured' };
  }
  const envelope = encryptedBackupEnvelope(backup);
  const body = JSON.stringify(envelope);
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'X-Bawsala-Backup-Format': envelope.format,
    'X-Bawsala-Backup-File': envelope.source.file,
    'X-Bawsala-Backup-Checksum': envelope.source.checksum,
    'Idempotency-Key': `backup-${String(envelope.source.checksum || sha256(body)).replace(/^sha256:/, '')}`
  };
  if (BACKUP_UPLOAD_TOKEN) headers.Authorization = `Bearer ${BACKUP_UPLOAD_TOKEN}`;
  try {
    const response = await outboundRequest(config.uploadUrl, { headers, body, timeoutMs: BACKUP_UPLOAD_TIMEOUT_MS, maxBytes: 256 * 1024 });
    const event = { file: envelope.source.file, checksum: envelope.source.checksum, reason, providerStatus: response.status, uploadedAt: new Date().toISOString() };
    stateStore.recordOperationalEvent?.('offsite-backup-succeeded', event);
    structuredLog('info', 'offsite-backup-succeeded', event);
    return { uploaded: true, ...event };
  } catch (err) {
    const event = { file: envelope.source.file, checksum: envelope.source.checksum, reason, code: err.code || err.message || 'OFFSITE_BACKUP_FAILED', failedAt: new Date().toISOString() };
    stateStore.recordOperationalEvent?.('offsite-backup-failed', event);
    structuredLog('error', 'offsite-backup-failed', event);
    sendOperationalAlert('offsite-backup-failed', event);
    throw err;
  }
}
function queueOffsiteBackup(backup, reason) {
  if (!backup) return;
  setImmediate(() => uploadBackupOffsite(backup, reason).catch(() => {}));
}
function scheduledBackupIntervalMs() {
  if (['off','false','0','disabled'].includes(BACKUP_SCHEDULE)) return 0;
  if (BACKUP_SCHEDULE === 'hourly') return 60 * 60 * 1000;
  if (BACKUP_SCHEDULE === 'daily') return 24 * 60 * 60 * 1000;
  const hours = Number(BACKUP_SCHEDULE);
  return Number.isFinite(hours) && hours > 0 ? Math.max(60 * 60 * 1000, Math.min(hours * 60 * 60 * 1000, 30 * 24 * 60 * 60 * 1000)) : 24 * 60 * 60 * 1000;
}
function runScheduledBackup(reason = 'scheduled') {
  try {
    const interval = scheduledBackupIntervalMs();
    if (!interval) return null;
    const latest = backupSummary()[0];
    if (latest && Date.now() - parseTime(latest.createdAt || 0) < interval * 0.9) {
      const uploaded = stateStore.latestOperationalEvent?.('offsite-backup-succeeded');
      if (offsiteBackupConfig().configured && uploaded?.details?.file !== latest.file) queueOffsiteBackup(latest, `${reason}-existing`);
      return latest;
    }
    const backup = createAdminBackup(reason);
    structuredLog('info', 'scheduled-backup-created', backup);
    queueOffsiteBackup(backup, reason);
    return backup;
  } catch (err) {
    structuredLog('error', 'scheduled-backup-failed', { code: err.code || err.message || 'BACKUP_FAILED' });
    sendOperationalAlert('scheduled-backup-failed', { code: err.code || err.message || 'BACKUP_FAILED' });
    return null;
  }
}
function systemStatusPayload() {
  return {
    version: APP_VERSION,
    instanceId: SERVER_INSTANCE_ID,
    production: isProduction(),
    uptimeSeconds: Math.round(process.uptime()),
    memory: process.memoryUsage(),
    storage: stateStore.info(),
    storageWritable: isStorageWritable(),
    warnings: runtimeWarnings(),
    rateLimiter: { mode: typeof stateStore.consumeRateLimit === 'function' ? 'sqlite-durable' : 'in-memory', buckets: rateMap.size, maxBuckets: MAX_RATE_BUCKETS, limits: RATE_LIMITS },
    admissionControl: { maxActiveRequests: MAX_ACTIVE_REQUESTS, activeRequests: runtimeMetrics.activeRequests() },
    counts: {
      users: Object.keys(db.users || {}).length,
      sessions: Object.keys(db.sessions || {}).length,
      snapshots: Object.keys(db.snapshots || {}).length,
      audit: (db.audit || []).length,
      securityEvents: (db.securityEvents || []).length,
      paymentEvents: (db.paymentEvents || []).length,
      backups: backupSummary().length
    },
    features: {
      csrf: true,
      requestIds: true,
      strictSessionBinding: STRICT_SESSION_BINDING,
      paymentProvider: PAYMENT_PROVIDER || 'none',
      mailProvider: mailProviderConfig().provider,
      googleOAuthConfigured: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI)
    }
  };
}

function operationsSnapshot() {
  const metrics = runtimeMetrics.snapshot();
  const storage = stateStore.info();
  let integrity = { ok: false };
  try { integrity = stateStore.integrity(); } catch (_) {}
  const backups = backupSummary();
  const latestBackupAt = backups[0]?.createdAt || null;
  const backupAgeSeconds = latestBackupAt ? Math.max(0, Math.round((Date.now() - parseTime(latestBackupAt)) / 1000)) : null;
  const backupFresh = backupAgeSeconds !== null && backupAgeSeconds <= Math.max(24 * 60 * 60, Math.round(scheduledBackupIntervalMs() / 1000) * 1.5);
  const mail = (db.mailOutbox || []).reduce((acc, item) => { const status = String(item?.status || 'unknown'); acc[status] = (acc[status] || 0) + 1; return acc; }, {});
  const recentPaymentFailures = (db.paymentEvents || []).filter(item => /failed|past_due|unpaid/i.test(String(item?.type || item?.status || '')) && Date.now() - parseTime(item?.at || item?.createdAt || 0) < 24 * 60 * 60 * 1000).length;
  const recentSyncFailures = Object.values(db.calendarSync || {}).filter(item => item?.lastError && Date.now() - parseTime(item?.updatedAt || item?.lastAttemptAt || 0) < 24 * 60 * 60 * 1000).length;
  const warnings = runtimeWarnings();
  const offsiteConfig = offsiteBackupConfig();
  const offsiteSuccess = stateStore.latestOperationalEvent?.('offsite-backup-succeeded') || null;
  const offsiteFailure = stateStore.latestOperationalEvent?.('offsite-backup-failed') || null;
  const offsiteAgeSeconds = offsiteSuccess?.at ? Math.max(0, Math.round((Date.now() - parseTime(offsiteSuccess.at)) / 1000)) : null;
  const offsiteFresh = !isProduction() || (!offsiteConfig.required && !offsiteConfig.configured) || (offsiteAgeSeconds !== null && offsiteAgeSeconds <= Math.max(36 * 60 * 60, Math.round(scheduledBackupIntervalMs() / 1000) * 1.75));
  const checks = [
    { id: 'storage', label: 'سلامة التخزين', weight: 18, ok: integrity.ok !== false && integrity.sqliteOk !== false && integrity.foreignKeysOk !== false, detail: storage.mode || storage.engine },
    { id: 'persistence', label: 'استمرارية الكتابة', weight: 12, ok: !lastPersistError, detail: lastPersistError?.code || (pendingPersist ? 'pending' : 'healthy') },
    { id: 'errors', label: 'معدل أخطاء الخادم', weight: 12, ok: Number(metrics.errorRate || 0) < 1, degraded: Number(metrics.errorRate || 0) < 3, detail: `${metrics.errorRate || 0}%` },
    { id: 'latency', label: 'زمن الاستجابة والحلقة', weight: 10, ok: Number(metrics.latencyMs?.p95 || 0) < 750 && Number(metrics.eventLoopLagMs?.p99 || 0) < 150, degraded: Number(metrics.latencyMs?.p95 || 0) < 1500 && Number(metrics.eventLoopLagMs?.p99 || 0) < 400, detail: `P95:${metrics.latencyMs?.p95 || 0}ms loop:${metrics.eventLoopLagMs?.p99 || 0}ms` },
    { id: 'backup', label: 'حداثة النسخ المحلي', weight: 10, ok: backupFresh, degraded: backupAgeSeconds !== null && backupAgeSeconds < 3 * 24 * 60 * 60, detail: latestBackupAt || 'missing' },
    { id: 'offsite', label: 'النسخ المشفر خارج الخادم', weight: 12, ok: offsiteFresh, degraded: offsiteConfig.configured && !!offsiteSuccess, detail: offsiteSuccess?.at || (offsiteConfig.configured ? (offsiteFailure?.details?.code || 'awaiting-first-upload') : 'not-configured') },
    { id: 'mail', label: 'صحة طابور البريد', weight: 8, ok: Number(mail.failed || 0) === 0 && Number(mail.retry || 0) < 10, degraded: Number(mail.failed || 0) < 3, detail: `queued:${mail.queued || 0} retry:${mail.retry || 0} failed:${mail.failed || 0}` },
    { id: 'providers', label: 'الخدمات الخارجية', weight: 6, ok: !isProduction() || (mailProviderConfig().configured && (!PAYMENT_PROVIDER || PAYMENT_PROVIDER === 'none' || billingProviderConfig().configured)), detail: isProduction() ? 'production-check' : 'development' },
    { id: 'security-trail', label: 'سجل أمني مترابط', weight: 5, ok: SECURITY_LOG_JSONL && !!initializeSecurityLogChain(), degraded: SECURITY_LOG_JSONL, detail: SECURITY_LOG_JSONL ? (securityLogChainHead ? 'hash-chain-active' : 'awaiting-first-event') : 'disabled' },
    { id: 'warnings', label: 'تحذيرات الإعداد', weight: 7, ok: warnings.length === 0, degraded: warnings.length <= 2, detail: warnings.length ? warnings.join(',') : 'none' }
  ];
  let score = 0;
  for (const check of checks) score += check.ok ? check.weight : (check.degraded ? Math.round(check.weight * 0.5) : 0);
  score = Math.max(0, Math.min(100, score));
  const recommendations = [];
  for (const check of checks) if (!check.ok) recommendations.push({
    id: check.id,
    priority: check.degraded ? 'medium' : 'high',
    message: ({ storage: 'افحص SQLite وforeign keys قبل استقبال طلبات جديدة.', persistence: 'عالج فشل الحفظ فوراً ولا تعتبر الاستجابة ناجحة.', errors: 'راجع أكثر المسارات أخطاءً وآخر request IDs.', latency: 'راجع الاستعلامات والمسارات الأعلى في P95.', backup: 'أنشئ نسخة محلية حديثة واختبر الاستعادة.', offsite: 'فعّل النسخ المشفر خارج الخادم وتحقق من آخر رفع ناجح.', mail: 'نظف طابور البريد وافحص provider والـ retries.', providers: 'أكمل مفاتيح واختبارات staging للخدمات الخارجية.', 'security-trail': 'فعّل سجل JSONL المترابط وتحقق من سلسلة التجزئة.', warnings: 'أغلق تحذيرات إعداد production قبل الإطلاق.' })[check.id]
  });
  const targetAvailability = 99.5;
  const observedAvailability = Math.max(0, 100 - Number(metrics.errorRate || 0));
  const errorBudgetRemaining = Math.max(0, Math.min(100, Math.round(((observedAvailability - targetAvailability) / (100 - targetAvailability)) * 1000) / 10));
  return {
    score,
    status: score >= 90 ? 'healthy' : score >= 70 ? 'degraded' : 'critical',
    generatedAt: new Date().toISOString(),
    checks,
    recommendations: recommendations.slice(0, 8),
    slo: { targetAvailability, observedAvailability, errorBudgetRemainingPercent: errorBudgetRemaining },
    queues: { mail, recentPaymentFailures, recentSyncFailures },
    backup: { count: backups.length, latestAt: latestBackupAt, ageSeconds: backupAgeSeconds, fresh: backupFresh, offsite: { configured: offsiteConfig.configured, required: offsiteConfig.required, latestSuccessAt: offsiteSuccess?.at || null, latestFailureAt: offsiteFailure?.at || null, ageSeconds: offsiteAgeSeconds, fresh: offsiteFresh } },
    persistence: { pending: pendingPersist, lastPersistAt, lastError: lastPersistError, lastSaveStats: integrity.lastSaveStats || null },
    securityTrail: { enabled: SECURITY_LOG_JSONL, chained: !!initializeSecurityLogChain(), head: securityLogChainHead || null },
    rateLimiter: { mode: typeof stateStore.consumeRateLimit === 'function' ? 'sqlite-durable' : 'in-memory' }
  };
}
function openMetricsPayload() {
  const metrics = runtimeMetrics.snapshot();
  const operations = operationsSnapshot();
  const mail = operations.queues.mail || {};
  const lines = [
    '# HELP bawsala_up Whether the application process is serving requests.',
    '# TYPE bawsala_up gauge',
    'bawsala_up 1',
    '# TYPE bawsala_requests_total counter',
    `bawsala_requests_total ${Number(metrics.totalRequests || 0)}`,
    '# TYPE bawsala_request_errors_total counter',
    `bawsala_request_errors_total ${Number(metrics.totalErrors || 0)}`,
    '# TYPE bawsala_active_requests gauge',
    `bawsala_active_requests ${Number(metrics.activeRequests || 0)}`,
    '# TYPE bawsala_request_latency_ms gauge',
    `bawsala_request_latency_ms{quantile="0.50"} ${Number(metrics.latencyMs?.p50 || 0)}`,
    `bawsala_request_latency_ms{quantile="0.95"} ${Number(metrics.latencyMs?.p95 || 0)}`,
    `bawsala_request_latency_ms{quantile="0.99"} ${Number(metrics.latencyMs?.p99 || 0)}`,
    '# TYPE bawsala_event_loop_lag_ms gauge',
    `bawsala_event_loop_lag_ms{quantile="0.95"} ${Number(metrics.eventLoopLagMs?.p95 || 0)}`,
    `bawsala_event_loop_lag_ms{quantile="0.99"} ${Number(metrics.eventLoopLagMs?.p99 || 0)}`,
    '# TYPE bawsala_operational_score gauge',
    `bawsala_operational_score ${operations.score}`,
    '# TYPE bawsala_storage_writable gauge',
    `bawsala_storage_writable ${isStorageWritable() ? 1 : 0}`,
    '# TYPE bawsala_persistence_pending gauge',
    `bawsala_persistence_pending ${pendingPersist ? 1 : 0}`,
    '# TYPE bawsala_backup_age_seconds gauge',
    `bawsala_backup_age_seconds ${operations.backup.ageSeconds ?? -1}`,
    '# TYPE bawsala_offsite_backup_age_seconds gauge',
    `bawsala_offsite_backup_age_seconds ${operations.backup.offsite?.ageSeconds ?? -1}`,
    '# TYPE bawsala_offsite_backup_configured gauge',
    `bawsala_offsite_backup_configured ${operations.backup.offsite?.configured ? 1 : 0}`,
    '# TYPE bawsala_mail_queue gauge',
    `bawsala_mail_queue{status="queued"} ${Number(mail.queued || 0)}`,
    `bawsala_mail_queue{status="retry"} ${Number(mail.retry || 0)}`,
    `bawsala_mail_queue{status="failed"} ${Number(mail.failed || 0)}`,
    '# TYPE bawsala_users gauge',
    `bawsala_users ${Object.keys(db.users || {}).length}`,
    '# TYPE bawsala_sessions gauge',
    `bawsala_sessions ${Object.keys(db.sessions || {}).length}`
  ];
  return lines.join('\n') + '\n';
}

function redirectTo(res, location) {
  setSecurityHeaders(res);
  res.writeHead(302, { Location: location, 'Cache-Control': 'no-store' });
  res.end();
}
function clearCookie(res, name) {
  appendSetCookie(res, cookie(name, '', { maxAge: 0, secure: isProduction(), sameSite: 'Strict' }));
}
function buildGoogleAuthUrl(res, { intent = 'signin', userId = '' } = {}) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) return '';
  const calendarIntent = intent === 'calendar';
  if (calendarIntent && (!GOOGLE_CALENDAR_ENABLED || !oauthCryptoKey() || !userId)) return '';
  const state = crypto.randomBytes(32).toString('base64url');
  const codeVerifier = crypto.randomBytes(48).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  appendSetCookie(res, cookie('bawsala_google_state', state, {
    maxAge: GOOGLE_STATE_MAX_AGE_SECONDS,
    secure: isProduction(),
    httpOnly: true,
    sameSite: 'Lax'
  }));
  appendSetCookie(res, cookie('bawsala_google_pkce', codeVerifier, {
    maxAge: GOOGLE_STATE_MAX_AGE_SECONDS,
    secure: isProduction(),
    httpOnly: true,
    sameSite: 'Lax'
  }));
  appendSetCookie(res, cookie('bawsala_google_intent', calendarIntent ? `calendar:${userId}` : 'signin', {
    maxAge: GOOGLE_STATE_MAX_AGE_SECONDS,
    secure: isProduction(),
    httpOnly: true,
    sameSite: 'Lax'
  }));
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', calendarIntent ? `openid email profile ${GOOGLE_CALENDAR_SCOPE}` : 'openid email profile');
  url.searchParams.set('prompt', calendarIntent ? 'consent select_account' : 'select_account');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  if (calendarIntent) {
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('include_granted_scopes', 'true');
  }
  return url.toString();
}

function httpsRequestJson(target, options = {}, body = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(target);
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 10_000
    }, response => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { raw += chunk; if (raw.length > 1024 * 1024) req.destroy(Object.assign(new Error('OAUTH_RESPONSE_TOO_LARGE'), { status: 502 })); });
      response.on('end', () => {
        let data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch (_) { return reject(Object.assign(new Error('OAUTH_BAD_RESPONSE'), { status: 502 })); }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return reject(Object.assign(new Error('OAUTH_PROVIDER_ERROR'), { status: 502, providerStatus: response.statusCode, data: scrub(data) }));
        }
        resolve(data);
      });
    });
    req.on('timeout', () => req.destroy(Object.assign(new Error('OAUTH_TIMEOUT'), { status: 504 })));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
async function exchangeGoogleCode(code, codeVerifier) {
  const form = new URLSearchParams();
  form.set('code', code);
  form.set('client_id', GOOGLE_CLIENT_ID);
  form.set('client_secret', GOOGLE_CLIENT_SECRET);
  form.set('redirect_uri', GOOGLE_REDIRECT_URI);
  form.set('grant_type', 'authorization_code');
  form.set('code_verifier', codeVerifier);
  return httpsRequestJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }
  }, form.toString());
}
async function fetchGoogleUserInfo(accessToken) {
  return httpsRequestJson('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${accessToken}` }
  });
}
function storeGoogleCalendarTokens(user, tokens, profile = {}) {
  const existing = db.calendarSync[user.id] || {};
  const refreshToken = tokens.refresh_token || openSecret(existing.encryptedRefreshToken);
  if (!refreshToken) throw Object.assign(new Error('GOOGLE_CALENDAR_REFRESH_TOKEN_REQUIRED'), { status: 409 });
  const accessToken = tokens.access_token || openSecret(existing.encryptedAccessToken);
  const expiresIn = Math.max(60, Number(tokens.expires_in || 3600));
  db.calendarSync[user.id] = {
    ...existing,
    connected: true,
    provider: 'google',
    googleSub: cleanText(profile.sub || existing.googleSub, 160),
    googleEmail: cleanEmail(profile.email || existing.googleEmail || user.email),
    encryptedRefreshToken: sealSecret(refreshToken),
    encryptedAccessToken: accessToken ? sealSecret(accessToken) : existing.encryptedAccessToken || '',
    accessTokenExpiresAt: accessToken ? new Date(Date.now() + Math.max(60, expiresIn - 60) * 1000).toISOString() : existing.accessTokenExpiresAt || null,
    grantedScope: cleanText(tokens.scope || existing.grantedScope || GOOGLE_CALENDAR_SCOPE, 1000),
    tokenType: cleanText(tokens.token_type || existing.tokenType || 'Bearer', 40),
    connectedAt: existing.connectedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastError: null
  };
  persistNow({ throwOnError: true });
  audit('google-calendar-connected', user.id, { emailHash: safeHash(db.calendarSync[user.id].googleEmail, 'google-calendar-email').slice(0, 16) });
  return db.calendarSync[user.id];
}
async function refreshGoogleAccessToken(user, { force = false } = {}) {
  const sync = db.calendarSync[user.id] || {};
  const cached = openSecret(sync.encryptedAccessToken);
  const expiresAt = parseTime(sync.accessTokenExpiresAt || 0) || 0;
  if (!force && cached && expiresAt > Date.now() + 30_000) return cached;
  const refreshToken = openSecret(sync.encryptedRefreshToken);
  if (!refreshToken) throw Object.assign(new Error('GOOGLE_CALENDAR_NOT_CONNECTED'), { status: 409 });
  const form = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  try {
    const tokens = await httpsRequestJson('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }
    }, form.toString());
    if (!tokens.access_token) throw Object.assign(new Error('GOOGLE_TOKEN_REFRESH_FAILED'), { status: 502 });
    sync.encryptedAccessToken = sealSecret(tokens.access_token);
    sync.accessTokenExpiresAt = new Date(Date.now() + Math.max(60, Number(tokens.expires_in || 3600) - 60) * 1000).toISOString();
    sync.updatedAt = new Date().toISOString();
    sync.lastError = null;
    db.calendarSync[user.id] = sync;
    persistSoon();
    return tokens.access_token;
  } catch (error) {
    sync.lastError = 'GOOGLE_TOKEN_REFRESH_FAILED';
    sync.updatedAt = new Date().toISOString();
    if (error?.data?.error === 'invalid_grant') sync.connected = false;
    db.calendarSync[user.id] = sync;
    persistSoon();
    throw Object.assign(new Error(error?.data?.error === 'invalid_grant' ? 'GOOGLE_CALENDAR_RECONNECT_REQUIRED' : 'GOOGLE_TOKEN_REFRESH_FAILED'), { status: error?.data?.error === 'invalid_grant' ? 409 : 502, cause: error });
  }
}
async function googleCalendarRequest(user, pathname, { method = 'GET', query = null, body = undefined } = {}, retry = true) {
  const accessToken = await refreshGoogleAccessToken(user);
  const url = new URL(`${GOOGLE_CALENDAR_API}${pathname}`);
  if (query) for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.append(key, String(value));
  }
  const payload = body === undefined ? '' : JSON.stringify(body);
  const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${accessToken}` };
  if (payload) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(payload);
  }
  try {
    return await httpsRequestJson(url.toString(), { method, headers }, payload);
  } catch (error) {
    if (retry && error?.providerStatus === 401) {
      await refreshGoogleAccessToken(user, { force: true });
      return googleCalendarRequest(user, pathname, { method, query, body }, false);
    }
    throw error;
  }
}
function googleCalendarPath(eventId = '') {
  const calendar = encodeURIComponent(GOOGLE_CALENDAR_ID);
  return `/calendars/${calendar}/events${eventId ? `/${encodeURIComponent(eventId)}` : ''}`;
}
function googlePrivateUserHash(user) { return safeHash(user.id, 'google-calendar-user').slice(0, 24); }
function googleEventPayload(user, event) {
  const reminderMinutes = Number.isFinite(Number(event.reminderMinutes)) ? Math.max(0, Math.min(10080, Number(event.reminderMinutes))) : null;
  const zone = cleanTimezone(event.timezone);
  const timing = event.allDay === true
    ? { start: { date: cleanDate(event.date) }, end: { date: cleanDate(event.endDate) || timezone.addDays(cleanDate(event.date), 1) } }
    : {
        start: { dateTime: cleanIsoLike(event.startTime) || deriveStartTime(event.date, event.time, zone), timeZone: zone },
        end: { dateTime: cleanIsoLike(event.endTime) || new Date(eventEndMs(event)).toISOString(), timeZone: zone }
      };
  if (!timing.start.date && !timing.start.dateTime) throw Object.assign(new Error('INVALID_CALENDAR_START'), { status: 400 });
  return {
    summary: cleanText(event.title, 140) || 'Bawsala study event',
    description: cleanText(event.description || event.notes, 2000),
    ...timing,
    reminders: reminderMinutes === null ? { useDefault: false, overrides: [] } : { useDefault: false, overrides: [{ method: 'popup', minutes: reminderMinutes }] },
    extendedProperties: { private: { bawsalaManaged: 'true', bawsalaUserHash: googlePrivateUserHash(user), bawsalaEventId: cleanId(event.id) } }
  };
}
function localEventFromGoogle(remote, existing = null) {
  const privateProps = remote?.extendedProperties?.private || {};
  const allDay = !!remote?.start?.date;
  const zone = cleanTimezone(remote?.start?.timeZone || remote?.end?.timeZone || existing?.timezone);
  let startTime = '', endTime = '', date = '', time = '', endDate = '';
  if (allDay) {
    date = cleanDate(remote?.start?.date);
    endDate = cleanDate(remote?.end?.date) || timezone.addDays(date, 1);
    const startMs = timezone.wallTimeToInstant(date, '00:00:00', zone);
    const endMs = timezone.wallTimeToInstant(endDate, '00:00:00', zone);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return existing;
    startTime = new Date(startMs).toISOString();
    endTime = new Date(endMs).toISOString();
  } else {
    startTime = cleanIsoLike(remote?.start?.dateTime);
    endTime = cleanIsoLike(remote?.end?.dateTime);
    if (!startTime || !endTime) return existing;
    const wall = timezone.instantToWallTime(parseTime(startTime), zone);
    date = wall?.date || '';
    time = wall?.time || '';
  }
  if (!startTime || !endTime || !date) return existing;
  const override = Array.isArray(remote?.reminders?.overrides) ? remote.reminders.overrides.find(item => item?.method === 'popup') : null;
  const normalized = normalizeCalendarEvent({
    id: cleanId(privateProps.bawsalaEventId) || existing?.id || newId('cal'),
    title: cleanText(remote.summary, 140) || existing?.title || 'حدث Google Calendar',
    description: cleanText(remote.description, 2000),
    notes: cleanText(remote.description, 2000),
    startTime,
    endTime,
    date,
    time,
    allDay,
    endDate: allDay ? endDate : undefined,
    timezone: zone,
    type: existing?.type || 'task',
    track: existing?.track || 'all',
    subject: existing?.subject || 'Google Calendar',
    reminderMinutes: Number.isFinite(Number(override?.minutes)) ? Number(override.minutes) : undefined,
    reminder: override ? legacyReminderFromMinutes(override.minutes) : 'none',
    googleEventId: cleanText(remote.id, 160),
    googleEtag: cleanText(remote.etag, 240),
    googleUpdatedAt: cleanIsoLike(remote.updated),
    externalProvider: 'google',
    externalSyncStatus: 'synced'
  }, existing);
  if (!normalized) return existing;
  normalized.updatedAt = cleanIsoLike(remote.updated) || normalized.updatedAt;
  normalized.googleUpdatedAt = cleanIsoLike(remote.updated) || undefined;
  normalized.googleEtag = cleanText(remote.etag, 240) || undefined;
  return normalized;
}
async function listManagedGoogleEvents(user) {
  const items = [];
  let pageToken = '';
  const timeMin = new Date(Date.now() - GOOGLE_SYNC_PAST_DAYS * 86400000).toISOString();
  const timeMax = new Date(Date.now() + GOOGLE_SYNC_FUTURE_DAYS * 86400000).toISOString();
  do {
    const data = await googleCalendarRequest(user, googleCalendarPath(), {
      query: {
        singleEvents: 'true',
        showDeleted: 'true',
        maxResults: '2500',
        timeMin,
        timeMax,
        privateExtendedProperty: 'bawsalaManaged=true',
        pageToken
      }
    });
    if (Array.isArray(data.items)) items.push(...data.items.slice(0, CALENDAR_MAX_EVENTS - items.length));
    pageToken = cleanText(data.nextPageToken, 500);
  } while (pageToken && items.length < CALENDAR_MAX_EVENTS);
  return items;
}
async function upsertGoogleEvent(user, event) {
  const payload = googleEventPayload(user, event);
  if (event.googleEventId) {
    try {
      return await googleCalendarRequest(user, googleCalendarPath(event.googleEventId), { method: 'PATCH', body: payload });
    } catch (error) {
      if (error?.providerStatus !== 404 && error?.providerStatus !== 410) throw error;
    }
  }
  return googleCalendarRequest(user, googleCalendarPath(), { method: 'POST', body: payload });
}
async function deleteGoogleEvent(user, eventId) {
  if (!eventId) return false;
  try {
    await googleCalendarRequest(user, googleCalendarPath(eventId), { method: 'DELETE' });
    return true;
  } catch (error) {
    if ([404, 410].includes(error?.providerStatus)) return true;
    throw error;
  }
}
async function syncGoogleCalendar(user, { direction = 'two-way' } = {}) {
  const status = googleCalendarStatusForUser(user);
  if (!status.configured) throw Object.assign(new Error('GOOGLE_CALENDAR_NOT_CONFIGURED'), { status: 503 });
  if (!status.connected) throw Object.assign(new Error('GOOGLE_CALENDAR_NOT_CONNECTED'), { status: 409 });
  if (!['two-way', 'push', 'pull'].includes(direction)) throw Object.assign(new Error('GOOGLE_CALENDAR_DIRECTION_INVALID'), { status: 400 });
  const sync = db.calendarSync[user.id] || {};
  sync.lastAttemptAt = new Date().toISOString();
  sync.lastError = null;
  db.calendarSync[user.id] = sync;
  persistSoon();

  const stats = { direction, pulled: 0, pushed: 0, deleted: 0, conflictsResolved: 0, unchanged: 0 };
  try {
    let local = calendarEventsForUser(user.id, true).map(item => ({ ...item }));
    let remote = [];
    if (direction !== 'push') remote = await listManagedGoogleEvents(user);
    const localById = new Map(local.map(item => [cleanId(item.id), item]));
    const localByGoogleId = new Map(local.filter(item => item.googleEventId).map(item => [String(item.googleEventId), item]));
    const remoteByLocalId = new Map();
    const remoteByGoogleId = new Map();

    for (const item of remote) {
      const privateProps = item?.extendedProperties?.private || {};
      const localId = cleanId(privateProps.bawsalaEventId);
      if (localId) remoteByLocalId.set(localId, item);
      if (item?.id) remoteByGoogleId.set(String(item.id), item);
      const current = (localId && localById.get(localId)) || localByGoogleId.get(String(item?.id || ''));
      if (item?.status === 'cancelled') {
        if (current && current._deleted !== true) {
          const now = cleanIsoLike(item.updated) || new Date().toISOString();
          Object.assign(current, { _deleted: true, deletedAt: now, updatedAt: now, googleUpdatedAt: now, externalSyncStatus: 'deleted-remote' });
          stats.pulled += 1;
        }
        continue;
      }
      const remoteUpdated = parseTime(item.updated || 0) || 0;
      const localUpdated = parseTime(current?.updatedAt || 0) || 0;
      if (!current || remoteUpdated > localUpdated + 1000) {
        const next = localEventFromGoogle(item, current || null);
        if (next) {
          if (current) Object.assign(current, next);
          else { local.push(next); localById.set(cleanId(next.id), next); }
          stats.pulled += 1;
          if (current) stats.conflictsResolved += 1;
        }
      }
    }

    if (direction !== 'pull') {
      for (const event of local) {
        if (event._deleted === true) {
          if (event.googleEventId && await deleteGoogleEvent(user, event.googleEventId)) stats.deleted += 1;
          continue;
        }
        const remoteEvent = remoteByLocalId.get(cleanId(event.id)) || (event.googleEventId ? remoteByGoogleId.get(String(event.googleEventId)) : null);
        const remoteUpdated = parseTime(remoteEvent?.updated || event.googleUpdatedAt || 0) || 0;
        const localUpdated = parseTime(event.updatedAt || event.createdAt || 0) || 0;
        if (remoteEvent && remoteUpdated > localUpdated + 1000) { stats.unchanged += 1; continue; }
        if (remoteEvent && Math.abs(remoteUpdated - localUpdated) <= 1000 && event.externalSyncStatus === 'synced') { stats.unchanged += 1; continue; }
        const saved = await upsertGoogleEvent(user, event);
        event.googleEventId = cleanText(saved.id, 160) || event.googleEventId;
        event.googleEtag = cleanText(saved.etag, 240) || undefined;
        event.googleUpdatedAt = cleanIsoLike(saved.updated) || new Date().toISOString();
        event.externalProvider = 'google';
        event.externalSyncStatus = 'synced';
        stats.pushed += 1;
      }
    }

    persistCalendarEvents(user.id, local.slice(0, CALENDAR_MAX_EVENTS));
    sync.lastSyncAt = new Date().toISOString();
    sync.lastResult = stats;
    sync.lastError = null;
    sync.updatedAt = sync.lastSyncAt;
    db.calendarSync[user.id] = sync;
    persistNow({ throwOnError: true });
    audit('google-calendar-synced', user.id, stats);
    return { events: calendarEventsForUser(user.id), stats, status: googleCalendarStatusForUser(user) };
  } catch (error) {
    sync.lastError = cleanText(error.message || 'GOOGLE_CALENDAR_SYNC_FAILED', 120);
    sync.updatedAt = new Date().toISOString();
    db.calendarSync[user.id] = sync;
    persistSoon();
    audit('google-calendar-sync-failed', user.id, { code: sync.lastError, providerStatus: error?.providerStatus || null });
    throw error;
  }
}
async function disconnectGoogleCalendar(user) {
  const sync = db.calendarSync[user.id] || {};
  const token = openSecret(sync.encryptedRefreshToken) || openSecret(sync.encryptedAccessToken);
  if (token) {
    const form = new URLSearchParams({ token }).toString();
    outboundRequest('https://oauth2.googleapis.com/revoke', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form) },
      body: form,
      timeoutMs: 6000,
      maxBytes: 64 * 1024
    }).catch(() => null);
  }
  delete db.calendarSync[user.id];
  persistNow({ throwOnError: true });
  audit('google-calendar-disconnected', user.id);
  return googleCalendarStatusForUser(user);
}
function pendingGoogleFromRequest(req) {
  const token = parseCookies(req).bawsala_google_pending;
  if (!validTokenShape(token)) return null;
  const hash = sha256(token);
  const pending = db.oauthPending?.[hash];
  if (!pending) return null;
  if (parseTime(pending.expiresAt || 0) < Date.now()) {
    delete db.oauthPending[hash];
    persistSoon();
    return null;
  }
  return { token, hash, pending };
}
function publicGooglePending(req) {
  const found = pendingGoogleFromRequest(req);
  if (!found) return null;
  return {
    name: found.pending.name || '',
    email: found.pending.email || '',
    provider: 'google',
    requiresProfileCompletion: true,
    expiresAt: found.pending.expiresAt || null
  };
}
function cleanupOauthPending() {
  const now = Date.now();
  for (const [hash, pending] of Object.entries(db.oauthPending || {})) {
    if (parseTime(pending.expiresAt || 0) < now) delete db.oauthPending[hash];
  }
}
function consumeGooglePending(req, res) {
  const found = pendingGoogleFromRequest(req);
  if (!found) throw Object.assign(new Error('GOOGLE_PROFILE_PENDING_NOT_FOUND'), { status: 401 });
  delete db.oauthPending[found.hash];
  clearCookie(res, 'bawsala_google_pending');
  persistSoon();
  return found.pending;
}
function safeHexEqual(left, right) {
  if (!/^[a-f0-9]+$/i.test(String(left || '')) || !/^[a-f0-9]+$/i.test(String(right || ''))) return false;
  const a = Buffer.from(String(left), 'hex');
  const b = Buffer.from(String(right), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyWebhookSignature(req, rawBody) {
  if (!PAYMENT_WEBHOOK_SECRET) return false;
  if (PAYMENT_PROVIDER === 'stripe') {
    const header = String(req.headers['stripe-signature'] || '');
    const parts = header.split(',').map(part => part.trim()).filter(Boolean);
    const timestamp = Number(parts.find(part => part.startsWith('t='))?.slice(2) || 0);
    const signatures = parts.filter(part => part.startsWith('v1=')).map(part => part.slice(3));
    if (!timestamp || !signatures.length || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > STRIPE_WEBHOOK_TOLERANCE_SECONDS) return false;
    const expected = crypto.createHmac('sha256', PAYMENT_WEBHOOK_SECRET).update(`${timestamp}.${rawBody}`).digest('hex');
    return signatures.some(signature => safeHexEqual(signature, expected));
  }
  const timestamp = Number(req.headers['x-bawsala-timestamp'] || 0);
  const eventId = cleanText(req.headers['x-bawsala-event-id'] || '', 160);
  const signature = String(req.headers['x-bawsala-signature'] || '');
  if (!timestamp || !eventId || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > PAYMENT_WEBHOOK_TOLERANCE_SECONDS) return false;
  const expected = crypto.createHmac('sha256', PAYMENT_WEBHOOK_SECRET).update(`${timestamp}.${eventId}.${rawBody}`).digest('hex');
  return safeHexEqual(signature, expected);
}
function unixIso(value) {
  const number = Number(value || 0);
  return number > 0 ? new Date(number * 1000).toISOString() : '';
}

function stripeMetadata(object) {
  const candidates = [
    object?.metadata,
    object?.subscription_details?.metadata,
    object?.parent?.subscription_details?.metadata,
    object?.lines?.data?.[0]?.metadata
  ];
  return candidates.find(value => value && typeof value === 'object' && Object.keys(value).length) || {};
}

function stripeObjectId(value) {
  if (typeof value === 'string') return cleanText(value, 160);
  if (value && typeof value === 'object') return cleanText(value.id || '', 160);
  return '';
}

function normalizeBillingWebhook(body) {
  if (PAYMENT_PROVIDER !== 'stripe') return body;
  const object = body?.data?.object || {};
  const metadata = stripeMetadata(object);
  const objectType = cleanText(object.object || '', 40);
  const providerSessionId = objectType === 'checkout.session' ? stripeObjectId(object.id) : '';
  const localSession = Object.values(db.checkoutSessions || {}).find(session =>
    session.providerSessionId === providerSessionId || session.id === cleanId(object.client_reference_id)
  );
  const customerId = stripeObjectId(object.customer);
  const subscriptionId = stripeObjectId(
    object.subscription ||
    object.parent?.subscription_details?.subscription ||
    object.subscription_details?.subscription ||
    (objectType === 'subscription' ? object.id : '')
  );
  const linkedUser = Object.values(db.users || {}).find(user =>
    (subscriptionId && user.subscription?.providerSubscriptionId === subscriptionId) ||
    (customerId && user.subscription?.providerCustomerId === customerId)
  );
  const line = object.lines?.data?.[0] || {};
  const priceId = stripeObjectId(line.price || object.line_items?.data?.[0]?.price || object.items?.data?.[0]?.price);
  const periodStart = unixIso(line.period?.start || object.current_period_start || object.period_start);
  const periodEnd = unixIso(line.period?.end || object.current_period_end || object.period_end);
  return {
    id: cleanText(body.id, 160),
    type: cleanText(body.type, 100),
    provider: 'stripe',
    userId: cleanId(metadata.userId || localSession?.userId || linkedUser?.id),
    planId: cleanText(metadata.planId || localSession?.planId || linkedUser?.subscription?.plan, 40),
    checkoutSessionId: cleanId(metadata.checkoutSessionId || object.client_reference_id || localSession?.id),
    customerId,
    subscriptionId,
    providerInvoiceId: cleanText(objectType === 'invoice' ? object.id : '', 160),
    invoiceId: cleanText(objectType === 'invoice' ? object.id : '', 160),
    number: cleanText(object.number || '', 80),
    amountMinor: Number(object.amount_paid ?? object.amount_due ?? object.amount_total ?? 0),
    amountCents: Number(object.amount_paid ?? object.amount_due ?? object.amount_total ?? 0),
    priceId,
    livemode: body?.livemode === true,
    account: cleanText(body?.account || '', 160),
    currency: cleanText(String(object.currency || BILLING_CURRENCY).toUpperCase(), 12),
    invoiceStatus: cleanText(object.status || '', 40),
    periodStart,
    periodEnd,
    renewal: periodEnd,
    cancelAtPeriodEnd: object.cancel_at_period_end === true,
    hostedInvoiceUrl: cleanText(object.hosted_invoice_url || '', 500),
    receiptUrl: cleanText(object.invoice_pdf || '', 500),
    status: cleanText(object.status || '', 40),
    paymentStatus: cleanText(object.payment_status || '', 40),
    metadata
  };
}

function webhookRecordKey(provider, eventId) { return sha256(`billing-webhook|${provider}|${eventId}`); }
function existingWebhookRecord(provider, eventId) { return db.idempotencyRecords?.[webhookRecordKey(provider, eventId)] || null; }
function recordWebhookEvent(provider, eventId, details) {
  const now = Date.now();
  db.idempotencyRecords[webhookRecordKey(provider, eventId)] = { userId: cleanId(details.userId), routeId: 'billing-webhook', provider, eventId, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + 400 * 24 * 60 * 60_000).toISOString(), response: scrub(details) };
}
function validateBillingWebhook(normalized, rawBody, req) {
  const eventId = cleanText(normalized.id || normalized.eventId || req.headers['x-bawsala-event-id'] || '', 160);
  if (!eventId) throw Object.assign(new Error('WEBHOOK_EVENT_ID_REQUIRED'), { status: 400 });
  if (PAYMENT_PROVIDER !== 'stripe' && cleanText(req.headers['x-bawsala-event-id'], 160) !== eventId) throw Object.assign(new Error('WEBHOOK_EVENT_ID_MISMATCH'), { status: 400 });
  const userId = cleanId(normalized.userId || normalized.metadata?.userId);
  const plan = planById(normalized.planId || normalized.metadata?.planId);
  const user = db.users[userId];
  if (!user || !plan || !plan.paid) throw Object.assign(new Error('WEBHOOK_TARGET_NOT_FOUND'), { status: 404 });
  const checkoutId = cleanId(normalized.checkoutSessionId || normalized.metadata?.checkoutSessionId);
  const checkout = checkoutId ? db.checkoutSessions?.[checkoutId] : null;
  if (checkout && (checkout.userId !== userId || checkout.planId !== plan.id)) throw Object.assign(new Error('WEBHOOK_CHECKOUT_OWNERSHIP_MISMATCH'), { status: 400 });
  if (PAYMENT_PROVIDER === 'stripe') {
    const expectedLive = STRIPE_SECRET_KEY.startsWith('sk_live_');
    if (normalized.livemode !== expectedLive) throw Object.assign(new Error('WEBHOOK_LIVEMODE_MISMATCH'), { status: 400 });
    const expectedPrice = STRIPE_PRICE_IDS[plan.id];
    if (normalized.priceId && expectedPrice && normalized.priceId !== expectedPrice) throw Object.assign(new Error('WEBHOOK_PRICE_MISMATCH'), { status: 400 });
    if (normalized.type === 'checkout.session.completed' && !['paid','no_payment_required'].includes(String(normalized.paymentStatus || '').toLowerCase())) throw Object.assign(new Error('WEBHOOK_PAYMENT_NOT_COMPLETE'), { status: 400 });
  }
  const eventType = cleanText(normalized.type, 100);
  const amountRequired = eventType === 'checkout.session.completed' || eventType === 'invoice.paid';
  const expectedAmount = Number(plan.priceMinor ?? plan.priceCents ?? 0);
  const amount = Number(normalized.amountMinor ?? normalized.amountCents ?? 0);
  if (amountRequired && amount !== expectedAmount) throw Object.assign(new Error('WEBHOOK_AMOUNT_MISMATCH'), { status: 400 });
  if (amountRequired && String(normalized.currency || '').toUpperCase() !== String(plan.currency || BILLING_CURRENCY).toUpperCase()) throw Object.assign(new Error('WEBHOOK_CURRENCY_MISMATCH'), { status: 400 });
  return { eventId, userId, user, plan, checkout, rawDigest: sha256(rawBody) };
}

function readRawJson(req, maxBytes = req._bodyLimit || MAX_BODY) {
  assertJsonContentType(req);
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength && contentLength > maxBytes) throw Object.assign(new Error('PAYLOAD_TOO_LARGE'), { status: 413 });
  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = '';
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) { reject(Object.assign(new Error('PAYLOAD_TOO_LARGE'), { status: 413 })); req.destroy(); return; }
      raw += chunk;
    });
    req.on('end', () => {
      try { const body = raw ? JSON.parse(raw) : {}; if (!body || typeof body !== 'object' || Array.isArray(body)) throw Object.assign(new Error('BAD_JSON_ROOT'), { status: 400 }); assertNoDangerousJsonKeys(body); resolve({ raw, body }); }
      catch (err) { reject(err.status ? err : Object.assign(new Error('BAD_JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}


async function handleApi(req, res, url) {
  const method = String(req.method || '').toUpperCase();
  const pathName = url.pathname;
  const contract = apiContract.resolve(pathName, method);
  if (!contract.found) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
  if (!contract.methodAllowed) throw Object.assign(new Error('METHOD_NOT_ALLOWED'), { status: 405, allow: contract.allowed.join(', ') });
  req.routeId = contract.route.id;
  req.routeCategory = contract.route.category;
  req._bodyLimit = bodyLimitForPath(pathName, method);
  // Browser capability negotiation must not consume a business-operation rate bucket.
  if (method === 'OPTIONS') return sendJson(res, 204, {}, { Allow: contract.allowed.join(', ') });
  rateLimit(req, contract.route.category || rateCategoryForPath(pathName));
  assertFetchMetadata(req, pathName, method);
  if (req.headers.origin && !isSameOrigin(req)) throw Object.assign(new Error('BAD_ORIGIN'), { status: 403 });
  if (isUnsafeMethod(method) && !(pathName === '/api/billing/webhook' && method === 'POST')) {
    if (!hasValidCsrf(req)) throw Object.assign(new Error('BAD_CSRF'), { status: 403 });
  }

  if (db.appSettings.maintenance && pathName !== '/api/health' && !pathName.startsWith('/api/auth/') && !pathName.startsWith('/api/admin/')) {
    const user = currentUser(req);
    if (!user || user.role !== 'admin') return sendJson(res, 503, { ok: false, error: 'MAINTENANCE_MODE', message: 'Bawsala is temporarily in maintenance mode.' });
  }

  if (pathName === '/api/health' && method === 'GET') {
    const base = { ok: true, status: 'live', version: APP_VERSION, time: new Date().toISOString() };
    return sendJson(res, 200, healthDetailsAllowed(req) ? { ...base, mode: 'full-stack', maintenance: !!db.appSettings.maintenance, production: isProduction(), ...runtimeHealth() } : base);
  }

  if (pathName === '/api/health/live' && method === 'GET') {
    return sendJson(res, 200, { ok: true, status: 'live', version: APP_VERSION, time: new Date().toISOString() });
  }

  if (pathName === '/api/health/ready' && method === 'GET') {
    const runtime = runtimeHealth();
    const warnings = [];
    if (isProduction() && !process.env.BAWSALA_DATA_DIR) warnings.push('BAWSALA_DATA_DIR_NOT_SET');
    if (!runtime.storageWritable) warnings.push('DATA_DIR_NOT_WRITABLE');
    if (!runtime.integrity?.ok || runtime.integrity?.sqliteOk === false) warnings.push('DATA_INTEGRITY_CHECK_FAILED');
    if (isProduction() && !PUBLIC_BASE_URL) warnings.push(PUBLIC_BASE_URL_RAW ? 'PUBLIC_BASE_URL_INVALID_OR_INSECURE' : 'PUBLIC_BASE_URL_NOT_CONFIGURED');
    if (isProduction() && !mailProviderConfig().configured) warnings.push('MAIL_DELIVERY_NOT_CONFIGURED');
    if (isProduction() && PAYMENT_PROVIDER && PAYMENT_PROVIDER !== 'none' && !billingProviderConfig().configured) warnings.push('PAYMENT_PROVIDER_INCOMPLETE');
    const ready = !!runtime.storage.engine && runtime.storageWritable && runtime.integrity?.ok !== false && runtime.integrity?.sqliteOk !== false && !(isProduction() && (!process.env.BAWSALA_DATA_DIR || !PUBLIC_BASE_URL));
    const base = { ok: ready, status: ready ? 'ready' : 'not-ready', version: APP_VERSION, time: new Date().toISOString() };
    const details = { ...base, ...runtime, dependencies: { mailConfigured: mailProviderConfig().configured, paymentConfigured: billingProviderConfig().configured, googleOAuthConfigured: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI) }, warnings };
    return sendJson(res, ready ? 200 : 503, healthDetailsAllowed(req) ? details : base);
  }

  if (pathName === '/api/health/metrics' && method === 'GET') {
    if (!healthDetailsAllowed(req)) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
    return sendText(res, 200, openMetricsPayload(), 'text/plain; version=0.0.4; charset=utf-8');
  }

  if (pathName === '/api/health/storage' && method === 'GET') {
    if (!healthDetailsAllowed(req)) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
    const runtime = runtimeHealth();
    const healthy = runtime.storageWritable && runtime.integrity?.ok !== false && runtime.integrity?.sqliteOk !== false;
    return sendJson(res, healthy ? 200 : 503, { ok: healthy, status: healthy ? 'writable' : 'not-writable', storage: runtime.storage, integrity: runtime.integrity, dataDirConfigured: runtime.dataDirConfigured, time: new Date().toISOString() });
  }

  if (pathName === '/api/auth/csrf' && method === 'GET') {
    const token = getOrIssueCsrfToken(req, res);
    return sendJson(res, 200, { ok: true, csrfToken: token });
  }

  if (pathName === '/api/auth/signup' && method === 'POST') {
    requirePublicBaseUrl();
    if (DISABLE_PUBLIC_SIGNUPS) throw Object.assign(new Error('SIGNUPS_DISABLED'), { status: 403 });
    const body = await readJson(req);
    const email = cleanEmail(body.email);
    authIdentityLimit(email);
    const name = cleanText(body.name, 120) || 'Student';
    const phone = cleanPhone(body.phone);
    const track = validTrack(body.track) ? body.track : 'academic';
    const specialization = validSpecialization(track, cleanText(body.specialization, 80));
    if (!isValidEmailAddress(email)) throw Object.assign(new Error('INVALID_EMAIL'), { status: 400 });
    if (!validatePassword(body.password, { email, name })) throw Object.assign(new Error('WEAK_PASSWORD'), { status: 400 });
    if (phone && phone.length < 7) throw Object.assign(new Error('INVALID_PHONE'), { status: 400 });
    if (body.ageConfirmed !== true) throw Object.assign(new Error('AGE_CONFIRMATION_REQUIRED'), { status: 400 });
    if (body.nationalId || body.nationalIdNumber) throw Object.assign(new Error('NATIONAL_ID_NOT_COLLECTED'), { status: 400 });
    if (body.privacyAccepted !== true) throw Object.assign(new Error('PRIVACY_REQUIRED'), { status: 400 });
    if (findUserByEmail(email)) throw Object.assign(new Error('ACCOUNT_NOT_AVAILABLE'), { status: 409 });
    signupSuccessLimit(req);
    const { salt, hash, algorithm, peppered } = await hashPassword(body.password);
    const id = newId('user');
    const requestedSetupToken = cleanText(req.headers['x-bawsala-setup-token'], 240);
    const canBootstrapAdmin = userCount() === 0 && ALLOW_DEV_ADMIN_BOOTSTRAP;
    const canTokenAdmin = ALLOW_ADMIN_BOOTSTRAP_HEADER && adminCount() === 0 && SETUP_ADMIN_TOKEN.length >= 32 && networkSecurity.safeEqualSecret(requestedSetupToken, SETUP_ADMIN_TOKEN);
    const role = (canBootstrapAdmin || canTokenAdmin) ? 'admin' : 'student';
    const user = {
      id, name, email, role,
      track,
      specialization,
      phone,
      grade: cleanText(body.grade, 40) || 'tawjihi',
      goal: Math.max(0, Math.min(100, Number(body.goal || 85))),
      language: ['ar', 'en'].includes(body.language) ? body.language : 'ar',
      theme: body.theme === 'light' ? 'light' : 'dark',
      passwordSalt: salt,
      passwordHash: hash,
      passwordAlgorithm: algorithm,
      passwordPeppered: peppered,
      passwordHistory: [{ salt, hash, algorithm, peppered, createdAt: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      privacyAcceptedAt: new Date().toISOString(),
      legalVersion: LEGAL_VERSION,
      emailVerifiedAt: null,
      emailVerification: null,
      subscription: defaultSubscription()
    };
    db.users[id] = user;
    db.snapshots[id] = { keys: {}, updatedAt: new Date().toISOString(), schema: SNAPSHOT_SCHEMA };
    createSession(user, res, req);
    const verification = issueEmailVerification(user, req, { force: true }).payload;
    audit('user-signup', id, { role, emailVerificationRequired: true, legalVersion: LEGAL_VERSION });
    return sendJson(res, 201, { ok: true, user: publicUser(user), verification });
  }


  if (pathName === '/api/auth/verify-email/status' && method === 'GET') {
    const user = requireUser(req);
    return sendJson(res, 200, { ok: true, user: publicUser(user), verification: emailVerificationClientPayload(user, '', req) });
  }

  if (pathName === '/api/auth/verify-email/request' && method === 'POST') {
    requirePublicBaseUrl();
    const user = requireUser(req);
    authIdentityLimit(user.email);
    const verification = issueEmailVerification(user, req).payload;
    return sendJson(res, 200, { ok: true, user: publicUser(user), verification });
  }

  if (pathName === '/api/auth/verify-email/confirm' && method === 'POST') {
    const body = await readJson(req);
    const user = confirmEmailVerificationToken(body.token);
    return sendJson(res, 200, { ok: true, user: publicUser(user) });
  }

  if (pathName === '/api/auth/verify-email/confirm' && method === 'GET') {
    try {
      confirmEmailVerificationToken(url.searchParams.get('token') || '');
      return redirectTo(res, '/pages/signup-success.html?verified=1');
    } catch (err) {
      return redirectTo(res, '/pages/signup-success.html?verified=0&reason=' + encodeURIComponent(err.message || 'verification_failed'));
    }
  }

  if (pathName === '/api/auth/password-reset/request' && method === 'POST') {
    requirePublicBaseUrl();
    const body = await readJson(req);
    const email = cleanEmail(body.email);
    authIdentityLimit(email);
    const reset = issuePasswordReset(email, req);
    return sendJson(res, 200, { ok: true, reset });
  }

  if (pathName === '/api/auth/password-reset/confirm' && method === 'POST') {
    const body = await readJson(req);
    const user = await confirmPasswordResetToken(body.token, body.newPassword);
    return sendJson(res, 200, { ok: true, user: publicUser(user) });
  }

  if (pathName === '/api/auth/login' && method === 'POST') {
    const body = await readJson(req);
    const email = cleanEmail(body.email);
    assertLoginNotLocked(email, req);
    authIdentityLimit(email);
    const user = findUserByEmail(email);
    let passwordOk = false;
    if (user) passwordOk = await verifyPassword(body.password, user);
    else await burnLoginHash(body.password);
    if (!passwordOk) {
      recordLoginFailure(email, req, user || null);
      assertLoginNotLocked(email, req);
      throw Object.assign(new Error('INVALID_LOGIN'), { status: 401 });
    }
    if (user.role === 'admin' && user.mfa?.enabled) {
      if (!body.mfaCode) throw Object.assign(new Error('MFA_REQUIRED'), { status: 401 });
      if (!verifyMfaCredential(user, body.mfaCode)) { recordLoginFailure(email, req, user); throw Object.assign(new Error('INVALID_MFA_CODE'), { status: 401 }); }
    }
    resetLoginFailures(email, req, user);
    createSession(user, res, req, { mfaVerified: user.role === 'admin' && !!user.mfa?.enabled });
    audit('user-login', user.id, { emailVerified: isEmailVerified(user) });
    return sendJson(res, 200, { ok: true, user: publicUser(user) });
  }

  if (pathName === '/api/auth/logout' && method === 'POST') {
    const user = currentUser(req);
    clearSession(req, res);
    if (user) audit('user-logout', user.id);
    return sendJson(res, 200, { ok: true });
  }

  if (pathName === '/api/auth/me' && method === 'GET') {
    const user = currentUser(req);
    const csrfToken = getOrIssueCsrfToken(req, res);
    return sendJson(res, 200, { ok: true, user: publicUser(user), authenticated: !!user, csrfToken });
  }

  if (pathName === '/api/account/mfa' && method === 'GET') {
    const user = requireVerifiedUser(req);
    if (user.role !== 'admin') throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
    return sendJson(res, 200, { ok: true, enabled: !!user.mfa?.enabled, required: !user.mfa?.enabled, confirmedAt: user.mfa?.confirmedAt || null, recoveryCodesRemaining: user.mfa?.recoveryCodeHashes?.length || 0, pending: parseTime(user.mfaPending?.expiresAt || 0) > Date.now() });
  }

  if (pathName === '/api/account/mfa' && method === 'POST') {
    const user = requireVerifiedUser(req);
    if (user.role !== 'admin') throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
    if (!mfaCryptoKey()) throw Object.assign(new Error('MFA_NOT_CONFIGURED'), { status: 503 });
    const secret = base32Encode(crypto.randomBytes(20));
    user.mfaPending = { encryptedSecret: sealMfaSecret(secret), createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() };
    persistSoon(); audit('mfa-setup-started', user.id);
    const label = encodeURIComponent(user.email); const issuer = encodeURIComponent('Bawsala Study OS');
    return sendJson(res, 200, { ok: true, secret, otpauthUrl: `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`, expiresAt: user.mfaPending.expiresAt });
  }

  if (pathName === '/api/account/mfa/confirm' && method === 'POST') {
    const user = requireVerifiedUser(req);
    if (user.role !== 'admin') throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
    const body = await readJson(req); const pending = user.mfaPending;
    if (!pending || parseTime(pending.expiresAt || 0) <= Date.now()) throw Object.assign(new Error('MFA_SETUP_EXPIRED'), { status: 400 });
    const secret = openMfaSecret(pending.encryptedSecret);
    if (!secret || !verifyTotp(secret, body.code)) throw Object.assign(new Error('INVALID_MFA_CODE'), { status: 400 });
    const recovery = issueRecoveryCodes();
    user.mfa = { enabled: true, encryptedSecret: pending.encryptedSecret, confirmedAt: new Date().toISOString(), recoveryCodeHashes: recovery.hashes };
    delete user.mfaPending; const session = sessionForRequest(req); if (session) session.mfaVerifiedAt = new Date().toISOString();
    persistSoon(); audit('mfa-enabled', user.id);
    return sendJson(res, 200, { ok: true, recoveryCodes: recovery.codes, user: publicUser(user) });
  }

  if (pathName === '/api/account/mfa' && method === 'DELETE') {
    const user = requireVerifiedUser(req);
    if (user.role !== 'admin') throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
    const body = await readJson(req);
    if (!await verifyPassword(body.password, user)) throw Object.assign(new Error('INVALID_PASSWORD'), { status: 401 });
    if (!verifyMfaCredential(user, body.code)) throw Object.assign(new Error('INVALID_MFA_CODE'), { status: 401 });
    delete user.mfa; delete user.mfaPending;
    for (const session of Object.values(db.sessions)) if (session.userId === user.id) session.mfaVerifiedAt = null;
    persistSoon(); audit('mfa-disabled', user.id);
    return sendJson(res, 200, { ok: true, user: publicUser(user) });
  }

  if (pathName === '/api/legal/config' && method === 'GET') {
    const legal = legalCommerceConfig();
    return sendJson(res, 200, { ok: true, version: LEGAL_VERSION, commerceEnabled: billingProviderConfig().configured, operator: legal.complete ? { name: legal.entityName, address: legal.entityAddress, jurisdiction: legal.jurisdiction, taxId: legal.taxId, contactEmail: legal.contactEmail, refundPolicyVersion: legal.refundPolicyVersion, refundWindowDays: legal.refundWindowDays } : null });
  }

  if (pathName === '/api/account/legal-consent' && method === 'POST') {
    const user = requireUser(req);
    const body = await readJson(req);
    if (body.accepted !== true || cleanText(body.version, 80) !== LEGAL_VERSION) throw Object.assign(new Error('LEGAL_CONSENT_INVALID'), { status: 400 });
    user.privacyAcceptedAt = new Date().toISOString();
    user.legalVersion = LEGAL_VERSION;
    user.updatedAt = user.privacyAcceptedAt;
    persistSoon();
    audit('legal-consent-accepted', user.id, { legalVersion: LEGAL_VERSION });
    return sendJson(res, 200, { ok: true, user: publicUser(user) });
  }

  if (pathName === '/api/account' && method === 'PATCH') {
    const user = requireUser(req);
    const body = await readJson(req);
    if (body.name !== undefined) user.name = cleanText(body.name, 120) || user.name;
    if (body.track !== undefined) user.track = validTrack(body.track) ? body.track : user.track;
    if (body.specialization !== undefined) user.specialization = validSpecialization(user.track || 'academic', cleanText(body.specialization, 80));
    if (body.phone !== undefined) { const phone = cleanPhone(body.phone); if (phone && phone.length < 7) throw Object.assign(new Error('INVALID_PHONE'), { status: 400 }); user.phone = phone; }
    if (body.grade !== undefined) user.grade = cleanText(body.grade, 40) || user.grade;
    if (body.goal !== undefined) user.goal = Math.max(0, Math.min(100, Number(body.goal || user.goal || 85)));
    if (body.language !== undefined) user.language = ['ar', 'en'].includes(body.language) ? body.language : user.language;
    if (body.theme !== undefined) user.theme = body.theme === 'light' ? 'light' : 'dark';
    user.updatedAt = new Date().toISOString();
    persistSoon();
    audit('account-updated', user.id);
    return sendJson(res, 200, { ok: true, user: publicUser(user) });
  }


  if (pathName === '/api/account/sessions' && method === 'GET') {
    const user = requireUser(req);
    return sendJson(res, 200, { ok: true, sessions: accountSessions(user.id, req) });
  }

  const accountSessionMatch = pathName.match(/^\/api\/account\/sessions\/([^/]+)$/);
  if (accountSessionMatch && method === 'DELETE') {
    const user = requireUser(req);
    const token = sessionToken(req);
    const currentHash = token ? sha256(token) : '';
    const sessionId = cleanId(accountSessionMatch[1]);
    const revoked = revokeSessionByPublicId(user.id, sessionId, currentHash);
    if (!revoked) throw Object.assign(new Error('SESSION_NOT_FOUND_OR_CURRENT'), { status: 404 });
    audit('session-revoked', user.id, { sessionId });
    return sendJson(res, 200, { ok: true, revoked, sessions: accountSessions(user.id, req) });
  }

  if (pathName === '/api/auth/google/config' && method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      enabled: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI),
      clientId: GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.slice(0, 12) + '…' : '',
      scopes: ['openid', 'email', 'profile'],
      requiresProfileCompletion: true,
      note: 'Google can provide name/email/profile only when permitted; phone remains optional and full date of birth is not required.'
    });
  }

  if (pathName === '/api/auth/google/start' && method === 'GET') {
    const authUrl = buildGoogleAuthUrl(res);
    if (!authUrl) return sendJson(res, 200, { ok: true, enabled: false, authUrl: '', message: 'Google OAuth is not configured. Set BAWSALA_GOOGLE_CLIENT_ID, BAWSALA_GOOGLE_CLIENT_SECRET, and BAWSALA_GOOGLE_REDIRECT_URI.' });
    return sendJson(res, 200, { ok: true, enabled: true, authUrl });
  }

  if (pathName === '/api/auth/google/pending' && method === 'GET') {
    return sendJson(res, 200, { ok: true, pending: publicGooglePending(req) });
  }

  if (pathName === '/api/auth/google/complete' && method === 'POST') {
    const body = await readJson(req);
    const pending = consumeGooglePending(req, res);
    const email = cleanEmail(pending.email);
    authIdentityLimit(email);
    const existing = findUserByEmail(email);
    if (existing) {
      existing.providers = { ...(existing.providers || {}), google: { sub: pending.googleSub, emailVerifiedAt: pending.emailVerifiedAt || new Date().toISOString(), linkedAt: new Date().toISOString() } };
      existing.authProvider = existing.authProvider || 'google';
      existing.emailVerifiedAt = existing.emailVerifiedAt || existing.providers?.google?.emailVerifiedAt || new Date().toISOString();
      existing.updatedAt = new Date().toISOString();
      createSession(existing, res, req);
      audit('google-existing-login-after-pending', existing.id);
      return sendJson(res, 200, { ok: true, user: publicUser(existing), existing: true });
    }
    const phone = cleanPhone(body.phone);
    const track = validTrack(body.track) ? body.track : 'academic';
    const specialization = validSpecialization(track, cleanText(body.specialization, 80));
    if (phone && phone.length < 7) throw Object.assign(new Error('INVALID_PHONE'), { status: 400 });
    if (body.ageConfirmed !== true) throw Object.assign(new Error('AGE_CONFIRMATION_REQUIRED'), { status: 400 });
    if (body.nationalId || body.nationalIdNumber) throw Object.assign(new Error('NATIONAL_ID_NOT_COLLECTED'), { status: 400 });
    if (body.privacyAccepted !== true) throw Object.assign(new Error('PRIVACY_REQUIRED'), { status: 400 });
    const id = newId('user');
    const user = {
      id,
      name: cleanText(body.name, 120) || pending.name || 'Student',
      email,
      role: 'student',
      track,
      specialization,
      phone,
      grade: cleanText(body.grade, 40) || 'tawjihi',
      goal: Math.max(0, Math.min(100, Number(body.goal || 85))),
      language: ['ar', 'en'].includes(body.language) ? body.language : 'ar',
      theme: body.theme === 'light' ? 'light' : 'dark',
      authProvider: 'google',
      emailVerifiedAt: pending.emailVerifiedAt || new Date().toISOString(),
      providers: { google: { sub: pending.googleSub, emailVerifiedAt: pending.emailVerifiedAt || new Date().toISOString(), linkedAt: new Date().toISOString() } },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      privacyAcceptedAt: new Date().toISOString(),
      legalVersion: LEGAL_VERSION,
      emailVerification: { provider: 'google', verifiedAt: pending.emailVerifiedAt || new Date().toISOString() },
      subscription: defaultSubscription()
    };
    db.users[id] = user;
    db.snapshots[id] = { keys: {}, updatedAt: new Date().toISOString(), schema: SNAPSHOT_SCHEMA };
    createSession(user, res, req);
    audit('google-user-completed-signup', id, { track, specialization });
    return sendJson(res, 201, { ok: true, user: publicUser(user), existing: false });
  }

  if (pathName === '/api/auth/google/callback' && method === 'GET') {
    let callbackIntent = 'signin';
    const callbackRedirect = (code) => redirectTo(res, callbackIntent.startsWith('calendar:')
      ? `/pages/calendar.html?google=${encodeURIComponent(code)}`
      : `/pages/login.html?auth=${encodeURIComponent(code)}`);
    try {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) return callbackRedirect('google_not_configured');
      const error = cleanText(url.searchParams.get('error') || '', 80);
      const state = cleanText(url.searchParams.get('state') || '', 160);
      const oauthCookies = parseCookies(req);
      callbackIntent = cleanText(oauthCookies.bawsala_google_intent || 'signin', 220) || 'signin';
      const cookieState = String(oauthCookies.bawsala_google_state || '');
      const codeVerifier = String(oauthCookies.bawsala_google_pkce || '');
      clearCookie(res, 'bawsala_google_state');
      clearCookie(res, 'bawsala_google_pkce');
      clearCookie(res, 'bawsala_google_intent');
      if (error) return callbackRedirect('google_denied');
      if (!validTokenShape(state) || !validTokenShape(cookieState) || !validTokenShape(codeVerifier) || state.length !== cookieState.length || !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(cookieState))) {
        audit('google-oauth-state-failed', 'anonymous', { intent: callbackIntent.startsWith('calendar:') ? 'calendar' : 'signin' });
        return callbackRedirect('google_state_failed');
      }
      const code = cleanText(url.searchParams.get('code') || '', 4096);
      if (!code) return callbackRedirect('google_missing_code');
      const tokens = await exchangeGoogleCode(code, codeVerifier);
      if (!tokens.access_token) return callbackRedirect('google_token_failed');
      const profile = await fetchGoogleUserInfo(tokens.access_token);
      const email = cleanEmail(profile.email);
      const emailVerified = profile.email_verified === true || profile.email_verified === 'true';
      const googleSub = cleanText(profile.sub, 160);
      if (!email || !/^\S+@\S+\.\S+$/.test(email) || !emailVerified || !googleSub) {
        audit('google-oauth-profile-rejected', 'anonymous', { emailHash: email ? sha256(email).slice(0, 12) : '', emailVerified: !!emailVerified });
        return callbackRedirect('google_profile_rejected');
      }

      if (callbackIntent.startsWith('calendar:')) {
        const expectedUserId = cleanId(callbackIntent.slice('calendar:'.length));
        const user = currentUser(req);
        if (!user || user.id !== expectedUserId) {
          audit('google-calendar-link-session-mismatch', user?.id || 'anonymous', { expectedUserHash: expectedUserId ? sha256(expectedUserId).slice(0, 12) : '' });
          return callbackRedirect('session_required');
        }
        if (cleanEmail(user.email) !== email) {
          audit('google-calendar-link-email-mismatch', user.id, { googleEmailHash: sha256(email).slice(0, 12) });
          return callbackRedirect('email_mismatch');
        }
        const linkedSub = cleanText(user.providers?.google?.sub, 160);
        if (linkedSub && linkedSub !== googleSub) {
          audit('google-calendar-link-provider-mismatch', user.id);
          return callbackRedirect('provider_mismatch');
        }
        user.providers = { ...(user.providers || {}), google: { sub: googleSub, emailVerifiedAt: user.providers?.google?.emailVerifiedAt || new Date().toISOString(), linkedAt: user.providers?.google?.linkedAt || new Date().toISOString() } };
        user.updatedAt = new Date().toISOString();
        storeGoogleCalendarTokens(user, tokens, profile);
        audit('google-calendar-oauth-complete', user.id);
        return callbackRedirect('connected');
      }

      const existing = findUserByEmail(email);
      if (existing) {
        existing.providers = { ...(existing.providers || {}), google: { sub: googleSub, emailVerifiedAt: existing.providers?.google?.emailVerifiedAt || new Date().toISOString(), linkedAt: existing.providers?.google?.linkedAt || new Date().toISOString() } };
        existing.authProvider = existing.authProvider || 'password';
        existing.emailVerifiedAt = existing.emailVerifiedAt || new Date().toISOString();
        existing.updatedAt = new Date().toISOString();
        createSession(existing, res, req);
        audit('google-login', existing.id);
        return redirectTo(res, '/pages/dashboard.html?auth=google');
      }
      cleanupOauthPending();
      const pendingToken = crypto.randomBytes(32).toString('base64url');
      db.oauthPending[sha256(pendingToken)] = {
        name: cleanText(profile.name, 120),
        email,
        googleSub,
        picture: cleanText(profile.picture, 500),
        emailVerifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + GOOGLE_PENDING_MAX_AGE_MS).toISOString()
      };
      appendSetCookie(res, cookie('bawsala_google_pending', pendingToken, { maxAge: Math.floor(GOOGLE_PENDING_MAX_AGE_MS / 1000), secure: isProduction(), httpOnly: true, sameSite: 'Strict' }));
      persistSoon();
      audit('google-profile-pending-created', 'anonymous', { emailHash: sha256(email).slice(0, 12) });
      return redirectTo(res, '/pages/signup.html?google=complete');
    } catch (err) {
      audit('google-oauth-error', 'anonymous', { error: err.message || 'unknown', intent: callbackIntent.startsWith('calendar:') ? 'calendar' : 'signin' });
      return callbackRedirect('google_failed');
    }
  }

  if (pathName === '/api/integrations/google-calendar/status' && method === 'GET') {
    const user = currentUser(req);
    return sendJson(res, 200, { ok: true, ...googleCalendarStatusForUser(user) });
  }

  if (pathName === '/api/integrations/google-calendar/connect' && method === 'GET') {
    const user = requireVerifiedUser(req);
    const authUrl = buildGoogleAuthUrl(res, { intent: 'calendar', userId: user.id });
    if (!authUrl) throw Object.assign(new Error('GOOGLE_CALENDAR_NOT_CONFIGURED'), { status: 503 });
    audit('google-calendar-connect-started', user.id);
    return sendJson(res, 200, { ok: true, authUrl, status: googleCalendarStatusForUser(user) });
  }

  if (pathName === '/api/integrations/google-calendar/sync' && method === 'POST') {
    const user = requireVerifiedUser(req);
    const leaseName = `google-calendar:${user.id}`;
    if (googleCalendarSyncLocks.has(user.id) || !acquireJobLease(leaseName, 10 * 60_000)) throw Object.assign(new Error('GOOGLE_CALENDAR_SYNC_IN_PROGRESS'), { status: 409 });
    const body = await readJson(req);
    googleCalendarSyncLocks.add(user.id);
    try {
      const result = await syncGoogleCalendar(user, { direction: cleanText(body.direction || 'two-way', 20) });
      return sendJson(res, 200, { ok: true, ...result, revision: safeSnapshotForUser(user.id).revision });
    } finally {
      googleCalendarSyncLocks.delete(user.id);
      releaseJobLease(leaseName);
    }
  }

  if (pathName === '/api/integrations/google-calendar' && method === 'DELETE') {
    const user = requireVerifiedUser(req);
    const status = await disconnectGoogleCalendar(user);
    return sendJson(res, 200, { ok: true, status });
  }

  if (pathName === '/api/calendar/events' && method === 'GET') {
    const user = requireVerifiedUser(req);
    const events = filterCalendarEvents(calendarEventsForUser(user.id).sort(calendarSort), url);
    return sendJson(res, 200, { ok: true, events, revision: safeSnapshotForUser(user.id).revision, sync: publicCalendarSync(user) });
  }

  if (pathName === '/api/calendar/events' && method === 'POST') {
    const user = requireVerifiedUser(req);
    const body = await readJson(req);
    const existing = calendarEventsForUser(user.id, true);
    const event = normalizeCalendarEvent(body);
    const events = persistCalendarEvents(user.id, [event, ...existing].slice(0, CALENDAR_MAX_EVENTS)).sort(calendarSort);
    audit('calendar-event-created', user.id, { eventId: event.id, type: event.type, track: event.track, reminder: event.reminder });
    return sendJson(res, 201, { ok: true, event, events, revision: safeSnapshotForUser(user.id).revision, sync: publicCalendarSync(user) });
  }

  const calendarEventMatch = pathName.match(/^\/api\/calendar\/events\/([^/]+)$/);
  if (calendarEventMatch && method === 'GET') {
    const user = requireVerifiedUser(req);
    const eventId = cleanId(calendarEventMatch[1]);
    const event = calendarEventsForUser(user.id).find(item => cleanId(item.id) === eventId);
    if (!event) throw Object.assign(new Error('CALENDAR_EVENT_NOT_FOUND'), { status: 404 });
    return sendJson(res, 200, { ok: true, event, sync: publicCalendarSync(user) });
  }

  if (calendarEventMatch && method === 'PATCH') {
    const user = requireVerifiedUser(req);
    const eventId = cleanId(calendarEventMatch[1]);
    const body = await readJson(req);
    const existing = calendarEventsForUser(user.id, true);
    const current = existing.find(item => cleanId(item.id) === eventId && item._deleted !== true);
    if (!current) throw Object.assign(new Error('CALENDAR_EVENT_NOT_FOUND'), { status: 404 });
    const updated = normalizeCalendarEvent({ ...body, id: eventId }, current);
    const events = persistCalendarEvents(user.id, existing.map(item => cleanId(item.id) === eventId ? updated : item)).sort(calendarSort);
    audit('calendar-event-updated', user.id, { eventId, type: updated.type, track: updated.track, reminder: updated.reminder });
    return sendJson(res, 200, { ok: true, event: updated, events, revision: safeSnapshotForUser(user.id).revision, sync: publicCalendarSync(user) });
  }

  if (calendarEventMatch && method === 'DELETE') {
    const user = requireVerifiedUser(req);
    const eventId = cleanId(calendarEventMatch[1]);
    const existing = calendarEventsForUser(user.id, true);
    let found = false;
    const now = new Date().toISOString();
    const next = existing.map(item => {
      if (cleanId(item.id) !== eventId || item._deleted === true) return item;
      found = true;
      return { ...item, _deleted: true, deletedAt: now, updatedAt: now };
    });
    if (!found) throw Object.assign(new Error('CALENDAR_EVENT_NOT_FOUND'), { status: 404 });
    const events = persistCalendarEvents(user.id, next).sort(calendarSort);
    audit('calendar-event-deleted', user.id, { eventId });
    return sendJson(res, 200, { ok: true, events, revision: safeSnapshotForUser(user.id).revision, sync: publicCalendarSync(user) });
  }

  if (pathName === '/api/calendar/reminders/dispatch' && method === 'POST') {
    const user = requireVerifiedUser(req);
    await readJson(req);
    const reminders = dispatchCalendarReminders(user);
    return sendJson(res, 200, { ok: true, reminders, dispatched: reminders.length, mailConfigured: mailProviderConfig().configured, outboxSize: db.mailOutbox.length });
  }

  if (pathName === '/api/billing/plans' && method === 'GET') {
    return sendJson(res, 200, { ok: true, plans: BILLING_PLANS, pricing: planPriceMath(), provider: billingProviderConfig() });
  }

  if (pathName === '/api/billing/status' && method === 'GET') {
    const user = requireUser(req);
    if (!user.subscription) user.subscription = defaultSubscription();
    return sendJson(res, 200, { ok: true, authenticated: true, subscription: publicSubscription(user), gates: publicFeatureGates(user), provider: billingProviderConfig(), history: billingHistoryForUser(user.id) });
  }

  if (pathName === '/api/billing/feature-gates' && method === 'GET') {
    const user = requireUser(req);
    return sendJson(res, 200, { ok: true, gates: publicFeatureGates(user), subscription: publicSubscription(user) });
  }

  if (pathName === '/api/billing/invoices' && method === 'GET') {
    const user = requireVerifiedUser(req);
    return sendJson(res, 200, { ok: true, ...billingHistoryForUser(user.id) });
  }

  if (pathName === '/api/billing/checkout' && method === 'POST') {
    const user = requireVerifiedUser(req);
    const body = await readJson(req);
    const key = requireIdempotencyKey(req);
    const fingerprint = idempotencyFingerprint(body);
    const replay = readIdempotencyRecord(user.id, req.routeId, key, fingerprint);
    if (replay?.response) return sendJson(res, 200, replay.response, { 'Idempotency-Replayed': 'true' });
    const plan = planById(body.planId);
    if (!plan || !plan.paid) throw Object.assign(new Error('INVALID_PLAN'), { status: 400 });
    const provider = billingProviderConfig();
    if (!provider.configured) {
      audit('billing-checkout-not-configured', user.id, { plan: plan.id, provider: provider.provider });
      return sendJson(res, 200, { ok: true, configured: false, checkoutUrl: '', provider, pricing: planPriceMath(), message: 'Payment provider is not configured. Add checkout configuration and a signed webhook secret before taking money.' });
    }
    const { session, checkoutUrl } = await createCheckoutSession(user, plan, req);
    persistSoon();
    audit('billing-checkout-created', user.id, { plan: plan.id, provider: session.provider, checkoutSessionId: session.id });
    const response = { ok: true, configured: true, checkoutUrl, provider, checkoutSession: { id: session.id, planId: session.planId, amountCents: session.amountCents, currency: session.currency, expiresAt: session.expiresAt } };
    writeIdempotencyRecord(user.id, req.routeId, key, fingerprint, response);
    return sendJson(res, 200, response);
  }

  if (pathName === '/api/billing/change-plan' && method === 'POST') {
    const user = requireVerifiedUser(req);
    const body = await readJson(req);
    const key = requireIdempotencyKey(req);
    const fingerprint = idempotencyFingerprint(body);
    const replay = readIdempotencyRecord(user.id, req.routeId, key, fingerprint);
    if (replay?.response) return sendJson(res, 200, replay.response, { 'Idempotency-Replayed': 'true' });
    const plan = planById(body.planId);
    if (!plan || !plan.paid) throw Object.assign(new Error('INVALID_PLAN'), { status: 400 });
    const current = publicSubscription(user);
    if (current.plan === plan.id && ['active','canceling'].includes(current.status)) throw Object.assign(new Error('PLAN_ALREADY_ACTIVE'), { status: 409 });
    const provider = billingProviderConfig();
    if (provider.provider === 'stripe' && provider.configured) {
      const portalUrl = await createBillingPortalSession(user, req);
      const response = { ok: true, configured: true, requiresPortal: true, portalUrl, subscription: publicSubscription(user), message: 'Complete the plan change in the Stripe billing portal. Local access changes only after a signed webhook.' };
      audit('billing-plan-change-portal-issued', user.id, { from: current.plan, to: plan.id });
      writeIdempotencyRecord(user.id, req.routeId, key, fingerprint, response);
      return sendJson(res, 200, response);
    }
    user.subscription = { ...(user.subscription || defaultSubscription()), pendingPlanChange: { planId: plan.id, requestedAt: new Date().toISOString(), prorationHandledBy: provider.configured ? provider.provider : 'not-configured' }, updatedAt: new Date().toISOString() };
    persistSoon();
    audit('billing-plan-change-requested', user.id, { from: current.plan, to: plan.id, configured: provider.configured });
    const response = provider.configured
      ? { ok: true, configured: true, subscription: publicSubscription(user), message: 'Plan change requested. Access changes only after a signed provider webhook confirms it.' }
      : { ok: true, configured: false, subscription: publicSubscription(user), message: 'Plan change recorded as pending only. Real proration must be performed by the payment provider webhook.' };
    writeIdempotencyRecord(user.id, req.routeId, key, fingerprint, response);
    return sendJson(res, 200, response);
  }

  if (pathName === '/api/billing/portal' && method === 'POST') {
    const user = requireVerifiedUser(req);
    const body = await readJson(req);
    const key = requireIdempotencyKey(req);
    const fingerprint = idempotencyFingerprint(body);
    const replay = readIdempotencyRecord(user.id, req.routeId, key, fingerprint);
    if (replay?.response) return sendJson(res, 200, replay.response, { 'Idempotency-Replayed': 'true' });
    const provider = billingProviderConfig();
    let response;
    if (!provider.portalConfigured) response = { ok: true, configured: false, portalUrl: '', provider, message: 'Billing portal is not configured.' };
    else {
      const portalUrl = await createBillingPortalSession(user, req);
      response = { ok: true, configured: true, portalUrl, provider };
    }
    writeIdempotencyRecord(user.id, req.routeId, key, fingerprint, response);
    return sendJson(res, 200, response);
  }

  if (pathName === '/api/billing/cancel' && method === 'POST') {
    const user = requireVerifiedUser(req);
    const body = await readJson(req);
    const key = requireIdempotencyKey(req);
    const fingerprint = idempotencyFingerprint(body);
    const replay = readIdempotencyRecord(user.id, req.routeId, key, fingerprint);
    if (replay?.response) return sendJson(res, 200, replay.response, { 'Idempotency-Replayed': 'true' });
    const sub = user.subscription || defaultSubscription();
    if (!sub.plan || sub.plan === 'free') throw Object.assign(new Error('NO_PAID_SUBSCRIPTION'), { status: 409 });
    const provider = billingProviderConfig();
    if (provider.provider === 'stripe' && provider.configured) {
      const portalUrl = await createBillingPortalSession(user, req);
      const response = { ok: true, configured: true, requiresPortal: true, portalUrl, subscription: publicSubscription(user), message: 'Complete cancellation in the Stripe billing portal. Local access changes only after a signed webhook.' };
      audit('billing-cancel-portal-issued', user.id, { plan: sub.plan, reason: cleanText(body.reason || '', 120) });
      writeIdempotencyRecord(user.id, req.routeId, key, fingerprint, response);
      return sendJson(res, 200, response);
    }
    user.subscription = { ...sub, cancelAtPeriodEnd: true, status: sub.status === 'active' ? 'canceling' : (sub.status || 'free'), cancellationRequestedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    persistSoon();
    audit('billing-cancel-requested', user.id, { plan: user.subscription.plan, provider: provider.provider, configured: provider.configured, reason: cleanText(body.reason || '', 120) });
    const response = { ok: true, configured: provider.configured, subscription: publicSubscription(user), message: provider.configured ? 'Cancellation request stored locally. Provider cancellation must be confirmed by webhook or billing portal.' : 'Cancellation recorded locally only. No provider is configured.' };
    writeIdempotencyRecord(user.id, req.routeId, key, fingerprint, response);
    return sendJson(res, 200, response);
  }

  if (pathName === '/api/billing/webhook' && method === 'POST') {
    const { raw, body } = await readRawJson(req);
    if (!verifyWebhookSignature(req, raw)) throw Object.assign(new Error('BAD_WEBHOOK_SIGNATURE'), { status: 401 });
    const normalized = normalizeBillingWebhook(body);
    const checked = validateBillingWebhook(normalized, raw, req);
    if (existingWebhookRecord(PAYMENT_PROVIDER || cleanText(normalized.provider, 40) || 'external', checked.eventId)) return sendJson(res, 200, { ok: true, idempotent: true });
    const action = applyBillingWebhook(checked.user, checked.plan, normalized);
    const provider = PAYMENT_PROVIDER || cleanText(normalized.provider, 40) || 'external';
    recordWebhookEvent(provider, checked.eventId, { userId: checked.userId, type: cleanText(normalized.type, 80), plan: checked.plan.id, action, rawDigest: checked.rawDigest });
    db.paymentEvents.unshift({ id: checked.eventId, at: new Date().toISOString(), userId: checked.userId, type: cleanText(normalized.type, 80), plan: checked.plan.id, action, provider });
    persistNow();
    audit('billing-webhook-applied', checked.user.id, { eventId: checked.eventId, type: normalized.type, plan: checked.plan.id, action });
    return sendJson(res, 200, { ok: true, action, subscription: publicSubscription(checked.user) });
  }

  if (pathName === '/api/account/export' && method === 'GET') {
    const user = requireVerifiedUser(req);
    const snap = safeSnapshotForUser(user.id);
    audit('account-exported', user.id, { keys: Object.keys(snap.keys || {}).length });
    return sendJson(res, 200, {
      ok: true,
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      user: publicUser(user),
      snapshot: snap
    });
  }
  if (pathName === '/api/account/sessions/revoke' && method === 'POST') {
    const user = requireUser(req);
    const body = await readJson(req);
    const sessionId = cleanId(body.sessionId);
    const currentToken = sessionToken(req);
    const currentHash = currentToken ? sha256(currentToken) : '';
    let revoked = false;
    for (const [hash, sess] of Object.entries(db.sessions)) {
      const id = sess.id || hash.slice(0, 16);
      if (sess.userId === user.id && id === sessionId && hash !== currentHash) { delete db.sessions[hash]; revoked = true; }
    }
    if (!revoked) throw Object.assign(new Error('SESSION_NOT_FOUND'), { status: 404 });
    persistSoon();
    audit('session-revoked', user.id, { sessionId });
    return sendJson(res, 200, { ok: true });
  }

  if (pathName === '/api/account/security-log' && method === 'GET') {
    const user = requireUser(req);
    return sendJson(res, 200, { ok: true, events: publicSecurityLog(user.id) });
  }

  if (pathName === '/api/account' && method === 'DELETE') {
    const user = requireUser(req);
    const body = await readJson(req);
    if (user.passwordHash) {
      if (!(await verifyPassword(body.password, user))) throw Object.assign(new Error('INVALID_PASSWORD'), { status: 401 });
    } else if (cleanEmail(body.confirmEmail) !== user.email) {
      throw Object.assign(new Error('EMAIL_CONFIRMATION_REQUIRED'), { status: 401 });
    }
    if (user.role === 'admin' && adminCount() <= 1) throw Object.assign(new Error('LAST_ADMIN_REQUIRED'), { status: 409 });
    const deletedRef = `deleted_${safeHash(user.id, 'account-deletion').slice(0, 16)}`;
    for (const [sid, sess] of Object.entries(db.sessions || {})) if (sess.userId === user.id) delete db.sessions[sid];
    for (const [hash, token] of Object.entries(db.emailVerificationTokens || {})) if (token?.userId === user.id) delete db.emailVerificationTokens[hash];
    for (const [hash, token] of Object.entries(db.passwordResetTokens || {})) if (token?.userId === user.id) delete db.passwordResetTokens[hash];
    for (const [hash, pending] of Object.entries(db.oauthPending || {})) if (pending?.userId === user.id || cleanEmail(pending?.email) === user.email) delete db.oauthPending[hash];
    for (const [key, record] of Object.entries(db.idempotencyRecords || {})) if (record?.userId === user.id) delete db.idempotencyRecords[key];
    for (const [id, checkout] of Object.entries(db.checkoutSessions || {})) if (checkout?.userId === user.id) delete db.checkoutSessions[id];
    for (const [id, ticket] of Object.entries(db.supportTickets || {})) if (ticket?.userId === user.id) delete db.supportTickets[id];
    db.mailOutbox = (db.mailOutbox || []).filter(item => item?.userId !== user.id && cleanEmail(item?.to) !== user.email);
    db.paymentEvents = (db.paymentEvents || []).map(event => event?.userId === user.id ? { ...event, userId: deletedRef } : event);
    for (const invoice of Object.values(db.invoices || {})) if (invoice?.userId === user.id) invoice.userId = deletedRef;
    db.audit = (db.audit || []).map(event => event?.actor === user.id ? { ...event, actor: deletedRef } : event);
    db.securityEvents = (db.securityEvents || []).map(event => event?.actor === user.id ? { ...event, actor: deletedRef } : event);
    delete db.authFailures[authFailureKey(user.email)];
    delete db.calendarSync[user.id];
    delete db.snapshots[user.id];
    delete db.users[user.id];
    clearSession(req, res);
    db.audit.unshift({ at: new Date().toISOString(), type: 'account-deleted', actor: deletedRef, details: { retainedBillingRecords: true } });
    persistNow({ throwOnError: true });
    return sendJson(res, 200, { ok: true, localDataShouldBeCleared: true });
  }

  if (pathName === '/api/account/password' && method === 'POST') {
    const user = requireUser(req);
    const body = await readJson(req);
    if (user.passwordHash && !(await verifyPassword(body.currentPassword, user))) throw Object.assign(new Error('INVALID_PASSWORD'), { status: 401 });
    if (!validatePassword(body.newPassword, { email: user.email, name: user.name })) throw Object.assign(new Error('WEAK_PASSWORD'), { status: 400 });
    if (await isPasswordReused(user, body.newPassword)) throw Object.assign(new Error('PASSWORD_REUSED'), { status: 400 });
    const { salt, hash, algorithm, peppered } = await hashPassword(body.newPassword);
    user.passwordSalt = salt;
    user.passwordHash = hash;
    user.passwordAlgorithm = algorithm;
    user.passwordPeppered = peppered;
    rememberPassword(user, salt, hash, algorithm, peppered);
    user.updatedAt = new Date().toISOString();
    // revoke other sessions
    const token = sessionToken(req);
    const currentHash = token ? sha256(token) : '';
    revokeUserSessions(user.id, currentHash);
    resetLoginFailures(user.email, req, user);
    persistSoon();
    audit('password-changed', user.id);
    return sendJson(res, 200, { ok: true });
  }

  function expectedRevision(request, body = {}) {
    const rawHeader = String(request.headers['if-match'] || '').trim().replace(/^W\//, '').replace(/^"|"$/g, '');
    return cleanText(body.baseRevision || rawHeader, 120);
  }

  if (pathName === '/api/study/overview' && method === 'GET') {
    const user = requireVerifiedUser(req);
    const snap = safeSnapshotForUser(user.id);
    const overview = studyDomain.buildStudyOverview(snap.keys, {
      date: cleanText(url.searchParams.get('date') || '', 10),
      timezoneOffsetMinutes: Number(url.searchParams.get('timezoneOffsetMinutes') || 0),
      profileId: cleanId(url.searchParams.get('profileId') || '')
    });
    return sendJson(res, 200, { ok: true, overview, revision: snap.revision, updatedAt: snap.updatedAt });
  }

  if (pathName === '/api/study/transactions' && method === 'POST') {
    const user = requireVerifiedUser(req);
    const body = await readJson(req);
    const actions = Array.isArray(body.actions) ? body.actions : [];
    const idempotency = requestIdempotencyKey(req);
    if (!idempotency) throw Object.assign(new Error('IDEMPOTENCY_KEY_REQUIRED'), { status: 400 });
    const fingerprint = idempotencyFingerprint({ actions, profileId: body.profileId || '', date: body.date || '' });
    const previous = readIdempotencyRecord(user.id, 'study.transactions', idempotency, fingerprint);
    if (previous) return sendJson(res, 200, previous.response);
    const before = safeSnapshotForUser(user.id);
    const baseRevision = expectedRevision(req, body);
    if (!baseRevision) throw Object.assign(new Error('PRECONDITION_REQUIRED'), { status: 428 });
    if (baseRevision !== before.revision) {
      throw Object.assign(new Error('SYNC_CONFLICT'), { status: 409, currentRevision: before.revision });
    }
    const result = studyDomain.applyTransaction(before.keys, actions, {
      date: cleanText(body.date || '', 10),
      timezoneOffsetMinutes: Number(body.timezoneOffsetMinutes || 0),
      profileId: cleanId(body.profileId || ''),
      now: Date.now(),
      idFactory: () => newId('study')
    });
    const updatedAt = new Date().toISOString();
    const cleanKeys = filterSnapshotKeys(result.keys, { strict: true });
    const revision = snapshotRevision(cleanKeys);
    const response = { ok: true, overview: studyDomain.buildStudyOverview(cleanKeys, { date: body.date, timezoneOffsetMinutes: body.timezoneOffsetMinutes, profileId: result.profileId }), changedKeys: result.changedKeys, revision, updatedAt, conflict: false, previousRevision: before.revision };
    const oldSnapshot = db.snapshots[user.id];
    const oldAudit = db.audit;
    const recordKey = idempotencyRecordKey(user.id, 'study.transactions', idempotency);
    const oldRecord = db.idempotencyRecords[recordKey];
    try {
      db.snapshots[user.id] = { keys: cleanKeys, updatedAt, schema: SNAPSHOT_SCHEMA, revision };
      db.audit = [{ at: updatedAt, type: 'study-transaction-committed', actor: user.id, details: scrub({ actions: actions.map(action => cleanText(action?.type, 60)), changedKeys: result.changedKeys.length }) }, ...db.audit].slice(0, 500);
      writeIdempotencyRecord(user.id, 'study.transactions', idempotency, fingerprint, response, { persist: false });
      persistNow({ throwOnError: true });
    } catch (error) {
      db.snapshots[user.id] = oldSnapshot;
      db.audit = oldAudit;
      if (oldRecord) db.idempotencyRecords[recordKey] = oldRecord; else delete db.idempotencyRecords[recordKey];
      throw error;
    }
    return sendJson(res, 200, response, { ETag: `"${revision}"` });
  }

  if (pathName === '/api/sync/snapshot' && method === 'GET') {
    const user = requireVerifiedUser(req);
    const snap = safeSnapshotForUser(user.id);
    return sendJson(res, 200, { ok: true, snapshot: snap }, { ETag: `"${snap.revision}"` });
  }

  if (pathName === '/api/sync/snapshot' && method === 'PUT') {
    const user = requireVerifiedUser(req);
    const body = await readJson(req);
    const incomingRaw = jsonSafe(body.keys || {}, MAX_SNAPSHOT);
    const incoming = filterSnapshotKeys(incomingRaw, { strict: true });
    const before = safeSnapshotForUser(user.id);
    const existing = before.keys || {};
    const mode = body.mode === 'replace' ? 'replace' : 'merge';
    const baseRevision = expectedRevision(req, body);
    if (!baseRevision) throw Object.assign(new Error('PRECONDITION_REQUIRED'), { status: 428 });
    if (baseRevision !== before.revision) {
      return sendJson(res, 409, { ok: false, error: 'SYNC_CONFLICT', message: 'Snapshot changed on another client.', currentRevision: before.revision, updatedAt: before.updatedAt }, { ETag: `"${before.revision}"` });
    }
    const keys = mode === 'replace' ? incoming : mergeSnapshotKeys(existing, incoming);
    const updatedAt = new Date().toISOString();
    const revision = snapshotRevision(keys);
    const previous = db.snapshots[user.id];
    try {
      db.snapshots[user.id] = { keys, updatedAt, schema: SNAPSHOT_SCHEMA, revision };
      db.audit = [{ at: updatedAt, type: 'snapshot-saved', actor: user.id, details: scrub({ keys: Object.keys(keys).length, mode, tombstones: snapshotStats(keys).tombstones }) }, ...db.audit].slice(0, 500);
      persistNow({ throwOnError: true });
    } catch (error) {
      db.snapshots[user.id] = previous;
      throw error;
    }
    return sendJson(res, 200, { ok: true, snapshot: safeSnapshotForUser(user.id), conflict: false }, { ETag: `"${revision}"` });
  }

  if (pathName.startsWith('/api/sync/key/') && ['GET', 'PUT', 'DELETE'].includes(method)) {
    const user = requireVerifiedUser(req);
    const keyName = cleanKey(decodeURIComponent(pathName.slice('/api/sync/key/'.length)));
    if (!keyName || !isSyncKeyAllowed(keyName)) throw Object.assign(new Error('INVALID_KEY'), { status: 400 });
    const snap = db.snapshots[user.id] || (db.snapshots[user.id] = { keys: {}, updatedAt: new Date().toISOString(), schema: SNAPSHOT_SCHEMA, revision: snapshotRevision({}) });
    const current = safeSnapshotForUser(user.id);
    if (method === 'GET') return sendJson(res, 200, { ok: true, key: keyName, value: snap.keys[keyName] ?? null, revision: current.revision }, { ETag: `"${current.revision}"` });
    const body = method === 'PUT' ? await readJson(req) : {};
    const baseRevision = expectedRevision(req, body);
    if (!baseRevision) throw Object.assign(new Error('PRECONDITION_REQUIRED'), { status: 428 });
    if (baseRevision !== current.revision) {
      return sendJson(res, 409, { ok: false, error: 'SYNC_CONFLICT', message: 'Snapshot changed on another client.', currentRevision: current.revision }, { ETag: `"${current.revision}"` });
    }
    const beforeKeys = { ...(snap.keys || {}) };
    if (method === 'DELETE') delete snap.keys[keyName];
    else {
      const cleanValue = snapshotSchema.sanitizeForBaseKey(syncBaseKey(keyName), jsonSafe(body.value, MAX_SNAPSHOT), undefined);
      if (cleanValue === undefined || cleanValue === null) throw Object.assign(new Error('INVALID_VALUE'), { status: 400 });
      snap.keys[keyName] = cleanValue;
    }
    snap.updatedAt = new Date().toISOString();
    snap.schema = SNAPSHOT_SCHEMA;
    snap.revision = snapshotRevision(filterSnapshotKeys(snap.keys || {}));
    try { persistNow({ throwOnError: true }); }
    catch (error) { snap.keys = beforeKeys; snap.revision = current.revision; throw error; }
    return sendJson(res, 200, { ok: true, key: keyName, value: snap.keys[keyName] ?? null, revision: snap.revision }, { ETag: `"${snap.revision}"` });
  }

  if (pathName === '/api/support/tickets' && method === 'GET') {
    const user = requireVerifiedUser(req);
    const tickets = Object.values(db.supportTickets || {})
      .filter(ticket => ticket?.userId === user.id)
      .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
      .slice(0, 200)
      .map(ticket => supportTicketDto(ticket));
    return sendJson(res, 200, { ok: true, tickets });
  }

  if (pathName === '/api/support/tickets' && method === 'POST') {
    const user = requireVerifiedUser(req);
    const body = await readJson(req);
    if (body.consent !== true) throw Object.assign(new Error('SUPPORT_CONSENT_REQUIRED'), { status: 400 });
    const category = cleanText(body.category, 40).toLowerCase();
    const allowedCategories = new Set(['technical', 'account', 'sync', 'billing', 'privacy', 'suggestion']);
    const title = cleanText(body.title, 140);
    const details = cleanText(body.details, 6000);
    if (!allowedCategories.has(category)) throw Object.assign(new Error('SUPPORT_CATEGORY_INVALID'), { status: 400 });
    if (title.length < 6 || details.length < 20) throw Object.assign(new Error('SUPPORT_DETAILS_INVALID'), { status: 400 });
    const now = new Date().toISOString();
    const ticket = {
      id: newId('ticket'), userId: user.id, ownerName: user.name || '', ownerEmail: user.email || '',
      status: 'جديدة', priority: body.priority === 'high' ? 'high' : 'normal', category, title, details,
      adminNote: '', createdAt: now, updatedAt: now, closedAt: null,
      history: [{ at: now, actor: 'user', action: 'created', status: 'جديدة' }]
    };
    db.supportTickets[ticket.id] = ticket;
    try { persistNow({ throwOnError: true }); }
    catch (error) { delete db.supportTickets[ticket.id]; throw error; }
    audit('support-ticket-created', user.id, { ticketId: ticket.id, category, priority: ticket.priority });
    return sendJson(res, 201, { ok: true, ticket: supportTicketDto(ticket) });
  }

  const supportTicketMatch = pathName.match(/^\/api\/support\/tickets\/([^/]+)$/);
  if (supportTicketMatch && method === 'PATCH') {
    const user = requireVerifiedUser(req);
    const ticketId = cleanId(supportTicketMatch[1]);
    const ticket = db.supportTickets?.[ticketId];
    if (!ticket || ticket.userId !== user.id) throw Object.assign(new Error('SUPPORT_TICKET_NOT_FOUND'), { status: 404 });
    const body = await readJson(req);
    if (body.status !== 'تم الحل') throw Object.assign(new Error('SUPPORT_STATUS_INVALID'), { status: 400 });
    const previous = JSON.parse(JSON.stringify(ticket));
    const now = new Date().toISOString();
    ticket.status = 'تم الحل'; ticket.closedAt = now; ticket.updatedAt = now;
    ticket.history = [...(Array.isArray(ticket.history) ? ticket.history : []), { at: now, actor: 'user', action: 'closed', status: 'تم الحل' }].slice(-30);
    try { persistNow({ throwOnError: true }); }
    catch (error) { db.supportTickets[ticketId] = previous; throw error; }
    audit('support-ticket-closed', user.id, { ticketId });
    return sendJson(res, 200, { ok: true, ticket: supportTicketDto(ticket) });
  }

  if (pathName === '/api/admin/overview' && method === 'GET') {
    const admin = requireAdmin(req);
    const users = Object.values(db.users);
    const legacyProblemCount = Object.values(db.snapshots).reduce((sum, snap) => {
      return sum + Object.entries(snap.keys || {}).filter(([k]) => syncBaseKey(k) === 'problems').reduce((a, [, arr]) => a + (Array.isArray(arr) ? arr.filter(item => !(item && item._deleted === true) && item?.source !== 'support-center').length : 0), 0);
    }, 0);
    const problemCount = Object.keys(db.supportTickets || {}).length + legacyProblemCount;
    const tombstoneCount = Object.values(db.snapshots).reduce((sum, snap) => sum + snapshotStats(snap.keys || {}).tombstones, 0);
    return sendJson(res, 200, {
      ok: true,
      settings: db.appSettings,
      metrics: { users: users.length, admins: users.filter(u => u.role === 'admin').length, support: users.filter(u => u.role === 'support').length, paid: users.filter(u => u.subscription?.status === 'active').length, pastDue: users.filter(u => u.subscription?.status === 'past_due').length, sessions: Object.keys(db.sessions).length, snapshots: Object.keys(db.snapshots).length, problems: problemCount, tombstones: tombstoneCount, audit: db.audit.length, paymentEvents: db.paymentEvents.length },
      audit: db.audit.slice(0, 40),
      storage: stateStore.info(),
      admin: publicUser(admin)
    });
  }

  if (pathName === '/api/admin/backup' && method === 'GET') {
    const admin = requireAdmin(req);
    audit('admin-backup-exported', admin.id, { users: Object.keys(db.users).length, snapshots: Object.keys(db.snapshots).length });
    return sendJson(res, 200, { ok: true, backup: publicBackup() });
  }


  if (pathName === '/api/admin/system' && method === 'GET') {
    const admin = requireAdmin(req);
    audit('admin-system-read', admin.id);
    return sendJson(res, 200, { ok: true, system: systemStatusPayload() });
  }

  if (pathName === '/api/admin/metrics' && method === 'GET') {
    requireAdmin(req);
    return sendJson(res, 200, {
      ok: true,
      metrics: runtimeMetrics.snapshot({ includeRecent: true }),
      persistence: { pending: pendingPersist, lastPersistAt, lastError: lastPersistError },
      operations: operationsSnapshot(),
      routes: apiContract.publicContract()
    });
  }

  if (pathName === '/api/admin/backups' && method === 'GET') {
    requireAdmin(req);
    return sendJson(res, 200, { ok: true, backups: backupSummary(), keep: BACKUP_KEEP });
  }

  if (pathName === '/api/admin/backups' && method === 'POST') {
    const admin = requireAdmin(req);
    const body = await readJson(req);
    const backup = createAdminBackup(cleanText(body.label || 'manual-admin', 60));
    audit('admin-backup-created', admin.id, { file: backup.file, sizeBytes: backup.sizeBytes, checksum: backup.checksum });
    queueOffsiteBackup(backup, 'manual-admin');
    return sendJson(res, 201, { ok: true, backup, offsite: { queued: offsiteBackupConfig().configured }, backups: backupSummary() });
  }

  if (pathName === '/api/admin/maintenance/cleanup' && method === 'POST') {
    const admin = requireAdmin(req);
    const cleanup = cleanupExpiredRecords('admin');
    const prunedBackups = typeof stateStore.pruneBackups === 'function' ? stateStore.pruneBackups(BACKUP_KEEP) : [];
    audit('admin-maintenance-cleanup', admin.id, { cleanup, prunedBackups: prunedBackups.length });
    return sendJson(res, 200, { ok: true, cleanup, prunedBackups, system: systemStatusPayload() });
  }

  if (pathName === '/api/admin/security-events' && method === 'GET') {
    requireAdmin(req);
    const paging = parsePagination(url.searchParams, { defaultLimit: 100, maxLimit: 300 });
    const type = cleanText(url.searchParams.get('type') || '', 80).toLowerCase();
    const filtered = (db.securityEvents || []).filter(evt => !type || String(evt?.type || '').toLowerCase().includes(type));
    const result = paginate(filtered, paging);
    return sendJson(res, 200, { ok: true, events: result.items, pagination: result.pagination });
  }

  if (pathName === '/api/admin/security-status' && method === 'GET') {
    requireAdmin(req);
    return sendJson(res, 200, { ok: true, status: {
      version: APP_VERSION,
      production: isProduction(),
      storage: stateStore.info(),
      storageWritable: isStorageWritable(),
      requestIds: true,
      csrf: true,
      fetchMetadata: STRICT_FETCH_METADATA,
      adminIpAllowlist: ADMIN_IP_ALLOWLIST.size > 0,
      securityJsonlLog: SECURITY_LOG_JSONL,
      securityLogHashChain: { active: SECURITY_LOG_JSONL, head: initializeSecurityLogChain() || null },
      offsiteBackups: offsiteBackupConfig(),
      publicSignupsDisabled: DISABLE_PUBLIC_SIGNUPS,
      secureCookiesInProduction: isProduction(),
      sessionIdleMinutes: Math.round(SESSION_IDLE_MS / 60000),
      sessionAbsoluteHours: Math.round(SESSION_ABSOLUTE_MS / 3600000),
      mailConfigured: mailProviderConfig().configured,
      paymentWebhookConfigured: !!PAYMENT_WEBHOOK_SECRET,
      googleOAuthConfigured: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI),
      rateLimits: {
        generalPerFiveMinutes: RATE_LIMITS.general.limit,
        authPerFifteenMinutes: RATE_LIMITS.auth.limit,
        signupSuccessPerHour: RATE_LIMITS.signupSuccess.limit,
        paymentReadsPerMinute: RATE_LIMITS['payment-read'].limit,
        paymentWritesPerMinute: RATE_LIMITS.payment.limit,
        paymentWebhooksPerMinute: RATE_LIMITS['payment-webhook'].limit,
        syncPerMinute: RATE_LIMITS.sync.limit,
        adminPerMinute: RATE_LIMITS.admin.limit,
        healthPerMinute: RATE_LIMITS.health.limit
      },
      backups: backupSummary().slice(0, 5),
      warnings: runtimeWarnings()
    }});
  }

  if (pathName === '/api/admin/security-report' && method === 'GET') {
    requireAdmin(req);
    const byType = {};
    for (const evt of (db.securityEvents || []).slice(0, 300)) {
      const type = cleanText(evt?.type || evt?.details?.type || 'event', 80) || 'event';
      byType[type] = (byType[type] || 0) + 1;
    }
    return sendJson(res, 200, { ok: true, report: {
      generatedAt: new Date().toISOString(),
      version: APP_VERSION,
      instanceId: SERVER_INSTANCE_ID,
      activeRateBuckets: rateMap.size,
      recentSecurityEvents: (db.securityEvents || []).slice(0, 25),
      eventCounts: byType,
      controls: {
        csrf: true,
        fetchMetadata: STRICT_FETCH_METADATA,
        adminIpAllowlist: ADMIN_IP_ALLOWLIST.size > 0,
        securityJsonlLog: SECURITY_LOG_JSONL,
        securityLogHashChain: { active: SECURITY_LOG_JSONL, head: initializeSecurityLogChain() || null },
        offsiteBackups: offsiteBackupConfig(),
        publicSignupsDisabled: DISABLE_PUBLIC_SIGNUPS,
        strictSessionBinding: STRICT_SESSION_BINDING,
        requestTimeoutMs: REQUEST_TIMEOUT_MS,
        maxJsonBody: MAX_JSON_BODY,
        maxAuthBody: MAX_AUTH_BODY,
        maxAdminBody: MAX_ADMIN_BODY
      },
      warnings: runtimeWarnings()
    }});
  }

  if (pathName === '/api/admin/settings' && method === 'GET') {
    requireAdmin(req);
    return sendJson(res, 200, { ok: true, settings: db.appSettings });
  }

  if (pathName === '/api/admin/settings' && method === 'PATCH') {
    const admin = requireAdmin(req);
    const body = await readJson(req);
    const next = { ...db.appSettings };
    ['brandArabic', 'brandEnglish', 'tagline', 'whatsapp', 'announcement'].forEach(k => { if (body[k] !== undefined) next[k] = cleanText(body[k], k === 'announcement' ? 400 : 120); });
    if (body.showAnnouncement !== undefined) next.showAnnouncement = !!body.showAnnouncement;
    if (body.maintenance !== undefined) next.maintenance = !!body.maintenance;
    db.appSettings = next;
    persistSoon();
    audit('admin-settings-updated', admin.id);
    return sendJson(res, 200, { ok: true, settings: db.appSettings });
  }

  if (pathName === '/api/admin/users' && method === 'GET') {
    requireAdmin(req);
    const paging = parsePagination(url.searchParams, { defaultLimit: 100, maxLimit: 250 });
    const query = cleanText(url.searchParams.get('q') || '', 120).toLowerCase();
    const role = cleanText(url.searchParams.get('role') || '', 20);
    const allUsers = Object.values(db.users).map(adminUserListItem)
      .filter(user => !role || user.role === role)
      .filter(user => !query || `${user.name || ''} ${user.email || ''}`.toLowerCase().includes(query))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const result = paginate(allUsers, paging);
    return sendJson(res, 200, { ok: true, users: result.items, pagination: result.pagination, filters: { q: query, role } });
  }

  const userRoleMatch = pathName.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (userRoleMatch && method === 'PATCH') {
    const admin = requireAdmin(req);
    const target = db.users[cleanId(userRoleMatch[1])];
    if (!target) throw Object.assign(new Error('USER_NOT_FOUND'), { status: 404 });
    const body = await readJson(req);
    if (body.role && ROLE_SET.has(body.role)) {
      if (target.role === 'admin' && body.role !== 'admin' && adminCount() <= 1) {
        throw Object.assign(new Error('LAST_ADMIN_REQUIRED'), { status: 409 });
      }
      target.role = body.role;
    }
    if (body.name !== undefined) target.name = cleanText(body.name, 120) || target.name;
    target.updatedAt = new Date().toISOString();
    persistSoon();
    audit('admin-user-updated', admin.id, { target: target.id, role: target.role });
    return sendJson(res, 200, { ok: true, user: publicUser(target) });
  }

  const adminUserSessionsMatch = pathName.match(/^\/api\/admin\/users\/([^/]+)\/sessions$/);
  if (adminUserSessionsMatch && method === 'DELETE') {
    const admin = requireAdmin(req);
    const targetId = cleanId(adminUserSessionsMatch[1]);
    const target = db.users[targetId];
    if (!target) throw Object.assign(new Error('USER_NOT_FOUND'), { status: 404 });
    let revoked = 0;
    for (const [hash, sess] of Object.entries(db.sessions || {})) {
      if (sess.userId === targetId) { delete db.sessions[hash]; revoked += 1; }
    }
    persistSoon();
    audit('admin-user-sessions-revoked', admin.id, { target: targetId, revoked });
    return sendJson(res, 200, { ok: true, revoked, user: publicUser(target) });
  }

  if (pathName === '/api/admin/problems' && method === 'GET') {
    requireSupportOrAdmin(req);
    const problems = Object.values(db.supportTickets || {}).map(ticket => ({
      ...supportTicketDto(ticket, { admin: true }),
      ownerUserId: ticket.userId,
      storageKey: 'supportTickets',
      source: 'support-center',
      privacy: 'private',
      visibility: 'student-admin'
    }));
    // Preserve legacy non-support problem reports until they are explicitly migrated.
    for (const [userId, snap] of Object.entries(db.snapshots)) {
      const user = db.users[userId];
      for (const [key, arr] of Object.entries(snap.keys || {})) {
        if (syncBaseKey(key) !== 'problems' || !Array.isArray(arr)) continue;
        for (const item of arr) {
          if (!item || item._deleted === true || item.source === 'support-center') continue;
          const privacy = cleanText(item.privacy, 20) || 'anonymous';
          const redacted = privacy === 'anonymous'
            ? { ...item, name: '', contact: '', ownerUserId: userId, ownerName: 'مجهول', ownerEmail: '', storageKey: key }
            : { ...item, ownerUserId: userId, ownerName: user?.name || 'Student', ownerEmail: privacy === 'private' ? '' : (user?.email || ''), storageKey: key };
          problems.push(redacted);
        }
      }
    }
    problems.sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    const paging = parsePagination(url.searchParams, { defaultLimit: 300, maxLimit: 300 });
    const status = cleanText(url.searchParams.get('status') || '', 40).toLowerCase();
    const query = cleanText(url.searchParams.get('q') || '', 120).toLowerCase();
    const filtered = problems
      .filter(problem => !status || String(problem.status || '').toLowerCase() === status)
      .filter(problem => !query || `${problem.title || ''} ${problem.details || problem.message || ''} ${problem.subject || ''} ${problem.ownerName || ''}`.toLowerCase().includes(query));
    const result = paginate(filtered, paging);
    return sendJson(res, 200, { ok: true, problems: result.items, pagination: result.pagination, filters: { q: query, status } });
  }

  const problemMatch = pathName.match(/^\/api\/admin\/problems\/([^/]+)\/([^/]+)$/);
  if (problemMatch && method === 'PATCH') {
    const admin = requireSupportOrAdmin(req);
    const ownerId = cleanId(problemMatch[1]);
    const problemId = cleanId(problemMatch[2]);
    const body = await readJson(req);
    const ticket = db.supportTickets?.[problemId];
    if (ticket && ticket.userId === ownerId) {
      const allowedStatuses = new Set(['جديدة', 'قيد المتابعة', 'تم الحل', 'مؤجلة']);
      const requestedStatus = cleanText(body.status, 40);
      const status = allowedStatuses.has(requestedStatus) ? requestedStatus : ticket.status;
      const previous = JSON.parse(JSON.stringify(ticket));
      const now = new Date().toISOString();
      ticket.status = status;
      ticket.adminNote = cleanText(body.adminNote, 3000);
      ticket.updatedAt = now;
      ticket.closedAt = status === 'تم الحل' ? (ticket.closedAt || now) : null;
      ticket.history = [...(Array.isArray(ticket.history) ? ticket.history : []), { at: now, actor: admin.id, action: 'admin-update', status }].slice(-30);
      try { persistNow({ throwOnError: true }); }
      catch (error) { db.supportTickets[problemId] = previous; throw error; }
      audit('admin-problem-updated', admin.id, { ownerId, problemId, status });
      return sendJson(res, 200, { ok: true, problem: supportTicketDto(ticket, { admin: true }) });
    }
    const snap = db.snapshots[ownerId];
    if (!snap) throw Object.assign(new Error('PROBLEM_NOT_FOUND'), { status: 404 });
    let updated = null;
    for (const [key, arr] of Object.entries(snap.keys || {})) {
      if (syncBaseKey(key) !== 'problems' || !Array.isArray(arr)) continue;
      snap.keys[key] = arr.map(item => {
        if (cleanId(item.id) !== problemId) return item;
        updated = { ...item, status: cleanText(body.status, 40) || item.status || 'قيد المتابعة', adminNote: cleanText(body.adminNote, 500), updatedAt: new Date().toISOString() };
        return updated;
      });
    }
    if (!updated) throw Object.assign(new Error('PROBLEM_NOT_FOUND'), { status: 404 });
    snap.updatedAt = new Date().toISOString();
    persistNow({ throwOnError: true });
    audit('admin-problem-updated', admin.id, { ownerId, problemId, status: updated.status });
    return sendJson(res, 200, { ok: true, problem: updated });
  }

  throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8'
};
function isInsideRoot(candidate) {
  const rel = path.relative(ROOT_REAL, candidate);
  return rel === '' || (!!rel && !rel.startsWith('..') && !path.isAbsolute(rel));
}
function isPublicStaticRequest(pathname) {
  if (pathname === '/') return true;
  if (!pathname.startsWith('/')) return false;
  const parts = pathname.split('/').filter(Boolean);
  if (parts.includes('..') || parts.some(part => part === '.' || part.includes('\0'))) return false;
  if (pathname.includes('\\')) return false;
  if (PUBLIC_STATIC_FILES.has(pathname)) return true;
  return PUBLIC_STATIC_PREFIXES.some(prefix => pathname.startsWith(prefix)) && !parts.some(part => part.startsWith('.') && prefixSafeHidden(pathname, part) === false);
}
function prefixSafeHidden() { return false; }

function safeStaticPath(url) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch (_) { throw Object.assign(new Error('BAD_PATH'), { status: 400 }); }
  if (pathname === '/') pathname = '/index.html';
  if (!isPublicStaticRequest(pathname)) throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
  const ext = path.extname(pathname).toLowerCase();
  if (SENSITIVE_STATIC_EXT.has(ext)) throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
  const target = path.resolve(ROOT, '.' + pathname);
  const rel = path.relative(ROOT, target);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw Object.assign(new Error('FORBIDDEN'), { status: 403 });
  return { pathname, target };
}
function serveStatic(req, res, url) {
  const method = String(req.method || '').toUpperCase();
  if (!['GET', 'HEAD'].includes(method)) {
    setSecurityHeaders(res);
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD', 'Cache-Control': 'no-store' });
    res.end('Method not allowed');
    return;
  }
  let resolved;
  try { resolved = safeStaticPath(url); }
  catch (err) {
    setSecurityHeaders(res);
    res.writeHead(err.status || 403, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(err.message || 'Forbidden');
    return;
  }
  const { pathname, target } = resolved;
  if (AUTH_PROTECTED_PAGES.has(pathname) || ADMIN_PROTECTED_PAGES.has(pathname)) {
    const user = currentUser(req);
    const allowed = !!user && (!ADMIN_PROTECTED_PAGES.has(pathname) || (user.role === 'admin' && isEmailVerified(user)));
    if (!allowed) {
      setSecurityHeaders(res);
      res.writeHead(302, { Location: '/pages/login.html?next=' + encodeURIComponent(pathname), 'Cache-Control': 'no-store' });
      res.end('Redirecting');
      return;
    }
  }
  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) {
      const ext = path.extname(pathname).toLowerCase();
      const acceptsHtml = String(req.headers.accept || '').includes('text/html');
      if (ext || !acceptsHtml) {
        setSecurityHeaders(res);
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end('Not found');
        return;
      }
      const fallback = path.join(ROOT, 'index.html');
      fs.readFile(fallback, (fErr, data) => {
        if (fErr) {
          setSecurityHeaders(res);
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end('Not found');
          return;
        }
        setSecurityHeaders(res);
        res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache, must-revalidate', 'X-App-Version': APP_VERSION });
        res.end(method === 'HEAD' ? undefined : data);
      });
      return;
    }
    fs.realpath(target, (realErr, realTarget) => {
      if (realErr || !isInsideRoot(realTarget)) {
        setSecurityHeaders(res);
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end('Forbidden');
        return;
      }
      const ext = path.extname(realTarget).toLowerCase();
      const acceptEncoding = String(req.headers['accept-encoding'] || '');
      const compressible = TEXT_STATIC_EXT.has(ext) && stat.size >= 1024;
      const encoding = compressible && /(?:^|,)\s*br(?:\s*;|\s*,|$)/i.test(acceptEncoding)
        ? 'br'
        : (compressible && /(?:^|,)\s*gzip(?:\s*;|\s*,|$)/i.test(acceptEncoding) ? 'gzip' : 'identity');
      const etag = 'W/"' + stat.size + '-' + Number(stat.mtimeMs).toString(36) + '-' + encoding + '"';
      const versioned = url.searchParams.get('v') === APP_VERSION;
      const cache = pathname === '/service-worker.js'
        ? 'no-cache, no-store, must-revalidate'
        : (ext === '.html'
          ? 'no-cache, must-revalidate'
          : (versioned && (['.css', '.js', '.webmanifest'].includes(ext) || STATIC_IMMUTABLE_EXT.has(ext))
            ? 'public, max-age=31536000, immutable'
            : (STATIC_FRESH_EXT.has(ext) ? 'public, max-age=300, must-revalidate' : 'no-store')));
      const headers = {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': cache,
        ETag: etag,
        'Last-Modified': stat.mtime.toUTCString(),
        'X-App-Version': APP_VERSION
      };
      if (ext === '.html') {
        headers.Link = `</assets/dist/bawsala-pixel.css?v=${APP_VERSION}>; rel=preload; as=style, </assets/dist/bawsala-core.js?v=${APP_VERSION}>; rel=preload; as=script`;
      }
      if (compressible) headers.Vary = 'Accept-Encoding';
      if (encoding !== 'identity') headers['Content-Encoding'] = encoding;
      if (req.headers['if-none-match'] === etag) {
        setSecurityHeaders(res);
        res.writeHead(304, headers);
        res.end();
        return;
      }
      const cacheKey = `${realTarget}:${stat.size}:${stat.mtimeMs}`;
      const cached = staticAssetCache.get(cacheKey);
      const finish = payload => {
        const entry = cached || {};
        if (entry[encoding]) staticAssetCacheBytes -= entry[encoding].length;
        entry[encoding] = payload;
        staticAssetCache.set(cacheKey, entry);
        staticAssetCacheBytes += payload.length;
        while (staticAssetCache.size > 120 || staticAssetCacheBytes > STATIC_CACHE_MAX_BYTES) {
          const oldestKey = staticAssetCache.keys().next().value;
          const oldest = staticAssetCache.get(oldestKey) || {};
          staticAssetCacheBytes -= Object.values(oldest).reduce((sum, value) => sum + (Buffer.isBuffer(value) ? value.length : 0), 0);
          staticAssetCache.delete(oldestKey);
        }
        headers['Content-Length'] = payload.length;
        setSecurityHeaders(res);
        res.writeHead(200, headers);
        res.end(method === 'HEAD' ? undefined : payload);
      };
      if (cached?.[encoding]) return finish(cached[encoding]);
      const readAndCompress = () => {
        fs.readFile(realTarget, (rErr, data) => {
          if (rErr) {
            setSecurityHeaders(res);
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end('Server error');
            return;
          }
          if (encoding === 'identity') return finish(data);
          const done = (compressionError, payload) => {
            if (compressionError) {
              delete headers['Content-Encoding'];
              return finish(data);
            }
            finish(payload);
          };
          if (encoding === 'br') zlib.brotliCompress(data, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }, done);
          else zlib.gzip(data, { level: 6 }, done);
        });
      };
      if (encoding !== 'identity') {
        const suffix = encoding === 'br' ? '.br' : '.gz';
        fs.readFile(realTarget + suffix, (compressedError, compressedData) => {
          if (!compressedError) return finish(compressedData);
          readAndCompress();
        });
        return;
      }
      readAndCompress();
    });
  });
}

function serveSecurityTxt(req, res) {
  const method = String(req.method || '').toUpperCase();
  setSecurityHeaders(res);
  if (!['GET', 'HEAD'].includes(method)) {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD', 'Cache-Control': 'no-store' });
    res.end('Method not allowed');
    return;
  }
  const fallbackOrigin = `${isProduction() ? 'https' : 'http'}://${String(req.headers.host || `${HOST}:${PORT}`)}`;
  const origin = String(PUBLIC_BASE_URL || fallbackOrigin).replace(/\/$/, '');
  const expires = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
  const body = [
    `Contact: ${origin}/pages/support.html`,
    `Canonical: ${origin}/.well-known/security.txt`,
    `Expires: ${expires}`,
    'Preferred-Languages: ar, en',
    ''
  ].join('\n');
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=86400, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(method === 'HEAD' ? undefined : body);
}

function shouldRedirectToHttps(req) {
  if (!isProduction() || !TRUST_PROXY) return false;
  const proto = networkSecurity.forwardedProto(req, { trustedProxyRules: TRUSTED_PROXY_RULES });
  return proto === 'http';
}
function httpsRedirectTarget(req) {
  if (!PUBLIC_BASE_URL) return '';
  try { return new URL(req.url || '/', PUBLIC_BASE_URL).toString(); }
  catch (_) { return ''; }
}

let shuttingDown = false;
const openSockets = new Set();
const server = http.createServer(async (req, res) => {
  runtimeMetrics.begin(req, res);
  attachRequestContext(req, res);
  if (shuttingDown) {
    setSecurityHeaders(res);
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '5', Connection: 'close' });
    res.end(JSON.stringify({ ok: false, error: 'SERVER_SHUTTING_DOWN', requestId: req.requestId }));
    return;
  }
  if (runtimeMetrics.activeRequests() > MAX_ACTIVE_REQUESTS && !String(req.url || '').startsWith('/api/health/')) {
    setSecurityHeaders(res);
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '1', Connection: 'close' });
    res.end(JSON.stringify({ ok: false, error: 'SERVER_OVERLOADED', retryable: true, requestId: req.requestId }));
    return;
  }
  try {
    assertRequestShape(req);
    const rawPath = String(req.url || '').split('?', 1)[0];
    const remoteAddress = String(req.socket?.remoteAddress || '');
    const loopbackHealth = req.method === 'GET' && rawPath === '/api/health/live' && ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remoteAddress);
    if (loopbackHealth) return sendJson(res, 200, { ok: true, status: 'live', version: APP_VERSION, time: new Date().toISOString() });
    assertAllowedHost(req);
    if (shouldRedirectToHttps(req)) {
      const target = httpsRedirectTarget(req);
      setSecurityHeaders(res);
      if (!target) {
        res.writeHead(421, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end('Public origin is not configured');
        return;
      }
      res.writeHead(req.url && req.url.startsWith('/api/') ? 426 : 308, { Location: target, 'Cache-Control': 'no-store' });
      res.end(req.url && req.url.startsWith('/api/') ? 'HTTPS required' : 'Redirecting to HTTPS');
      return;
    }
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (url.pathname === '/pages/study.html') { setSecurityHeaders(res); res.writeHead(308, { Location: '/pages/workspace.html#flow', 'Cache-Control': 'public, max-age=86400' }); return res.end(); }
    if (url.pathname === '/.well-known/security.txt') return serveSecurityTxt(req, res);
    return serveStatic(req, res, url);
  } catch (err) {
    if (req.url && req.url.startsWith('/api/')) return sendError(res, err);
    setSecurityHeaders(res); res.writeHead(err.status || 500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end((err.status && err.status < 500) ? (err.message || 'Error') : 'Server error');
  }
});

function gracefulShutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  structuredLog('info', 'server-shutdown-started', { signal, activeRequests: runtimeMetrics.activeRequests(), openSockets: openSockets.size });
  const forceTimer = setTimeout(() => {
    for (const socket of openSockets) socket.destroy();
    persistNow();
    try { runtimeMetrics.close?.(); } catch (_) {}
    try { stateStore.close?.(); } catch (_) {}
    process.exit(exitCode);
  }, 8000);
  forceTimer.unref?.();
  server.close(() => {
    clearTimeout(forceTimer);
    const persisted = persistNow();
    try { runtimeMetrics.close?.(); } catch (_) {}
    try { stateStore.close?.(); } catch (_) {}
    structuredLog('info', 'server-shutdown-complete', { signal, persisted });
    process.exit(exitCode);
  });
}
process.on('uncaughtException', err => {
  structuredLog('fatal', 'uncaught-exception', { message: err.message || 'unknown' });
  gracefulShutdown('uncaughtException', 1);
});
process.on('unhandledRejection', reason => { structuredLog('fatal', 'unhandled-rejection', { message: reason?.message || String(reason || 'unknown') }); gracefulShutdown('unhandledRejection', 1); });
process.on('SIGINT', () => gracefulShutdown('SIGINT', 0));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM', 0));

server.on('connection', socket => {
  openSockets.add(socket);
  socket.on('close', () => openSockets.delete(socket));
});
server.on('clientError', (err, socket) => {
  try { structuredLog('warn', 'client-error', { code: err.code || 'CLIENT_ERROR' }); } catch (_) {}
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
});

server.requestTimeout = REQUEST_TIMEOUT_MS;
server.headersTimeout = REQUEST_TIMEOUT_MS + 5000;
server.keepAliveTimeout = 5000;

assertRuntimeExposure();
assertProductionConfiguration();
cleanupExpiredRecords('startup');
if (String(process.env.BAWSALA_BACKUP_ON_STARTUP || 'false').toLowerCase() === 'true') runScheduledBackup('startup');
setInterval(() => { if (!acquireJobLease('cleanup', 5 * 60_000)) return; try { cleanupExpiredRecords('scheduled'); } finally { releaseJobLease('cleanup'); } }, 10 * 60 * 1000).unref?.();
setInterval(() => processMailOutbox().catch(err => structuredLog('error', 'mail-worker-failed', { code: err.message || 'MAIL_WORKER_FAILED' })), 30 * 1000).unref?.();
setInterval(() => { try { const result = dispatchAllCalendarReminders(); if (result.reminders) structuredLog('info', 'calendar-reminder-worker', result); } catch (err) { structuredLog('error', 'calendar-reminder-worker-failed', { code: err.message || 'CALENDAR_REMINDER_WORKER_FAILED' }); } }, 60 * 1000).unref?.();
const backupInterval = scheduledBackupIntervalMs();
if (backupInterval) setInterval(() => { if (!acquireJobLease('backup', 10 * 60_000)) return; try { runScheduledBackup('scheduled'); } finally { releaseJobLease('backup'); } }, Math.min(backupInterval, 60 * 60 * 1000)).unref?.();

server.listen(PORT, BIND_HOST, () => {
  console.log(`Bawsala Study Toolkit v${APP_VERSION} running at http://${BIND_HOST}:${PORT}`);
  if (userCount() === 0 && ALLOW_DEV_ADMIN_BOOTSTRAP) console.warn('Development admin bootstrap is explicitly enabled. Disable BAWSALA_ALLOW_DEV_ADMIN_BOOTSTRAP after creating the local admin.');
  if (userCount() === 0 && isProduction() && !SETUP_ADMIN_TOKEN) console.warn('Production warning: no setup token configured; signups will be students only.');
  if (isProduction() && adminCount() > 0 && MFA_ENCRYPTION_SECRET.length < 32) console.warn('Production warning: administrative access is blocked until BAWSALA_MFA_ENCRYPTION_KEY is configured.');
  if (isProduction() && GOOGLE_CLIENT_ID && (!GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI)) console.warn('Production warning: Google OAuth is partially configured and will not work until client secret and redirect URI are set.');
  for (const warning of runtimeWarnings()) console.warn(`Production warning: ${warning}`);
  structuredLog('info', 'server-started', { port: PORT, production: isProduction(), storage: stateStore.info(), warnings: runtimeWarnings() });
});
