import type { TranslationKey } from '@/i18n';

import type { BusinessScheme } from './schemas';

/**
 * Plain-language buckets over the directory's ~130 raw support types, so a reader can ask for
 * "money as a grant" without knowing that the catalogue also calls it "seed support" or
 * "pilot funding". A scheme can sit in several buckets.
 */
export const SUPPORT_BUCKETS: { key: string; label: TranslationKey; match: RegExp }[] = [
  {
    key: 'grant',
    label: 'schemes.bucket.grant',
    match: /grant|seed|pilot funding|fellowship|award/i,
  },
  { key: 'loan', label: 'schemes.bucket.loan', match: /loan|debt|credit|finance/i },
  {
    key: 'subsidy',
    label: 'schemes.bucket.subsidy',
    match: /subsid|subvention|reimburse|incentive/i,
  },
  { key: 'equity', label: 'schemes.bucket.equity', match: /equity|investment|fund/i },
  {
    key: 'incubation',
    label: 'schemes.bucket.incubation',
    match: /incubat|accelerat|mentor|handholding/i,
  },
  {
    key: 'training',
    label: 'schemes.bucket.training',
    match: /training|skill|capacity|entrepreneurship development/i,
  },
  { key: 'market', label: 'schemes.bucket.market', match: /market|procurement|export|trade/i },
];

export type SchemeFilters = { query: string; sector: string; bucket: string };

export function filterSchemes(
  schemes: readonly BusinessScheme[],
  { query, sector, bucket }: SchemeFilters
): BusinessScheme[] {
  const needle = query.trim().toLowerCase();
  const bucketMatch = SUPPORT_BUCKETS.find((entry) => entry.key === bucket)?.match;
  return schemes.filter((scheme) => {
    if (sector && !scheme.sector.includes(sector)) return false;
    if (bucketMatch && !scheme.support.some((support) => bucketMatch.test(support)))
      return false;
    if (!needle) return true;
    return [scheme.name, scheme.acronym, scheme.owner, scheme.summary, ...scheme.support].some(
      (value) => value.toLowerCase().includes(needle)
    );
  });
}

export type SchemeAvailability = 'open' | 'closed' | 'periodic';

/**
 * Whether a reader can apply now, read from the directory's status slug. Only the two
 * unambiguous ends are coloured; everything call- or cohort-based stays neutral.
 */
export function schemeAvailability(status: string): SchemeAvailability {
  if (/closed|historical|ended/.test(status)) return 'closed';
  if (/^(standing|active|official-gateway|rolling)/.test(status)) return 'open';
  return 'periodic';
}
