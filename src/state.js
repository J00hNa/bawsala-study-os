'use strict';

import { asRecord, safeText, safeId, safeRef, safeNumber, safeTimestamp, safeDate, safeTime, safeEnum, safeUrl, sanitizeList, todayISO } from './utils.js';

const SCHEMA_VERSION = 4;
const COLORS = ['purple', 'blue', 'green'];
const RESOURCE_TYPES = ['Documentation', 'PDF', 'Book', 'Course', 'Video', 'Notes', 'Anki', 'Other'];

export { SCHEMA_VERSION, COLORS };

export function seedState() {
  const now = Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: { createdAt: now, updatedAt: now },
    profile: { name: 'PLAYER', avatar: 'P', totalXp: 0, credits: 0, dailyGoal: 60 },
    quests: [], subjects: [], sessions: [], focusLog: [], notes: [], resources: [], cards: [],
    reviewLog: [], questions: [], arenaRuns: [], challengeClaims: [],
    settings: {
      reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false,
      sound: false, compact: false, highContrast: false,
      theme: 'dark', language: 'en',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      onboardingDone: false
    },
    notifications: []
  };
}

export function migrateLegacy(legacy) {
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return seedState();
  return normalizeState({ ...legacy, schemaVersion: Number(legacy.schemaVersion || 1) });
}

export function normalizeState(value) {
  const fallback = seedState();
  const source = asRecord(value);
  const profile = asRecord(source.profile);
  const settings = asRecord(source.settings);
  const meta = asRecord(source.meta);

  const subjects = sanitizeList(source.subjects, [], 100, item => ({
    id: safeId(item.id),
    name: safeText(item.name, 100).trim() || 'Untitled subject',
    symbol: safeText(item.symbol, 3).trim().toUpperCase() || 'ST',
    description: safeText(item.description, 1500),
    progress: Math.round(safeNumber(item.progress, 0, 100, 0)),
    color: safeEnum(item.color, COLORS, 'purple')
  }));

  const subjectById = new Map(subjects.map(item => [item.id, item]));
  const subjectByName = new Map(subjects.map(item => [item.name.toLocaleLowerCase(), item]));
  const subjectData = item => {
    const byId = subjectById.get(safeRef(item.subjectId));
    const byName = subjectByName.get(safeText(item.subject, 100).trim().toLocaleLowerCase());
    const subject = byId || byName || null;
    return { subjectId: subject?.id || '', subject: subject?.name || safeText(item.subject, 100).trim() || 'General' };
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      createdAt: safeTimestamp(meta.createdAt, Date.now()),
      updatedAt: safeTimestamp(meta.updatedAt, Date.now())
    },
    profile: {
      name: safeText(profile.name || fallback.profile.name, 20).trim() || 'PLAYER',
      avatar: safeText(profile.avatar || fallback.profile.avatar, 2).trim().toUpperCase() || 'P',
      totalXp: Math.round(safeNumber(profile.totalXp, 0, 100000000, 0)),
      credits: Math.round(safeNumber(profile.credits, 0, 100000000, 0)),
      dailyGoal: Math.round(safeNumber(profile.dailyGoal, 15, 600, 60))
    },
    subjects,
    quests: sanitizeList(source.quests, [], 400, item => ({
      id: safeId(item.id), ...subjectData(item),
      title: safeText(item.title, 180).trim() || 'Untitled quest',
      description: safeText(item.description, 2000),
      priority: safeEnum(item.priority, ['high', 'medium', 'low'], 'medium'),
      duration: Math.round(safeNumber(item.duration, 5, 480, 25)),
      xp: Math.round(safeNumber(item.xp, 0, 1000, 100)),
      dueDate: safeDate(item.dueDate, ''),
      completed: Boolean(item.completed),
      rewarded: Boolean(item.rewarded || item.completed),
      createdAt: safeTimestamp(item.createdAt),
      completedAt: item.completedAt ? safeTimestamp(item.completedAt) : null,
      steps: sanitizeList(item.steps, [], 50, step => ({ id: safeId(step.id), text: safeText(step.text, 300).trim() || 'Step', done: Boolean(step.done) }))
    })),
    sessions: sanitizeList(source.sessions, [], 1000, item => ({
      id: safeId(item.id), ...subjectData(item),
      questId: safeRef(item.questId),
      title: safeText(item.title, 180).trim() || 'Study session',
      date: safeDate(item.date, todayISO()),
      time: safeTime(item.time),
      duration: Math.round(safeNumber(item.duration, 5, 480, 25)),
      color: safeEnum(item.color, COLORS, 'purple')
    })),
    focusLog: sanitizeList(source.focusLog, [], 5000, item => ({
      id: safeId(item.id), date: safeDate(item.date, todayISO()),
      minutes: Math.round(safeNumber(item.minutes, 0, 1440, 0)),
      seconds: Math.round(safeNumber(item.seconds, 0, 86400, Number(item.minutes || 0) * 60)),
      xp: Math.round(safeNumber(item.xp, 0, 10000, 0)),
      mode: safeEnum(item.mode, ['sprint', 'deep', 'review'], 'deep'),
      questId: safeRef(item.questId), note: safeText(item.note, 1500), proof: safeText(item.proof, 1500),
      distractions: Math.round(safeNumber(item.distractions, 0, 1000, 0)), createdAt: safeTimestamp(item.createdAt)
    })),
    notes: sanitizeList(source.notes, [], 300, item => ({
      id: safeId(item.id), ...subjectData(item),
      title: safeText(item.title, 240).trim() || 'Untitled note',
      body: safeText(item.body, 50000),
      updatedAt: safeTimestamp(item.updatedAt)
    })),
    resources: sanitizeList(source.resources, [], 500, item => ({
      id: safeId(item.id), ...subjectData(item),
      title: safeText(item.title, 240).trim() || 'Untitled resource',
      type: safeEnum(item.type, RESOURCE_TYPES, 'Other'),
      description: safeText(item.description, 3000),
      tags: (Array.isArray(item.tags) ? item.tags : []).slice(0, 20).map(tag => safeText(tag, 40).trim()).filter(Boolean),
      url: safeUrl(item.url)
    })),
    cards: sanitizeList(source.cards, [], 3000, item => ({
      id: safeId(item.id), ...subjectData(item),
      front: safeText(item.front, 3000).trim() || 'Empty prompt',
      back: safeText(item.back, 6000).trim() || 'Empty answer',
      dueDate: safeDate(item.dueDate, todayISO()),
      dueAt: safeTimestamp(item.dueAt, new Date(`${safeDate(item.dueDate, todayISO())}T00:00:00`).getTime()),
      interval: Math.round(safeNumber(item.interval, 0, 36500, 0)),
      ease: safeNumber(item.ease, 1.3, 4, 2.5),
      reps: Math.round(safeNumber(item.reps, 0, 100000, 0)),
      lapses: Math.round(safeNumber(item.lapses, 0, 100000, 0))
    })),
    reviewLog: sanitizeList(source.reviewLog, [], 10000, item => ({
      id: safeId(item.id), cardId: safeRef(item.cardId),
      date: safeDate(item.date, todayISO()),
      reviewedAt: safeTimestamp(item.reviewedAt, Date.now()),
      rating: safeEnum(item.rating, ['again', 'hard', 'good', 'easy'], 'again'),
      correct: item.correct === undefined ? item.rating !== 'again' : Boolean(item.correct),
      ...subjectData(item)
    })),
    questions: sanitizeList(source.questions, [], 3000, item => ({
      id: safeId(item.id), ...subjectData(item),
      prompt: safeText(item.prompt, 3000).trim() || 'Untitled question',
      answer: safeText(item.answer, 3000).trim() || 'No answer',
      accepted: (Array.isArray(item.accepted) ? item.accepted : []).slice(0, 20).map(answer => safeText(answer, 300).trim()).filter(Boolean),
      hint: safeText(item.hint, 1200)
    })),
    arenaRuns: sanitizeList(source.arenaRuns, [], 5000, item => ({
      id: safeId(item.id), date: safeDate(item.date, todayISO()),
      createdAt: safeTimestamp(item.createdAt, Date.now()),
      correct: Math.round(safeNumber(item.correct, 0, 1000, 0)),
      total: Math.round(safeNumber(item.total, 0, 1000, 0)),
      bestCombo: Math.round(safeNumber(item.bestCombo, 0, 1000, 0)),
      xp: Math.round(safeNumber(item.xp, 0, 100000, 0)),
      answers: (Array.isArray(item.answers) ? item.answers : []).slice(0, 100).map(answer => ({
        questionId: safeRef(answer.questionId),
        correct: Boolean(answer.correct),
        answeredAt: safeTimestamp(answer.answeredAt, Date.now())
      }))
    })),
    challengeClaims: [...new Set((Array.isArray(source.challengeClaims) ? source.challengeClaims : []).slice(0, 1000).map(date => safeDate(date, '')).filter(Boolean))],
    settings: {
      reducedMotion: Boolean(settings.reducedMotion), sound: Boolean(settings.sound),
      compact: Boolean(settings.compact), highContrast: Boolean(settings.highContrast),
      theme: safeEnum(settings.theme, ['dark', 'light', 'system'], 'dark'),
      language: safeEnum(settings.language, ['en', 'ar'], 'en'),
      timeZone: safeText(settings.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', 80),
      onboardingDone: Boolean(settings.onboardingDone)
    },
    notifications: sanitizeList(source.notifications, [], 100, item => ({
      id: safeId(item.id), title: safeText(item.title, 180).trim() || 'Notification',
      message: safeText(item.message, 1200),
      createdAt: safeTimestamp(item.createdAt, Date.now()),
      read: Boolean(item.read), time: safeText(item.time, 80)
    }))
  };
}

export function hasMeaningfulData(value) {
  return ['quests', 'subjects', 'sessions', 'focusLog', 'notes', 'resources', 'cards', 'reviewLog', 'questions', 'arenaRuns'].some(key => value[key]?.length);
}

// ── Level calculation ──
const RANKS = ['NOVICE I', 'NOVICE II', 'LEARNER I', 'LEARNER II', 'SCHOLAR I', 'SCHOLAR II', 'SCHOLAR III', 'TACTICIAN I', 'TACTICIAN II', 'MASTERMIND'];

export function getLevelData(totalXp) {
  const total = Math.max(0, Number(totalXp) || 0);
  const level = Math.floor(total / 1000) + 1;
  const xp = total % 1000;
  return { total, level, xp, rank: RANKS[Math.min(level - 1, RANKS.length - 1)] || 'LEGEND' };
}

// ── State signature for conflict detection ──
export function stateSignature(value) {
  const normalized = normalizeState(value);
  normalized.meta.updatedAt = 0;
  return JSON.stringify(normalized);
}
