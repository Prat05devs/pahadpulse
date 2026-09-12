import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { DEFAULT_SOCIAL_IMAGE, SITE_NAME, SITE_URL } from '@/lib/seo';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ui',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
  weight: ['500', '600', '700', '800'],
});

/**
 * The canonical origin, used to make every relative metadata URL absolute.
 *
 * Without `metadataBase` Next resolves Open Graph and canonical URLs against localhost and
 * logs a build warning — so a link shared on WhatsApp, which is how this audience actually
 * passes a page around, would carry an unusable preview URL. The custom domain is the
 * canonical one rather than the vercel.app deployment, so shares and search results point at
 * the address the portal is published under.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: 'Pahad Pulse | Uttarakhand Public Data Intelligence',
    template: '%s | Pahad Pulse',
  },
  description:
    'Pahad Pulse turns Uttarakhand’s trusted public data into useful intelligence for residents, travellers, businesses, researchers, and decision-makers.',
  keywords: [
    'Pahad Pulse',
    'Uttarakhand data platform',
    'Uttarakhand dashboard',
    'public data intelligence',
    'district data Uttarakhand',
    'Uttarakhand weather alerts',
    'Uttarakhand tourism data',
    'Uttarakhand road map',
    'Uttarakhand connectivity',
    'AI-ready public data',
  ],
  authors: [{ name: 'Pahad Pulse', url: SITE_URL }],
  creator: 'Pahad Pulse',
  publisher: 'Pahad Pulse',
  category: 'public data intelligence',
  referrer: 'origin-when-cross-origin',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: '/',
    siteName: SITE_NAME,
    title: 'Pahad Pulse | Uttarakhand Public Data Intelligence',
    description:
      'Uttarakhand’s public data, made useful—live alerts, district intelligence, infrastructure, tourism, connectivity, and decision-ready comparisons in one proud platform.',
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pahad Pulse | Uttarakhand Public Data Intelligence',
    description:
      'Uttarakhand’s public data, made useful for people, planning, research, and smarter decisions.',
    images: [DEFAULT_SOCIAL_IMAGE.url],
  },
  robots: {
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
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  manifest: '/manifest.webmanifest',
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      description:
        'A proudly built public-data initiative making Uttarakhand’s scattered online information easier to understand and use.',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: ['en', 'hi'],
      description:
        'A unified public-data intelligence platform for Uttarakhand’s districts, alerts, weather, roads, tourism, connectivity, and development indicators.',
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#application`,
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: 'DataVisualizationApplication',
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      featureList: [
        'Live public alerts',
        'District-level data dashboards',
        'Weather and air-quality monitoring',
        'Road and connectivity intelligence',
        'Tourism data',
        'District and business-potential comparisons',
      ],
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-50 -translate-y-20 rounded-md bg-accent px-4 py-2 font-semibold text-accent-foreground transition-transform duration-150 focus:translate-y-0"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
