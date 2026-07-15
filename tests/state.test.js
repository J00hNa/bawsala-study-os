import { describe, it, expect } from 'vitest';
import { seedState, normalizeState, hasMeaningfulData, getLevelData, stateSignature, SCHEMA_VERSION } from '../src/state.js';

describe('seedState', () => {
  it('creates a valid empty state', () => {
    const state = seedState();
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.profile.name).toBe('PLAYER');
    expect(state.profile.totalXp).toBe(0);
    expect(state.quests).toEqual([]);
    expect(state.cards).toEqual([]);
    expect(state.settings.theme).toBe('dark');
    expect(state.settings.language).toBe('en');
  });
});

describe('normalizeState', () => {
  it('normalizes a valid state', () => {
    const raw = {
      schemaVersion: 4,
      profile: { name: 'Test', totalXp: 500 },
      quests: [{ id: 'q1', title: 'Test Quest', priority: 'high', duration: 30, xp: 100, completed: false, rewarded: false }],
      subjects: [],
      sessions: [],
      focusLog: [],
      notes: [],
      resources: [],
      cards: [],
      reviewLog: [],
      questions: [],
      arenaRuns: [],
      challengeClaims: [],
      settings: { theme: 'light' },
      notifications: []
    };
    const normalized = normalizeState(raw);
    expect(normalized.schemaVersion).toBe(SCHEMA_VERSION);
    expect(normalized.profile.name).toBe('Test');
    expect(normalized.profile.totalXp).toBe(500);
    expect(normalized.quests).toHaveLength(1);
    expect(normalized.quests[0].title).toBe('Test Quest');
    expect(normalized.quests[0].priority).toBe('high');
  });

  it('handles null/undefined input', () => {
    const normalized = normalizeState(null);
    expect(normalized.schemaVersion).toBe(SCHEMA_VERSION);
    expect(normalized.quests).toEqual([]);
  });

  it('sanitizes malicious input', () => {
    const raw = {
      quests: [{ title: '<script>alert("xss")</script>', priority: 'invalid', duration: -100 }],
      cards: [{ front: 'test'.repeat(1000), back: 'answer' }]
    };
    const normalized = normalizeState(raw);
    expect(normalized.quests[0].priority).toBe('medium');
    expect(normalized.quests[0].duration).toBe(5);
  });

  it('deduplicates IDs', () => {
    const raw = {
      quests: [
        { id: 'dup', title: 'Q1', priority: 'high', duration: 30, xp: 100 },
        { id: 'dup', title: 'Q2', priority: 'low', duration: 15, xp: 50 }
      ]
    };
    const normalized = normalizeState(raw);
    expect(normalized.quests).toHaveLength(2);
    expect(normalized.quests[0].id).not.toBe(normalized.quests[1].id);
  });

  it('enforces collection limits', () => {
    const raw = {
      quests: Array.from({ length: 500 }, (_, i) => ({
        id: `q${i}`, title: `Quest ${i}`, priority: 'medium', duration: 30, xp: 100
      }))
    };
    const normalized = normalizeState(raw);
    expect(normalized.quests.length).toBeLessThanOrEqual(400);
  });

  it('resolves subject references by name', () => {
    const raw = {
      subjects: [{ id: 's1', name: 'Math' }],
      quests: [{ title: 'Math HW', subject: 'Math', priority: 'high', duration: 30, xp: 100 }]
    };
    const normalized = normalizeState(raw);
    expect(normalized.quests[0].subjectId).toBe('s1');
    expect(normalized.quests[0].subject).toBe('Math');
  });

  it('validates card scheduling fields', () => {
    const raw = {
      cards: [{ front: 'Q', back: 'A', interval: 10, ease: 2.5, reps: 3, lapses: 1 }]
    };
    const normalized = normalizeState(raw);
    expect(normalized.cards[0].interval).toBe(10);
    expect(normalized.cards[0].ease).toBe(2.5);
    expect(normalized.cards[0].reps).toBe(3);
    expect(normalized.cards[0].lapses).toBe(1);
  });

  it('normalizes settings', () => {
    const raw = { settings: { theme: 'invalid', sound: 'yes' } };
    const normalized = normalizeState(raw);
    expect(normalized.settings.theme).toBe('dark');
    expect(normalized.settings.sound).toBe(true);
  });
});

describe('hasMeaningfulData', () => {
  it('returns false for empty state', () => {
    const state = seedState();
    expect(hasMeaningfulData(state)).toBe(false);
  });

  it('returns true when data exists', () => {
    const state = seedState();
    state.quests.push({ id: '1', title: 'Test' });
    expect(hasMeaningfulData(state)).toBe(true);
  });
});

describe('getLevelData', () => {
  it('calculates level from XP', () => {
    expect(getLevelData(0)).toEqual({ total: 0, level: 1, xp: 0, rank: 'NOVICE I' });
    expect(getLevelData(999)).toEqual({ total: 999, level: 1, xp: 999, rank: 'NOVICE I' });
    expect(getLevelData(1000)).toEqual({ total: 1000, level: 2, xp: 0, rank: 'NOVICE II' });
    expect(getLevelData(5000)).toEqual({ total: 5000, level: 6, xp: 0, rank: 'SCHOLAR II' });
    expect(getLevelData(10000)).toEqual({ total: 10000, level: 11, xp: 0, rank: 'MASTERMIND' });
  });

  it('handles edge cases', () => {
    expect(getLevelData(-100).level).toBe(1);
    expect(getLevelData('abc').level).toBe(1);
    expect(getLevelData(null).level).toBe(1);
  });
});

describe('stateSignature', () => {
  it('produces consistent signatures', () => {
    const state = seedState();
    const sig1 = stateSignature(state);
    const sig2 = stateSignature(state);
    expect(sig1).toBe(sig2);
  });

  it('ignores updatedAt', () => {
    const state1 = seedState();
    state1.meta.createdAt = 1000;
    state1.meta.updatedAt = 1000;
    const state2 = seedState();
    state2.meta.createdAt = 1000;
    state2.meta.updatedAt = 2000;
    expect(stateSignature(state1)).toBe(stateSignature(state2));
  });
});
