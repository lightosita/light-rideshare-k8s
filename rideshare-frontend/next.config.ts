// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  images: {
    domains: ["img.youtube.com", "images.unsplash.com", "lh3.googleusercontent.com"],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
  },


  turbopack: {}, 
};

export default nextConfig;