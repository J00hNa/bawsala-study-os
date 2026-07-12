'use strict';

/**
 * Central API contract. The server still owns business logic, while this module
 * owns route discovery, method validation, rate-limit classification, and
 * stable route identifiers for metrics/logging.
 */
const ROUTES = [
  exact('health.full', '/api/health', ['GET'], 'health'),
  exact('health.live', '/api/health/live', ['GET'], 'health'),
  exact('health.ready', '/api/health/ready', ['GET'], 'health'),
  exact('health.storage', '/api/health/storage', ['GET'], 'health'),
  exact('health.metrics', '/api/health/metrics', ['GET'], 'health'),

  exact('auth.csrf', '/api/auth/csrf', ['GET'], 'auth'),
  exact('auth.signup', '/api/auth/signup', ['POST'], 'auth'),
  exact('auth.verify.status', '/api/auth/verify-email/status', ['GET'], 'auth'),
  exact('auth.verify.request', '/api/auth/verify-email/request', ['POST'], 'auth'),
  exact('auth.verify.confirm', '/api/auth/verify-email/confirm', ['GET', 'POST'], 'auth'),
  exact('auth.password-reset.request', '/api/auth/password-reset/request', ['POST'], 'auth'),
  exact('auth.password-reset.confirm', '/api/auth/password-reset/confirm', ['POST'], 'auth'),
  exact('auth.login', '/api/auth/login', ['POST'], 'auth'),
  exact('auth.logout', '/api/auth/logout', ['POST'], 'auth'),
  exact('auth.me', '/api/auth/me', ['GET'], 'auth'),
  exact('auth.google.config', '/api/auth/google/config', ['GET'], 'auth'),
  exact('auth.google.start', '/api/auth/google/start', ['GET'], 'auth'),
  exact('auth.google.pending', '/api/auth/google/pending', ['GET'], 'auth'),
  exact('auth.google.complete', '/api/auth/google/complete', ['POST'], 'auth'),
  exact('auth.google.callback', '/api/auth/google/callback', ['GET'], 'auth'),

  exact('legal.config', '/api/legal/config', ['GET'], 'general'),
  exact('account.legal-consent', '/api/account/legal-consent', ['POST'], 'auth'),
  exact('account.mfa', '/api/account/mfa', ['GET', 'POST', 'DELETE'], 'auth'),
  exact('account.mfa.confirm', '/api/account/mfa/confirm', ['POST'], 'auth'),
  exact('account.profile', '/api/account', ['PATCH', 'DELETE'], 'general'),
  exact('account.password', '/api/account/password', ['POST'], 'auth'),
  exact('account.export', '/api/account/export', ['GET'], 'general'),
  exact('account.sessions', '/api/account/sessions', ['GET'], 'auth'),
  exact('account.sessions.revoke-legacy', '/api/account/sessions/revoke', ['POST'], 'auth'),
  pattern('account.sessions.revoke', /^\/api\/account\/sessions\/([^/]+)$/, ['DELETE'], 'auth'),
  exact('account.security-log', '/api/account/security-log', ['GET'], 'auth'),

  exact('integration.google-calendar.status', '/api/integrations/google-calendar/status', ['GET'], 'sync'),
  exact('integration.google-calendar.connect', '/api/integrations/google-calendar/connect', ['GET'], 'sync'),
  exact('integration.google-calendar.sync', '/api/integrations/google-calendar/sync', ['POST'], 'sync'),
  exact('integration.google-calendar.disconnect', '/api/integrations/google-calendar', ['DELETE'], 'sync'),
  exact('calendar.events', '/api/calendar/events', ['GET', 'POST'], 'sync'),
  pattern('calendar.event', /^\/api\/calendar\/events\/([^/]+)$/, ['GET', 'PATCH', 'DELETE'], 'sync'),
  exact('calendar.reminders.dispatch', '/api/calendar/reminders/dispatch', ['POST'], 'sync'),

  exact('billing.plans', '/api/billing/plans', ['GET'], 'payment-read'),
  exact('billing.status', '/api/billing/status', ['GET'], 'payment-read'),
  exact('billing.feature-gates', '/api/billing/feature-gates', ['GET'], 'payment-read'),
  exact('billing.invoices', '/api/billing/invoices', ['GET'], 'payment-read'),
  exact('billing.checkout', '/api/billing/checkout', ['POST'], 'payment'),
  exact('billing.change-plan', '/api/billing/change-plan', ['POST'], 'payment'),
  exact('billing.portal', '/api/billing/portal', ['POST'], 'payment'),
  exact('billing.cancel', '/api/billing/cancel', ['POST'], 'payment'),
  exact('billing.webhook', '/api/billing/webhook', ['POST'], 'payment-webhook'),

  exact('study.overview', '/api/study/overview', ['GET'], 'sync'),
  exact('study.transactions', '/api/study/transactions', ['POST'], 'sync'),

  exact('sync.snapshot', '/api/sync/snapshot', ['GET', 'PUT'], 'sync'),
  pattern('sync.key', /^\/api\/sync\/key\/(.+)$/, ['GET', 'PUT', 'DELETE'], 'sync'),

  exact('support.tickets', '/api/support/tickets', ['GET', 'POST'], 'general'),
  pattern('support.ticket', /^\/api\/support\/tickets\/([^/]+)$/, ['PATCH'], 'general'),

  exact('admin.overview', '/api/admin/overview', ['GET'], 'admin'),
  exact('admin.backup-export', '/api/admin/backup', ['GET'], 'admin'),
  exact('admin.system', '/api/admin/system', ['GET'], 'admin'),
  exact('admin.metrics', '/api/admin/metrics', ['GET'], 'admin'),
  exact('admin.backups', '/api/admin/backups', ['GET', 'POST'], 'admin'),
  exact('admin.cleanup', '/api/admin/maintenance/cleanup', ['POST'], 'admin'),
  exact('admin.security-events', '/api/admin/security-events', ['GET'], 'admin'),
  exact('admin.security-status', '/api/admin/security-status', ['GET'], 'admin'),
  exact('admin.security-report', '/api/admin/security-report', ['GET'], 'admin'),
  exact('admin.settings', '/api/admin/settings', ['GET', 'PATCH'], 'admin'),
  exact('admin.users', '/api/admin/users', ['GET'], 'admin'),
  pattern('admin.user', /^\/api\/admin\/users\/([^/]+)$/, ['PATCH'], 'admin'),
  pattern('admin.user.sessions', /^\/api\/admin\/users\/([^/]+)\/sessions$/, ['DELETE'], 'admin'),
  exact('admin.problems', '/api/admin/problems', ['GET'], 'admin'),
  pattern('admin.problem', /^\/api\/admin\/problems\/([^/]+)\/([^/]+)$/, ['PATCH'], 'admin')
];

function exact(id, path, methods, category) {
  return Object.freeze({ id, path, methods: Object.freeze([...methods]), category, match: pathname => pathname === path });
}

function pattern(id, regexp, methods, category) {
  return Object.freeze({ id, regexp, methods: Object.freeze([...methods]), category, match: pathname => regexp.test(pathname) });
}

function findPath(pathname) {
  return ROUTES.filter(route => route.match(pathname));
}

function resolve(pathname, method) {
  const normalizedMethod = String(method || '').toUpperCase();
  const matchingPath = findPath(pathname);
  if (!matchingPath.length) return { found: false, allowed: [] };
  const allowed = [...new Set(matchingPath.flatMap(item => item.methods))].sort();
  if (normalizedMethod === 'OPTIONS') {
    return { found: true, methodAllowed: true, route: matchingPath[0], allowed: [...allowed, 'OPTIONS'] };
  }
  const route = matchingPath.find(item => item.methods.includes(normalizedMethod));
  if (!route) {
    return { found: true, methodAllowed: false, allowed };
  }
  return { found: true, methodAllowed: true, route, allowed: route.methods };
}

function publicContract() {
  return ROUTES.map(({ id, path, regexp, methods, category }) => ({
    id,
    path: path || regexp.source,
    dynamic: !path,
    methods: [...methods],
    category
  }));
}

module.exports = { ROUTES, resolve, publicContract };
