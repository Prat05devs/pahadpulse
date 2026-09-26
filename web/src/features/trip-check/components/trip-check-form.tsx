import React from 'react';
import { Search } from 'lucide-react';
import type { DestinationGroup } from '../model';

interface TripCheckFormProps {
  groups: DestinationGroup[];
  dates: { value: string; label: string }[];
  selectedTo: string;
  selectedDate: string;
}

/**
 * A plain GET form: the result is a shareable URL (`/trip-check?to=kedarnath&date=…`) and the
 * tool works before, or without, client JavaScript.
 */
export function TripCheckForm({ groups, dates, selectedTo, selectedDate }: TripCheckFormProps) {
  return (
    <form
      action="/trip-check"
      method="get"
      className="grid gap-3 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-card backdrop-blur-xl sm:p-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-end"
    >
      <div>
        <label htmlFor="trip-to" className="text-xs font-semibold text-text-light">
          Where are you going?
        </label>
        <select
          id="trip-to"
          name="to"
          defaultValue={selectedTo}
          required
          className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
        >
          <option value="" disabled>
            Choose a place or district
          </option>
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={`${group.label}-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="trip-date" className="text-xs font-semibold text-text-light">
          Travel date
        </label>
        <select
          id="trip-date"
          name="date"
          defaultValue={selectedDate}
          className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
        >
          {dates.map((date) => (
            <option key={date.value} value={date.value}>
              {date.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
      >
        <Search className="size-4" aria-hidden="true" />
        Check conditions
      </button>
    </form>
  );
}
