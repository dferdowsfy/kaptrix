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

// Stationary stardust around the arc — pure twinkle, no motion.
const STARDUST: { x: number; y: number; r: number; delay: number }[] = [
  { x: 1080, y: 600, r: 1.2, delay: 0 },
  { x: 990, y: 500, r: 0.9, delay: 0.6 },
  { x: 900, y: 420, r: 1.4, delay: 1.4 },
  { x: 820, y: 340, r: 1.0, delay: 0.3 },
  { x: 740, y: 260, r: 1.1, delay: 1.1 },
  { x: 660, y: 200, r: 0.8, delay: 1.8 },
  { x: 1130, y: 700, r: 0.9, delay: 2.0 },
  { x: 1020, y: 580, r: 1.0, delay: 0.5 },
  { x: 940, y: 460, r: 1.2, delay: 1.6 },
  { x: 880, y: 390, r: 0.9, delay: 0.2 },
  { x: 780, y: 300, r: 1.0, delay: 1.3 },
  { x: 1140, y: 340, r: 1.1, delay: 0.4 },
  { x: 1080, y: 240, r: 0.8, delay: 1.7 },
  { x: 970, y: 180, r: 0.9, delay: 2.4 },
  { x: 850, y: 140, r: 1.0, delay: 0.8 },
  { x: 1050, y: 420, r: 1.2, delay: 1.0 },
];

// The primary motion path — sweeps from the lower-right corner up to
// the upper-right, with a gentle curl through the upper-center area.
const ARC_PATH = "M 1180 760 Q 700 580 760 320 Q 880 80 1100 -40";
// A faint inner secondary arc for depth.
const ARC_PATH_INNER = "M 1160 660 Q 820 540 880 360 Q 960 200 1090 100";

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
              elements reference via <mpath>. */}
          <path id="hpa-path" d={ARC_PATH} />
          <path id="hpa-path-inner" d={ARC_PATH_INNER} />
        </defs>

        {/* ─────── Layer 1: violet origin bloom ─────── */}
        <circle
          cx="1140"
          cy="780"
          r="500"
          fill="url(#hpa-origin-disc)"
          filter="url(#hpa-origin-bloom)"
        />

        {/* ─────── Layer 2: the base arc itself ───────
            Two strokes — a wide blurred halo underneath, then the
            crisp gradient line on top — give the curve a glowing-light
            quality so the path is always visible (subtly) even between
            particle waves. */}
        <use
          href="#hpa-path"
          stroke="url(#hpa-arc-gradient)"
          strokeWidth="6"
          fill="none"
          opacity="0.35"
          filter="url(#hpa-bloom)"
        />
        <use
          href="#hpa-path"
          className="hero-arc-shimmer hero-arc-shimmer-1"
          stroke="url(#hpa-arc-gradient)"
          strokeWidth="1.4"
          fill="none"
        />
        <use
          href="#hpa-path-inner"
          stroke="url(#hpa-arc-gradient)"
          strokeWidth="3"
          fill="none"
          opacity="0.18"
          filter="url(#hpa-bloom)"
        />
        <use
          href="#hpa-path-inner"
          className="hero-arc-shimmer hero-arc-shimmer-2"
          stroke="url(#hpa-arc-gradient)"
          strokeWidth="0.9"
          fill="none"
          opacity="0.5"
        />

        {/* ─────── Layer 3: the particle stream ───────
            mix-blend-mode: screen on this group means overlapping
            particles brighten instead of just adding opacity over the
            dark hero gradient — the same trick high-end branded
            particle effects use. */}
        <g
          style={{ mixBlendMode: "screen" } as React.CSSProperties}
        >
          {PARTICLES.map((p, i) => (
            <g key={`p-${i}`} className="hero-arc-particle-wrap" style={{
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              opacity: p.baseOpacity,
            } as React.CSSProperties}>
              <circle
                r={p.radius}
                fill="#FFFFFF"
                filter="url(#hpa-glow)"
              >
                <animateMotion
                  dur={`${p.duration}s`}
                  begin={`${p.delay}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                >
                  <mpath href="#hpa-path" />
                </animateMotion>
              </circle>
            </g>
          ))}

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
