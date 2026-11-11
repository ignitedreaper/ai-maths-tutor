import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix the "multiple lockfiles / workspace root" warning by explicitly pointing to this project
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Serve service worker with headers that allow it to control the full origin scope
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
