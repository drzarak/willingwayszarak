import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.willingways.org",
      },
      {
        protocol: "https",
        hostname: "willingways.org",
      },
    ],
  },
};

export default nextConfig;
