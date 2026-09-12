'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight } from 'lucide-react';

interface DistrictOption {
  slug: string;
  nameEn: string;
  nameHi: string;
}

interface DistrictPickerProps {
  districts: DistrictOption[];
  selectedA: string;
  selectedB: string;
}

/**
 * The two district selectors.
 *
 * Selection lives in the URL rather than in component state, so a comparison can be linked,
 * bookmarked and cited — which matters on a platform whose point is letting someone check a
 * figure against its source. It also means the page stays a Server Component and the data is
 * fetched once on the server instead of round-tripping from the browser.
 */
export function DistrictPicker({ districts, selectedA, selectedB }: DistrictPickerProps) {
  const router = useRouter();
  
  const [localA, setLocalA] = React.useState(selectedA || '');
  const [localB, setLocalB] = React.useState(selectedB || '');

  const go = () => {
    if (localA && localB) {
      router.push(`/compare?a=${encodeURIComponent(localA)}&b=${encodeURIComponent(localB)}`);
    }
  };

  const renderOptions = (disabledSlug: string) =>
    districts.map((district) => (
      <option key={district.slug} value={district.slug} disabled={district.slug === disabledSlug}>
        {district.nameEn} · {district.nameHi}
      </option>
    ));

  const selectClass =
    'w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm font-medium ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            First district
          </span>
          <select
            className={selectClass}
            value={localA}
            onChange={(event) => setLocalA(event.target.value)}
          >
            <option value="" disabled>Select district...</option>
            {renderOptions(localB)}
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            const temp = localA;
            setLocalA(localB);
            setLocalB(temp);
          }}
          aria-label="Swap the two districts"
          title="Swap"
          className="mb-0.5 self-center rounded-md border border-border bg-surface p-2.5 text-muted-foreground transition hover:bg-surface-hover hover:text-text-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeftRight className="size-4" aria-hidden="true" />
        </button>

        <label className="flex-1">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Second district
          </span>
          <select
            className={selectClass}
            value={localB}
            onChange={(event) => setLocalB(event.target.value)}
          >
            <option value="" disabled>Select district...</option>
            {renderOptions(localA)}
          </select>
        </label>
      </div>
      <div>
        <button
          type="button"
          onClick={go}
          disabled={!localA || !localB}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Compare
        </button>
      </div>
    </div>
  );
}
