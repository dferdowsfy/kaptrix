"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Persistent floating "Try the demo" button shown on all public
 * marketing surfaces. Hidden inside the live product (/preview and
 * authenticated routes) so it doesn't overlap the in-app UI.
 */
export function DemoFab() {
  const pathname = usePathname() ?? "/";

  const hideOn =
    pathname.startsWith("/preview") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/engagements") ||
    pathname.startsWith("/benchmarks") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/account");

  if (hideOn) return null;

  return (
    <Link
      href="/demo"
      aria-label="Open the live demo"
      className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 ring-1 ring-white/20 transition hover:shadow-xl hover:shadow-indigo-900/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:bottom-8 sm:right-8 sm:px-6 sm:py-3.5 sm:text-base"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="-ml-0.5"
      >
        <polygon points="6 4 20 12 6 20 6 4" />
      </svg>
      Try the live demo
    </Link>
  );
}
