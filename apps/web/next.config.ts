import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: [
    '@compliance/ui',
    '@compliance/shared',
    '@compliance/validation',
    '@compliance/api-client',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
      },
    ],
  },
  experimental: {
    cpus: 1, // limit parallel workers for low-memory builds
  },
};

export default nextConfig;
