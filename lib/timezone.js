'use strict';

const FORMATTERS = new Map();

function formatter(timeZone) {
  const key = String(timeZone || 'UTC');
  if (!FORMATTERS.has(key)) {
    FORMATTERS.set(key, new Intl.DateTimeFormat('en-CA-u-ca-iso8601-nu-latn', {
      timeZone: key,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23'
    }));
  }
  return FORMATTERS.get(key);
}

function isValidTimeZone(value) {
  const zone = String(value || '').trim();
  if (!zone || zone.length > 80) return false;
  try { formatter(zone).format(0); return true; }
  catch (_) { return false; }
}

function partsAt(instant, timeZone) {
  const ms = instant instanceof Date ? instant.getTime() : Number(instant);
  if (!Number.isFinite(ms) || !isValidTimeZone(timeZone)) return null;
  const values = {};
  for (const part of formatter(timeZone).formatToParts(new Date(ms))) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  return {
    year: Number(values.year), month: Number(values.month), day: Number(values.day),
    hour: Number(values.hour), minute: Number(values.minute), second: Number(values.second)
  };
}

function offsetMilliseconds(instant, timeZone) {
  const ms = instant instanceof Date ? instant.getTime() : Number(instant);
  const parts = partsAt(ms, timeZone);
  if (!parts) return NaN;
  const rounded = Math.trunc(ms / 1000) * 1000;
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - rounded;
}

function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { year, month, day };
}

function parseTime(value) {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(value || ''));
  if (!match) return null;
  const hour = Number(match[1]), minute = Number(match[2]), second = Number(match[3] || 0);
  if (hour > 23 || minute > 59 || second > 59) return null;
  return { hour, minute, second };
}

function sameWallTime(parts, target) {
  return parts && parts.year === target.year && parts.month === target.month && parts.day === target.day &&
    parts.hour === target.hour && parts.minute === target.minute && parts.second === target.second;
}

function wallTimeToInstant(date, time = '00:00', timeZone = 'UTC', { disambiguation = 'earlier' } = {}) {
  const d = parseDate(date), t = parseTime(time);
  if (!d || !t || !isValidTimeZone(timeZone)) return null;
  const target = { ...d, ...t };
  const naive = Date.UTC(d.year, d.month - 1, d.day, t.hour, t.minute, t.second);
  const candidates = new Set();
  const offsets = new Set();
  for (const probe of [naive - 36e5 * 24, naive - 12e5 * 6, naive, naive + 12e5 * 6, naive + 36e5 * 24]) {
    const offset = offsetMilliseconds(probe, timeZone);
    if (Number.isFinite(offset)) offsets.add(offset);
  }
  for (const offset of offsets) {
    const candidate = naive - offset;
    if (sameWallTime(partsAt(candidate, timeZone), target)) candidates.add(candidate);
  }
  const sorted = [...candidates].sort((a, b) => a - b);
  if (!sorted.length) return null; // nonexistent DST wall time
  if (disambiguation === 'later') return sorted[sorted.length - 1];
  if (disambiguation === 'reject' && sorted.length !== 1) return null;
  return sorted[0];
}

function instantToWallTime(instant, timeZone = 'UTC') {
  const parts = partsAt(instant, timeZone);
  if (!parts) return null;
  const pad = value => String(value).padStart(2, '0');
  return {
    ...parts,
    date: `${String(parts.year).padStart(4, '0')}-${pad(parts.month)}-${pad(parts.day)}`,
    time: `${pad(parts.hour)}:${pad(parts.minute)}`,
    dateTime: `${String(parts.year).padStart(4, '0')}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`
  };
}

function addDays(date, amount) {
  const d = parseDate(date);
  if (!d) return '';
  const value = new Date(Date.UTC(d.year, d.month - 1, d.day + Number(amount || 0)));
  return value.toISOString().slice(0, 10);
}

function zonedDayBounds(date, timeZone) {
  const start = wallTimeToInstant(date, '00:00:00', timeZone);
  const nextDate = addDays(date, 1);
  const endExclusive = nextDate ? wallTimeToInstant(nextDate, '00:00:00', timeZone) : null;
  if (!Number.isFinite(start) || !Number.isFinite(endExclusive)) return null;
  return { start, endExclusive };
}

module.exports = { isValidTimeZone, partsAt, offsetMilliseconds, wallTimeToInstant, instantToWallTime, addDays, zonedDayBounds };
