import { z } from 'zod';
import schemeCorpusJson from '../data/startup-schemes.json' with { type: 'json' };
import type {
  BusinessScheme,
  BusinessSchemeDirectory,
  BusinessSchemeFilters,
} from '../models/business-scheme.model.js';

const SchemeSchema = z.object({
  id: z.number().int().positive(),
  group: z.string(),
  slug: z.string(),
  name: z.string(),
  acronym: z.string(),
  owner: z.string(),
  sector: z.array(z.string()),
  stage: z.array(z.string()),
  support: z.array(z.string()),
  access: z.string(),
  status: z.string(),
  summary: z.string(),
  eligibility: z.array(z.string()),
  benefits: z.array(z.string()),
  apply: z.array(z.string()),
  url: z.url(),
  availability: z.string(),
});

const CorpusSchema = z.object({
  verified_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.url(),
  count: z.number().int().nonnegative(),
  schemes: z.array(SchemeSchema),
});

// Fail startup rather than silently serve malformed policy data. The corpus is versioned with
// the API and is validated once when the module loads, not on every public request.
const corpus = CorpusSchema.parse(schemeCorpusJson);
if (corpus.count !== corpus.schemes.length) {
  throw new Error(
    `Startup scheme corpus count mismatch: metadata says ${corpus.count}, found ${corpus.schemes.length}`,
  );
}

const uttarakhandGateway: BusinessScheme = {
  id: 1000,
  group: 'state-policy-gateway',
  slug: 'uttarakhand-startup-policy-gateway',
  name: 'Uttarakhand Startup Policy Gateway',
  acronym: 'Startup Uttarakhand',
  owner: 'Department of Industries, Government of Uttarakhand',
  sector: ['sector-agnostic', 'Uttarakhand'],
  stage: ['recognition', 'startup support', 'market access'],
  support: ['policy incentives', 'recognition', 'incubation'],
  access: 'direct on the official state portal',
  status: 'official-gateway',
  summary:
    'The authoritative entry point for Uttarakhand startup recognition, current policy notifications, incentives and ecosystem programmes.',
  eligibility: [
    'Check the current Uttarakhand startup policy and recognition conditions',
    'Individual incentives may add domicile, incorporation, employment, sector or pre-approval requirements',
  ],
  benefits: [
    'Routes applicants to the current state policy, recognition process and programme notices',
    'Keeps changing state incentives behind one authoritative government entry point',
  ],
  apply: [
    'Open the official portal and review the current policy notification',
    'Complete state recognition where required before incurring reimbursable expenditure',
  ],
  url: 'https://startuputtarakhand.uk.gov.in/',
  availability:
    'Official state gateway verified 22 July 2026. Check each linked incentive window before applying.',
};

const catalogue: BusinessScheme[] = [uttarakhandGateway, ...(corpus.schemes as BusinessScheme[])];

const contains = (candidate: string, query: string): boolean =>
  candidate.toLocaleLowerCase('en-IN').includes(query);

export function listBusinessSchemes(filters: BusinessSchemeFilters): BusinessSchemeDirectory {
  const query = filters.query?.trim().toLocaleLowerCase('en-IN');
  const sector = filters.sector?.trim().toLocaleLowerCase('en-IN');
  const support = filters.support?.trim().toLocaleLowerCase('en-IN');
  const status = filters.status?.trim().toLocaleLowerCase('en-IN');

  const filtered = catalogue.filter((scheme) => {
    if (
      query !== undefined &&
      ![
        scheme.name,
        scheme.acronym,
        scheme.owner,
        scheme.summary,
        ...scheme.sector,
        ...scheme.support,
      ].some((value) => contains(value, query))
    ) {
      return false;
    }
    if (sector !== undefined && !scheme.sector.some((value) => contains(value, sector))) {
      return false;
    }
    if (support !== undefined && !scheme.support.some((value) => contains(value, support))) {
      return false;
    }
    if (status !== undefined && !contains(scheme.status, status)) return false;
    return true;
  });

  return {
    verifiedOn: corpus.verified_on,
    sourceUrl: corpus.source,
    total: catalogue.length,
    filteredCount: filtered.length,
    sectors: [...new Set(catalogue.flatMap((scheme) => scheme.sector))].sort(),
    supportTypes: [...new Set(catalogue.flatMap((scheme) => scheme.support))].sort(),
    schemes: filtered.slice(0, filters.limit),
  };
}

const SCENARIO_SCHEMES: Record<string, string[]> = {
  Tourism: [
    'uttarakhand-startup-policy-gateway',
    'pradhan-mantri-mudra-yojana',
    'cgtmse',
    'credit-guarantee-scheme-for-startups',
  ],
  'IT & Services': [
    'uttarakhand-startup-policy-gateway',
    'credit-guarantee-scheme-for-startups',
    'gem-startup-runway',
    'nidhi-prayas-2',
  ],
  Agriculture: [
    'uttarakhand-startup-policy-gateway',
    'agrisure',
    'rkv-rafter-innovation-agri-entrepreneurship',
    'pmfme',
  ],
  Manufacturing: [
    'uttarakhand-startup-policy-gateway',
    'cgtmse',
    'pradhan-mantri-mudra-yojana',
    'gem-startup-runway',
  ],
  'Retail & Services': [
    'uttarakhand-startup-policy-gateway',
    'pradhan-mantri-mudra-yojana',
    'cgtmse',
    'gem-startup-runway',
  ],
};

export function recommendBusinessSchemes(category: string, limit = 4): BusinessScheme[] {
  const preferred = SCENARIO_SCHEMES[category] ?? ['uttarakhand-startup-policy-gateway'];
  const bySlug = new Map(catalogue.map((scheme) => [scheme.slug, scheme]));
  return preferred
    .flatMap((slug) => {
      const scheme = bySlug.get(slug);
      return scheme === undefined ? [] : [scheme];
    })
    .slice(0, limit);
}
