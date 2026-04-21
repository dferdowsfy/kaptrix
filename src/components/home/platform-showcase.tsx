"use client";

import { useEffect, useRef, useState } from "react";

type Step = {
  kicker: string;
  title: string;
  description: string;
  href: string;
  accent: string;
};

type Props = {
  steps: Step[];
};

// Inject CSS into a same-origin iframe that blocks navigation/clicks on
// links, buttons and inputs — but keeps the document scrollable.
// Also prevents the iframe from hijacking the parent's scroll position
// (e.g. when an autofocused input inside scrolls the iframe into view).
function lockIframeNavigation(iframe: HTMLIFrameElement | null) {
  if (!iframe) return;
  // Snapshot parent scroll so an autofocused element inside the iframe
  // cannot scroll the landing page away from the top.
  const parentScrollY =
    typeof window !== "undefined" ? window.scrollY : 0;
  const restoreParentScroll = () => {
    if (typeof window === "undefined") return;
    if (window.scrollY !== parentScrollY) {
      window.scrollTo({ top: parentScrollY, left: 0, behavior: "auto" });
    }
  };
  try {
    const doc = iframe.contentDocument;
    if (!doc) return;
    // Blur anything that auto-focused on load.
    const active = doc.activeElement as HTMLElement | null;
    if (active && active !== doc.body) active.blur();
    const existing = doc.getElementById("kx-demo-lock");
    if (!existing) {
      const style = doc.createElement("style");
      style.id = "kx-demo-lock";
      style.textContent = `
        a, button, [role="button"], input, select, textarea, label {
          pointer-events: none !important;
        }
        html, body { overflow: auto !important; }
      `;
      doc.head.appendChild(style);
    }
    // Block form submissions defensively
    doc.addEventListener(
      "submit",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
      true,
    );
    // Intercept focus events so the parent page is not scrolled to
    // reveal elements inside the iframe.
    doc.addEventListener(
      "focusin",
      (e) => {
        const target = e.target as HTMLElement | null;
        target?.blur?.();
        restoreParentScroll();
      },
      true,
    );
  } catch {
    // Cross-origin — nothing we can do; fall back to no-op
  }
  // Always restore parent scroll after the iframe loads, even if the
  // document is cross-origin or focus already moved.
  restoreParentScroll();
  if (typeof window !== "undefined") {
    window.requestAnimationFrame(restoreParentScroll);
  }
}

export function PlatformShowcase({ steps }: Props) {
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const current = steps[active];

  // Defer iframe mount and autoplay until the showcase scrolls into view.
  // Prevents the embedded preview from triggering any scroll/focus side
  // effects on the landing page before the user has reached this section.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!autoplay || !visible) return;
    const id = window.setTimeout(
      () => setActive((prev) => (prev + 1) % steps.length),
      5500,
    );
    return () => window.clearTimeout(id);
  }, [active, autoplay, steps.length, visible]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
      if (e.key === "ArrowRight") {
        setActive((prev) => (prev + 1) % steps.length);
        setAutoplay(false);
      }
      if (e.key === "ArrowLeft") {
        setActive((prev) => (prev - 1 + steps.length) % steps.length);
        setAutoplay(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [expanded, steps.length]);

  const gotoPrev = () => {
    setActive((prev) => (prev - 1 + steps.length) % steps.length);
    setAutoplay(false);
  };
  const gotoNext = () => {
    setActive((prev) => (prev + 1) % steps.length);
    setAutoplay(false);
  };

  const Stepper = () => (
    <ol className="relative grid gap-2 sm:grid-cols-3">
      {steps.map((step, idx) => {
        const isActive = idx === active;
        return (
          <li key={step.kicker}>
            <button
              type="button"
              onClick={() => {
                setActive(idx);
                setAutoplay(false);
              }}
              aria-current={isActive ? "step" : undefined}
              className={`group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border p-4 text-left transition ${
                isActive
                  ? "border-white/30 bg-white/10 text-white shadow-lg"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
              }`}
            >
              <div
                aria-hidden
                className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${step.accent} ${
                  isActive ? "opacity-100" : "opacity-40"
                }`}
              />
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.28em] sm:text-[11px] sm:tracking-[0.3em] ${
                  isActive ? "text-indigo-200" : "text-slate-400"
                }`}
              >
                {step.kicker}
              </p>
              <p
                className={`mt-1 text-sm font-semibold sm:text-base ${
                  isActive ? "text-white" : "text-slate-200"
                }`}
              >
                {step.title}
              </p>
              <p
                className={`mt-1 text-xs leading-5 sm:text-[13px] sm:leading-5 ${
                  isActive ? "text-slate-200" : "text-slate-400"
                }`}
              >
                {step.description}
              </p>
            </button>
          </li>
        );
      })}
    </ol>
  );

  const Controls = () => (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {steps.map((_, idx) => (
          <span
            key={idx}
            aria-hidden
            className={`h-1.5 rounded-full transition-all ${
              idx === active ? "w-10 bg-indigo-400" : "w-4 bg-white/20"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={gotoPrev}
          className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={gotoNext}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
        >
          Next →
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div ref={rootRef} className="mt-14">
        <div className="relative overflow-hidden rounded-[2rem] border border-slate-800/20 bg-slate-950 p-4 shadow-2xl sm:p-6">
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${current.accent} transition-all duration-700`}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 -right-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"
          />

          {/* Layer stepper anchored inside the box */}
          <div className="relative mb-5 flex items-start justify-between gap-3">
            <div className="flex-1">
              <Stepper />
            </div>
            <button
              type="button"
              onClick={() => {
                setExpanded(true);
                setAutoplay(false);
              }}
              className="mt-1 shrink-0 rounded-full border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20"
              aria-label="Expand to fullscreen"
              title="Expand"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M4 14v6h6" />
                <path d="M20 10V4h-6" />
                <path d="M14 10l6-6" />
                <path d="M10 14l-6 6" />
              </svg>
            </button>
          </div>

          <div className="relative mx-auto aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
            {visible ? (
              <iframe
                key={current.href}
                title={current.title}
                src={current.href}
                onLoad={(e) => lockIframeNavigation(e.currentTarget)}
                className="showcase-fade absolute inset-0 h-full w-full border-0"
                loading="lazy"
                scrolling="yes"
                tabIndex={-1}
              />
            ) : (
              <div
                aria-hidden
                className="absolute inset-0 flex items-center justify-center bg-slate-900 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
              >
                Preview loads as you scroll
              </div>
            )}
          </div>

          <div className="relative mt-5">
            <Controls />
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-slate-500 sm:hidden">
          Tap the expand icon to view fullscreen.
        </p>
      </div>

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Platform preview fullscreen"
          className="fixed inset-0 z-[100] flex flex-col bg-slate-950"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-300">
                {current.kicker}
              </p>
              <p className="truncate text-sm font-semibold text-white sm:text-base">
                {current.title}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 sm:text-sm"
              aria-label="Close fullscreen"
            >
              Close ✕
            </button>
          </div>

          <div className="px-4 pt-3 sm:px-6">
            <Stepper />
          </div>

          <div className="relative mx-auto mt-3 flex w-full max-w-[1400px] flex-1 overflow-hidden px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
              <iframe
                key={`fs-${current.href}`}
                title={current.title}
                src={current.href}
                onLoad={(e) => lockIframeNavigation(e.currentTarget)}
                className="showcase-fade absolute inset-0 h-full w-full border-0"
                loading="lazy"
                scrolling="yes"
                tabIndex={-1}
              />
            </div>
          </div>

          <div className="border-t border-white/10 px-4 py-3 sm:px-6">
            <Controls />
          </div>
        </div>
      )}
    </>
  );
}
