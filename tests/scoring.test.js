import { describe, it, expect } from 'vitest';
import {
  awardXp, getTodayFocus, getTodayFocusXp, getTodayReviews, getDueCards,
  getRetention, getArenaAccuracy, calculateStreak, questProgress,
  getCompanionMessage, getMainQuest, calculateArenaScore,
  getAchievements, FOCUS_RATES, FOCUS_MODE_DEFAULTS
} from '../src/scoring.js';
import { todayISO } from '../src/utils.js';

// Mock today's date
const MOCK_TODAY = '2024-06-15';

function makeState(overrides = {}) {
  return {
    profile: { totalXp: 0, credits: 0, dailyGoal: 60, ...overrides.profile },
    quests: overrides.quests || [],
    subjects: overrides.subjects || [],
    sessions: [],
    focusLog: overrides.focusLog || [],
    notes: overrides.notes || [],
    resources: [],
    cards: overrides.cards || [],
    reviewLog: overrides.reviewLog || [],
    questions: [],
    arenaRuns: overrides.arenaRuns || [],
    challengeClaims: overrides.challengeClaims || [],
    settings: { sound: false },
    notifications: []
  };
}

describe('awardXp', () => {
  it('awards XP and credits', () => {
    const state = makeState();
    const result = awardXp(state, 100, 'test', 10);
    expect(result).toEqual({ xp: 100, currency: 10, reason: 'test', levelUp: false, level: 1 });
    expect(state.profile.totalXp).toBe(100);
    expect(state.profile.credits).toBe(10);
  });

  it('detects level up', () => {
    const state = makeState({ profile: { totalXp: 900, credits: 0, dailyGoal: 60 } });
    const result = awardXp(state, 100, 'test', 0);
    expect(result.levelUp).toBe(true);
    expect(result.level).toBe(2);
  });

  it('returns null for zero XP', () => {
    const state = makeState();
    expect(awardXp(state, 0, 'test', 0)).toBeNull();
  });

  it('clamps negative XP', () => {
    const state = makeState();
    awardXp(state, -50, 'test', -10);
    expect(state.profile.totalXp).toBe(0);
    expect(state.profile.credits).toBe(0);
  });
});

describe('getDueCards', () => {
  it('returns cards due now', () => {
    const now = Date.now();
    const state = makeState({
      cards: [
        { id: 'c1', subjectId: '', subject: 'Math', dueAt: now - 1000 },
        { id: 'c2', subjectId: '', subject: 'Math', dueAt: now + 100000 }
      ]
    });
    const due = getDueCards(state);
    expect(due).toHaveLength(1);
    expect(due[0].id).toBe('c1');
  });

  it('filters by subject', () => {
    const now = Date.now();
    const state = makeState({
      cards: [
        { id: 'c1', subjectId: 's1', subject: 'Math', dueAt: now - 1000 },
        { id: 'c2', subjectId: 's2', subject: 'Science', dueAt: now - 1000 }
      ]
    });
    expect(getDueCards(state, 's1')).toHaveLength(1);
    expect(getDueCards(state, 'all')).toHaveLength(2);
  });
});

describe('getRetention', () => {
  it('calculates retention from recent reviews', () => {
    const state = makeState({
      reviewLog: [
        { correct: true, reviewedAt: Date.now() },
        { correct: true, reviewedAt: Date.now() - 1000 },
        { correct: false, reviewedAt: Date.now() - 2000 }
      ]
    });
    expect(getRetention(state)).toBe(67);
  });

  it('returns 0 for no reviews', () => {
    expect(getRetention(makeState())).toBe(0);
  });
});

describe('getArenaAccuracy', () => {
  it('calculates accuracy', () => {
    const state = makeState({
      arenaRuns: [
        { correct: 8, total: 10 },
        { correct: 5, total: 10 }
      ]
    });
    expect(getArenaAccuracy(state)).toBe(65);
  });

  it('returns 0 for no runs', () => {
    expect(getArenaAccuracy(makeState())).toBe(0);
  });
});

describe('calculateStreak', () => {
  it('returns 0 for no activity', () => {
    expect(calculateStreak(makeState())).toEqual({ current: 0, longest: 0 });
  });
});

describe('questProgress', () => {
  it('calculates progress with steps', () => {
    const quest = {
      completed: false,
      steps: [
        { done: true },
        { done: true },
        { done: false }
      ]
    };
    expect(questProgress(quest)).toBe(67);
  });

  it('returns 100 for completed quest without steps', () => {
    expect(questProgress({ completed: true, steps: [] })).toBe(100);
  });

  it('returns 0 for incomplete quest without steps', () => {
    expect(questProgress({ completed: false, steps: [] })).toBe(0);
  });
});

describe('calculateArenaScore', () => {
  it('calculates win/loss and XP', () => {
    const score = calculateArenaScore(7, 10, 5);
    expect(score.won).toBe(true);
    expect(score.xp).toBe(355);
    expect(score.credits).toBe(35);
    expect(score.accuracy).toBe(70);
  });

  it('detects loss', () => {
    const score = calculateArenaScore(3, 10, 0);
    expect(score.won).toBe(false);
  });
});

describe('getMainQuest', () => {
  it('returns highest priority incomplete quest', () => {
    const state = makeState({
      quests: [
        { id: 'q1', completed: true, priority: 'high' },
        { id: 'q2', completed: false, priority: 'low' },
        { id: 'q3', completed: false, priority: 'high' }
      ]
    });
    const main = getMainQuest(state);
    expect(main.id).toBe('q3');
  });

  it('returns null when all completed', () => {
    const state = makeState({
      quests: [{ completed: true, priority: 'high' }]
    });
    expect(getMainQuest(state)).toBeNull();
  });
});

describe('getCompanionMessage', () => {
  it('returns clear queue message when no active quests and no due cards', () => {
    const state = makeState();
    expect(getCompanionMessage(state)).toContain('queue is clear');
  });

  it('returns start focus message when no focus today', () => {
    const state = makeState({
      quests: [{ id: 'q1', completed: false, priority: 'high' }]
    });
    expect(getCompanionMessage(state)).toContain('Start one focused block');
  });

  it('returns review message when focus logged but no reviews and due cards exist', () => {
    const today = todayISO();
    const state = makeState({
      quests: [{ id: 'q1', completed: false, priority: 'high' }],
      focusLog: [{ date: today, minutes: 30 }],
      cards: [{ id: 'c1', dueAt: Date.now() - 1000 }]
    });
    expect(getCompanionMessage(state)).toContain('test memory');
  });
});

describe('getAchievements', () => {
  it('returns array of achievement objects', () => {
    const state = makeState();
    const achievements = getAchievements(state);
    expect(Array.isArray(achievements)).toBe(true);
    expect(achievements.length).toBeGreaterThan(0);
    achievements.forEach(a => {
      expect(a).toHaveProperty('icon');
      expect(a).toHaveProperty('name');
      expect(a).toHaveProperty('description');
      expect(a).toHaveProperty('unlocked');
    });
  });

  it('unlocks First Focus when focusLog has entries', () => {
    const state = makeState({ focusLog: [{ date: MOCK_TODAY, minutes: 30 }] });
    const achievements = getAchievements(state);
    const firstFocus = achievements.find(a => a.name === 'First Focus');
    expect(firstFocus.unlocked).toBe(true);
  });

  it('does not unlock First Focus when no focusLog', () => {
    const state = makeState();
    const achievements = getAchievements(state);
    const firstFocus = achievements.find(a => a.name === 'First Focus');
    expect(firstFocus.unlocked).toBe(false);
  });
});

describe('getTodayFocus', () => {
  it('returns 0 for no focus today', () => {
    expect(getTodayFocus(makeState())).toBe(0);
  });
});

describe('getTodayFocusXp', () => {
  it('returns 0 for no focus XP today', () => {
    expect(getTodayFocusXp(makeState())).toBe(0);
  });
});

describe('getTodayReviews', () => {
  it('returns 0 for no reviews today', () => {
    expect(getTodayReviews(makeState())).toBe(0);
  });
});

describe('FOCUS_RATES', () => {
  it('has correct rates', () => {
    expect(FOCUS_RATES.sprint).toBe(3);
    expect(FOCUS_RATES.deep).toBe(2);
    expect(FOCUS_RATES.review).toBe(2);
  });
});

describe('FOCUS_MODE_DEFAULTS', () => {
  it('has correct defaults', () => {
    expect(FOCUS_MODE_DEFAULTS.sprint).toBe(15);
    expect(FOCUS_MODE_DEFAULTS.deep).toBe(45);
    expect(FOCUS_MODE_DEFAULTS.review).toBe(25);
  });
});
