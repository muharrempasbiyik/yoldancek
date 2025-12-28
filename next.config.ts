import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Production'da console.log'ları kaldır (Next.js 13+ özelliği)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // error ve warn loglarını koru (hata ayıklama için)
    } : false,
  },
};

export default nextConfig;
