'use strict';

// ── DOM helpers ──
export const q = (selector, root = document) => root.querySelector(selector);
export const qa = (selector, root = document) => [...root.querySelectorAll(selector)];

// ── Identity ──
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

// ── Math ──
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const percentClass = (prefix, value) => `${prefix}-${Math.round(clamp(Number(value) || 0, 0, 100))}`;

export const setPercentClass = (element, prefix, value) => {
  if (!element) return;
  [...element.classList].filter(name => name.startsWith(`${prefix}-`)).forEach(name => element.classList.remove(name));
  element.classList.add(percentClass(prefix, value));
};

// ── Deep clone ──
export const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

// ── HTML escaping ──
const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' };
export const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, char => ESCAPE_MAP[char]);

// ── Date utilities ──
let displayTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const getDisplayTimeZone = () => displayTimeZone;
export const setDisplayTimeZone = (tz) => { displayTimeZone = tz || 'UTC'; };

export const DAY_MS = 86400000;

export const localISO = (date = new Date()) => {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: displayTimeZone, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch {
    const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return copy.toISOString().slice(0, 10);
  }
};

export const todayISO = () => localISO();

export const addDays = (dateString, days) => {
  const [year, month, day] = String(dateString).split('-').map(Number);
  return localISO(new Date(Date.UTC(year, month - 1, day + Number(days || 0), 12)));
};

export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY_MS);

// ── Formatting ──
export const formatDate = (date, language = 'en') => date
  ? new Intl.DateTimeFormat(language, { timeZone: displayTimeZone, month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00Z`))
  : 'No date';

export const formatTime = (value, language = 'en') => {
  if (!value) return 'Any time';
  const [hour, minute] = value.split(':').map(Number);
  return new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2020, 0, 1, hour, minute)));
};

export const formatMinutes = minutes => {
  const safe = Math.max(0, Math.round(Number(minutes) || 0));
  return safe >= 60 ? `${Math.floor(safe / 60)}h${safe % 60 ? ` ${safe % 60}m` : ''}` : `${safe}m`;
};

// ── Text normalization ──
export const normalizeAnswer = value => String(value || '')
  .normalize('NFKC')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .normalize('NFC')
  .toLocaleLowerCase()
  .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
  .replace(/[^\p{L}\p{N}\s.+#()=-]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// ── Array utilities ──
export const randomize = items => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
};

// ── Validation helpers ──
export const asRecord = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export const safeText = (value, max = 500) => String(value ?? '').replace(/[\0\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '').slice(0, max);

export const safeId = value => {
  const candidate = String(value ?? '');
  return /^[A-Za-z0-9_-]{1,128}$/.test(candidate) ? candidate : uid();
};

export const safeRef = value => {
  const candidate = String(value ?? '');
  return /^[A-Za-z0-9_-]{1,128}$/.test(candidate) ? candidate : '';
};

export const safeNumber = (value, min, max, fallback = min) => {
  if (value === null || value === undefined) return fallback;
  const number = Number(value);
  return clamp(Number.isFinite(number) ? number : fallback, min, max);
};

export const safeTimestamp = (value, fallback = Date.now()) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number < 4102444800000 ? number : fallback;
};

export const safeDate = (value, fallback = '') => {
  const candidate = String(value ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return fallback;
  const parsed = new Date(`${candidate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString().slice(0, 10) === candidate ? candidate : fallback;
};

export const safeTime = (value, fallback = '16:00') => {
  const candidate = String(value ?? '');
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(candidate) ? candidate : fallback;
};

export const safeEnum = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;

export const safeUrl = value => {
  const candidate = safeText(value, 2048).trim();
  if (!candidate) return '';
  try {
    const parsed = new URL(candidate);
    const local = parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
    return parsed.protocol === 'https:' || local ? parsed.href : '';
  } catch {
    return '';
  }
};

export const sanitizeList = (value, fallback, limit, mapper) => {
  const source = Array.isArray(value) ? value : fallback;
  const seen = new Set();
  return source.slice(0, limit).map((item, index) => mapper(asRecord(item), index)).filter(Boolean).map(item => {
    if (!item.id || seen.has(item.id)) item.id = uid();
    seen.add(item.id);
    return item;
  });
};

// ── Audio ──
let audioContext = null;
export const beep = (frequency = 440, duration = .06, soundEnabled = false) => {
  if (!soundEnabled) return;
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    gain.gain.value = .025;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Audio unavailable
  }
};

// ── Toast ──
export const toast = (title, message, type = '', action = null) => {
  const element = document.createElement('div');
  element.className = `toast ${type}`.trim();
  element.setAttribute('role', type === 'error' ? 'alert' : 'status');
  const actionButton = action?.label ? `<button type="button" class="toast-action">${escapeHTML(action.label)}</button>` : '';
  element.innerHTML = `<div><strong>${escapeHTML(title)}</strong><span>${escapeHTML(message)}</span></div>${actionButton}`;
  const removeTimer = window.setTimeout(() => element.remove(), action ? 8000 : 3800);
  if (action?.run) {
    q('.toast-action', element)?.addEventListener('click', async () => {
      window.clearTimeout(removeTimer);
      q('.toast-action', element).disabled = true;
      try { await action.run(); } finally { element.remove(); }
    }, { once: true });
  }
  const region = q('#toastRegion');
  if (!region) return;
  region.appendChild(element);
};

// ── Visibility limits ──
export const visibleLimits = { cards: 120, questions: 80, resources: 120 };

// ── Search highlight helper ──
export const highlightMatch = (text, query) => {
  if (!query) return escapeHTML(text);
  const escaped = escapeHTML(text);
  const queryEscaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(`(${queryEscaped})`, 'gi'), '<mark>$1</mark>');
};
