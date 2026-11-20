import { describe, expect, it } from 'vitest';
import { dailyIndex, dailyPick, randomPick } from './daily-pick';

describe('dailyIndex', () => {
  it('is stable for the same day', () => {
    const morning = new Date('2026-08-10T01:00:00Z');
    const night = new Date('2026-08-10T23:59:00Z');
    expect(dailyIndex(5, morning)).toBe(dailyIndex(5, night));
  });

  it('advances by one index per UTC day', () => {
    const day1 = new Date('2026-08-10T12:00:00Z');
    const day2 = new Date('2026-08-11T12:00:00Z');
    expect(dailyIndex(7, day2)).toBe((dailyIndex(7, day1) + 1) % 7);
  });

  it('returns 0 for a non-positive length', () => {
    expect(dailyIndex(0)).toBe(0);
  });
});

describe('dailyPick', () => {
  it('picks an item within bounds deterministically for a given date', () => {
    const items = ['a', 'b', 'c'];
    const date = new Date('2026-08-10T12:00:00Z');
    expect(dailyPick(items, date)).toBe(items[dailyIndex(items.length, date)]);
  });

  it('throws on an empty list', () => {
    expect(() => dailyPick([])).toThrow('Cannot pick from an empty list');
  });
});

describe('randomPick', () => {
  it('always returns one of the given items', () => {
    const items = [1, 2, 3];
    for (let i = 0; i < 20; i++) {
      expect(items).toContain(randomPick(items));
    }
  });

  it('throws on an empty list', () => {
    expect(() => randomPick([])).toThrow('Cannot pick from an empty list');
  });
});
