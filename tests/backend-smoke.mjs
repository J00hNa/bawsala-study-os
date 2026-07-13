import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
  key(index) { return [...this.map.keys()][index] ?? null; }
  get length() { return this.map.size; }
}

const calls = [];
const sessionPayload = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: '11111111-1111-1111-1111-111111111111', email: 'student@example.com' }
};

const fetchMock = async (url, options = {}) => {
  calls.push({ url: String(url), options });
  const path = new URL(url).pathname;
  let body = {};
  if (path.endsWith('/auth/v1/token')) body = sessionPayload;
  else if (path.endsWith('/rest/v1/rpc/sync_study_state')) body = { ok: true, conflict: false, revision: 2 };
  else if (path.endsWith('/rest/v1/study_states')) body = [{ state: { profile: {} }, revision: 1, updated_at: new Date().toISOString() }];
  else if (path.endsWith('/auth/v1/user')) body = sessionPayload.user;
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
};

const storage = new MemoryStorage();
const context = {
  window: {
    BAWSALA_CONFIG: {
      SUPABASE_URL: 'https://example-project.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_with_enough_length',
      SYNC_DEBOUNCE_MS: 1000
    }
  },
  localStorage: storage,
  location: { origin: 'https://study.example', pathname: '/', search: '', hash: '' },
  history: { replaceState() {} },
  crypto: webcrypto,
  fetch: fetchMock,
  Headers,
  Response,
  AbortController,
  URL,
  URLSearchParams,
  setTimeout,
  clearTimeout,
  console
};
context.window.setTimeout = setTimeout;
context.window.clearTimeout = clearTimeout;
vm.createContext(context);
vm.runInContext(await readFile(new URL('../backend.js', import.meta.url), 'utf8'), context, { filename: 'backend.js' });

const api = context.window.BawsalaBackend;
assert.equal(api.isConfigured(), true);
const session = await api.signIn('Student@Example.com', 'correct horse battery staple', 'captcha-test-token');
assert.equal(session.user.email, 'student@example.com');
assert.ok(storage.getItem('bawsala-cloud-session-v1'));
const signInCall = calls.find(call => call.url.includes('/auth/v1/token?grant_type=password'));
assert.ok(signInCall);
const signInBody = JSON.parse(signInCall.options.body);
assert.equal(signInBody.email, 'student@example.com');
assert.equal(signInBody.gotrue_meta_security.captcha_token, 'captcha-test-token');

const user = await api.getCurrentUser();
assert.equal(user.id, sessionPayload.user.id);

const pushed = await api.pushState({ profile: { name: 'PLAYER' } }, 1);
assert.equal(pushed.revision, 2);
const rpcCall = calls.find(call => call.url.includes('/rpc/sync_study_state'));
assert.ok(rpcCall);
const rpcBody = JSON.parse(rpcCall.options.body);
assert.equal(rpcBody.p_expected_revision, 1);
assert.equal(rpcBody.p_state.profile.name, 'PLAYER');
assert.ok(rpcCall.options.headers.get('Authorization').startsWith('Bearer '));

const pulled = await api.pullState();
assert.equal(pulled.revision, 1);

await api.sendPasswordReset('Student@Example.com', 'captcha-reset-token');
const recoveryCall = calls.find(call => call.url.includes('/auth/v1/recover?redirect_to='));
assert.ok(recoveryCall);
const recoveryBody = JSON.parse(recoveryCall.options.body);
assert.equal(recoveryBody.gotrue_meta_security.captcha_token, 'captcha-reset-token');
assert.ok(recoveryCall.url.includes(encodeURIComponent('https://study.example/')));

await api.signOut();
assert.equal(storage.getItem('bawsala-cloud-session-v1'), null);
console.log('backend smoke: ok');
