import type { RankedIndicator } from './schemas';

/** Budget rows are stored in thousands of rupees, matching the source document. */
export function formatCrore(thousands: number, maximumFractionDigits = 2): string {
  return `₹${(thousands / 10_000).toLocaleString('en-IN', { maximumFractionDigits })} cr`;
}

export function formatRankedValue(item: RankedIndicator): string {
  const value = item.value.toLocaleString('en-IN', {
    minimumFractionDigits: item.decimals,
    maximumFractionDigits: item.decimals,
  });

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
