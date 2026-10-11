import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Product images come from object storage (RustFS locally, S3/CloudFront in production).
const storage = new URL(process.env.STORAGE_PUBLIC_URL ?? 'http://127.0.0.1:9002');
// Gateway seen from this server. Rewrites are fixed at build time, so container images are built
// with the in-cluster URL (plan §7).
// Local and in-cluster storage sit on private addresses, which the optimizer refuses by default
// (SSRF guard). Allowed only then, and remotePatterns still limits it to the storage host.
const isPrivateStorage =
  process.env.STORAGE_IS_PRIVATE === 'true' ||
  ['127.0.0.1', 'localhost'].includes(storage.hostname);
const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:4000';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Browser API calls stay same-origin: the refresh cookie is first-party and no CORS is needed.
  rewrites: () =>
    Promise.resolve([{ source: '/api/v1/:path*', destination: `${apiBaseUrl}/api/v1/:path*` }]),
  typedRoutes: true,
  // Our CSS is a few KB: inlining it removes the render-blocking request (Lighthouse FCP/LCP).
  experimental: { inlineCss: true },
  images: {
    dangerouslyAllowLocalIP: isPrivateStorage,
    remotePatterns: [
      {
        protocol: storage.protocol === 'https:' ? 'https' : 'http',
        hostname: storage.hostname,
        port: storage.port,
        pathname: '/bazaar-images/**',
      },
    ],
    // Category placeholders are SVG; served as attachments with a locked-down CSP (Next.js guidance).
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // frontend-web is its own project; without this the repo-root lockfile is taken as the root.
  turbopack: { root: import.meta.dirname },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);
