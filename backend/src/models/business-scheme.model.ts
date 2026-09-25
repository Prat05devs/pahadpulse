export interface BusinessScheme {
  id: number;
  group: string;
  slug: string;
  name: string;
  acronym: string;
  owner: string;
  sector: string[];
  stage: string[];
  support: string[];
  access: string;
  status: string;
  summary: string;
  eligibility: string[];
  benefits: string[];
  apply: string[];
  url: string;
  availability: string;
}

export interface BusinessSchemeDirectory {
  verifiedOn: string;
  sourceUrl: string;
  total: number;
  filteredCount: number;
  sectors: string[];
  supportTypes: string[];
  schemes: BusinessScheme[];
}

export interface BusinessSchemeFilters {
  query?: string;
  sector?: string;
  support?: string;
  status?: string;
  limit: number;
}
