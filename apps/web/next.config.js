const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_STANDALONE ? 'standalone' : undefined,
  outputFileTracingRoot: path.join(__dirname, '../../'),
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: true,
  transpilePackages: [
    '@visapilot/shared',
    '@visapilot/config',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
