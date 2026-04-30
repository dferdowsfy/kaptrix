/**
 * Subtle animated evidence-line arc anchored to the lower-right of the
 * landing-page hero. Pure SVG + CSS — no JS animation loop, no external
 * deps, no canvas. Sits behind all hero content with low opacity so the
 * headline, bullets, and CTAs stay highly readable.
 *
 * Visual language:
 *   - Three layered stroke arcs in violet → electric purple, glow blurred
 *     via SVG filter so they read as light trails rather than hard lines.
 *   - Particle dots along the arc, fading out to soft sparks.
 *   - Slow drift animation: opacity shimmer + a tiny stroke-dashoffset
 *     trail that crawls along the path. No fast motion.
 *
 * Responsive:
 *   - Desktop: visible on the right side as a large sweeping arc.
 *   - Tablet: scaled down + lower opacity.
 *   - Mobile: rendered as a small bottom-right glow only (≤640px hides
 *     most of the arc via overflow + scale).
 *
 * Accessibility:
 *   - aria-hidden, pointer-events-none. Honors prefers-reduced-motion.
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
          <filter id="hero-arc-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hero-arc-soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <linearGradient id="hero-arc-stroke-1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0" />
            <stop offset="35%" stopColor="#A855F7" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#6B5BFF" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hero-arc-stroke-2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0" />
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hero-arc-stroke-3" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0" />
            <stop offset="50%" stopColor="#A78BFA" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#C4B5FD" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Soft glow disc behind the arcs — gives the lower-right corner
            its violet bloom without competing with the hero content. */}
        <circle
          cx="1100"
          cy="780"
          r="420"
          fill="#7C3AED"
          opacity="0.18"
          filter="url(#hero-arc-soft-glow)"
        />

        {/* Layer 1 — outermost arc, broad and faint. */}
        <path
          className="hero-arc-line hero-arc-line-1"
          d="M 1180 820 Q 980 540 760 280 Q 580 80 380 -40"
          stroke="url(#hero-arc-stroke-1)"
          strokeWidth="1.4"
          fill="none"
          filter="url(#hero-arc-glow)"
        />

        {/* Layer 2 — middle arc, the brightest line. */}
        <path
          className="hero-arc-line hero-arc-line-2"
          d="M 1200 720 Q 1020 500 820 320 Q 640 160 460 60"
          stroke="url(#hero-arc-stroke-1)"
          strokeWidth="1.8"
          fill="none"
          filter="url(#hero-arc-glow)"
        />

        {/* Layer 3 — innermost arc, tighter curl. */}
        <path
          className="hero-arc-line hero-arc-line-3"
          d="M 1170 640 Q 1060 460 920 320 Q 780 200 640 140"
          stroke="url(#hero-arc-stroke-2)"
          strokeWidth="1.2"
          fill="none"
          filter="url(#hero-arc-glow)"
        />

        {/* Trail layer 4 — short crawling dash that drifts along the
            middle arc to give a sense of data movement. */}
        <path
          className="hero-arc-trail"
          d="M 1200 720 Q 1020 500 820 320 Q 640 160 460 60"
          stroke="url(#hero-arc-stroke-3)"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />

        {/* Particle dots distributed along the arcs. */}
        {PARTICLES.map((p, i) => (
          <circle
            key={i}
            className={`hero-arc-particle hero-arc-particle-${(i % 3) + 1}`}
            cx={p.x}
            cy={p.y}
            r={p.r}
            fill="#C4B5FD"
            style={{ animationDelay: `${p.delay}s` }}
          />
        ))}
      </svg>
    </div>
  );
}

const PARTICLES: { x: number; y: number; r: number; delay: number }[] = [
  { x: 1080, y: 600, r: 1.6, delay: 0 },
  { x: 990, y: 500, r: 1.2, delay: 0.6 },
  { x: 900, y: 420, r: 1.8, delay: 1.4 },
  { x: 820, y: 340, r: 1.3, delay: 0.3 },
  { x: 740, y: 260, r: 1.5, delay: 1.1 },
  { x: 660, y: 200, r: 1.0, delay: 1.8 },
  { x: 560, y: 130, r: 1.4, delay: 0.9 },
  { x: 1130, y: 700, r: 1.0, delay: 2.0 },
  { x: 1020, y: 580, r: 1.2, delay: 0.5 },
  { x: 940, y: 460, r: 1.6, delay: 1.6 },
  { x: 880, y: 390, r: 1.0, delay: 0.2 },
  { x: 780, y: 300, r: 1.3, delay: 1.3 },
  { x: 680, y: 220, r: 1.0, delay: 0.7 },
];
