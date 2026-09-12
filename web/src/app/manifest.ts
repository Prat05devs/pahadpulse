import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pahad Pulse — Uttarakhand Public Data Intelligence',
    short_name: 'Pahad Pulse',
    description:
      'A proudly built Uttarakhand platform that turns trusted public data into useful, decision-ready intelligence.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f9fc',
    theme_color: '#075bd8',
    icons: [
      {
        src: '/logo.png',
        sizes: '1250x1250',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
