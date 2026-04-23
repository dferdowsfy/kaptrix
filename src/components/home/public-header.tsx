"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Shared top navigation for all non-authenticated / public pages.
 * - Fully transparent at the top of the page so the hero background
 *   shines through.
 * - Fades in a subtle blur + border when the user scrolls past the hero.
 * - On mobile: "Client login" stays visible at all times; a hamburger
 *   button opens a drop-down panel with the primary nav.
 */

const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/framework", label: "Framework" },
  { href: "/demo", label: "Platform" },
  { href: "/contact", label: "Contact" },
];

// Shade chosen to sit one notch brighter than the hero gradient
// (#1B1F4A / #0D1033) so the menu reads as its own surface.
const MENU_PURPLE = "#241A5C";

export function PublicHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on route change.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // ESC to close the mobile menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  // Three header states:
  //  - menuOpen           → solid dark-purple bar + panel (white text)
  //  - scrolled (no menu) → light glass bar (dark slate text)
  //  - neither            → transparent over hero (white text)
  const scrolledGlass = scrolled && !menuOpen;

  const linkClass = (href: string) => {
    const active = isActive(href);
    return `relative text-sm font-medium transition sm:text-base ${
      scrolledGlass
        ? active
          ? "text-slate-900"
          : "text-slate-700 hover:text-slate-900"
        : active
          ? "text-white"
          : "text-slate-100 hover:text-white"
    }`;
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          menuOpen
            ? "border-b border-white/10 backdrop-blur-xl"
            : scrolledGlass
              ? "border-b border-slate-200/70 bg-white/70 backdrop-blur-xl"
              : "border-b border-transparent bg-transparent"
        }`}
        style={menuOpen ? { backgroundColor: `${MENU_PURPLE}F2` } : undefined}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-5">
          <Link href="/" aria-label="KAPTRIX home" className="group">
            <span
              className={`text-sm font-semibold uppercase tracking-[0.32em] transition-colors sm:text-base ${
                scrolledGlass ? "text-slate-900" : "text-white"
              }`}
            >
              Kaptrix
            </span>
          </Link>

          <nav className="hidden items-center gap-8 sm:flex">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Always visible on mobile — no interaction required. */}
            <Link
              href="/login"
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition sm:px-4 sm:py-2 sm:text-base ${
                scrolledGlass
                  ? "border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  : "border-white/25 text-slate-100 hover:border-white/50 hover:bg-white/10"
              }`}
            >
              Client login
            </Link>

            {/* Hamburger: mobile only, lives to the right of Client login. */}
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="public-mobile-menu"
              onClick={() => setMenuOpen((v) => !v)}
              className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition sm:hidden ${
                scrolledGlass
                  ? "border-slate-300 text-slate-800 hover:bg-slate-100"
                  : "border-white/25 text-white hover:bg-white/10"
              }`}
            >
              <span aria-hidden className="relative block h-3.5 w-5">
                <span
                  className={`absolute left-0 top-0 block h-[2px] w-full rounded-full bg-current transition-transform duration-300 ${
                    menuOpen ? "translate-y-[6px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`absolute left-0 top-1/2 -mt-px block h-[2px] w-full rounded-full bg-current transition-opacity duration-200 ${
                    menuOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute bottom-0 left-0 block h-[2px] w-full rounded-full bg-current transition-transform duration-300 ${
                    menuOpen ? "-translate-y-[6px] -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Mobile drop-down panel — dark purple, white text. */}
        <div
          id="public-mobile-menu"
          className={`overflow-hidden border-white/10 backdrop-blur-xl transition-[max-height,opacity,border-color] duration-300 ease-out sm:hidden ${
            menuOpen
              ? "max-h-[28rem] border-t opacity-100"
              : "max-h-0 border-transparent opacity-0"
          }`}
          style={{ backgroundColor: `${MENU_PURPLE}F2` }}
        >
          <nav className="mx-auto flex max-w-7xl flex-col px-6 pb-4 pt-1">
            {NAV_LINKS.map((l, i) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    transitionDelay: menuOpen ? `${80 + i * 55}ms` : "0ms",
                  }}
                  className={`group flex items-center justify-between border-b border-white/10 py-4 text-lg font-medium transition-all duration-300 last:border-b-0 ${
                    menuOpen
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0"
                  } ${active ? "text-white" : "text-slate-200 hover:text-white"}`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full transition ${
                        active
                          ? "bg-indigo-300"
                          : "bg-white/30 group-hover:bg-white/60"
                      }`}
                    />
                    {l.label}
                  </span>
                  <svg
                    aria-hidden
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition ${
                      active
                        ? "text-indigo-300"
                        : "text-white/40 group-hover:translate-x-0.5 group-hover:text-white"
                    }`}
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Tap-to-close backdrop, sits beneath the header but above the page. */}
      <div
        aria-hidden
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-300 sm:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
    </>
  );
}
