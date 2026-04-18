import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/home/logo";
import { Reveal } from "@/components/home/reveal";
import { TiltCard } from "@/components/home/tilt-card";

export const metadata: Metadata = {
  title: "KAPTRIX | AI Diligence Platform",
  description:
    "Deterministic AI diligence with evidence-driven reasoning and operator-led decisions.",
};

const SNAPSHOTS = [
  {
    kicker: "Layer 01",
    title: "Intake & context",
    description: "Operator-defined scope and deal context.",
    href: "/preview/intake",
    accent: "from-indigo-500/40 via-sky-500/20 to-transparent",
  },
  {
    kicker: "Layer 02",
    title: "Scoring layer",
    description: "Deterministic dimensions with evidence links.",
    href: "/preview/scoring",
    accent: "from-violet-500/40 via-fuchsia-500/20 to-transparent",
  },
  {
    kicker: "Layer 03",
    title: "Report layer",
    description: "Investment-ready output with full auditability.",
    href: "/preview/report",
    accent: "from-fuchsia-500/40 via-rose-500/20 to-transparent",
  },
];

const LAYERS = [
  {
    id: "01",
    title: "Deterministic scoring engine",
    body: "A fixed methodology where the same inputs always produce the same base score. No hidden model behavior.",
    accent: "from-indigo-500 to-indigo-700",
  },
  {
    id: "02",
    title: "Evidence signal engine",
    body: "Documents, claims, and inconsistencies are converted into structured proposals that can be reviewed and approved.",
    accent: "from-violet-500 to-violet-700",
  },
  {
    id: "03",
    title: "Expert reasoning surface",
    body: "AI expands coverage while operators stay accountable for final decisions, rationale quality, and confidence judgment.",
    accent: "from-fuchsia-500 to-fuchsia-700",
  },
];

const MARQUEE = [
  "Deterministic scoring",
  "Evidence-backed AI",
  "Operator judgment",
  "Full audit trail",
  "IC-ready reports",
  "Bounded adjustments",
  "Confidence signals",
  "Pattern library",
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" aria-label="KAPTRIX home">
            <Logo wordClassName="text-lg sm:text-xl" markClassName="h-7 w-7" />
          </Link>
          <nav className="hidden items-center gap-10 text-base font-medium text-slate-600 sm:flex">
            <Link
              href="/how-it-works"
              className="transition hover:text-slate-900"
            >
              How it works
            </Link>
            <Link href="/preview" className="transition hover:text-slate-900">
              Platform
            </Link>
          </nav>
          <Link
            href="/login?mode=signup"
            className="inline-flex items-center rounded-full bg-slate-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
        <div
          aria-hidden
          className="absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-indigo-500/25 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-48 -left-32 h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/25 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(129,140,248,0.18),transparent_55%)]"
        />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-6 pb-24 pt-24 sm:pt-28 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:pb-32">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-indigo-300">
              AI diligence, rebuilt
            </p>
            <h1 className="mt-6 text-5xl font-light leading-[1.02] tracking-tight sm:text-7xl lg:text-[5.75rem]">
              AI + expert knowledge,
              <span className="headline-gradient"> one decision system.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-9 text-slate-300 sm:text-xl">
              KAPTRIX combines deterministic scoring, evidence-backed AI
              signals, and operator judgment into one platform that stands up
              in IC and investment committee scrutiny.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/login?mode=signup"
                className="inline-flex items-center rounded-full bg-white px-7 py-4 text-base font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
              >
                Get started
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center rounded-full border border-white/25 px-7 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                How it works →
              </Link>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="shimmer-border rounded-3xl">
              <div className="relative z-[1] rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl backdrop-blur-md">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-200">
                  Decision integrity
                </p>
                <div className="mt-6 space-y-3 text-base text-slate-200">
                  <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 leading-7">
                    <strong className="text-white">AI</strong> expands
                    coverage, detects contradictions, and proposes bounded
                    adjustments.
                  </p>
                  <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 leading-7">
                    <strong className="text-white">Experts</strong> approve,
                    reject, and own final scoring rationale.
                  </p>
                  <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 leading-7">
                    <strong className="text-white">Platform</strong> preserves
                    a full audit trail for every score change.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Marquee strip */}
        <div className="marquee relative border-t border-white/10 bg-slate-950/60 py-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-slate-950 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-slate-950 to-transparent"
          />
          <div className="marquee-track text-3xl font-light uppercase tracking-[0.18em] text-slate-400 sm:text-5xl">
            {[...MARQUEE, ...MARQUEE].map((word, i) => (
              <span key={i} className="inline-flex items-center pr-16">
                <span>{word}</span>
                <span
                  aria-hidden
                  className="ml-16 inline-block h-2 w-2 rounded-full bg-indigo-400/60"
                />
              </span>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-28 px-6 py-24 sm:py-28">
        {/* ---------- Platform layers ---------- */}
        <section>
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">
              Platform layers
            </p>
            <h2 className="mt-4 max-w-4xl text-4xl font-light leading-[1.05] tracking-tight sm:text-6xl">
              One workflow.{" "}
              <span className="text-slate-500">Three clear layers.</span>
            </h2>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              A calm, minimal surface inspired by Anthropic — paired with
              cinematic tile choreography to guide the eye through each engine
              powering KAPTRIX.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {LAYERS.map((layer, idx) => (
              <Reveal key={layer.id} delay={idx * 120}>
                <TiltCard className="h-full">
                  <article className="group relative h-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_40px_-24px_rgba(15,23,42,0.25)]">
                    <div
                      aria-hidden
                      className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${layer.accent}`}
                    />
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${layer.accent} text-base font-bold text-white shadow-sm`}
                      >
                        {layer.id}
                      </span>
                      <span className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Layer
                      </span>
                    </div>
                    <h3 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">
                      {layer.title}
                    </h3>
                    <p className="mt-4 text-base leading-8 text-slate-600">
                      {layer.body}
                    </p>
                  </article>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- Platform snapshots ---------- */}
        <section>
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-600">
                  Platform snapshots
                </p>
                <h2 className="mt-4 max-w-3xl text-4xl font-light leading-[1.05] tracking-tight sm:text-6xl">
                  See the product{" "}
                  <span className="text-slate-500">in motion.</span>
                </h2>
              </div>
              <Link
                href="/preview"
                className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-400"
              >
                Open full preview →
              </Link>
            </div>
          </Reveal>

          <div className="mt-14 flex flex-col items-stretch gap-4 xl:flex-row xl:items-stretch">
            {SNAPSHOTS.map((shot, idx) => (
              <div key={shot.title} className="contents xl:flex xl:flex-1">
                <Reveal
                  delay={idx * 140}
                  className="xl:flex-1"
                >
                  <TiltCard className="h-full">
                    <Link
                      href={shot.href}
                      className="relative block h-full overflow-hidden rounded-[2rem] border border-slate-800/20 bg-slate-950 p-4 text-white shadow-xl"
                    >
                      <div
                        aria-hidden
                        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${shot.accent}`}
                      />
                      <div className="relative mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
                            {shot.kicker}
                          </p>
                          <p className="mt-1 text-lg font-semibold">
                            {shot.title}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200">
                          Live →
                        </span>
                      </div>
                      <p className="relative mb-4 text-sm leading-6 text-slate-300">
                        {shot.description}
                      </p>
                      <div className="relative h-[26rem] overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                        <div className="absolute left-0 top-0 origin-top-left scale-[0.62]">
                          <iframe
                            title={shot.title}
                            src={shot.href}
                            className="h-[960px] w-[1440px] border-0"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    </Link>
                  </TiltCard>
                </Reveal>
                {idx < SNAPSHOTS.length - 1 && (
                  <div
                    aria-hidden
                    className="flow-arrow flex items-center justify-center py-3 xl:py-0 xl:px-1"
                  >
                    <svg
                      viewBox="0 0 80 24"
                      className="h-6 w-16 rotate-90 text-indigo-400 xl:h-7 xl:w-20 xl:rotate-0"
                      fill="none"
                    >
                      <defs>
                        <linearGradient
                          id={`arrow-grad-${idx}`}
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#e879f9" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M4 12 H70"
                        stroke={`url(#arrow-grad-${idx})`}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="4 6"
                        className="flow-arrow-dash"
                      />
                      <path
                        d="M62 5 L74 12 L62 19"
                        stroke={`url(#arrow-grad-${idx})`}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Simple access ---------- */}
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm sm:p-14">
          <Reveal>
            <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-fuchsia-600">
                  Simple access
                </p>
                <h2 className="mt-4 text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl">
                  Built for operators.{" "}
                  <span className="text-slate-500">
                    Trusted by investment committees.
                  </span>
                </h2>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                  Onboarding stays simple. Enterprise trust stays intact:
                  secure auth, clear recovery, and auditable actions end to
                  end.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-7">
                <div className="flex flex-col gap-3">
                  <Link
                    href="/login?mode=signup"
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
                  >
                    Create account
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-4 text-base font-semibold text-slate-700 transition hover:border-slate-400"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-base text-slate-500">
          <Logo wordClassName="text-sm" markClassName="h-5 w-5" />
          <p>© {new Date().getFullYear()} KAPTRIX</p>
          <div className="flex items-center gap-6">
            <Link
              href="/how-it-works"
              className="transition hover:text-slate-800"
            >
              How it works
            </Link>
            <Link href="/preview" className="transition hover:text-slate-800">
              Platform
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
