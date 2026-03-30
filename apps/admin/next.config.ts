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
    ],
  },
};

export default nextConfig;
