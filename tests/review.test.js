import { describe, it, expect } from 'vitest';
import { rateCard, RATING_XP, isArenaAnswerCorrect, generateArenaHint, processRating } from '../src/review.js';

const TODAY = '2024-06-15';

function makeCard(overrides = {}) {
  return {
    id: 'card-1',
    front: 'What is 2+2?',
    back: '4',
    subjectId: 's1',
    subject: 'Math',
    interval: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    dueDate: TODAY,
    dueAt: Date.now(),
    ...overrides
  };
}

describe('rateCard', () => {
  describe('again rating', () => {
    it('resets interval and reps', () => {
      const card = makeCard({ interval: 10, reps: 5, ease: 2.8 });
      const result = rateCard(card, 'again', TODAY);
      expect(result.interval).toBe(0);
      expect(result.reps).toBe(0);
      expect(result.lapses).toBe(1);
      expect(result.dueDate).toBe(TODAY);
    });

    it('decreases ease', () => {
      const card = makeCard({ ease: 2.5 });
      const result = rateCard(card, 'again', TODAY);
      expect(result.ease).toBe(2.3);
    });

    it('does not go below 1.3 ease', () => {
      const card = makeCard({ ease: 1.3 });
      const result = rateCard(card, 'again', TODAY);
      expect(result.ease).toBe(1.3);
    });
  });

  describe('hard rating', () => {
    it('increases interval slightly', () => {
      const card = makeCard({ interval: 10, reps: 3 });
      const result = rateCard(card, 'hard', TODAY);
      expect(result.interval).toBe(12);
      expect(result.reps).toBe(4);
    });

    it('decreases ease slightly', () => {
      const card = makeCard({ ease: 2.5 });
      const result = rateCard(card, 'hard', TODAY);
      expect(result.ease).toBe(2.45);
    });

    it('minimum interval of 2', () => {
      const card = makeCard({ interval: 0 });
      const result = rateCard(card, 'hard', TODAY);
      expect(result.interval).toBe(2);
    });
  });

  describe('good rating', () => {
    it('first rep sets interval to 1', () => {
      const card = makeCard({ reps: 0, interval: 0 });
      const result = rateCard(card, 'good', TODAY);
      expect(result.interval).toBe(1);
      expect(result.reps).toBe(1);
    });

    it('second rep sets interval to 3', () => {
      const card = makeCard({ reps: 1, interval: 1 });
      const result = rateCard(card, 'good', TODAY);
      expect(result.interval).toBe(3);
      expect(result.reps).toBe(2);
    });

    it('subsequent reps use ease multiplier', () => {
      const card = makeCard({ reps: 3, interval: 7, ease: 2.5 });
      const result = rateCard(card, 'good', TODAY);
      expect(result.interval).toBe(18);
      expect(result.reps).toBe(4);
    });

    it('sets future due date', () => {
      const card = makeCard({ reps: 2, interval: 3 });
      const result = rateCard(card, 'good', TODAY);
      expect(result.dueDate).toBe('2024-06-23');
    });
  });

  describe('easy rating', () => {
    it('increases interval with bonus', () => {
      const card = makeCard({ interval: 10, ease: 2.5, reps: 5 });
      const result = rateCard(card, 'easy', TODAY);
      expect(result.interval).toBe(33);
      expect(result.ease).toBe(2.65);
      expect(result.reps).toBe(6);
    });

    it('increases ease', () => {
      const card = makeCard({ ease: 2.5 });
      const result = rateCard(card, 'easy', TODAY);
      expect(result.ease).toBe(2.65);
    });

    it('does not exceed 3.2 ease', () => {
      const card = makeCard({ ease: 3.2 });
      const result = rateCard(card, 'easy', TODAY);
      expect(result.ease).toBe(3.2);
    });
  });
});

describe('RATING_XP', () => {
  it('has correct XP values', () => {
    expect(RATING_XP.again).toBe(2);
    expect(RATING_XP.hard).toBe(5);
    expect(RATING_XP.good).toBe(8);
    expect(RATING_XP.easy).toBe(10);
  });
});

describe('isArenaAnswerCorrect', () => {
  it('matches exact answer', () => {
    const question = { answer: 'Paris', accepted: [] };
    expect(isArenaAnswerCorrect(question, 'Paris')).toBe(true);
  });

  it('matches case-insensitive', () => {
    const question = { answer: 'Paris', accepted: [] };
    expect(isArenaAnswerCorrect(question, 'paris')).toBe(true);
    expect(isArenaAnswerCorrect(question, 'PARIS')).toBe(true);
  });

  it('matches accepted alternatives', () => {
    const question = { answer: 'Paris', accepted: ['City of Light', 'Ville Lumière'] };
    expect(isArenaAnswerCorrect(question, 'City of Light')).toBe(true);
    expect(isArenaAnswerCorrect(question, 'Ville Lumière')).toBe(true);
  });

  it('rejects wrong answers', () => {
    const question = { answer: 'Paris', accepted: [] };
    expect(isArenaAnswerCorrect(question, 'London')).toBe(false);
  });

  it('rejects empty answers', () => {
    const question = { answer: 'Paris', accepted: [] };
    expect(isArenaAnswerCorrect(question, '')).toBe(false);
  });

  it('handles unicode normalization', () => {
    const question = { answer: 'café', accepted: [] };
    expect(isArenaAnswerCorrect(question, 'cafe')).toBe(true);
  });
});

describe('generateArenaHint', () => {
  it('returns custom hint if provided', () => {
    const question = { answer: 'Paris', hint: 'Capital of France' };
    expect(generateArenaHint(question)).toBe('Capital of France');
  });

  it('generates default hint', () => {
    const question = { answer: 'Paris', hint: '' };
    const hint = generateArenaHint(question);
    expect(hint).toContain('P');
    expect(hint).toContain('5');
  });
});

describe('processRating', () => {
  it('processes a rating and advances index', () => {
    const queue = [makeCard({ id: 'c1' }), makeCard({ id: 'c2' })];
    const session = { queue, index: 0, stats: { reviewed: 0, remembered: 0 }, attempts: new Map() };
    const result = processRating(session, 'good');
    expect(result.index).toBe(1);
    expect(result.stats.reviewed).toBe(1);
    expect(result.stats.remembered).toBe(1);
    expect(result.complete).toBe(false);
  });

  it('completes when last card rated', () => {
    const queue = [makeCard({ id: 'c1' })];
    const session = { queue, index: 0, stats: { reviewed: 0, remembered: 0 }, attempts: new Map() };
    const result = processRating(session, 'good');
    expect(result.complete).toBe(true);
  });

  it('re-adds "again" cards to queue (max 2 attempts)', () => {
    const queue = [makeCard({ id: 'c1' })];
    const session = { queue, index: 0, stats: { reviewed: 0, remembered: 0 }, attempts: new Map() };
    const result = processRating(session, 'again');
    expect(result.queue).toHaveLength(2);
    expect(result.complete).toBe(false);
  });

  it('stops re-adding after 2 attempts', () => {
    const queue = [makeCard({ id: 'c1' })];
    const attempts = new Map([['c1', 2]]);
    const session = { queue, index: 0, stats: { reviewed: 0, remembered: 0 }, attempts };
    const result = processRating(session, 'again');
    expect(result.queue).toHaveLength(1);
    expect(result.complete).toBe(true);
  });

  it('tracks remembered stats correctly', () => {
    const queue = [makeCard({ id: 'c1' }), makeCard({ id: 'c2' })];
    let session = { queue, index: 0, stats: { reviewed: 0, remembered: 0 }, attempts: new Map() };
    session = processRating(session, 'again');
    session = processRating(session, 'good');
    expect(session.stats.reviewed).toBe(2);
    expect(session.stats.remembered).toBe(1);
  });
});
