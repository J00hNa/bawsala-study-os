import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bawsala-hardening-'));
const appPort = 20200 + Math.floor(Math.random() * 500);
const mailPort = appPort + 600;
const base = `http://127.0.0.1:${appPort}`;
const receivedMail = [];
const receivedBackups = [];
const backupKey = 'hardening-backup-key-32-characters-minimum';
const securityPepper = 'hardening-security-pepper-32-characters-minimum';
let app;
let stderr = '';

const mailServer = http.createServer((req, res) => {
  let raw = '';
  req.on('data', chunk => { raw += chunk; });
  req.on('end', () => {
    if (req.url === '/backup') {
      try { receivedBackups.push({ payload: JSON.parse(raw), headers: req.headers }); } catch (_) {}
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: `backup_${receivedBackups.length}` }));
      return;
    }
    try { receivedMail.push(JSON.parse(raw)); } catch (_) {}
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: `mail_${receivedMail.length}` }));
  });
});
await new Promise(resolve => mailServer.listen(mailPort, '127.0.0.1', resolve));

async function waitFor(url, timeout = 7000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { const response = await fetch(url); if (response.ok) return response; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`SERVER_DID_NOT_START\n${stderr}`);
}

function base32Decode(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(value || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const char of clean) bits += alphabet.indexOf(char).toString(2).padStart(5, '0');
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}
function totp(secret, now = Date.now()) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30000)));
  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0');
}

function cookie(headers, name) {
  const raw = headers.get('set-cookie') || '';
  const match = raw.match(new RegExp(`(?:^|,\\s*)${name}=([^;]+)`));
  return match ? `${name}=${match[1]}` : '';
}

try {
  app = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(appPort),
      BAWSALA_STORAGE: 'json',
      BAWSALA_DATA_DIR: path.join(temp, 'data'),
      BAWSALA_PUBLIC_BASE_URL: base,
      BAWSALA_MAIL_PROVIDER: 'webhook',
      BAWSALA_MAIL_WEBHOOK_URL: `http://127.0.0.1:${mailPort}/send`,
      BAWSALA_MAIL_FROM: 'noreply@example.test',
      BAWSALA_HEALTH_DETAILS_TOKEN: 'health-test-token-32-random-characters',
      BAWSALA_SECURITY_PEPPER: securityPepper,
      BAWSALA_BACKUP_SCHEDULE: 'off',
      BAWSALA_BACKUP_UPLOAD_URL: `http://127.0.0.1:${mailPort}/backup`,
      BAWSALA_BACKUP_UPLOAD_TOKEN: 'backup-upload-token',
      BAWSALA_BACKUP_ENCRYPTION_KEY: backupKey,
      BAWSALA_ALLOW_DEV_ADMIN_BOOTSTRAP: 'true',
      BAWSALA_MFA_ENCRYPTION_KEY: 'hardening-mfa-encryption-key-32-characters-minimum'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  app.stderr.on('data', chunk => { stderr += chunk.toString(); });
  await waitFor(`${base}/api/health/live`);

  const publicHealth = await fetch(`${base}/api/health`);
  const publicJson = await publicHealth.json();
  assert.equal(publicJson.ok, true);
  assert.equal(publicJson.version, '16.0.1');
  assert.equal('storage' in publicJson, false);
  assert.equal('instanceId' in publicJson, false);

  const detailed = await fetch(`${base}/api/health/ready`, { headers: { 'X-Bawsala-Health-Token': 'health-test-token-32-random-characters' } });
  const detailedJson = await detailed.json();
  assert.equal(detailedJson.ok, true);
  assert.equal(detailedJson.integrity?.ok, true);
  assert.equal(detailedJson.storage?.engine, 'json');

  const privatePage = await fetch(`${base}/pages/account.html`, { redirect: 'manual' });
  assert.equal(privatePage.status, 302);
  assert.match(privatePage.headers.get('location') || '', /login\.html/);

  const compressed = await fetch(`${base}/assets/dist/bawsala-core.js`, { headers: { 'Accept-Encoding': 'gzip' } });
  assert.equal(compressed.status, 200);
  assert.equal(compressed.headers.get('content-encoding'), 'gzip');
  assert.match(compressed.headers.get('vary') || '', /Accept-Encoding/i);

  const csrf = await fetch(`${base}/api/auth/csrf`);
  const csrfJson = await csrf.json();
  const csrfCookie = cookie(csrf.headers, 'bawsala_csrf');
  assert.ok(csrfJson.csrfToken && csrfCookie);
  const signup = await fetch(`${base}/api/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Bawsala-Request': '1',
      'X-Bawsala-CSRF': csrfJson.csrfToken,
      Cookie: csrfCookie
    },
    body: JSON.stringify({
      name: 'Production Test', email: 'hardening@example.test', password: 'QuartzRiver582!',
      phone: '0790000000', track: 'academic', specialization: 'it', grade: 'tawjihi', privacyAccepted: true, ageConfirmed: true
    })
  });
  assert.equal(signup.status, 201);
  for (let i = 0; i < 30 && receivedMail.length === 0; i += 1) await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(receivedMail.length, 1);
  assert.equal(receivedMail[0].to, 'hardening@example.test');
  assert.match(receivedMail[0].text, /verify-email/);
  const verifyLink = receivedMail[0].text.match(/https?:\/\/[^\s]+verify-email[^\s]+/)?.[0];
  assert.ok(verifyLink);
  const verifyToken = new URL(verifyLink).searchParams.get('token');
  const verified = await fetch(`${base}/api/auth/verify-email/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Bawsala-Request': '1', 'X-Bawsala-CSRF': csrfJson.csrfToken, Cookie: csrfCookie },
    body: JSON.stringify({ token: verifyToken })
  });
  assert.equal(verified.status, 200);

  const sessionCookie = cookie(signup.headers, 'bawsala_session');
  assert.ok(sessionCookie);
  const authCookies = `${csrfCookie}; ${sessionCookie}`;
  const mfaStart = await fetch(`${base}/api/account/mfa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Bawsala-Request': '1', 'X-Bawsala-CSRF': csrfJson.csrfToken, Cookie: authCookies },
    body: '{}'
  });
  const mfaStartJson = await mfaStart.json();
  assert.equal(mfaStart.status, 200);
  assert.ok(mfaStartJson.secret);
  const mfaConfirm = await fetch(`${base}/api/account/mfa/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Bawsala-Request': '1', 'X-Bawsala-CSRF': csrfJson.csrfToken, Cookie: authCookies },
    body: JSON.stringify({ code: totp(mfaStartJson.secret) })
  });
  assert.equal(mfaConfirm.status, 200);
  const createdBackup = await fetch(`${base}/api/admin/backups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Bawsala-Request': '1',
      'X-Bawsala-CSRF': csrfJson.csrfToken,
      Cookie: `${csrfCookie}; ${sessionCookie}`
    },
    body: JSON.stringify({ label: 'offsite-hardening' })
  });
  assert.equal(createdBackup.status, 201);
  for (let i = 0; i < 40 && receivedBackups.length === 0; i += 1) await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(receivedBackups.length, 1);
  const uploaded = receivedBackups[0];
  assert.equal(uploaded.headers.authorization, 'Bearer backup-upload-token');
  assert.equal(uploaded.payload.format, 'bawsala-encrypted-backup-v1');
  assert.equal(uploaded.payload.encryption.algorithm, 'aes-256-gcm');
  assert.ok(uploaded.payload.ciphertext && !uploaded.payload.ciphertext.includes('hardening@example.test'));
  const key = crypto.createHash('sha256').update(`bawsala-backup-v1|${backupKey}`).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(uploaded.payload.encryption.iv, 'base64url'));
  decipher.setAAD(Buffer.from(uploaded.payload.encryption.aad, 'base64url'));
  decipher.setAuthTag(Buffer.from(uploaded.payload.encryption.authTag, 'base64url'));
  const clearBackup = Buffer.concat([decipher.update(Buffer.from(uploaded.payload.ciphertext, 'base64url')), decipher.final()]).toString('utf8');
  const clearJson = JSON.parse(clearBackup);
  assert.equal(clearJson.format, 'bawsala-state-backup-v2');
  assert.equal(clearJson.encryption.algorithm, 'aes-256-gcm');
  assert.ok(clearJson.ciphertext && !clearJson.ciphertext.includes('hardening@example.test'));
  const localKey = crypto.createHash('sha256').update(`bawsala-local-backup-v2|${backupKey}`).digest();
  const localDecipher = crypto.createDecipheriv('aes-256-gcm', localKey, Buffer.from(clearJson.encryption.iv, 'base64url'));
  localDecipher.setAAD(Buffer.from(clearJson.encryption.aad, 'base64url'));
  localDecipher.setAuthTag(Buffer.from(clearJson.encryption.authTag, 'base64url'));
  const state = JSON.parse(Buffer.concat([
    localDecipher.update(Buffer.from(clearJson.ciphertext, 'base64url')),
    localDecipher.final()
  ]).toString('utf8'));
  assert.ok(state.users && Object.values(state.users).some(user => user.email === 'hardening@example.test'));

  await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Bawsala-Request': '1', 'X-Bawsala-CSRF': csrfJson.csrfToken, Cookie: csrfCookie },
    body: JSON.stringify({ email: 'hardening@example.test', password: 'definitely-wrong-password' })
  });
  await new Promise(resolve => setTimeout(resolve, 100));
  const securityFile = path.join(temp, 'data', 'security-events.jsonl');
  assert.ok(fs.existsSync(securityFile));
  const securityLines = fs.readFileSync(securityFile, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  assert.ok(securityLines.length >= 1);
  const stable = value => value === null || typeof value !== 'object' ? JSON.stringify(value) : Array.isArray(value) ? '[' + value.map(stable).join(',') + ']' : '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
  let prior = null;
  for (const line of securityLines) {
    assert.equal(line.previousHash, prior);
    const { checksum, ...chained } = line;
    const expected = 'sha256:' + crypto.createHash('sha256').update(`${securityPepper}|security-log-chain|${stable(chained)}`).digest('hex');
    assert.equal(checksum, expected);
    prior = checksum;
  }

  const badData = path.join(temp, 'bad-production');
  const fail = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, NODE_ENV: 'production', PORT: String(appPort + 1), BAWSALA_DATA_DIR: badData, BAWSALA_STORAGE: 'json', BAWSALA_ENFORCE_PRODUCTION_CONFIG: 'true', BAWSALA_PUBLIC_BASE_URL: '', BAWSALA_PUBLIC_URL: '', BAWSALA_SETUP_ADMIN_TOKEN: '', SETUP_ADMIN_TOKEN: '', BAWSALA_SECURITY_PEPPER: '', BAWSALA_PASSWORD_PEPPER: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let failErr = '';
  fail.stdout.on('data', chunk => { failErr += chunk.toString(); });
  fail.stderr.on('data', chunk => { failErr += chunk.toString(); });
  const exitCode = await new Promise(resolve => fail.on('exit', resolve));
  assert.notEqual(exitCode, 0);
  assert.match(failErr, /PRODUCTION_CONFIGURATION_INVALID|production-configuration-invalid/);

  console.log('Production hardening integration tests passed.');
} finally {
  if (app && app.exitCode === null) {
    app.kill('SIGTERM');
    await Promise.race([new Promise(resolve => app.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 1500))]);
    if (app.exitCode === null) {
      app.kill('SIGKILL');
      await Promise.race([new Promise(resolve => app.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 1000))]);
    }
  }
  app?.stdout?.destroy?.();
  app?.stderr?.destroy?.();
  const mailClose = new Promise(resolve => mailServer.close(resolve));
  mailServer.closeIdleConnections?.();
  mailServer.closeAllConnections?.();
  await Promise.race([mailClose, new Promise(resolve => setTimeout(resolve, 1500))]);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { fs.rmSync(temp, { recursive: true, force: true }); break; } catch (_) { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
}
