import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Product images come from object storage (RustFS locally, S3/CloudFront in production).
const storage = new URL(process.env.STORAGE_PUBLIC_URL ?? 'http://127.0.0.1:9002');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  images: {
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
