import type { BusinessScheme } from './schemas';
import { filterSchemes, schemeAvailability } from './schemes';

const scheme = (overrides: Partial<BusinessScheme>): BusinessScheme => ({
  id: 1,
  group: 'startup-specific',
  slug: 'seed-fund',
  name: 'Startup India Seed Fund Scheme',
  acronym: 'SISFS',
  owner: 'DPIIT',
  sector: ['sector-agnostic'],
  stage: ['launch'],
  support: ['seed funding', 'convertible debt'],
  access: 'through approved incubators',
  status: 'incubator-dependent',
  summary: 'Early-stage money through incubators.',
  eligibility: [],
  benefits: [],
  apply: [],
  url: 'https://seedfund.startupindia.gov.in/',
  availability: '',
  ...overrides,
});

const schemes = [
  scheme({}),
  scheme({
    id: 2,
    slug: 'cgss',
    name: 'Credit Guarantee Scheme',
    acronym: 'CGSS',
    support: ['credit guarantee'],
    sector: ['fintech'],
  }),
  scheme({
    id: 3,
    slug: 'train',
    name: 'Skill programme',
    acronym: 'ESDP',
    support: ['training'],
  }),
];

describe('scheme finder', () => {
  it('searches name, acronym, owner, summary and support', () => {
    expect(
      filterSchemes(schemes, { query: 'cgss', sector: '', bucket: '' }).map((s) => s.id)
    ).toEqual([2]);
    expect(
      filterSchemes(schemes, { query: 'incubators', sector: '', bucket: '' })
    ).toHaveLength(3);
  });

  it('filters by plain-language support bucket and sector', () => {
    expect(
      filterSchemes(schemes, { query: '', sector: '', bucket: 'loan' }).map((s) => s.id)
    ).toEqual([1, 2]);
    expect(
      filterSchemes(schemes, { query: '', sector: '', bucket: 'grant' }).map((s) => s.id)
    ).toEqual([1]);
    expect(
      filterSchemes(schemes, { query: '', sector: 'fintech', bucket: '' }).map((s) => s.id)
    ).toEqual([2]);
  });

  it('only calls a scheme open or closed when its status says so', () => {
    expect(schemeAvailability('standing-open')).toBe('open');
    expect(schemeAvailability('rolling-until-scheme-close')).toBe('open');
    expect(schemeAvailability('closed-new-applications')).toBe('closed');
    expect(schemeAvailability('historical-ended-march-2025')).toBe('closed');
    expect(schemeAvailability('periodic-calls')).toBe('periodic');
  });
});
