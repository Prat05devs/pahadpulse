/**
 * Renders an indicator value in its own unit.
 *
 * Numerals stay Latin in both locales (a global constraint): Devanagari digits hurt scanning
 * in tables and break tabular alignment. `en-IN` is used for grouping so large figures read
 * as 3,62,688 — the lakh/crore grouping a reader of an Indian government statistic expects —
 * rather than 362,688.
 */
export function formatIndicatorValue(value: number, unit: string, decimals: number): string {
  const number = value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  switch (unit) {
    case 'percent':
      return `${number}%`;
    case 'inr':
      return `₹${number}`;
    case 'females_per_1000_males':
      return `${number} per 1,000 men`;
    case 'per_1000_population':
      return `${number} per 1,000`;
    case 'count':
      return number;
    // A score out of 100 carries no suffix: the label already says it is an index, and
    // "67 index" reads as a unit that does not exist.
    case 'index':
      return number;
    // A rank is a position, not a quantity. The hash says so without the label having to
    // repeat itself, and "2 rank" reads as a count of ranks.
    case 'rank':
      return `#${number}`;
    case 'kg_per_day':
      return `${number} kg/day`;
    default:
      return `${number} ${unit}`;
  }
}
