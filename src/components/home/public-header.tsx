"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/home/logo";

/**
 * Shared top navigation for all non-authenticated / public pages.
 * - Fully transparent at the top of the page so the hero background
 *   shines through.
 * - Fades in a subtle blur + border when the user scrolls past the hero.
 * - Keeps the layout consistent across /, /how-it-works, /login, etc.
 */
export function PublicHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkClass = (href: string) => {
    const active = pathname === href;
    return `relative text-sm font-medium transition sm:text-base ${
      scrolled
        ? active
          ? "text-slate-900"
          : "text-slate-600 hover:text-slate-900"
        : active
          ? "text-white"
          : "text-white/70 hover:text-white"
    }`;
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-slate-200/70 bg-white/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" aria-label="KAPTRIX home" className="group">
          <Logo
            wordClassName={`text-lg sm:text-xl transition-colors ${
              scrolled ? "text-slate-900" : "text-white"
            }`}
            markClassName="h-7 w-7"
          />
        </Link>

        <nav className="hidden items-center gap-8 sm:flex">
          <Link href="/how-it-works" className={linkClass("/how-it-works")}>
            How it works
          </Link>
          <Link href="/preview" className={linkClass("/preview")}>
            Platform
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition sm:px-5 sm:py-2.5 sm:text-base ${
              scrolled
                ? "text-slate-700 hover:text-slate-900"
                : "text-white/80 hover:text-white"
            }`}
          >
            Log in
          </Link>
          <Link
            href="/login?mode=signup"
            className={`inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold transition sm:px-6 sm:py-3 sm:text-base ${
              scrolled
                ? "bg-slate-900 text-white shadow-sm hover:bg-slate-800"
                : "border border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20"
            }`}
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
