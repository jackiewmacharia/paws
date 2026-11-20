import { average, parseRange } from './range';

describe('parseRange', () => {
  it('parses a simple "min - max" string', () => {
    expect(parseRange('12 - 15')).toEqual({ min: 12, max: 15, avg: 13.5 });
  });

  it('parses ranges with inconsistent whitespace and trailing units', () => {
    expect(parseRange('7  -  10')).toEqual({ min: 7, max: 10, avg: 8.5 });
    expect(parseRange('12-15 years')).toEqual({ min: 12, max: 15, avg: 13.5 });
  });

  it('parses decimal values', () => {
    expect(parseRange('3.2-4.5')).toEqual({ min: 3.2, max: 4.5, avg: 3.9 });
  });

  it('returns undefined for missing or non-numeric input', () => {
    expect(parseRange(undefined)).toBeUndefined();
    expect(parseRange(null)).toBeUndefined();
    expect(parseRange('unknown')).toBeUndefined();
  });
});

describe('average', () => {
  it('averages a list of numbers, rounded to 1 decimal', () => {
    expect(average([14.5, 13.5])).toBe(14);
    expect(average([13.5, 11.5])).toBe(12.5);
  });

  it('returns 0 for an empty list', () => {
    expect(average([])).toBe(0);
  });
});
