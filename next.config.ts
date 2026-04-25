import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/lib/security/headers";

// In production we serve at kaptrix.com/aideligence behind a Vercel rewrite
// from the KaptrixComply project, so basePath ensures all routes, asset URLs,
// and <Link> hrefs resolve under /aideligence. Locally, we skip the prefix so
// http://localhost:3000/ works directly. Override with NEXT_PUBLIC_BASE_PATH
// if you need to mirror the prod path in dev.
const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ??
  (process.env.NODE_ENV === "production" ? "/aideligence" : "");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(basePath ? { basePath } : {}),
  async headers() {
    return [
      {
        // Apply baseline security headers to every route.
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  // URL aliasing:
  //   /app/*   — authenticated operators (clean URL)
  //   /demo/*  — public demo surface (nicer than /preview)
  //   /preview/* — legacy path, kept for backward compat
  // All three rewrite to the same src/app/preview/* route handlers.
  async rewrites() {
    return [
      { source: "/app", destination: "/preview" },
      { source: "/app/:path*", destination: "/preview/:path*" },
      { source: "/demo", destination: "/preview" },
      { source: "/demo/:path*", destination: "/preview/:path*" },
    ];
  },
};

export default nextConfig;
