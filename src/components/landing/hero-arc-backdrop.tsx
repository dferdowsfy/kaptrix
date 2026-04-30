/**
 * Hero arc backdrop — comet-head sweep along glowing arcs.
 *
 * Inspired by saxecap.com's hero. Each arc renders in three layers:
 *
 *   1. A very dim base stroke so the curve always exists in the
 *      background (white at ~15% opacity).
 *   2. A "chase light" — a thick bright stroke with a long dasharray
 *      whose dashoffset crawls fast, so a brilliant white segment
 *      sweeps along the arc and momentarily lights it up.
 *   3. A bright glowing comet head that travels the path via SVG
 *      `<animateMotion>`, dragging a comet tail behind it.
 *
 * Plus stardust particles that twinkle independently around the arcs.
 *
 * Pure SVG + CSS, no JS animation loop, no canvas. Pointer-events
 * disabled, aria-hidden, and `prefers-reduced-motion` kills every
 * animation.
 */

export function HeroArcBackdrop() {
  return (
    <div
      aria-hidden
      className="hero-arc-backdrop pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMaxYMid meet"
        className="hero-arc-svg absolute -right-12 -bottom-32 h-[140%] w-[80%] max-w-[1100px] sm:right-0 sm:-bottom-24 sm:w-[68%] lg:w-[56%]"
      >
        <defs>
          {/* Wide soft glow for the comet head and trail. */}
          <filter id="hero-arc-bloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b2" />
            <feMerge>
              <feMergeNode in="b1" />
              <feMergeNode in="b2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Gentler glow for stardust particles. */}
          <filter id="hero-arc-spark" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
          {/* Big violet bloom in the corner. */}
          <filter id="hero-arc-corner-bloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="28" />
          </filter>

          <radialGradient id="hero-arc-disc" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#7C3AED" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </radialGradient>

          {/* The chase-light gradient: invisible at the head, ramps up to
              brilliant white at the tail of the visible dash, then back
              to invisible. Combined with stroke-dasharray that's mostly
              gap, this paints a moving bright comet streak. */}
          <linearGradient id="hero-arc-chase" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="80%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
          </linearGradient>

          {/* Path definitions — referenced by the chase strokes AND by
              the <animateMotion> elements that run the comet heads
              along the same curves. */}
          <path
            id="hero-arc-path-1"
            d="M 1200 720 Q 1020 500 820 320 Q 640 160 460 60"
          />
          <path
            id="hero-arc-path-2"
            d="M 1180 820 Q 980 540 760 280 Q 580 80 380 -40"
          />
          <path
            id="hero-arc-path-3"
            d="M 1170 640 Q 1060 460 920 320 Q 780 200 640 140"
          />
        </defs>

        {/* Soft violet corner bloom. */}
        <circle
          cx="1100"
          cy="780"
          r="520"
          fill="url(#hero-arc-disc)"
          filter="url(#hero-arc-corner-bloom)"
        />

        {/* ──────────── ARC 1 — main sweep ──────────── */}

        {/* Base dim line so the arc exists when the comet is elsewhere. */}
        <use
          href="#hero-arc-path-1"
          stroke="#FFFFFF"
          strokeOpacity="0.16"
          strokeWidth="1.2"
          fill="none"
        />

        {/* Chase light — bright stroke with a long dasharray. The
            dashoffset animation makes the visible segment race along
            the path, "lighting up" the arc as it passes. */}
        <use
          href="#hero-arc-path-1"
          className="hero-arc-chase hero-arc-chase-1"
          stroke="url(#hero-arc-chase)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          filter="url(#hero-arc-bloom)"
        />

        {/* Comet tail — short dash that follows the head. Same path,
            slightly thicker, lower opacity, to fake afterimage. */}
        <use
          href="#hero-arc-path-1"
          className="hero-arc-tail hero-arc-tail-1"
          stroke="#FFFFFF"
          strokeOpacity="0.85"
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
          filter="url(#hero-arc-bloom)"
        />

        {/* Comet head — bright dot that travels via animateMotion. */}
        <g filter="url(#hero-arc-bloom)">
          <circle r="6" fill="#FFFFFF">
            <animateMotion dur="6s" repeatCount="indefinite" rotate="auto">
              <mpath href="#hero-arc-path-1" />
            </animateMotion>
          </circle>
          <circle r="3" fill="#FFFFFF">
            <animateMotion dur="6s" repeatCount="indefinite" rotate="auto">
              <mpath href="#hero-arc-path-1" />
            </animateMotion>
          </circle>
        </g>

        {/* ──────────── ARC 2 — outer sweep ──────────── */}

        <use
          href="#hero-arc-path-2"
          stroke="#FFFFFF"
          strokeOpacity="0.12"
          strokeWidth="1"
          fill="none"
        />
        <use
          href="#hero-arc-path-2"
          className="hero-arc-chase hero-arc-chase-2"
          stroke="url(#hero-arc-chase)"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
          filter="url(#hero-arc-bloom)"
        />
        <use
          href="#hero-arc-path-2"
          className="hero-arc-tail hero-arc-tail-2"
          stroke="#EDE9FE"
          strokeOpacity="0.7"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          filter="url(#hero-arc-bloom)"
        />
        <g filter="url(#hero-arc-bloom)">
          <circle r="5" fill="#FFFFFF">
            <animateMotion
              dur="8.5s"
              begin="1.2s"
              repeatCount="indefinite"
              rotate="auto"
            >
              <mpath href="#hero-arc-path-2" />
            </animateMotion>
          </circle>
          <circle r="2.5" fill="#FFFFFF">
            <animateMotion
              dur="8.5s"
              begin="1.2s"
              repeatCount="indefinite"
              rotate="auto"
            >
              <mpath href="#hero-arc-path-2" />
            </animateMotion>
          </circle>
        </g>

        {/* ──────────── ARC 3 — inner curl ──────────── */}

        <use
          href="#hero-arc-path-3"
          stroke="#A78BFA"
          strokeOpacity="0.18"
          strokeWidth="1"
          fill="none"
        />
        <use
          href="#hero-arc-path-3"
          className="hero-arc-chase hero-arc-chase-3"
          stroke="url(#hero-arc-chase)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          filter="url(#hero-arc-bloom)"
        />

        {/* ──────────── Stardust ──────────── */}

        {STARDUST.map((p, i) => (
          <circle
            key={i}
            className={`hero-arc-spark hero-arc-spark-${(i % 4) + 1}`}
            cx={p.x}
            cy={p.y}
            r={p.r}
            fill="#FFFFFF"
            filter="url(#hero-arc-spark)"
            style={{ animationDelay: `${p.delay}s` }}
          />
        ))}
      </svg>
    </div>
  );
}

// Stardust positions — clustered along and around the arc paths so they
// reinforce the "comet trailed across stars" feel.
const STARDUST: { x: number; y: number; r: number; delay: number }[] = [
  // Along arc 1
  { x: 1080, y: 600, r: 1.4, delay: 0 },
  { x: 990, y: 500, r: 1.0, delay: 0.6 },
  { x: 900, y: 420, r: 1.6, delay: 1.4 },
  { x: 820, y: 340, r: 1.1, delay: 0.3 },
  { x: 740, y: 260, r: 1.3, delay: 1.1 },
  { x: 660, y: 200, r: 0.9, delay: 1.8 },
  { x: 560, y: 130, r: 1.2, delay: 0.9 },
  // Along arc 2
  { x: 1130, y: 700, r: 1.0, delay: 2.0 },
  { x: 1020, y: 580, r: 1.2, delay: 0.5 },
  { x: 940, y: 460, r: 1.4, delay: 1.6 },
  { x: 840, y: 340, r: 1.0, delay: 0.2 },
  { x: 720, y: 220, r: 1.1, delay: 1.3 },
  { x: 600, y: 130, r: 1.3, delay: 0.7 },
  { x: 480, y: 50, r: 0.9, delay: 2.2 },
  // Stray stars off the path
  { x: 1140, y: 350, r: 1.2, delay: 0.4 },
  { x: 1080, y: 240, r: 0.9, delay: 1.7 },
  { x: 970, y: 180, r: 1.0, delay: 2.4 },
  { x: 850, y: 120, r: 1.1, delay: 0.8 },
  { x: 730, y: 80, r: 0.8, delay: 1.9 },
  { x: 1050, y: 420, r: 1.4, delay: 1.0 },
  { x: 920, y: 580, r: 1.0, delay: 0.1 },
  { x: 800, y: 500, r: 1.2, delay: 2.6 },
  { x: 700, y: 380, r: 0.9, delay: 1.5 },
  { x: 580, y: 280, r: 1.3, delay: 0.4 },
];
