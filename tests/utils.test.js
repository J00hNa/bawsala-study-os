import { describe, it, expect } from 'vitest';
import {
  uid, clamp, percentClass, escapeHTML, localISO, addDays,
  daysBetween, formatMinutes, normalizeAnswer, randomize, asRecord,
  safeText, safeId, safeRef, safeNumber, safeTimestamp, safeDate, safeTime,
  safeEnum, safeUrl, sanitizeList, highlightMatch, setPercentClass,
  getDisplayTimeZone, setDisplayTimeZone
} from '../src/utils.js';

describe('uid', () => {
  it('generates unique identifiers', () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[a-f0-9-]+$/);
  });
});

describe('clamp', () => {
  it('clamps to min and max', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('percentClass', () => {
  it('generates CSS class name', () => {
    expect(percentClass('w-pct', 50)).toBe('w-pct-50');
    expect(percentClass('h-pct', 0)).toBe('h-pct-0');
    expect(percentClass('w-pct', 150)).toBe('w-pct-100');
    expect(percentClass('w-pct', -5)).toBe('w-pct-0');
  });
});

describe('escapeHTML', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHTML('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(escapeHTML("it's a test")).toBe("it&#039;s a test");
    expect(escapeHTML('a & b')).toBe('a &amp; b');
  });

  it('handles null and undefined', () => {
    expect(escapeHTML(null)).toBe('');
    expect(escapeHTML(undefined)).toBe('');
  });
});

describe('localISO', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = localISO(new Date('2024-06-15T12:00:00Z'));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('addDays', () => {
  it('adds days to a date string', () => {
    expect(addDays('2024-01-01', 1)).toBe('2024-01-02');
    expect(addDays('2024-01-01', -1)).toBe('2023-12-31');
    expect(addDays('2024-01-01', 0)).toBe('2024-01-01');
  });
});

describe('daysBetween', () => {
  it('calculates days between dates', () => {
    expect(daysBetween('2024-01-01', '2024-01-02')).toBe(1);
    expect(daysBetween('2024-01-02', '2024-01-01')).toBe(-1);
    expect(daysBetween('2024-01-01', '2024-01-01')).toBe(0);
  });
});

describe('formatMinutes', () => {
  it('formats minutes correctly', () => {
    expect(formatMinutes(0)).toBe('0m');
    expect(formatMinutes(30)).toBe('30m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(90)).toBe('1h 30m');
    expect(formatMinutes(120)).toBe('2h');
  });

  it('handles edge cases', () => {
    expect(formatMinutes(null)).toBe('0m');
    expect(formatMinutes(undefined)).toBe('0m');
    expect(formatMinutes(-5)).toBe('0m');
    expect(formatMinutes(1.5)).toBe('2m');
  });
});

describe('normalizeAnswer', () => {
  it('normalizes text for comparison', () => {
    expect(normalizeAnswer('Hello World')).toBe('hello world');
    expect(normalizeAnswer('  spaced  ')).toBe('spaced');
    expect(normalizeAnswer('café')).toBe('cafe');
  });

  it('removes invisible characters', () => {
    expect(normalizeAnswer('test\u200B')).toBe('test');
  });
});

describe('randomize', () => {
  it('returns same items shuffled', () => {
    const items = [1, 2, 3, 4, 5];
    const result = randomize(items);
    expect(result.sort()).toEqual(items);
  });

  it('does not mutate original', () => {
    const items = [1, 2, 3];
    const original = [...items];
    randomize(items);
    expect(items).toEqual(original);
  });
});

describe('asRecord', () => {
  it('returns object or empty', () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    expect(asRecord(null)).toEqual({});
    expect(asRecord(undefined)).toEqual({});
    expect(asRecord([1, 2])).toEqual({});
    expect(asRecord('string')).toEqual({});
  });
});

describe('safeText', () => {
  it('truncates and sanitizes', () => {
    expect(safeText('hello', 3)).toBe('hel');
    expect(safeText(null)).toBe('');
    expect(safeText('test\u0000value')).toBe('testvalue');
  });
});

describe('safeId', () => {
  it('validates ID format', () => {
    expect(safeId('abc-123')).toBe('abc-123');
    expect(safeId('valid_id')).toBe('valid_id');
    expect(safeId('has spaces')).not.toBe('has spaces');
    expect(safeId('')).not.toBe('');
  });
});

describe('safeRef', () => {
  it('validates or returns empty', () => {
    expect(safeRef('valid-ref')).toBe('valid-ref');
    expect(safeRef('bad ref')).toBe('');
    expect(safeRef('')).toBe('');
  });
});

describe('safeNumber', () => {
  it('clamps and validates numbers', () => {
    expect(safeNumber(5, 0, 10)).toBe(5);
    expect(safeNumber(-1, 0, 10)).toBe(0);
    expect(safeNumber(15, 0, 10)).toBe(10);
    expect(safeNumber('abc', 0, 10, 5)).toBe(5);
    expect(safeNumber(null, 0, 10, 3)).toBe(3);
  });
});

describe('safeTimestamp', () => {
  it('validates timestamps', () => {
    expect(safeTimestamp(1700000000000)).toBe(1700000000000);
    expect(safeTimestamp(0)).toBeTypeOf('number');
    expect(safeTimestamp(-1)).toBeTypeOf('number');
    expect(safeTimestamp(4102444800001)).toBeTypeOf('number');
  });
});

describe('safeDate', () => {
  it('validates date strings', () => {
    expect(safeDate('2024-06-15')).toBe('2024-06-15');
    expect(safeDate('invalid')).toBe('');
    expect(safeDate('2024-13-01')).toBe('');
    expect(safeDate(null)).toBe('');
  });
});

describe('safeTime', () => {
  it('validates time strings', () => {
    expect(safeTime('14:30')).toBe('14:30');
    expect(safeTime('23:59')).toBe('23:59');
    expect(safeTime('25:00')).toBe('16:00');
    expect(safeTime('invalid')).toBe('16:00');
  });
});

describe('safeEnum', () => {
  it('returns valid enum or fallback', () => {
    expect(safeEnum('a', ['a', 'b', 'c'], 'a')).toBe('a');
    expect(safeEnum('x', ['a', 'b', 'c'], 'a')).toBe('a');
  });
});

describe('safeUrl', () => {
  it('validates HTTPS URLs', () => {
    expect(safeUrl('https://example.com')).toBe('https://example.com/');
    expect(safeUrl('http://localhost:3000')).toBe('http://localhost:3000/');
    expect(safeUrl('http://example.com')).toBe('');
    expect(safeUrl('not-a-url')).toBe('');
    expect(safeUrl('')).toBe('');
  });
});

describe('sanitizeList', () => {
  it('sanitizes and limits arrays', () => {
    const items = [{ id: '1', name: 'a' }, { id: '2', name: 'b' }];
    const result = sanitizeList(items, [], 10, item => ({ id: item.id, name: item.name }));
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('a');
  });

  it('deduplicates IDs', () => {
    const items = [{ id: '1', name: 'a' }, { id: '1', name: 'b' }];
    const result = sanitizeList(items, [], 10, item => ({ id: item.id, name: item.name }));
    expect(result).toHaveLength(2);
    expect(result[0].id).not.toBe(result[1].id);
  });

  it('enforces limit', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: String(i) }));
    const result = sanitizeList(items, [], 5, item => item);
    expect(result).toHaveLength(5);
  });
});

describe('highlightMatch', () => {
  it('highlights matching text', () => {
    expect(highlightMatch('Hello World', 'World')).toBe('Hello <mark>World</mark>');
    expect(highlightMatch('Hello World', '')).toBe('Hello World');
    expect(highlightMatch('Hello World', null)).toBe('Hello World');
  });
});

describe('setPercentClass', () => {
  it('sets percentage class on element', () => {
    const classes = [];
    const el = {
      classList: {
        [Symbol.iterator]: function* () { yield* classes; },
        filter(predicate) { return classes.filter(predicate); },
        remove(...names) { for (const name of names) { const i = classes.indexOf(name); if (i >= 0) classes.splice(i, 1); } },
        add(...names) { classes.push(...names); }
      }
    };
    setPercentClass(el, 'w-pct', 50);
    expect(classes).toContain('w-pct-50');
  });

  it('handles null element', () => {
    // Should not throw
    setPercentClass(null, 'w-pct', 50);
  });
});

describe('timezone', () => {
  it('gets and sets display timezone', () => {
    const original = getDisplayTimeZone();
    setDisplayTimeZone('America/New_York');
    expect(getDisplayTimeZone()).toBe('America/New_York');
    setDisplayTimeZone(original);
  });
});
