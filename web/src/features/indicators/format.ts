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
    default:
      return `${number} ${unit}`;
  }
}
