import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  // frontend-web is its own project; without this the repo-root lockfile is taken as the root.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
