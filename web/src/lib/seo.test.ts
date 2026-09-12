import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { DEFAULT_SOCIAL_IMAGE, SITE_URL, buildPageMetadata } from './seo';

describe('production SEO', () => {
  it('keeps canonical and social metadata aligned', () => {
    const metadata = buildPageMetadata({
      title: 'District intelligence',
      description: 'Source-backed district intelligence for Uttarakhand.',
      path: '/districts',
    });

    expect(metadata.title).toEqual({ absolute: 'District intelligence | Pahad Pulse' });
    expect(metadata.alternates).toEqual({ canonical: '/districts' });
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        url: '/districts',
        title: 'District intelligence | Pahad Pulse',
        images: [DEFAULT_SOCIAL_IMAGE],
      })
    );
    expect(metadata.twitter).toEqual(
      expect.objectContaining({
        card: 'summary_large_image',
        images: [DEFAULT_SOCIAL_IMAGE.url],
      })
    );
  });

  it('keeps unfinished workspaces out of search results', () => {
    const metadata = buildPageMetadata({
      title: 'Planned workspace',
      description: 'Not yet public.',
      path: '/offline',
      noIndex: true,
    });

    expect(metadata.robots).toEqual({ index: false, follow: false, noarchive: true });
    expect(robots()).toEqual(
      expect.objectContaining({
        rules: { userAgent: '*', allow: '/' },
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
      })
    );
  });

  it('publishes every indexable dashboard and district without retired routes', () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain(`${SITE_URL}/`);
    expect(urls).toContain(`${SITE_URL}/compare`);
    expect(urls).toContain(`${SITE_URL}/districts/almora`);
    expect(urls).toContain(`${SITE_URL}/districts/pauri-garhwal`);
    expect(urls).toContain(`${SITE_URL}/districts/tehri-garhwal`);
    expect(urls).toHaveLength(22);
    expect(urls.some((url) => url.endsWith('/migration'))).toBe(false);
    expect(urls.some((url) => url.endsWith('/governance'))).toBe(false);
    expect(urls.some((url) => url.endsWith('/offline'))).toBe(false);
  });
});
