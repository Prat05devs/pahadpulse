import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

const DISTRICTS = [
  'almora',
  'bageshwar',
  'chamoli',
  'champawat',
  'dehradun',
  'haridwar',
  'nainital',
  'pauri-garhwal',
  'pithoragarh',
  'rudraprayag',
  'tehri-garhwal',
  'udham-singh-nagar',
  'uttarkashi',
] as const;

const ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'hourly', priority: 1 },
  { path: '/alerts', changeFrequency: 'always', priority: 0.95 },
  { path: '/districts', changeFrequency: 'daily', priority: 0.9 },
  { path: '/compare', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/hydromet', changeFrequency: 'hourly', priority: 0.85 },
  { path: '/roads', changeFrequency: 'daily', priority: 0.8 },
  { path: '/tourism', changeFrequency: 'daily', priority: 0.8 },
  { path: '/connectivity', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/intelligence', changeFrequency: 'weekly', priority: 0.75 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: new URL(path, SITE_URL).toString(),
    changeFrequency,
    priority,
  }));

  const districts = DISTRICTS.map((slug) => ({
    url: new URL(`/districts/${slug}`, SITE_URL).toString(),
    changeFrequency: 'daily' as const,
    priority: 0.75,
  }));

  return [...pages, ...districts];
}
