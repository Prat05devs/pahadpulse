import type { Metadata } from 'next';
import './globals.css';

/**
 * The canonical origin, used to make every relative metadata URL absolute.
 *
 * Without `metadataBase` Next resolves Open Graph and canonical URLs against localhost and
 * logs a build warning — so a link shared on WhatsApp, which is how this audience actually
 * passes a page around, would carry an unusable preview URL. The custom domain is the
 * canonical one rather than the vercel.app deployment, so shares and search results point at
 * the address the portal is published under.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.pahadpulse.live';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Pahad Pulse — Uttarakhand Intelligence Platform',
  description:
    'Real-time data on weather, alerts, tourism, connectivity, and development across Uttarakhand.',
  alternates: { canonical: '/' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
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
