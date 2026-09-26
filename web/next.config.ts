import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.uttarakhandtourism.gov.in',
        pathname: '/assets/media/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/photo-*',
      },
    ],
  },
};

export default config;
