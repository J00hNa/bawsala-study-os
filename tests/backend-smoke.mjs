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
class WebSocketStub {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = WebSocketStub.CLOSED;
  addEventListener() {}
  removeEventListener() {}
  close() {}
  send() {}
}

const calls = [];
const sessionPayload = {
  access_token: 'access-token', refresh_token: 'refresh-token', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer',
  user: { id: '11111111-1111-1111-1111-111111111111', email: 'student@example.com', aud: 'authenticated' }
};
const fetchMock = async (input, options = {}) => {
  const url = String(input instanceof Request ? input.url : input);
  calls.push({ url, options });
  const path = new URL(url).pathname;
  let body = {};
  if (path.endsWith('/auth/v1/token')) body = sessionPayload;
  else if (path.endsWith('/rest/v1/rpc/sync_study_state')) body = { ok: true, conflict: false, revision: 2 };
  else if (path.endsWith('/rest/v1/study_states')) body = [{ state: { profile: {} }, revision: 1, updated_at: new Date().toISOString() }];
  else if (path.endsWith('/auth/v1/user')) body = sessionPayload.user;
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
};

const local = new MemoryStorage();
const session = new MemoryStorage();
const location = { href: 'https://study.example/index.html#settings', origin: 'https://study.example', pathname: '/index.html', search: '', hash: '#settings' };
const windowObject = {
  BAWSALA_CONFIG: { SUPABASE_URL: 'https://example-project.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_with_enough_length' },
  setTimeout, clearTimeout, setInterval, clearInterval, location
};
const context = {
  window: windowObject, self: windowObject, globalThis: null,
  localStorage: local, sessionStorage: session, location, history: { replaceState() {} }, navigator: {},
  crypto: webcrypto, fetch: fetchMock, Headers, Request, Response, AbortController, URL, URLSearchParams,
  TextEncoder, TextDecoder, btoa: value => Buffer.from(value, 'binary').toString('base64'), atob: value => Buffer.from(value, 'base64').toString('binary'), WebSocket: WebSocketStub, setTimeout, clearTimeout, setInterval, clearInterval, console
};
context.globalThis = context;
windowObject.window = windowObject;
windowObject.sessionStorage = session;
windowObject.localStorage = local;
vm.createContext(context);
vm.runInContext(await readFile(new URL('../backend.js', import.meta.url), 'utf8'), context, { filename: 'backend.js' });

const api = context.window.BawsalaBackend;
assert.equal(api.isConfigured(), true);
await assert.rejects(() => api.signUp('student@example.com', 'password123!', ''), /less predictable|too common/i);
const signedIn = await api.signIn('Student@Example.com', 'correct Horse battery 7!', 'captcha-test-token');
assert.equal(signedIn.user.email, 'student@example.com');
assert.ok(session.getItem('bawsala-auth-pkce-v2'));
assert.equal(local.getItem('bawsala-auth-pkce-v2'), null);

const signInCall = calls.find(call => call.url.includes('/auth/v1/token?grant_type=password'));
assert.ok(signInCall);
const signInBody = JSON.parse(signInCall.options.body);
assert.equal(signInBody.email, 'student@example.com');
assert.equal(signInBody.gotrue_meta_security.captcha_token, 'captcha-test-token');

const pushed = await api.pushState({ schemaVersion: 4, profile: {}, settings: {}, quests: [] }, 1);
assert.equal(pushed.revision, 2);
const rpcCall = calls.find(call => call.url.includes('/rpc/sync_study_state'));
assert.ok(rpcCall);
assert.equal(JSON.parse(rpcCall.options.body).p_expected_revision, 1);

const pulled = await api.pullState();
assert.equal(pulled.revision, 1);
await api.sendPasswordReset('Student@Example.com', 'captcha-reset-token');
assert.ok(calls.some(call => call.url.includes('/auth/v1/recover?redirect_to=')));
await api.signOut();
assert.equal(session.getItem('bawsala-auth-pkce-v2'), null);
console.log('backend smoke: ok');
