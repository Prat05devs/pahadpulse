import type { NextConfig } from 'next';

/*
 * Sent on every page. The site embeds no third-party frames and uses no camera, microphone or
 * location, so each is switched off rather than left to the browser default. A full
 * Content-Security-Policy is deliberately not set here: Next's inline bootstrap scripts need
 * nonces, and a policy that breaks hydration would take the site down. `frame-ancestors`
 * is the part of CSP that matters most (clickjacking), and it needs no nonce.
 */
const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
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
