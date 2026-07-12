'use strict';

function parseTime(value, fallback = 0) {
  if (value === undefined || value === null || value === '' || value === false || value === 0) return fallback;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : fallback;
}

const snapshotSchema = require('./snapshot-schema');

const PROFILE_SCOPED = new Set([
  'homeworks','errors','study:sessions','study:sourceBudget','study:continuation',
  'dashboard:mission','dashboard:executionGuard','dailyReviews','notebook:flashcards','study:calendar'
]);

function clamp(value, min, max, fallback = min) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}
function cleanText(value, max = 300) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function cleanId(value) {
  return cleanText(value, 140).replace(/[^a-zA-Z0-9:_-]/g, '');
}
function visibleArray(value) {
  return (Array.isArray(value) ? value : []).filter(item => !(item && item._deleted === true));
}
function offsetDate(value, timezoneOffsetMinutes = 0) {
  if (!value) return '';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const time = parseTime(raw);
  if (!Number.isFinite(time)) return raw.slice(0, 10);
  return new Date(time - clamp(timezoneOffsetMinutes, -840, 840, 0) * 60_000).toISOString().slice(0, 10);
}
function activeProfileId(keys = {}, requested = '') {
  const safeRequested = cleanId(requested);
  const profiles = visibleArray(keys.profiles);
  if (safeRequested && profiles.some(profile => cleanId(profile?.id) === safeRequested)) return safeRequested;
  const stored = cleanId(keys.activeProfileId);
  if (stored && profiles.some(profile => cleanId(profile?.id) === stored)) return stored;
  return cleanId(profiles[0]?.id) || stored || 'guest';
}
function scopedKey(profileId, baseKey) {
  return `profile.${cleanId(profileId) || 'guest'}.${baseKey}`;
}
function readValue(keys = {}, baseKey, profileId = '') {
  const scoped = scopedKey(profileId || activeProfileId(keys), baseKey);
  if (Object.prototype.hasOwnProperty.call(keys, scoped)) return keys[scoped];
  return keys[baseKey];
}
function keyForWrite(keys = {}, baseKey, profileId = '') {
  if (!PROFILE_SCOPED.has(baseKey)) return baseKey;
  const pid = profileId || activeProfileId(keys);
  const scoped = scopedKey(pid, baseKey);
  if (Object.prototype.hasOwnProperty.call(keys, scoped)) return scoped;
  if (!Object.prototype.hasOwnProperty.call(keys, baseKey)) return scoped;
  return baseKey;
}
function sanitize(baseKey, value, fallback) {
  return snapshotSchema.sanitizeForBaseKey(baseKey, value, fallback);
}
function itemTime(item) {
  return parseTime(item?.updatedAt || item?.reviewedAt || item?.finishedAt || item?.createdAt || item?.date || item?.dueAt || 0) || 0;
}
function upsertById(list, item, max = 1000) {
  const id = cleanId(item?.id);
  const existing = Array.isArray(list) ? list : [];
  if (!id) return [item, ...existing].slice(0, max);
  let found = false;
  const next = existing.map(current => {
    if (cleanId(current?.id) !== id) return current;
    found = true;
    return itemTime(item) >= itemTime(current) ? { ...current, ...item } : current;
  });
  if (!found) next.unshift(item);
  return next.slice(0, max);
}
function missionForDate(value, date, timezoneOffsetMinutes) {
  if (!value || typeof value !== 'object') return null;
  const missionDate = cleanText(value.date, 10) || offsetDate(value.updatedAt || value.createdAt, timezoneOffsetMinutes);
  if (missionDate !== date) return null;
  const text = cleanText(value.text || value.mission, 220);
  return text ? { ...value, text, mission: text, date: missionDate } : null;
}
function sourceBudgetForDate(value, date) {
  if (!value || typeof value !== 'object') return { date, limit: 2, sources: [], rule: '' };
  const budgetDate = cleanText(value.date, 10);
  if (budgetDate && budgetDate !== date) return { date, limit: clamp(value.limit, 1, 3, 2), sources: [], rule: cleanText(value.rule, 220) };
  return {
    ...value,
    date,
    limit: clamp(value.limit, 1, 3, 2),
    sources: (Array.isArray(value.sources) ? value.sources : []).map(item => cleanText(item, 120)).filter(Boolean).slice(0, clamp(value.limit, 1, 3, 2)),
    rule: cleanText(value.rule, 220)
  };
}
function isActionableError(item) {
  return Boolean(cleanText(item?.error || item?.message, 5000) && cleanText(item?.fix, 5000)) && !['انتهى'].includes(cleanText(item?.status, 30));
}
function dueAtOrBefore(value, nowMs) {
  const time = parseTime(value || 0);
  return Number.isFinite(time) && time <= nowMs;
}
function daysUntil(date, nowDate) {
  if (!date) return Number.POSITIVE_INFINITY;
  const a = parseTime(`${date}T00:00:00Z`);
  const b = parseTime(`${nowDate}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.ceil((a - b) / 86_400_000) : Number.POSITIVE_INFINITY;
}
function validContinuation(value, nowMs) {
  if (!value || typeof value !== 'object' || !cleanText(value.title, 180)) return null;
  const expiresAt = parseTime(value.expiresAt || 0);
  if (Number.isFinite(expiresAt) && expiresAt <= nowMs) return null;
  if (value.status === 'done' || value.status === 'cancelled') return null;
  return value;
}
function buildStudyOverview(keys = {}, options = {}) {
  const nowMs = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const timezoneOffsetMinutes = clamp(options.timezoneOffsetMinutes, -840, 840, 0);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(options.date || ''))
    ? String(options.date)
    : offsetDate(nowMs, timezoneOffsetMinutes);
  const profileId = activeProfileId(keys, options.profileId);
  const profiles = visibleArray(keys.profiles);
  const profile = profiles.find(item => cleanId(item?.id) === profileId) || profiles[0] || { id: profileId, name: 'طالب' };
  const rawMission = readValue(keys, 'dashboard:mission', profileId);
  const mission = missionForDate(rawMission, date, timezoneOffsetMinutes);
  const sourceBudget = sourceBudgetForDate(readValue(keys, 'study:sourceBudget', profileId), date);
  const guard = readValue(keys, 'dashboard:executionGuard', profileId) || null;
  const sessions = visibleArray(readValue(keys, 'study:sessions', profileId));
  const errors = visibleArray(readValue(keys, 'errors', profileId));
  const reviews = visibleArray(readValue(keys, 'dailyReviews', profileId));
  const homeworks = visibleArray(readValue(keys, 'homeworks', profileId));
  const flashcards = visibleArray(readValue(keys, 'notebook:flashcards', profileId));
  const calendar = visibleArray(readValue(keys, 'study:calendar', profileId));
  const continuation = validContinuation(readValue(keys, 'study:continuation', profileId), nowMs);

  const todaySessions = sessions.filter(item => offsetDate(item?.finishedAt || item?.createdAt, timezoneOffsetMinutes) === date && clamp(item?.minutes, 0, 600, 0) >= 5);
  const todayErrors = errors.filter(item => isActionableError(item) && offsetDate(item?.updatedAt || item?.createdAt, timezoneOffsetMinutes) === date);
  const todayReviews = reviews.filter(item => offsetDate(item?.date || item?.createdAt, timezoneOffsetMinutes) === date);
  const openHomeworks = homeworks.filter(item => !item?.done).sort((a, b) => {
    const ad = a?.due || '9999-12-31';
    const bd = b?.due || '9999-12-31';
    return String(ad).localeCompare(String(bd)) || itemTime(b) - itemTime(a);
  });
  const dueCards = flashcards.filter(item => !item?.archived && (!item?.dueAt || dueAtOrBefore(item.dueAt, nowMs)))
    .sort((a, b) => parseTime(a?.dueAt || 0) - parseTime(b?.dueAt || 0));
  const upcomingEvents = calendar.filter(item => item?.date && item.date >= date).sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`));
  const minutes = todaySessions.reduce((sum, item) => sum + clamp(item?.minutes, 0, 600, 0), 0);
  const goalMinutes = clamp(profile?.dailyHours, 0.25, 12, 2) * 60;
  const steps = [
    { key: 'mission', label: 'مهمة ومصادر', done: Boolean(mission?.text && sourceBudget.sources.length) },
    { key: 'focus', label: 'جلسة تركيز', done: todaySessions.length > 0 },
    { key: 'errors', label: 'خطأ قابل للمراجعة', done: todayErrors.length > 0 },
    { key: 'review', label: 'إغلاق اليوم', done: todayReviews.length > 0 }
  ];
  const done = steps.filter(step => step.done).length;
  let nextAction;
  if (!mission) nextAction = { key: 'mission', label: 'حدد مهمة اليوم', reason: rawMission ? 'مهمة الأمس لا تُحسب لليوم.' : 'لا توجد مهمة مرتبطة بتاريخ اليوم.' };
  else if (!sourceBudget.sources.length) nextAction = { key: 'mission', label: 'حدد مصدراً أو مصدرين', reason: 'المهمة بلا مصادر محددة تتحول غالباً إلى تنقل عشوائي.' };
  else if (!todaySessions.length) nextAction = { key: 'focus', label: 'ابدأ جلسة التركيز', reason: 'لا يوجد تنفيذ محفوظ اليوم.' };
  else if (!todayErrors.length) nextAction = { key: 'errors', label: 'سجل خطأ اليوم', reason: 'خطأ قديم لا يغلق خطوة اليوم.' };
  else if (!todayReviews.length) nextAction = { key: 'review', label: 'أغلق اليوم', reason: 'اكتب قرار الغد قبل أن تنهي.' };
  else nextAction = { key: 'flow', label: 'حلقة اليوم مكتملة', reason: 'لا تضف أدوات لمجرد الشعور بالانشغال.' };

  let priority = null;
  const urgentHomework = openHomeworks.find(item => daysUntil(item?.due, date) <= 2);
  if (continuation) priority = { kind: continuation.kind || 'continuation', id: continuation.entityId || '', title: continuation.title, subject: continuation.subject || '', target: continuation.target || 'focus', reason: 'هذا هو العمل الذي تركته مفتوحاً.' };
  else if (urgentHomework) priority = { kind: 'homework', id: urgentHomework.id, title: urgentHomework.title, subject: urgentHomework.subject || '', target: 'focus', reason: urgentHomework.due ? `موعده خلال ${Math.max(0, daysUntil(urgentHomework.due, date))} يوم.` : 'واجب مفتوح.' };
  else if (upcomingEvents[0] && daysUntil(upcomingEvents[0].date, date) <= 2) priority = { kind: 'calendar', id: upcomingEvents[0].id, title: upcomingEvents[0].title, subject: upcomingEvents[0].subject || '', target: 'focus', reason: 'موعد قريب في التقويم.' };
  else if (dueCards.length) priority = { kind: 'flashcards', id: dueCards[0].id, title: `مراجعة ${Math.min(20, dueCards.length)} بطاقة مستحقة`, subject: dueCards[0].subject || '', target: 'flashcards', reason: 'بطاقات تجاوزت موعد المراجعة.' };
  else if (mission) priority = { kind: 'mission', id: mission.id || '', title: mission.text, subject: mission.subject || '', target: nextAction.key === 'mission' ? 'mission' : 'focus', reason: 'مهمة اليوم الحالية.' };

  const timeline = [];
  if (mission) timeline.push({ type: 'mission', at: mission.updatedAt || mission.createdAt || `${date}T00:00:00.000Z`, title: mission.text, meta: `${mission.minutes || 25} دقيقة` });
  for (const item of todaySessions) timeline.push({ type: 'session', at: item.finishedAt || item.createdAt, title: item.mission || 'جلسة تركيز', meta: `${item.minutes || 0} دقيقة` });
  for (const item of todayErrors) timeline.push({ type: 'error', at: item.updatedAt || item.createdAt, title: item.lesson || item.subject || 'خطأ', meta: item.fix || '' });
  for (const item of todayReviews) timeline.push({ type: 'review', at: item.createdAt || item.date, title: 'إغلاق اليوم', meta: item.tomorrow || item.commitment || '' });
  timeline.sort((a, b) => parseTime(b.at || 0) - parseTime(a.at || 0));

  const warnings = [];
  if (rawMission && !mission) warnings.push({ code: 'STALE_MISSION', message: 'المهمة المحفوظة تخص يوماً سابقاً ولن تُحسب اليوم.' });
  if (mission && !sourceBudget.sources.length) warnings.push({ code: 'NO_SOURCES', message: 'المهمة لا تحتوي مصادر محددة.' });
  if (openHomeworks.filter(item => item?.due && item.due < date).length) warnings.push({ code: 'OVERDUE_HOMEWORK', message: 'توجد واجبات متأخرة.' });
  if (minutes > goalMinutes * 1.6) warnings.push({ code: 'OVER_GOAL', message: 'تجاوزت هدفك اليومي بكثير؛ لا تحوّل النظام إلى إرهاق.' });

  return {
    date,
    timezoneOffsetMinutes,
    profile: { id: profileId, name: cleanText(profile?.name, 70) || 'طالب', dailyHours: clamp(profile?.dailyHours, 0.25, 12, 2) },
    mission,
    sourceBudget,
    continuation,
    loop: { steps, done, total: steps.length, percent: Math.round(done / steps.length * 100), nextAction },
    focus: { minutes, goalMinutes: Math.round(goalMinutes), sessions: todaySessions.length, quality: todaySessions.length ? Math.round(todaySessions.reduce((sum, item) => sum + clamp(item?.focusScore, 1, 5, 3), 0) / todaySessions.length / 5 * 100) : 0 },
    counts: { openHomeworks: openHomeworks.length, overdueHomeworks: openHomeworks.filter(item => item?.due && item.due < date).length, dueCards: dueCards.length, todayErrors: todayErrors.length, upcomingEvents: upcomingEvents.length },
    priority,
    timeline: timeline.slice(0, 12),
    warnings,
    generatedAt: new Date(nowMs).toISOString()
  };
}

function applyAction(keys, action, context = {}) {
  if (!action || typeof action !== 'object') throw Object.assign(new Error('INVALID_STUDY_ACTION'), { status: 400 });
  const type = cleanText(action.type, 60);
  const payload = action.payload && typeof action.payload === 'object' ? action.payload : {};
  const profileId = activeProfileId(keys, context.profileId || payload.profileId);
  const nowIso = new Date(Number(context.now) || Date.now()).toISOString();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(context.date || payload.date || '')) ? String(context.date || payload.date) : nowIso.slice(0, 10);
  const idFactory = typeof context.idFactory === 'function' ? context.idFactory : (() => `study_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);
  const changed = [];
  const write = (baseKey, value) => {
    const key = keyForWrite(keys, baseKey, profileId);
    const clean = sanitize(baseKey, value, undefined);
    if (clean === undefined || clean === null) throw Object.assign(new Error('INVALID_STUDY_ACTION_PAYLOAD'), { status: 400 });
    keys[key] = clean;
    changed.push(key);
    return clean;
  };
  const append = (baseKey, record, max) => {
    const current = readValue(keys, baseKey, profileId);
    return write(baseKey, upsertById(current, record, max));
  };

  if (type === 'mission.save') {
    const text = cleanText(payload.text || payload.mission, 220);
    if (!text) throw Object.assign(new Error('MISSION_REQUIRED'), { status: 400 });
    write('dashboard:mission', {
      id: cleanId(payload.id) || idFactory(), text, mission: text, subject: cleanText(payload.subject, 80),
      minutes: clamp(payload.minutes, 5, 180, 25), status: ['ready','started','done','failed'].includes(payload.status) ? payload.status : 'ready',
      date, originType: cleanText(payload.originType, 40), originId: cleanId(payload.originId), originLabel: cleanText(payload.originLabel, 160),
      createdAt: cleanText(payload.createdAt, 50) || nowIso, updatedAt: nowIso
    });
  } else if (type === 'source-budget.save') {
    write('study:sourceBudget', { date, limit: clamp(payload.limit, 1, 3, 2), sources: (Array.isArray(payload.sources) ? payload.sources : []).slice(0, 3), rule: cleanText(payload.rule, 220), updatedAt: nowIso });
  } else if (type === 'session.complete') {
    const minutes = clamp(payload.minutes, 1, 240, 0);
    if (minutes < 1) throw Object.assign(new Error('SESSION_MINUTES_REQUIRED'), { status: 400 });
    append('study:sessions', { ...payload, id: cleanId(payload.id) || idFactory(), minutes, createdAt: cleanText(payload.createdAt, 50) || nowIso, updatedAt: nowIso, finishedAt: cleanText(payload.finishedAt, 50) || nowIso }, 500);
  } else if (type === 'error.save') {
    const error = cleanText(payload.error || payload.message, 5000);
    const fix = cleanText(payload.fix, 5000);
    if (!error || !fix) throw Object.assign(new Error('ERROR_AND_FIX_REQUIRED'), { status: 400 });
    append('errors', { ...payload, id: cleanId(payload.id) || idFactory(), error, fix, status: payload.status || 'جديد', createdAt: cleanText(payload.createdAt, 50) || nowIso, updatedAt: nowIso }, 220);
  } else if (type === 'review.save') {
    append('dailyReviews', { ...payload, id: cleanId(payload.id) || idFactory(), date: cleanText(payload.date, 50) || nowIso, createdAt: cleanText(payload.createdAt, 50) || nowIso, updatedAt: nowIso }, 240);
  } else if (type === 'homework.toggle') {
    const id = cleanId(payload.id);
    if (!id) throw Object.assign(new Error('HOMEWORK_ID_REQUIRED'), { status: 400 });
    const current = visibleArray(readValue(keys, 'homeworks', profileId));
    let found = false;
    const next = current.map(item => {
      if (cleanId(item?.id) !== id) return item;
      found = true;
      return { ...item, done: payload.done === undefined ? !item.done : Boolean(payload.done), updatedAt: nowIso };
    });
    if (!found) throw Object.assign(new Error('HOMEWORK_NOT_FOUND'), { status: 404 });
    write('homeworks', next);
  } else if (type === 'continuation.set') {
    const title = cleanText(payload.title, 180);
    if (!title) throw Object.assign(new Error('CONTINUATION_TITLE_REQUIRED'), { status: 400 });
    write('study:continuation', {
      id: cleanId(payload.id) || idFactory(), kind: cleanText(payload.kind, 40) || 'study', entityId: cleanId(payload.entityId), title,
      subject: cleanText(payload.subject, 80), target: cleanText(payload.target, 40) || 'focus', sourcePage: cleanText(payload.sourcePage, 160),
      status: 'active', createdAt: cleanText(payload.createdAt, 50) || nowIso, updatedAt: nowIso,
      expiresAt: cleanText(payload.expiresAt, 50) || new Date(parseTime(nowIso) + 7 * 86_400_000).toISOString()
    });
  } else if (type === 'continuation.clear') {
    const key = keyForWrite(keys, 'study:continuation', profileId);
    if (Object.prototype.hasOwnProperty.call(keys, key)) {
      delete keys[key];
      changed.push(key);
    }
  } else {
    throw Object.assign(new Error('UNSUPPORTED_STUDY_ACTION'), { status: 400 });
  }
  return { changedKeys: changed, profileId };
}

function applyTransaction(inputKeys = {}, actions = [], context = {}) {
  if (!Array.isArray(actions) || !actions.length || actions.length > 12) throw Object.assign(new Error('INVALID_STUDY_TRANSACTION'), { status: 400 });
  const nextKeys = JSON.parse(JSON.stringify(inputKeys || {}));
  const changed = new Set();
  let profileId = activeProfileId(nextKeys, context.profileId);
  for (const action of actions) {
    const result = applyAction(nextKeys, action, { ...context, profileId });
    profileId = result.profileId;
    result.changedKeys.forEach(key => changed.add(key));
  }
  return { keys: nextKeys, changedKeys: [...changed], profileId, overview: buildStudyOverview(nextKeys, { ...context, profileId }) };
}

module.exports = {
  PROFILE_SCOPED,
  clamp,
  offsetDate,
  activeProfileId,
  scopedKey,
  readValue,
  keyForWrite,
  buildStudyOverview,
  applyAction,
  applyTransaction
};
