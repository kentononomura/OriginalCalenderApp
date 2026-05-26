import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // ESLintのエラーがあっても本番ビルド（Vercel）を中断させないように設定
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
