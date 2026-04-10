import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@telepharmacy/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'manager.cnypharmacy.com',
        pathname: '/uploads/product_photo/**',
      },
      {
        protocol: 'https',
        hostname: 'minio.re-ya.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.re-ya.com',
        pathname: '/minio/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/telepharmacy/**',
      },
    ],
  },
};

export default nextConfig;
