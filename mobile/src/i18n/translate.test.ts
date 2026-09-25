import { en } from './strings.en';
import { hi } from './strings.hi';
import { translate } from './translate';

describe('the dictionaries', () => {
  it('translates every key into Hindi, with none left in English', () => {
    const untranslated = Object.keys(en).filter((key) => {
      const k = key as keyof typeof en;
      return hi[k] === en[k];
    });

    /*
     * A handful are identical on purpose, and they are listed out so a NEW one has to be
     * justified here rather than slipping in unnoticed:
     *
     *  - licence names and "API" identify a thing, and stop identifying it if translated
     *  - the rest are pure format strings — placeholders, separators and punctuation, with
     *    no word of their own to translate
     */
    expect(untranslated.sort()).toEqual(
      [
        'alertDetail.dateTime',
        'alertDetail.dateTimeRelative',
        'alertDetail.meta',
        'alerts.card.areasMore',
        // An email address is an address, not a phrase.
        'credits.contact.email',
        'credits.licence.bsd',
        'credits.licence.odbl',
      ].sort()
    );
  });

  it('has no empty translation', () => {
    const empty = Object.entries(hi)
      .filter(([, value]) => value.trim().length === 0)
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });

  it('keeps every placeholder a string uses in English', () => {
    const placeholders = (value: string) => (value.match(/\{\w+\}/g) ?? []).sort();

    // Reported as a list so a failure names the key rather than just the values.
    const mismatched = (Object.keys(en) as (keyof typeof en)[]).filter(
      (key) => placeholders(hi[key]).join() !== placeholders(en[key]).join()
    );

    expect(mismatched).toEqual([]);
  });
});

describe('translate', () => {
  it('returns the string for the requested language', () => {
    expect(translate('en', 'common.tryAgain')).toBe('Try again');
    expect(translate('hi', 'common.tryAgain')).toBe('फिर कोशिश करें');
  });

  it('substitutes placeholders', () => {
    expect(translate('en', 'error.savedData.checked', { when: '2 hours ago' })).toContain(
      '2 hours ago'
    );
  });

  it('leaves an unknown placeholder untouched rather than printing undefined', () => {
    expect(translate('en', 'error.savedData.checked', { other: 'x' })).toContain('{when}');
  });
});
