import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Apply baseline security headers to every route.
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  // URL aliasing: logged-in operators see clean /app/* paths while the
  // route handlers still live under src/app/preview/*. Anonymous demo
  // users hitting /preview/* continue to work unchanged.
  async rewrites() {
    return [
      { source: "/app", destination: "/preview" },
      { source: "/app/:path*", destination: "/preview/:path*" },
    ];
  },
};

export default nextConfig;
