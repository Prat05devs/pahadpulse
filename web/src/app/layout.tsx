import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pahad Pulse — Uttarakhand Intelligence Platform',
  description:
    'Real-time data on weather, alerts, tourism, connectivity, and development across Uttarakhand.',
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
