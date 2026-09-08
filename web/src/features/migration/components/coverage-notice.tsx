import React from 'react';
import { Clock3 } from 'lucide-react';
import type { Coverage } from '../schemas';

/**
 * What we say when a district's figures are not all there.
 *
 * Rendered instead of a panel, never as well as an empty one. A blank card and a broken
 * card look identical, and a reader who cannot tell them apart learns to distrust both.
 */
export function CoverageNotice({
  coverage,
  note,
  subject,
}: {
  coverage: Coverage;
  note: string | null;
  subject: string;
}) {
  if (coverage === 'covered') return null;

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-text-light">
        <Clock3 className="size-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
        {coverage === 'partial' ? `${subject}: partly available` : `${subject}: being compiled`}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {note ??
          'We are still working on this data. It will appear here as soon as a published source covers it.'}
      </p>
    </div>
  );
}
