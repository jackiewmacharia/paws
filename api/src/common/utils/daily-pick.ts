export function dailyIndex(length: number, date: Date = new Date()): number {
  if (length <= 0) return 0;
  const dayNumber = Math.floor(date.getTime() / 86_400_000);
  return dayNumber % length;
}

export function dailyPick<T>(items: readonly T[], date: Date = new Date()): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from an empty list');
  }
  return items[dailyIndex(items.length, date)];
}

export function randomPick<T>(items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from an empty list');
  }
  return items[Math.floor(Math.random() * items.length)];
}
