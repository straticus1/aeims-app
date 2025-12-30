import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Enable server actions
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.afterdarksys.com',
      },
    ],
  },
  // Ignore TypeScript errors during build for faster iteration
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
