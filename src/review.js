'use strict';

import { addDays, todayISO, normalizeAnswer } from './utils.js';

// ── SM-2 spaced repetition algorithm ──
// Returns updated card state after a rating
export function rateCard(card, rating, today = todayISO()) {
  const oldInterval = Math.max(1, Number(card.interval) || 1);

  if (rating === 'again') {
    return {
      ...card,
      interval: 0,
      dueAt: Date.now() + 10 * 60 * 1000,
      dueDate: today,
      ease: Math.max(1.3, Number(card.ease || 2.5) - 0.2),
      reps: 0,
      lapses: Number(card.lapses || 0) + 1
    };
  }

  if (rating === 'hard') {
    return {
      ...card,
      interval: Math.max(2, Math.round(oldInterval * 1.2)),
      ease: Math.max(1.3, Number(card.ease || 2.5) - 0.05),
      reps: Number(card.reps || 0) + 1,
      lapses: card.lapses
    };
  }

  if (rating === 'good') {
    const reps = Number(card.reps || 0);
    const newInterval = reps === 0 ? 1 : reps === 1 ? 3 : Math.max(3, Math.round(oldInterval * Number(card.ease || 2.5)));
    return {
      ...card,
      interval: newInterval,
      dueDate: addDays(today, newInterval),
      dueAt: new Date(`${addDays(today, newInterval)}T00:00:00`).getTime(),
      reps: reps + 1,
      lapses: card.lapses
    };
  }

  // easy
  const newInterval = Math.max(4, Math.round(oldInterval * Number(card.ease || 2.5) * 1.3));
  return {
    ...card,
    interval: newInterval,
    dueDate: addDays(today, newInterval),
    dueAt: new Date(`${addDays(today, newInterval)}T00:00:00`).getTime(),
    ease: Math.min(3.2, Number(card.ease || 2.5) + 0.15),
    reps: Number(card.reps || 0) + 1,
    lapses: card.lapses
  };
}

// ── XP per rating ──
export const RATING_XP = { again: 2, hard: 5, good: 8, easy: 10 };

// ── Arena answer checking ──
export function isArenaAnswerCorrect(question, answer) {
  const normalized = normalizeAnswer(answer);
  if (!normalized) return false;
  const accepted = [question.answer, ...(question.accepted || [])].map(normalizeAnswer).filter(Boolean);
  return accepted.includes(normalized);
}

// ── Arena hint generation ──
export function generateArenaHint(question) {
  if (question.hint) return question.hint;
  const answer = String(question.answer);
  return `The answer starts with "${answer.slice(0, 1)}" and has ${answer.length} characters.`;
}

// ── Review session management ──
export function createReviewSession(queue, stats = { reviewed: 0, remembered: 0 }, attempts = new Map()) {
  return { queue, index: 0, stats, attempts };
}

export function processRating(session, rating) {
  const { queue, index, stats, attempts } = session;
  const card = queue[index];
  if (!card) return { ...session, complete: true };

  const updatedCard = rateCard(card, rating);
  const attemptCount = Number(attempts.get(card.id) || 0) + 1;
  const newAttempts = new Map(attempts);
  newAttempts.set(card.id, attemptCount);

  const newStats = {
    reviewed: stats.reviewed + 1,
    remembered: stats.remembered + (rating !== 'again' ? 1 : 0)
  };

  // Build new queue: replace card at current index, optionally re-add for 'again'
  const newQueue = [...queue];
  if (rating === 'again' && attemptCount <= 2) {
    // Re-add to end of queue for relearning
    newQueue.push(updatedCard);
  }
  // Update the card in place for non-'again' ratings
  newQueue[index] = updatedCard;

  const nextIndex = index + 1;
  const complete = nextIndex >= newQueue.length;

  return {
    queue: newQueue,
    index: nextIndex,
    stats: newStats,
    attempts: newAttempts,
    complete,
    updatedCard
  };
}
