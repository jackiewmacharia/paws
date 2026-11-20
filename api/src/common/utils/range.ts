export interface NumericRange {
  min: number;
  max: number;
  avg: number;
}

/** Parses loose upstream strings like `"12 - 15"` or `"12-15 years"`. */
export function parseRange(
  text: string | null | undefined,
): NumericRange | undefined {
  if (!text) return undefined;
  const numbers = text.match(/\d+(\.\d+)?/g)?.map(Number);
  if (!numbers || numbers.length === 0) return undefined;

  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  return { min, max, avg: Math.round(((min + max) / 2) * 10) / 10 };
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
