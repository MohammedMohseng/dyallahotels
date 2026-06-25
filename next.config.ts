import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Exclude sharp from server external tracing to avoid native binary copy failures
  serverExternalPackages: ["sharp"],
  allowedDevOrigins: ['10.241.151.231'],
};

export default nextConfig;