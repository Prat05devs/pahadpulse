import type { RankedIndicator } from './schemas';

/**
 * Governance formatters, matching `web/src/features/governance/format.ts` output exactly.
 * Built on `Intl.NumberFormat` directly: Hermes backs that with ICU, where
 * `Number.prototype.toLocaleString` options are not guaranteed.
 */
const grouped = (value: number, minimum: number, maximum: number) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: minimum,
    maximumFractionDigits: maximum,
  }).format(value);

/** Budget rows are stored in thousands of rupees, matching the source document. */
export function formatCrore(thousands: number, maximumFractionDigits = 2): string {
  return `₹${grouped(thousands / 10_000, 0, maximumFractionDigits)} cr`;
}

export function formatRankedValue(item: RankedIndicator): string {
  const value = grouped(item.value, item.decimals, item.decimals);

  switch (item.unit) {
    case 'percent':
      return `${value}%`;
    case 'inr':
      return `₹${value}`;
    case 'rank':
      return `#${value}`;
    case 'females_per_1000_males':
      return `${value} per 1,000 men`;
    case 'per_1000_population':
      return `${value} per 1,000`;
    case 'kg_per_day':
      return `${value} kg/day`;
    default:
      return value;
  }
}

/** A compact, readable vintage for dense tables. */
export function formatVintage(value: string): string {
  const [year, month, day] = value.split('-');
  if (year === undefined || month === undefined || day === undefined) return value;
  return `${day}/${month}/${year}`;
}
