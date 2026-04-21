"use client";

import { useEffect } from "react";

/**
 * Forces the window to the top on mount of the landing page and pins
 * it there briefly to defeat any late-firing scroll side-effects
 * (scroll restoration, lazy-loaded iframes, focus shifts, etc.).
 */
export function ScrollToTop() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) {
      try {
        window.history.scrollRestoration = "manual";
      } catch {
        // no-op
      }
    }

    let pinning = true;
    const pin = () => {
      if (!pinning) return;
      if (window.scrollY !== 0) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    };

    // Run on mount, next frame, and a few follow-up ticks to catch
    // any async scroll from hydration, scroll restoration, or
    // offscreen iframe load events.
    pin();
    const raf = window.requestAnimationFrame(pin);
    const timers = [50, 150, 350, 800].map((ms) =>
      window.setTimeout(pin, ms),
    );
    window.addEventListener("scroll", pin, { passive: true });

    // Release the pin once the user actually interacts.
    const release = () => {
      pinning = false;
      window.removeEventListener("scroll", pin);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      window.removeEventListener("keydown", release);
    };
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchstart", release, { passive: true });
    window.addEventListener("keydown", release);

    // And release automatically after 1s regardless.
    const releaseTimer = window.setTimeout(release, 1000);

    return () => {
      pinning = false;
      window.cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(releaseTimer);
      window.removeEventListener("scroll", pin);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      window.removeEventListener("keydown", release);
    };
  }, []);
  return null;
}
