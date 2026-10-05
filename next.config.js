/** @type {import("next").NextConfig} */

// Baseline security headers (audit security #11). CSP is deliberately omitted for
// now — it needs care given inline styles + the GA snippet — and is tracked as a
// follow-up; these are the high-value, low-risk headers.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const PRIVATE_PATHS = [
  '/admin', '/admin/:path*', '/saved', '/profile', '/creator/:path*',
  '/my-resources', '/my-listening', '/ce-report',
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Private / signed-in pages: tell search engines not to index them. A
      // header (not robots.txt Disallow) so Google can fetch the page and see it.
      ...PRIVATE_PATHS.map(source => ({ source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] })),
    ];
  },
};
module.exports = nextConfig;
