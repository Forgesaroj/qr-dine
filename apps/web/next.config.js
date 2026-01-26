/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@qr-dine/ui", "@qr-dine/utils", "@qr-dine/types"],
  eslint: {
    // ESLint is run locally; skip during Vercel builds for faster deploys
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript is validated locally; skip during Vercel builds for faster deploys
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
  },
};

module.exports = nextConfig;
