import { createClient } from '@supabase/supabase-js';

const REQUEST_TIMEOUT_MS = 15_000;
const AUTH_STORAGE_KEY = 'bawsala-auth-pkce-v2';
const config = window.BAWSALA_CONFIG || {};
const baseUrl = String(config.SUPABASE_URL || '').replace(/\/$/, '');
const apiKey = String(config.SUPABASE_PUBLISHABLE_KEY || '');
const memorySession = new Map();
let memoryDeviceId = null;

class BackendError extends Error {
  constructor(message, status = 0, code = 'backend_error', cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = 'BackendError';
    this.status = Number(status || 0);
    this.code = String(code || 'backend_error');
  }
}

function isConfigured() {
  if (apiKey.length < 20) return false;
  try {
    const url = new URL(baseUrl);
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
  } catch {
    return false;
  }
}

function authStorage() {
  // Session storage avoids leaving refresh tokens behind on shared devices.
  // The in-memory fallback fails closed when browser storage is unavailable.
  return {
    getItem(key) {
      try { return sessionStorage.getItem(key); } catch { return memorySession.get(key) ?? null; }
    },
    setItem(key, value) {
      try { sessionStorage.setItem(key, value); } catch { memorySession.set(key, value); }
    },
    removeItem(key) {
      try { sessionStorage.removeItem(key); } catch { memorySession.delete(key); }
    }
  };
}

const client = isConfigured()
  ? createClient(baseUrl, apiKey, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
        storageKey: AUTH_STORAGE_KEY,
        storage: authStorage()
      },
      global: {
        headers: { 'X-Client-Info': 'bawsala-study-os/4.0.0' },
        fetch: async (input, init = {}) => {
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
          const signal = init.signal;
          if (signal) {
            if (signal.aborted) controller.abort();
            else signal.addEventListener('abort', () => controller.abort(), { once: true });
          }
          try {
            return await fetch(input, { ...init, signal: controller.signal, cache: 'no-store' });
          } finally {
            window.clearTimeout(timeout);
          }
        }
      }
    })
  : null;

let lastAuthEvent = null;
if (client) {
  client.auth.onAuthStateChange(event => {
    lastAuthEvent = event;
  });
}

function normalizeError(error, fallback = 'The cloud request failed.') {
  if (error instanceof BackendError) return error;
  const status = Number(error?.status || error?.context?.status || 0);
  const code = String(error?.code || error?.name || 'cloud_error');
  const safeMessages = {
    invalid_credentials: 'Email or password is incorrect.',
    email_not_confirmed: 'Confirm your email before signing in.',
    user_already_exists: 'An account already exists for this email.',
    signup_disabled: 'New account registration is disabled.',
    over_email_send_rate_limit: 'Too many email requests. Try again later.',
    weak_password: 'Choose a stronger password.',
    validation_failed: 'The submitted data is invalid.',
    request_timeout: 'The cloud request timed out.',
    AbortError: 'The cloud request timed out.'
  };
  return new BackendError(safeMessages[code] || fallback, status, code, error);
}

function ensureClient() {
  if (!client) throw new BackendError('Cloud sync is not configured.', 0, 'not_configured');
  return client;
}

function validateCredentials(email, password, signingUp = false) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new BackendError('Enter a valid email address.', 400, 'invalid_email');
  }
  const value = String(password || '');
  if (!value) throw new BackendError('Enter your password.', 400, 'missing_password');
  if (signingUp) validateNewPassword(value, normalizedEmail);
  return normalizedEmail;
}

function validateNewPassword(value, email = '') {
  const password = String(value || '');
  if (password.length < 12 || password.length > 128) {
    throw new BackendError('Use a password between 12 and 128 characters.', 400, 'weak_password');
  }
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(pattern => pattern.test(password)).length;
  const localPart = String(email || '').split('@')[0].toLocaleLowerCase();
  if (classes < 3 || (localPart.length >= 4 && password.toLocaleLowerCase().includes(localPart))) {
    throw new BackendError('Use a less predictable password with at least three character types and no email fragment.', 400, 'weak_password');
  }
  const common = ['password123!', 'qwerty123456', 'letmein123!', '123456789012'];
  if (common.includes(password.toLocaleLowerCase())) {
    throw new BackendError('That password is too common.', 400, 'weak_password');
  }
}

async function initialize() {
  if (!client) return { session: null, user: null, event: null };
  const url = new URL(location.href);
  const hadCallback = url.searchParams.has('code') || url.searchParams.has('error') || url.searchParams.has('error_description');
  try {
    if (url.searchParams.has('code')) {
      const code = url.searchParams.get('code');
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw error;
    }
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    let user = data.session?.user || null;
    if (data.session) {
      const verified = await client.auth.getUser();
      if (!verified.error) user = verified.data.user;
    }
    const event = lastAuthEvent || (url.searchParams.has('code') ? 'SIGNED_IN' : null);
    return { session: data.session, user, event };
  } catch (error) {
    throw normalizeError(error, 'Could not initialize the cloud session.');
  } finally {
    const hashContainsTokens = /(?:^|[#&])(access_token|refresh_token|provider_token)=/i.test(url.hash);
    if (hadCallback || hashContainsTokens) {
      for (const key of ['code', 'error', 'error_code', 'error_description', 'auth_callback']) url.searchParams.delete(key);
      history.replaceState(null, '', `${url.pathname}${url.search}#settings`);
    }
  }
}

async function getSession() {
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) throw normalizeError(error, 'Could not read the cloud session.');
  return data.session || null;
}

async function getCurrentUser() {
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error) {
    if ([400, 401, 403].includes(Number(error.status))) return null;
    throw normalizeError(error, 'Could not verify the current user.');
  }
  return data.user || null;
}

async function signUp(email, password, captchaToken = '') {
  const supabase = ensureClient();
  const normalizedEmail = validateCredentials(email, password, true);
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: String(password),
    options: {
      captchaToken: String(captchaToken || '') || undefined,
      emailRedirectTo: `${location.origin}${location.pathname}#settings`
    }
  });
  if (error) throw normalizeError(error, 'Could not create the account.');
  return data;
}

async function signIn(email, password, captchaToken = '') {
  const supabase = ensureClient();
  const normalizedEmail = validateCredentials(email, password, false);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: String(password),
    options: { captchaToken: String(captchaToken || '') || undefined }
  });
  if (error) throw normalizeError(error, 'Could not sign in.');
  return data.session;
}

async function signOut() {
  if (!client) return;
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) throw normalizeError(error, 'Could not sign out securely.');
}

async function sendPasswordReset(email, captchaToken = '') {
  const supabase = ensureClient();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new BackendError('Enter a valid email address.', 400, 'invalid_email');
  }
  const { data, error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${location.origin}${location.pathname}#settings`,
    captchaToken: String(captchaToken || '') || undefined
  });
  if (error) throw normalizeError(error, 'Could not send the password reset email.');
  return data;
}

async function updatePassword(password) {
  const value = String(password || '');
  const user = await getCurrentUser();
  validateNewPassword(value, user?.email || '');
  const { data, error } = await ensureClient().auth.updateUser({ password: value });
  if (error) throw normalizeError(error, 'Could not update the password.');
  return data;
}

async function reauthenticate(password) {
  const user = await getCurrentUser();
  if (!user?.email) throw new BackendError('Sign in again before continuing.', 401, 'not_authenticated');
  return signIn(user.email, password);
}

async function pullState() {
  const supabase = ensureClient();
  const user = await getCurrentUser();
  if (!user) throw new BackendError('Sign in to sync.', 401, 'not_authenticated');
  const { data, error } = await supabase
    .from('study_states')
    .select('state,revision,updated_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw normalizeError(error, 'Could not download your study data.');
  return data || null;
}

async function pushState(state, expectedRevision = 0) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new BackendError('Invalid application state.', 400, 'invalid_state');
  }
  const { data, error } = await ensureClient().rpc('sync_study_state', {
    p_state: state,
    p_expected_revision: Number(expectedRevision || 0),
    p_device_id: await getDeviceId()
  });
  if (error) throw normalizeError(error, 'Could not upload your study data.');
  return data;
}

async function getDeviceId() {
  const key = 'bawsala-device-id-v2';
  let value = null;
  try { value = localStorage.getItem(key); } catch { value = memoryDeviceId; }
  if (!value) {
    value = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    memoryDeviceId = value;
    try { localStorage.setItem(key, value); } catch { /* In-memory identifier remains valid for this tab. */ }
  }
  return value;
}

async function listCloudBackups(limit = 8) {
  const { data, error } = await ensureClient()
    .from('study_state_backups')
    .select('id,revision,created_at,reason,state')
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Math.min(25, Number(limit || 8))));
  if (error) throw normalizeError(error, 'Could not load cloud backups.');
  return data || [];
}

async function scheduleAccountDeletion() {
  const { data, error } = await ensureClient().functions.invoke('delete-account', {
    method: 'POST',
    body: { confirmation: 'DELETE MY ACCOUNT' }
  });
  if (error) throw normalizeError(error, 'Could not schedule account deletion.');
  return data;
}

async function getDeletionRequest() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await ensureClient()
    .from('account_deletion_requests')
    .select('requested_at,delete_after,status')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();
  if (error) throw normalizeError(error, 'Could not check deletion status.');
  return data || null;
}

async function cancelAccountDeletion() {
  const { data, error } = await ensureClient().rpc('cancel_account_deletion');
  if (error) throw normalizeError(error, 'Could not cancel account deletion.');
  return data;
}

function onAuthStateChange(callback) {
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription.unsubscribe();
}

window.BawsalaBackend = Object.freeze({
  BackendError,
  isConfigured,
  initialize,
  getSession,
  getCurrentUser,
  signUp,
  signIn,
  signOut,
  sendPasswordReset,
  updatePassword,
  reauthenticate,
  pullState,
  pushState,
  listCloudBackups,
  scheduleAccountDeletion,
  getDeletionRequest,
  cancelAccountDeletion,
  getDeviceId,
  onAuthStateChange
});
