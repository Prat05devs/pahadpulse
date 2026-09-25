/**
 * What each district is strong and weak at, relative to the other twelve.
 *
 * WHAT THIS IS. A ranking, and nothing more. "Weakest" here means "ranks lowest among
 * Uttarakhand's districts on this published figure, of this vintage" — not that a place is
 * failing, and not a judgement this platform is in a position to make. The wording the UI
 * uses has to keep saying that, because a governance dashboard is exactly where a relative
 * rank gets quoted as an absolute verdict.
 *
 * WHAT IT REFUSES TO DO. An indicator is used only when it covers every district and has a
 * declared direction. Ranking a district against twelve blanks produces a confident-looking
 * number that means nothing, and population has no better or worse. Indicators left out are
 * returned by name, so the dashboard can say what it could not consider rather than quietly
 * narrowing the question.
 */

export interface IndicatorSeriesInput {
  key: string;
  label: string;
  unit: string;
  decimals: number;
  /** Null means the indicator has no direction — population, area, sex ratio. */
  higherIsBetter: boolean | null;
  vintage: string;
  values: { slug: string; name: string; value: number }[];
}

export interface RankedIndicator {
  key: string;
  label: string;
  unit: string;
  decimals: number;
  vintage: string;
  value: number;
  rank: number;
  of: number;
}

export interface DistrictProfile {
  slug: string;
  name: string;
  /** Every usable indicator, best rank first. */
  ranked: RankedIndicator[];
  strengths: RankedIndicator[];
  weaknesses: RankedIndicator[];
}

export interface ProfileReport {
  districts: DistrictProfile[];
  /** Indicators considered, and the ones that could not be. */
  used: { key: string; label: string; vintage: string }[];
  excluded: {
    key: string;
    label: string;
    vintage: string;
    reason: 'no-direction' | 'partial-coverage';
  }[];
}

/** How many of each to surface. Three reads as a summary; ten reads as the whole list again. */
const HIGHLIGHT_COUNT = 3;

function isUsable(
  series: IndicatorSeriesInput,
  districtCount: number,
): { ok: true } | { ok: false; reason: 'no-direction' | 'partial-coverage' } {
  if (series.higherIsBetter === null) return { ok: false, reason: 'no-direction' };
  if (series.values.length < districtCount) return { ok: false, reason: 'partial-coverage' };
  return { ok: true };
}

/**
 * Ranks each district on every usable indicator, then picks its best and worst few.
 *
 * Ties share the lower rank number, the way a league table does — two districts on the same
 * literacy rate are both 4th, and the next is 6th. Presenting one of them as 5th would be
 * inventing a difference the data does not contain.
 */
export function buildProfiles(
  series: readonly IndicatorSeriesInput[],
  districts: readonly { slug: string; name: string }[],
): ProfileReport {
  const used: ProfileReport['used'] = [];
  const excluded: ProfileReport['excluded'] = [];
  const perDistrict = new Map<string, RankedIndicator[]>(
    districts.map((district) => [district.slug, []]),
  );

  for (const item of series) {
    const usable = isUsable(item, districts.length);
    if (!usable.ok) {
      excluded.push({
        key: item.key,
        label: item.label,
        vintage: item.vintage,
        reason: usable.reason,
      });
      continue;
    }
    used.push({ key: item.key, label: item.label, vintage: item.vintage });

    const ascending = item.higherIsBetter === false;
    const sorted = [...item.values].sort((a, b) =>
      ascending ? a.value - b.value : b.value - a.value,
    );

    sorted.forEach((entry, index) => {
      const previous = sorted[index - 1];
      const rank =
        previous !== undefined && previous.value === entry.value
          ? (perDistrict.get(previous.slug)?.find((r) => r.key === item.key)?.rank ?? index + 1)
          : index + 1;

      perDistrict.get(entry.slug)?.push({
        key: item.key,
        label: item.label,
        unit: item.unit,
        decimals: item.decimals,
        vintage: item.vintage,
        value: entry.value,
        rank,
        of: sorted.length,
      });
    });
  }

  const profiles = districts.map((district) => {
    const ranked = [...(perDistrict.get(district.slug) ?? [])].sort((a, b) => a.rank - b.rank);
    return {
      slug: district.slug,
      name: district.name,
      ranked,
      strengths: ranked.slice(0, HIGHLIGHT_COUNT),
      // From the end, worst first — the section that asks "what should be improved" reads
      // top-down like everything else.
      weaknesses: [...ranked].reverse().slice(0, HIGHLIGHT_COUNT),
    };
  });

  return { districts: profiles, used, excluded };
}

/**
 * The districts with the most bottom-half placements, worst first.
 *
 * Counting placements rather than averaging ranks on purpose: an average is one number that
 * hides whether a district is uniformly mid-table or bottom on five things and top on one,
 * and it is the second that a coordination meeting needs to see.
 */
export function rankByNeed(
  profiles: readonly DistrictProfile[],
): { slug: string; name: string; bottomHalf: number; of: number; worst: RankedIndicator[] }[] {
  return profiles
    .map((profile) => ({
      slug: profile.slug,
      name: profile.name,
      bottomHalf: profile.ranked.filter((item) => item.rank > item.of / 2).length,
      of: profile.ranked.length,
      worst: profile.weaknesses,
    }))
    .sort((a, b) => b.bottomHalf - a.bottomHalf || a.name.localeCompare(b.name));
}
