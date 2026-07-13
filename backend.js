(() => {
  'use strict';

  const SESSION_KEY = 'bawsala-cloud-session-v1';
  const DEVICE_KEY = 'bawsala-device-id-v1';
  const REQUEST_TIMEOUT_MS = 15000;
  const config = window.BAWSALA_CONFIG || {};
  const baseUrl = String(config.SUPABASE_URL || '').replace(/\/$/, '');
  const apiKey = String(config.SUPABASE_PUBLISHABLE_KEY || '');
  let refreshPromise = null;

  class BackendError extends Error {
    constructor(message, status = 0, code = '') {
      super(message);
      this.name = 'BackendError';
      this.status = status;
      this.code = code;
    }
  }

  function isConfigured() {
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(baseUrl) && apiKey.length >= 20;
  }

  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function readSession() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      return parsed && parsed.access_token && parsed.refresh_token ? parsed : null;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function writeSession(session) {
    if (!session) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    const safeSession = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: Number(session.expires_at || (Date.now() / 1000 + Number(session.expires_in || 3600))),
      token_type: session.token_type || 'bearer',
      user: session.user || null
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeSession));
    return safeSession;
  }

  function abortAfter(ms = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, clear: () => window.clearTimeout(timeout) };
  }

  async function parseResponse(response) {
    const text = await response.text();
    let payload = null;
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = text; }
    }
    if (!response.ok) {
      const message = payload?.msg || payload?.message || payload?.error_description || payload?.error || `Request failed (${response.status})`;
      throw new BackendError(String(message), response.status, String(payload?.code || payload?.error_code || ''));
    }
    return payload;
  }

  async function rawFetch(path, options = {}) {
    if (!isConfigured()) throw new BackendError('Cloud sync is not configured.', 0, 'not_configured');
    const timeout = abortAfter(options.timeout || REQUEST_TIMEOUT_MS);
    const headers = new Headers(options.headers || {});
    headers.set('apikey', apiKey);
    if (options.accessToken) headers.set('Authorization', `Bearer ${options.accessToken}`);
    if (options.json !== false) headers.set('Content-Type', 'application/json');
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: options.method || 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: timeout.signal,
        cache: 'no-store',
        credentials: 'omit'
      });
      return await parseResponse(response);
    } catch (error) {
      if (error?.name === 'AbortError') throw new BackendError('The cloud request timed out.', 0, 'timeout');
      if (error instanceof BackendError) throw error;
      throw new BackendError('Network request failed.', 0, 'network_error');
    } finally {
      timeout.clear();
    }
  }

  async function refreshSession() {
    const current = readSession();
    if (!current?.refresh_token) return null;
    if (refreshPromise) return refreshPromise;
    refreshPromise = rawFetch('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: { refresh_token: current.refresh_token }
    }).then(writeSession).catch(error => {
      writeSession(null);
      throw error;
    }).finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  async function getSession() {
    const current = readSession();
    if (!current) return null;
    if (Number(current.expires_at || 0) > Date.now() / 1000 + 75) return current;
    try { return await refreshSession(); } catch { return null; }
  }


  function consumeAuthRedirect() {
    const fragment = location.hash.startsWith('#') ? location.hash.slice(1) : '';
    if (!fragment || !fragment.includes('access_token=')) return null;
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) return null;
    const session = writeSession({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: Number(params.get('expires_in') || 3600),
      token_type: params.get('token_type') || 'bearer',
      user: null
    });
    const type = params.get('type') || 'signin';
    history.replaceState(null, '', `${location.pathname}${location.search}#settings`);
    return { type, session };
  }

  async function authedFetch(path, options = {}, retry = true) {
    const session = await getSession();
    if (!session) throw new BackendError('Your session has expired. Sign in again.', 401, 'session_expired');
    try {
      return await rawFetch(path, { ...options, accessToken: session.access_token });
    } catch (error) {
      if (retry && error.status === 401) {
        const refreshed = await refreshSession();
        if (!refreshed) throw error;
        return rawFetch(path, { ...options, accessToken: refreshed.access_token });
      }
      throw error;
    }
  }

  function validateCredentials(email, password, signingUp = false) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new BackendError('Enter a valid email address.', 400, 'invalid_email');
    if (String(password || '').length < (signingUp ? 10 : 1)) throw new BackendError(signingUp ? 'Use at least 10 characters for the password.' : 'Enter your password.', 400, 'weak_password');
    return normalizedEmail;
  }

  function authSecurity(captchaToken) {
    const token = String(captchaToken || '').trim();
    return token ? { gotrue_meta_security: { captcha_token: token } } : {};
  }

  async function signUp(email, password, captchaToken = '') {
    const normalizedEmail = validateCredentials(email, password, true);
    const payload = await rawFetch('/auth/v1/signup', {
      method: 'POST',
      body: { email: normalizedEmail, password: String(password), ...authSecurity(captchaToken) }
    });
    if (payload?.access_token) writeSession(payload);
    return payload;
  }

  async function signIn(email, password, captchaToken = '') {
    const normalizedEmail = validateCredentials(email, password, false);
    const payload = await rawFetch('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email: normalizedEmail, password: String(password), ...authSecurity(captchaToken) }
    });
    return writeSession(payload);
  }

  async function signOut() {
    const session = readSession();
    writeSession(null);
    if (!session?.access_token || !isConfigured()) return;
    try {
      await rawFetch('/auth/v1/logout?scope=local', { method: 'POST', accessToken: session.access_token, body: {} });
    } catch {
      // Local sign-out must still succeed if the network is unavailable.
    }
  }

  async function sendPasswordReset(email, captchaToken = '') {
    const normalizedEmail = validateCredentials(email, 'x', false);
    const redirectTo = `${location.origin}${location.pathname}`;
    return rawFetch(`/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: 'POST',
      body: { email: normalizedEmail, ...authSecurity(captchaToken) }
    });
  }


  async function updatePassword(password) {
    const value = String(password || '');
    if (value.length < 10) throw new BackendError('Use at least 10 characters for the password.', 400, 'weak_password');
    return authedFetch('/auth/v1/user', {
      method: 'PUT',
      body: { password: value }
    });
  }

  async function getCurrentUser() {
    const session = await getSession();
    if (!session) return null;
    if (session.user?.id) return session.user;
    const user = await authedFetch('/auth/v1/user', { json: false });
    const updated = { ...session, user };
    writeSession(updated);
    return user;
  }

  async function pullState() {
    const user = await getCurrentUser();
    if (!user) throw new BackendError('Sign in to sync.', 401, 'not_authenticated');
    const rows = await authedFetch(`/rest/v1/study_states?select=state,revision,updated_at&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, {
      headers: { Accept: 'application/json' },
      json: false
    });
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  async function pushState(state, expectedRevision = 0) {
    if (!state || typeof state !== 'object' || Array.isArray(state)) throw new BackendError('Invalid application state.', 400, 'invalid_state');
    const result = await authedFetch('/rest/v1/rpc/sync_study_state', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: {
        p_state: state,
        p_expected_revision: Number(expectedRevision || 0),
        p_device_id: getDeviceId()
      }
    });
    return result;
  }

  async function deleteAccount() {
    return authedFetch('/functions/v1/delete-account', { method: 'POST', body: {} });
  }

  window.BawsalaBackend = Object.freeze({
    BackendError,
    isConfigured,
    getDeviceId,
    getSession,
    consumeAuthRedirect,
    getCurrentUser,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
    pullState,
    pushState,
    deleteAccount
  });
})();
