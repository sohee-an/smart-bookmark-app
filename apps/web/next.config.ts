import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  reactStrictMode: true,

  typescript: {
    ignoreBuildErrors: true, // ← 이거 추가
  },
};

export default nextConfig;
