import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import snapshotSchema from '../lib/snapshot-schema.js';
import stateStoreModule from '../lib/state-store.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { isSyncKeyAllowed, syncBaseKey, sanitizeForBaseKey } = snapshotSchema;
const { normalizeDb } = stateStoreModule;

function defaultDb(){
  return {
    version: 1,
    createdAt: '2026-07-07T00:00:00.000Z',
    appSettings: { maintenance: false },
    users: {},
    sessions: {},
    snapshots: {},
    audit: []
  };
}

const cases = [];
function test(name, fn){ cases.push({ name, fn }); }

test('sync allow-list rejects privileged namespaces', () => {
  assert.equal(isSyncKeyAllowed('admin:backup'), false);
  assert.equal(isSyncKeyAllowed('security:events'), false);
  assert.equal(isSyncKeyAllowed('auth:token'), false);
  assert.equal(isSyncKeyAllowed('study:calendar'), true);
});

test('profile sync keys resolve to the base key before validation', () => {
  assert.equal(syncBaseKey('profile.student_1.study:sourceBudget'), 'study:sourceBudget');
  assert.equal(isSyncKeyAllowed('profile.student_1.study:sourceBudget'), true);
  assert.equal(isSyncKeyAllowed('profile.student_1.admin:backup'), false);
});

test('text sanitization strips executable HTML from notes', () => {
  const clean = sanitizeForBaseKey('notebook:notes', [{ id: 'n1', title: '<script>x</script> Algebra', body: 'Use <b>formula</b> not tags.' }]);
  assert.equal(clean.length, 1);
  assert.equal(clean[0].title.includes('<'), false);
  assert.equal(clean[0].body.includes('>'), false);
});

test('calendar sanitizer enforces allowed event types and bounded reminders', () => {
  const clean = sanitizeForBaseKey('study:calendar', [{ title: 'Mock exam', type: 'evil', date: '2026-07-09', reminderMinutes: 999999 }]);
  assert.equal(clean[0].type, 'task');
  assert.equal(clean[0].date, '2026-07-09');
  assert.equal(clean[0].reminderMinutes, 10080);
});

test('source budget caps selected sources at three', () => {
  const clean = sanitizeForBaseKey('study:sourceBudget', { limit: 99, sources: ['A','B','C','D'] });
  assert.equal(clean.limit, 3);
  assert.deepEqual(clean.sources, ['A','B','C']);
});

test('unsafe URLs are neutralized', () => {
  const clean = sanitizeForBaseKey('site:customResources', [{ name: 'Bad', url: 'javascript:alert(1)' }]);
  assert.equal(clean[0].url, '#');
});

test('normalizeDb never trusts malformed persisted shapes', () => {
  const normalized = normalizeDb({ users: [], sessions: 'bad', snapshots: null, appSettings: { maintenance: true }, audit: 'bad' }, defaultDb);
  assert.deepEqual(normalized.users, {});
  assert.deepEqual(normalized.sessions, {});
  assert.deepEqual(normalized.snapshots, {});
  assert.equal(normalized.appSettings.maintenance, true);
  assert.deepEqual(normalized.audit, []);
});

test('billing yearly price stays inside the documented 15-20 percent discount band', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const monthly = Number(server.match(/id: 'plus-monthly'[\s\S]*?priceCents: (\d+)/)?.[1]);
  const yearly = Number(server.match(/id: 'plus-yearly'[\s\S]*?priceCents: (\d+)/)?.[1]);
  assert.ok(monthly > 0, 'monthly price must be present');
  assert.ok(yearly > 0, 'yearly price must be present');
  const discount = (1 - yearly / (monthly * 12)) * 100;
  assert.ok(discount >= 15 && discount <= 20, `discount out of band: ${discount}`);
});

test('production package contains no shipped runtime database', () => {
  assert.equal(fs.existsSync(path.join(root, 'data', 'bawsala.sqlite')), false);
  const dbPath = path.join(root, 'data', 'db.json');
  if (fs.existsSync(dbPath)) {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    assert.equal(Object.keys(db.users || {}).length, 0);
    assert.equal(Object.keys(db.sessions || {}).length, 0);
  }
});

let passed = 0;
for (const item of cases) {
  try {
    await item.fn();
    passed += 1;
  } catch (err) {
    console.error(`Unit test failed: ${item.name}`);
    console.error(err?.stack || err);
    process.exit(1);
  }
}

console.log(`OK: ${passed} unit/business tests passed.`);
