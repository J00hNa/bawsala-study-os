import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const timezone = require('../lib/timezone');

assert.equal(timezone.isValidTimeZone('Asia/Amman'), true);
assert.equal(timezone.isValidTimeZone('America/New_York'), true);
assert.equal(timezone.isValidTimeZone('Not/AZone'), false);
assert.equal(timezone.isValidTimeZone(''), false);

const amman = timezone.wallTimeToInstant('2026-07-12', '09:30:15', 'Asia/Amman');
assert.equal(new Date(amman).toISOString(), '2026-07-12T06:30:15.000Z');
assert.deepEqual(timezone.instantToWallTime(amman, 'Asia/Amman'), {
  year: 2026, month: 7, day: 12, hour: 9, minute: 30, second: 15,
  date: '2026-07-12', time: '09:30', dateTime: '2026-07-12T09:30:15'
});
assert.equal(timezone.offsetMilliseconds(amman, 'Asia/Amman'), 3 * 60 * 60 * 1000);

assert.equal(timezone.wallTimeToInstant('2026-03-08', '02:30', 'America/New_York'), null, 'nonexistent DST wall time must be rejected');
const earlier = timezone.wallTimeToInstant('2026-11-01', '01:30', 'America/New_York', { disambiguation: 'earlier' });
const later = timezone.wallTimeToInstant('2026-11-01', '01:30', 'America/New_York', { disambiguation: 'later' });
assert.equal(later - earlier, 60 * 60 * 1000, 'ambiguous DST wall times must expose both instants');
assert.equal(timezone.wallTimeToInstant('2026-11-01', '01:30', 'America/New_York', { disambiguation: 'reject' }), null);

const spring = timezone.zonedDayBounds('2026-03-08', 'America/New_York');
const autumn = timezone.zonedDayBounds('2026-11-01', 'America/New_York');
assert.equal(spring.endExclusive - spring.start, 23 * 60 * 60 * 1000);
assert.equal(autumn.endExclusive - autumn.start, 25 * 60 * 60 * 1000);
assert.equal(timezone.addDays('2024-02-28', 1), '2024-02-29');
assert.equal(timezone.addDays('2024-02-29', 1), '2024-03-01');
assert.equal(timezone.addDays('invalid', 1), '');
assert.equal(timezone.wallTimeToInstant('2026-02-30', '09:00', 'UTC'), null);
assert.equal(timezone.wallTimeToInstant('2026-02-28', '25:00', 'UTC'), null);
assert.equal(timezone.partsAt(Number.NaN, 'UTC'), null);
assert.equal(timezone.instantToWallTime(Date.now(), 'Not/AZone'), null);
assert.equal(timezone.zonedDayBounds('invalid', 'UTC'), null);

console.log('OK: timezone conversion and DST edge-case tests passed.');
