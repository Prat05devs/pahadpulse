import {
  formatCompact,
  formatDate,
  formatNumber,
  formatRelative,
  formatUnit,
  humanise,
  localise,
  parseUtc,
} from './format';

describe('localise', () => {
  it('returns the requested language', () => {
    expect(localise({ en: 'Dehradun', hi: 'देहरादून' }, 'hi')).toBe('देहरादून');
  });

  it('falls back to the other language rather than an empty string', () => {
    // Hindi coverage is uneven across departments. A reader who picked Hindi is better
    // served by the English name than by a blank row.
    expect(localise({ en: 'Bageshwar', hi: '' }, 'hi')).toBe('Bageshwar');
  });

  it('treats whitespace as absent', () => {
    expect(localise({ en: 'Almora', hi: '   ' }, 'hi')).toBe('Almora');
  });

  it('handles a null value', () => {
    expect(localise(null, 'en')).toBe('');
  });
});

describe('parseUtc', () => {
  it("reads the API's space-separated format as UTC", () => {
    // The bug this guards: without the explicit Z, some engines read this as local time,
    // which puts every "x hours ago" 5.5 hours out for readers in India.
    expect(parseUtc('2026-09-10 04:30:00')?.toISOString()).toBe('2026-09-10T04:30:00.000Z');
  });

  it('accepts an ISO string unchanged', () => {
    expect(parseUtc('2026-09-10T04:30:00Z')?.toISOString()).toBe('2026-09-10T04:30:00.000Z');
  });

  it('returns null for nonsense rather than an Invalid Date', () => {
    expect(parseUtc('not a date')).toBeNull();
    expect(parseUtc(null)).toBeNull();
  });
});

describe('formatUnit', () => {
  it('maps a raw unit key to its symbol', () => {
    // The web app shipped `24 deg_c` onto live district pages. This is that regression.
    expect(formatUnit(24, 'deg_c')).toBe('24°C');
    expect(formatUnit(65, 'percent')).toBe('65%');
    expect(formatUnit(12.5, 'mm', 1)).toBe('12.5 mm');
  });

  it('shows an unmapped unit rather than dropping it', () => {
    // A visibly wrong label gets reported; a silently missing one never does.
    expect(formatUnit(5, 'furlongs')).toBe('5 furlongs');
  });

  it('omits the unit when there is none', () => {
    expect(formatUnit(1200, null)).toBe('1,200');
  });
});

describe('formatNumber', () => {
  it('groups digits the Indian way', () => {
    expect(formatNumber(1086346)).toBe('10,86,346');
  });
});

describe('formatCompact', () => {
  it('uses lakh and crore', () => {
    expect(formatCompact(1086346)).toBe('11 L');
    expect(formatCompact(15000000)).toBe('1.5 Cr');
    // Past a hundred million the decimal stops earning its place.
    expect(formatCompact(115000000)).toBe('12 Cr');
    expect(formatCompact(4300)).toBe('4.3 K');
  });

  it('leaves small numbers alone', () => {
    expect(formatCompact(13)).toBe('13');
  });
});

describe('formatDate', () => {
  it('renders a date-only vintage without shifting the day', () => {
    // A vintage is `YYYY-MM-DD`. Parsed as local time it can slip to the previous day.
    expect(formatDate('2011-03-01')).toBe('1 Mar 2011');
  });
});

describe('humanise', () => {
  it('turns an enum value into a sentence', () => {
    expect(humanise('partly_cloudy')).toBe('Partly cloudy');
    expect(humanise('extreme')).toBe('Extreme');
  });
});

describe('formatRelative', () => {
  const now = new Date('2026-09-10T12:00:00Z').getTime();

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // The regression this guards: Hermes has no `Intl.RelativeTimeFormat`, so the previous
  // implementation threw "undefined cannot be used as a constructor" on device and took
  // down every screen rendering a source note. Node has it, so this never failed in CI.
  it('does not throw on an engine without Intl.RelativeTimeFormat', () => {
    // `Intl.RelativeTimeFormat` is read-only to TypeScript, so reach it through an index
    // signature to delete and restore it the way a missing engine feature behaves.
    const intl = Intl as unknown as Record<string, unknown>;
    const saved = intl.RelativeTimeFormat;
    delete intl.RelativeTimeFormat;
    try {
      expect(formatRelative('2026-09-10 09:00:00')).toBe('3 hours ago');
    } finally {
      intl.RelativeTimeFormat = saved;
    }
  });

  it('reads the API\'s UTC format', () => {
    expect(formatRelative('2026-09-10 09:00:00')).toBe('3 hours ago');
  });

  it('collapses anything under a minute', () => {
    expect(formatRelative('2026-09-10 11:59:30')).toBe('just now');
  });

  it('singularises', () => {
    expect(formatRelative('2026-09-10 11:00:00')).toBe('1 hour ago');
  });

  it("uses the 'auto' wording for a single day", () => {
    expect(formatRelative('2026-09-09 12:00:00')).toBe('yesterday');
  });

  it('handles a future instant, as an alert expiry is', () => {
    expect(formatRelative('2026-09-10 15:00:00')).toBe('in 3 hours');
    expect(formatRelative('2026-09-11 12:00:00')).toBe('tomorrow');
  });

  it('returns an empty string for a missing value', () => {
    expect(formatRelative(null)).toBe('');
  });
});
