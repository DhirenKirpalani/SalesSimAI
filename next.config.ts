import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/eleven-agent/webhook/chat/completions",
        destination: "/api/eleven-agent/webhook",
      },
    ];
  },
};

export default nextConfig;
