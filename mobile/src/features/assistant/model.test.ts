import { fillQuestion, findQuestion } from './model';
import type { Catalogue } from './schemas';
import { mobileRoute, safeSourceUrl } from './services';

const catalogue: Catalogue = {
  categories: [
    {
      id: 'weather',
      label: 'Weather',
      icon: 'cloud',
      questions: [{ id: 'weather.now', text: 'Weather in {district}', needs: 'district' }],
    },
  ],
  starters: ['weather.now'],
  districts: [{ slug: 'almora', name: 'Almora' }],
  places: [
    { slug: 'kedarnath', name: 'Kedarnath', kind: 'char_dham', district: 'rudraprayag' },
  ],
};

describe('assistant model', () => {
  it('fills a selected district or a readable generic label', () => {
    expect(fillQuestion('Weather in {district}', catalogue, 'almora')).toBe(
      'Weather in Almora'
    );
    expect(fillQuestion('Weather in {district}', catalogue)).toBe('Weather in a district');
  });

  it('finds catalogue questions without duplicating an index in UI code', () => {
    expect(findQuestion(catalogue, 'weather.now')?.needs).toBe('district');
    expect(findQuestion(catalogue, 'not.real')).toBeUndefined();
  });

  it('maps shared backend routes to real mobile screens', () => {
    expect(mobileRoute('/governance')).toBe('/budget');
    expect(mobileRoute('/sources')).toBe('/credits');
    expect(mobileRoute('/districts/tehri-garhwal')).toBe('/districts/tehri-garhwal');
  });

  it('rejects arbitrary deep links and unsafe source protocols', () => {
    expect(mobileRoute('https://example.com')).toBeNull();
    expect(mobileRoute('/districts/../settings')).toBeNull();
    expect(safeSourceUrl('javascript:alert(1)')).toBeNull();
    expect(safeSourceUrl('https://mausam.imd.gov.in')).toBe('https://mausam.imd.gov.in');
  });
});
