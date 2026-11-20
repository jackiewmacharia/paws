/** Both APIs describe temperament as one comma-separated string, e.g. "Active, Energetic, Gentle". */
export function parseTraits(temperament: string | undefined): string[] {
  return (temperament ?? '')
    .split(',')
    .map((trait) => trait.trim())
    .filter(Boolean);
}
