import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pahad Pulse — Uttarakhand Intelligence Platform',
  description: 'Real-time data on weather, alerts, tourism, connectivity, and development across Uttarakhand.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
