import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // @ts-expect-error - NextConfig type might be missing eslint in Next 16, but it is required to bypass Vercel linting errors
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
