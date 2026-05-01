/**
 * Hero arc backdrop — premium evidence-trail particle stream.
 *
 * Visual model: a single primary curved path that sweeps from the
 * lower-right corner up toward the upper-right of the hero. ~50 tiny
 * sparkles travel along that exact path, each with a randomized but
 * SSR-deterministic delay / duration / size / opacity envelope so they
 * stagger naturally instead of moving as one block. A handful of
 * brighter comet particles occasionally streak along the same curve.
 *
 * Layered for dimensionality:
 *   1. Soft violet bloom disc anchored to the lower-right origin.
 *   2. The base arc itself (thin violet→white gradient stroke + a
 *      blurred duplicate underneath for glow).
 *   3. ~50 small particles with <animateMotion> + opacity fade.
 *   4. 4 brighter "comet" particles with longer trails, slower cycle.
 *   5. A few stationary stardust sparkles around the arc that twinkle
 *      independently for depth.
 *
 * `mix-blend-mode: screen` on the particle layer makes the glows
 * compose correctly over the dark navy hero gradient — particles
 * crossing over each other brighten instead of stacking opaquely.
 *
 * Pure SVG + CSS, no JS animation loop. pointer-events disabled,
 * aria-hidden, prefers-reduced-motion kills every animation.
 */

// SSR-deterministic pseudo-random — keeps server and client renders
// in sync so we don't get hydration drift.
function rand(seed: number, i: number): number {
  const x = Math.sin(seed * 9301 + i * 49297) * 23571;
  return x - Math.floor(x);
}

const PARTICLE_COUNT = 50;
const PARTICLE_PATH_DUR_MIN = 7; // seconds
const PARTICLE_PATH_DUR_RANGE = 5;

interface Particle {
  delay: number;
  duration: number;
  radius: number;
  baseOpacity: number;
}

const PARTICLES: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  delay: rand(1, i) * 10,
  duration: PARTICLE_PATH_DUR_MIN + rand(2, i) * PARTICLE_PATH_DUR_RANGE,
  radius: 0.5 + rand(3, i) * 1.5, // 0.5 – 2.0
  baseOpacity: 0.25 + rand(4, i) * 0.45, // 0.25 – 0.7
}));

// 4 brighter comets — slower, larger, brighter.
const COMETS: Particle[] = Array.from({ length: 4 }, (_, i) => ({
  delay: i * 3,
  duration: 9 + i * 0.8,
  radius: 2.6 + i * 0.4,
  baseOpacity: 0.95,
}));

// Stationary stardust scattered along the new circular arcs. Positions
// roughly track the visible portion of a sphere whose center sits at
// (1300, 1000) — i.e. just past the lower-right corner of the viewBox.
const STARDUST: { x: number; y: number; r: number; delay: number }[] = [
  // Along the inner arc (r=720)
  { x: 700, y: 750, r: 1.1, delay: 0 },
  { x: 800, y: 670, r: 0.9, delay: 0.6 },
  { x: 920, y: 560, r: 1.3, delay: 1.4 },
  { x: 1020, y: 440, r: 1.0, delay: 0.3 },
  { x: 1100, y: 360, r: 1.1, delay: 1.1 },
  // Along the main arc (r=900)
  { x: 520, y: 760, r: 0.8, delay: 1.8 },
  { x: 640, y: 640, r: 0.9, delay: 2.0 },
  { x: 760, y: 500, r: 1.0, delay: 0.5 },
  { x: 880, y: 380, r: 1.2, delay: 1.6 },
  { x: 1000, y: 260, r: 0.9, delay: 0.2 },
  { x: 1120, y: 160, r: 1.0, delay: 1.3 },
  // Along the outer arc (r=1080)
  { x: 360, y: 760, r: 1.1, delay: 0.4 },
  { x: 500, y: 600, r: 0.8, delay: 1.7 },
  { x: 660, y: 420, r: 0.9, delay: 2.4 },
  { x: 800, y: 240, r: 1.0, delay: 0.8 },
  { x: 920, y: 80, r: 1.2, delay: 1.0 },
];

// CIRCULAR ARC GEOMETRY
//
// All three arcs are slices of concentric circles whose center sits at
// approximately (1300, 1000) — just past the lower-right corner of the
// 1200 × 800 viewBox. That's what makes the visible portion of each
// curve read as the edge of a globe rising into the frame, rather than
// an abstract bezier swoop.
//
// SVG arc syntax:  M <start>  A rx ry rotation large-arc sweep <end>
//   - rx == ry == radius (true circle, no eccentricity)
//   - rotation 0
//   - large-arc 0 (we want the SHORT arc between the endpoints)
//   - sweep 1 (clockwise in SVG y-down)
//
// Endpoints are picked where each circle exits the viewBox: the bottom
// edge (y=800) on the lower-left side, and either the right edge (for
// the inner curl) or the top edge (for the outer arc) on the upper end.
//
// Outer arc:  r=1080.  bottom (238, 800) → top (892, 0)
// Main arc:   r=900.   bottom (423, 800) → right (1200, 106)
// Inner arc:  r=720.   bottom (609, 800) → right (1200, 287)
const ARC_PATH = "M 423 800 A 900 900 0 0 1 1200 106";
const ARC_PATH_INNER = "M 609 800 A 720 720 0 0 1 1200 287";
const ARC_PATH_OUTER = "M 238 800 A 1080 1080 0 0 1 892 0";

export function HeroArcBackdrop() {
  return (
    <div
      aria-hidden
      className="hero-arc-backdrop pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMaxYMid meet"
        className="hero-arc-svg absolute -right-6 -bottom-6 h-auto w-[88%] max-w-[420px] sm:-right-12 sm:-bottom-24 sm:h-[140%] sm:w-[68%] sm:max-w-[1100px] lg:w-[56%]"
      >
        <defs>
          {/* Wide bloom — the soft halo around bright sources. */}
          <filter id="hpa-bloom" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          {/* Tight bloom — the sharper inner glow on small sparkles. */}
          <filter id="hpa-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
          {/* Big violet origin bloom. */}
          <filter id="hpa-origin-bloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="32" />
          </filter>

          <radialGradient id="hpa-origin-disc" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#7C3AED" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </radialGradient>

          {/* Arc gradient: violet at the origin → white at the apex →
              fades back to indigo as the path continues off-canvas. */}
          <linearGradient id="hpa-arc-gradient" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0" />
            <stop offset="20%" stopColor="#A855F7" stopOpacity="0.45" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="80%" stopColor="#A78BFA" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
          </linearGradient>

          {/* Reusable path geometry that the particle <animateMotion>
              elements reference via <mpath>. All three arcs are slices
              of concentric circles centered at ~(1300, 1000), just
              past the lower-right corner of the viewBox. */}
          <path id="hpa-path" d={ARC_PATH} />
          <path id="hpa-path-inner" d={ARC_PATH_INNER} />
          <path id="hpa-path-outer" d={ARC_PATH_OUTER} />
        </defs>

        {/* ─────── Layer 1: violet origin bloom ───────
            Anchored at the implicit globe center (1300, 1000) — just
            past the bottom-right corner of the viewBox — so the soft
            glow radiates outward from "behind" the globe edge. The
            top hemisphere of this bloom bleeds back into the visible
            area of the hero. */}
        <circle
          cx="1300"
          cy="1000"
          r="620"
          fill="url(#hpa-origin-disc)"
          filter="url(#hpa-origin-bloom)"
        />

        {/* ─────── Layer 2: three concentric circular arcs ───────
            Each arc renders TWICE: a wide blurred halo at low opacity
            for the glow, then a thin crisp line on top. Three different
            radii (1080 / 900 / 720) create the orbital-shell layering
            the user asked for. */}

        {/* Outer arc (r=1080) — faintest, gives the globe its
            outermost orbit/shell. */}
        <use
          href="#hpa-path-outer"
          stroke="url(#hpa-arc-gradient)"
          strokeWidth="2.4"
          fill="none"
          opacity="0.25"
          filter="url(#hpa-bloom)"
        />
        <use
          href="#hpa-path-outer"
          className="hero-arc-shimmer hero-arc-shimmer-3"
          stroke="url(#hpa-arc-gradient)"
          strokeWidth="0.7"
          fill="none"
          opacity="0.45"
        />

        {/* Main arc (r=900) — the brightest, primary visible curve. */}
        <use
          href="#hpa-path"
          stroke="url(#hpa-arc-gradient)"
          strokeWidth="6"
          fill="none"
          opacity="0.4"
          filter="url(#hpa-bloom)"
        />
        <use
          href="#hpa-path"
          className="hero-arc-shimmer hero-arc-shimmer-1"
          stroke="url(#hpa-arc-gradient)"
          strokeWidth="1.4"
          fill="none"
        />

        {/* Inner arc (r=720) — tightest curl, hugs closer to the
            globe origin, half the prominence of the main arc. */}
        <use
          href="#hpa-path-inner"
          stroke="url(#hpa-arc-gradient)"
          strokeWidth="3"
          fill="none"
          opacity="0.22"
          filter="url(#hpa-bloom)"
        />
        <use
          href="#hpa-path-inner"
          className="hero-arc-shimmer hero-arc-shimmer-2"
          stroke="url(#hpa-arc-gradient)"
          strokeWidth="0.9"
          fill="none"
          opacity="0.55"
        />

        {/* ─────── Layer 3: the particle stream ───────
            mix-blend-mode: screen on this group means overlapping
            particles brighten instead of just adding opacity over the
            dark hero gradient — the same trick high-end branded
            particle effects use. */}
        <g
          style={{ mixBlendMode: "screen" } as React.CSSProperties}
        >
          {PARTICLES.map((p, i) => {
            // Distribute particles across three orbital shells so they
            // collectively read as a globe in motion: most ride the
            // primary arc, a smaller share each ride the inner and
            // outer arcs at correspondingly different speeds.
            const shellPick = i % 6;
            const shellPath =
              shellPick === 0
                ? "#hpa-path-inner"
                : shellPick === 1
                  ? "#hpa-path-outer"
                  : "#hpa-path";
            // Scale duration so all shells trace their arc at a similar
            // visual cadence even though arc lengths differ. Inner is
            // shorter ~80%, outer ~115%.
            const shellDuration =
              shellPath === "#hpa-path-inner"
                ? p.duration * 0.85
                : shellPath === "#hpa-path-outer"
                  ? p.duration * 1.15
                  : p.duration;
            return (
              <g
                key={`p-${i}`}
                className="hero-arc-particle-wrap"
                style={{
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${shellDuration}s`,
                  opacity: p.baseOpacity,
                } as React.CSSProperties}
              >
                <circle r={p.radius} fill="#FFFFFF" filter="url(#hpa-glow)">
                  <animateMotion
                    dur={`${shellDuration}s`}
                    begin={`${p.delay}s`}
                    repeatCount="indefinite"
                    rotate="auto"
                  >
                    <mpath href={shellPath} />
                  </animateMotion>
                </circle>
              </g>
            );
          })}

          {/* ─────── Layer 4: brighter comets ───────
              Larger, longer-trail, brighter — these are the "lookers"
              the eye latches onto. */}
          {COMETS.map((c, i) => (
            <g key={`c-${i}`} className="hero-arc-particle-wrap" style={{
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              opacity: c.baseOpacity,
            } as React.CSSProperties}>
              {/* trailing afterimage — bigger, blurrier, slightly
                  delayed via begin offset so it looks like a tail. */}
              <circle
                r={c.radius * 2.6}
                fill="#FFFFFF"
                opacity="0.35"
                filter="url(#hpa-bloom)"
              >
                <animateMotion
                  dur={`${c.duration}s`}
                  begin={`${c.delay - 0.18}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                >
                  <mpath href="#hpa-path" />
                </animateMotion>
              </circle>
              {/* the bright head */}
              <circle r={c.radius} fill="#FFFFFF" filter="url(#hpa-glow)">
                <animateMotion
                  dur={`${c.duration}s`}
                  begin={`${c.delay}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                >
                  <mpath href="#hpa-path" />
                </animateMotion>
              </circle>
            </g>
          ))}
        </g>

        {/* ─────── Layer 5: stationary stardust ─────── */}
        <g style={{ mixBlendMode: "screen" } as React.CSSProperties}>
          {STARDUST.map((p, i) => (
            <circle
              key={`s-${i}`}
              className={`hero-arc-stardust hero-arc-stardust-${(i % 4) + 1}`}
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill="#FFFFFF"
              filter="url(#hpa-glow)"
              style={{ animationDelay: `${p.delay}s` }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
