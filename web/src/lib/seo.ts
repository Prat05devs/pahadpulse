import type { Metadata } from 'next';

export const SITE_NAME = 'Pahad Pulse';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.pahadpulse.live';

export const DEFAULT_SOCIAL_IMAGE = {
  url: '/pahad-pulse-social-preview.png',
  width: 1200,
  height: 630,
  alt: 'Pahad Pulse — Uttarakhand’s public data, made useful.',
} as const;

const CORE_KEYWORDS = [
  'Pahad Pulse',
  'Uttarakhand data',
  'Uttarakhand dashboard',
  'public data intelligence',
  'district analytics',
  'Uttarakhand live alerts',
];

interface PageMetadataInput {
  title: string;
  description: string;
  path: `/${string}` | '/';
  keywords?: string[];
  noIndex?: boolean;
}

/** Keep canonical, social, and search metadata aligned for every public route. */
export function buildPageMetadata({
  title,
  description,
  path,
  keywords = [],
  noIndex = false,
}: PageMetadataInput): Metadata {
  const brandedTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  return {
    title: brandedTitle,
    description,
    keywords: [...CORE_KEYWORDS, ...keywords],
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      url: path,
      siteName: SITE_NAME,
      title: brandedTitle,
      description,
      images: [DEFAULT_SOCIAL_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: brandedTitle,
      description,
      images: [DEFAULT_SOCIAL_IMAGE.url],
    },
    robots: noIndex
      ? { index: false, follow: false, noarchive: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
  };
}
