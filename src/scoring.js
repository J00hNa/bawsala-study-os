'use strict';

import { todayISO, addDays, daysBetween, localISO } from './utils.js';
import { getLevelData } from './state.js';

// ── XP and credits ──
export function awardXp(state, amount, reason, credits = 0) {
  const xp = Math.max(0, Math.round(Number(amount) || 0));
  const currency = Math.max(0, Math.round(Number(credits) || 0));
  if (!xp && !currency) return null;
  const before = getLevelData(state.profile.totalXp).level;
  state.profile.totalXp += xp;
  state.profile.credits += currency;
  const after = getLevelData(state.profile.totalXp).level;
  return { xp, currency, reason, levelUp: after > before, level: after };
}

// ── Today aggregations ──
export function getTodayFocus(state) {
  const today = todayISO();
  return state.focusLog.filter(item => item.date === today).reduce((sum, item) => sum + Number(item.minutes || 0), 0);
}

export function getTodayFocusXp(state) {
  const today = todayISO();
  return state.focusLog.filter(item => item.date === today).reduce((sum, item) => sum + Number(item.xp || 0), 0);
}

export function getTodayReviews(state) {
  return state.reviewLog.filter(item => item.date === todayISO()).length;
}

// ── Flashcard due ──
export function getDueCards(state, subject = 'all', includeFuture = false) {
  const now = Date.now();
  return state.cards.filter(card => {
    const subjectMatches = subject === 'all' || card.subjectId === subject || card.subject === subject;
    return subjectMatches && (includeFuture || Number(card.dueAt || 0) <= now);
  });
}

// ── Retention ──
export function getRetention(state) {
  const recent = [...state.reviewLog].sort((a, b) => Number(b.reviewedAt || 0) - Number(a.reviewedAt || 0)).slice(0, 200);
  if (!recent.length) return 0;
  return Math.round(recent.filter(item => item.correct).length / recent.length * 100);
}

// ── Arena accuracy ──
export function getArenaAccuracy(state) {
  const answered = state.arenaRuns.reduce((sum, run) => sum + Number(run.total || 0), 0);
  const correct = state.arenaRuns.reduce((sum, run) => sum + Number(run.correct || 0), 0);
  return answered ? Math.round(correct / answered * 100) : 0;
}

// ── Activity dates (for streak and heatmap) ──
export function getActivityDates(state) {
  const dates = new Set(state.focusLog.filter(item => Number(item.minutes) > 0).map(item => item.date));
  state.quests.filter(item => item.completed && item.completedAt).forEach(item => dates.add(localISO(new Date(item.completedAt))));
  state.reviewLog.forEach(item => dates.add(item.date));
  state.arenaRuns.forEach(item => dates.add(item.date));
  return [...dates].filter(Boolean).sort();
}

// ── Streak calculation ──
export function calculateStreak(state) {
  const dates = getActivityDates(state);
  if (!dates.length) return { current: 0, longest: 0 };
  let longest = 1;
  let run = 1;
  for (let index = 1; index < dates.length; index += 1) {
    if (daysBetween(dates[index - 1], dates[index]) === 1) run += 1;
    else if (dates[index] !== dates[index - 1]) run = 1;
    longest = Math.max(longest, run);
  }
  const today = todayISO();
  const yesterday = addDays(today, -1);
  const anchor = dates.includes(today) ? today : (dates.includes(yesterday) ? yesterday : null);
  if (!anchor) return { current: 0, longest };
  let current = 1;
  let cursor = anchor;
  while (dates.includes(addDays(cursor, -1))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, longest };
}

// ── Quest progress percentage ──
export function questProgress(item) {
  if (!item.steps.length) return item.completed ? 100 : 0;
  return Math.round(item.steps.filter(step => step.done).length / item.steps.length * 100);
}

// ── Daily challenge check ──
export function checkDailyChallenge(state) {
  const date = todayISO();
  const progress = Math.min(5, getTodayReviews(state));
  if (progress < 5 || state.challengeClaims.includes(date)) return null;
  state.challengeClaims.push(date);
  const award = awardXp(state, 100, 'Daily Recall Rush completed', 20);
  return { award, date };
}

// ── Companion message ──
export function getCompanionMessage(state) {
  const focus = getTodayFocus(state);
  const cards = getTodayReviews(state);
  const active = state.quests.filter(item => !item.completed).length;
  const due = getDueCards(state).length;
  if (!active && due === 0) return 'Your queue is clear. Use the spare capacity for recovery or deeper practice.';
  if (focus === 0) return 'Do not optimize the plan again. Start one focused block and create evidence of progress.';
  if (cards === 0 && due) return 'Focus is logged. Now test memory before the material fades.';
  if (focus >= state.profile.dailyGoal) return 'Daily focus target secured. Stop chasing points and protect tomorrow\'s energy.';
  return 'Momentum is active. Finish the next smallest meaningful step.';
}

// ── Main quest (highest priority incomplete) ──
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export function getMainQuest(state) {
  return [...state.quests]
    .filter(item => !item.completed)
    .sort((a, b) => {
      const overdueA = a.dueDate && a.dueDate < todayISO() ? -2 : 0;
      const overdueB = b.dueDate && b.dueDate < todayISO() ? -2 : 0;
      return overdueA - overdueB || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
    })[0] || null;
}

// ── Arena scoring ──
export function calculateArenaScore(correct, total, bestCombo) {
  const won = correct >= Math.ceil(total * .6);
  const xp = correct * 45 + bestCombo * 8;
  const credits = correct * 5;
  const accuracy = total ? Math.round(correct / total * 100) : 0;
  return { won, xp, credits, accuracy };
}

// ── Achievement definitions ──
export function getAchievements(state) {
  const streak = calculateStreak(state);
  const focusMinutes = state.focusLog.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const completedQuests = state.quests.filter(item => item.completed).length;
  const reviews = state.reviewLog.length;
  const wins = state.arenaRuns.filter(run => Number(run.correct || 0) >= Math.ceil(Number(run.total || 0) * .6)).length;
  const level = getLevelData(state.profile.totalXp).level;
  return [
    { icon: '◉', name: 'First Focus', description: 'Log one focus session', unlocked: state.focusLog.length > 0 },
    { icon: '◆', name: 'Quest Runner', description: 'Clear 10 quests', unlocked: completedQuests >= 10 },
    { icon: '♨', name: 'Seven-Day Chain', description: 'Reach a 7-day streak', unlocked: streak.longest >= 7 },
    { icon: '▣', name: 'Memory Smith', description: 'Review 50 cards', unlocked: reviews >= 50 },
    { icon: '⚔', name: 'Arena Victor', description: 'Win 5 battles', unlocked: wins >= 5 },
    { icon: '⌛', name: 'Deep Worker', description: 'Focus for 10 hours', unlocked: focusMinutes >= 600 },
    { icon: 'Σ', name: 'Balanced Build', description: 'Use 4 subjects this week', unlocked: new Set(state.focusLog.filter(item => item.date >= addDays(todayISO(), -6)).map(item => state.quests.find(quest => quest.id === item.questId)?.subject).filter(Boolean)).size >= 4 },
    { icon: '✦', name: 'Knowledge Base', description: 'Create 20 notes', unlocked: state.notes.length >= 20 },
    { icon: '◇', name: 'Mastermind', description: 'Reach level 10', unlocked: level >= 10 }
  ];
}

// ── Focus XP rate ──
export const FOCUS_RATES = { sprint: 3, deep: 2, review: 2 };
export const FOCUS_MODE_DEFAULTS = { sprint: 15, deep: 45, review: 25 };
