import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/home/logo";
import { Reveal } from "@/components/home/reveal";
import { TiltCard } from "@/components/home/tilt-card";
import { PublicHeader } from "@/components/home/public-header";
import { PlatformShowcase } from "@/components/home/platform-showcase";

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
    title: "Adaptive knowledge brain",
    body: "Every document, claim, and precedent is ingested into a living knowledge base that continuously learns from new inputs — so decisions stay grounded in the strongest, most current evidence available.",
    accent: "from-violet-500 to-violet-700",
  },
  {
    id: "03",
    title: "Expert reasoning surface",
    body: "AI expands coverage while operators stay accountable for final decisions, rationale quality, and confidence judgment.",
    accent: "from-fuchsia-500 to-fuchsia-700",
  },
];

// Sequence that walks a visitor through the full Kaptrix experience —
// from the first upload to the continuously-trained client brain.
const JOURNEY = [
  {
    step: "01",
    title: "Frame the deal",
    lede: "Start with context, not a blank model.",
    body: "Answer the 14-section intake to lock the industry, stage, thesis, and the questions your IC actually cares about. The platform tailors every downstream prompt to that frame.",
    accent: "from-indigo-500 via-indigo-500 to-sky-500",
  },
  {
    step: "02",
    title: "Upload the room",
    lede: "CIMs, financials, contracts, customer calls — drop them in.",
    body: "Kaptrix parses, chunks, and embeds every document into a private vector index for that one client. Nothing leaks across firms, and nothing is thrown away.",
    accent: "from-sky-500 via-violet-500 to-violet-500",
  },
  {
    step: "03",
    title: "Score with evidence",
    lede: "Deterministic rubric. Every line traced to a quote.",
    body: "The engine scores each dimension using the same rubric every time, while the RAG layer surfaces the exact passages that justify — or contradict — each claim.",
    accent: "from-violet-500 via-fuchsia-500 to-fuchsia-500",
  },
  {
    step: "04",
    title: "The brain keeps learning",
    lede: "Every submission trains the client's own AI continuously.",
    body: "New documents, adjustments, and operator rationale fold back into the client's knowledge base. Ask a question tomorrow and the brain answers with everything you've ever fed it — not a generic model.",
    accent: "from-fuchsia-500 via-rose-500 to-amber-400",
  },
  {
    step: "05",
    title: "Ship the memo",
    lede: "IC-ready, fully auditable, on-brand.",
    body: "Generate the IC memo, risk register, or positioning deck in one click. Every number links back to its source document, its score history, and the operator who signed off.",
    accent: "from-amber-400 via-rose-500 to-fuchsia-500",
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
      <PublicHeader />

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
            <h1 className="mt-6 text-6xl font-light leading-[0.98] tracking-tight sm:text-7xl lg:text-[6.25rem]">
              An AI brain
              <br />
              <span className="headline-gradient">for every deal.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-xl leading-9 text-slate-200 sm:text-2xl">
              KAPTRIX turns your data room into a living,{" "}
              <span className="text-white">evidence-trained intelligence</span>{" "}
              — one that scores deterministically, cites every claim, and{" "}
              <span className="text-white">learns from every submission</span>.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
              Built for operators. Trusted by investment committees. Auditable
              end-to-end.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/login?mode=signup"
                className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-7 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:from-indigo-400 hover:to-fuchsia-400"
              >
                Start free →
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-white/25 bg-white/5 px-7 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Log in
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center rounded-full px-5 py-4 text-base font-medium text-white/70 transition hover:text-white"
              >
                How it works
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
        <div className="marquee relative border-t border-white/10 bg-slate-950/60 py-4">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-slate-950 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-slate-950 to-transparent"
          />
          <div className="marquee-track text-xs font-medium uppercase tracking-[0.32em] text-slate-400 sm:text-sm">
            {MARQUEE.map((word, i) => (
              <span key={i} className="inline-flex items-center">
                <span>{word}</span>
                {i < MARQUEE.length - 1 && (
                  <span
                    aria-hidden
                    className="ml-6 inline-block h-1.5 w-1.5 rounded-full bg-indigo-400/60"
                  />
                )}
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
          </Reveal>

          <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:items-stretch">
            {LAYERS.map((layer, idx) => (
              <Reveal key={layer.id} delay={idx * 120} className="h-full">
                <TiltCard className="h-full">
                  <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_40px_-24px_rgba(15,23,42,0.25)]">
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
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-600">
                Platform snapshots
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl font-light leading-[1.05] tracking-tight sm:text-6xl">
                See the product{" "}
                <span className="text-slate-500">in motion.</span>
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Step through each layer of the platform. The preview advances
                on its own, or jump to a layer from the stepper.
              </p>
            </div>
          </Reveal>

          <PlatformShowcase steps={SNAPSHOTS} />
        </section>

        {/* ---------- The journey: living RAG engine ---------- */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-900/5 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-8 text-white shadow-[0_40px_120px_-40px_rgba(79,70,229,0.45)] sm:p-14">
          <div
            aria-hidden
            className="absolute -top-40 -right-32 h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/20 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-40 -left-32 h-[22rem] w-[22rem] rounded-full bg-indigo-500/25 blur-3xl"
          />

          <Reveal>
            <div className="relative max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.34em] text-indigo-300">
                The living intelligence engine
              </p>
              <h2 className="mt-4 text-5xl font-light leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                Every submission{" "}
                <span className="headline-gradient">trains your deal brain.</span>
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                Kaptrix is not a one-shot model. Each client gets its own
                private RAG engine that gets sharper with every document,
                adjustment, and operator note. The longer you work the deal,
                the smarter the system becomes —{" "}
                <span className="text-white">only for you</span>.
              </p>
            </div>
          </Reveal>

          {/* Timeline */}
          <div className="relative mt-16">
            <div
              aria-hidden
              className="pointer-events-none absolute left-6 top-2 bottom-2 w-px bg-gradient-to-b from-indigo-400/60 via-fuchsia-400/40 to-transparent lg:left-1/2"
            />
            <ol className="space-y-10 lg:space-y-16">
              {JOURNEY.map((j, idx) => {
                const alignRight = idx % 2 === 1;
                return (
                  <Reveal key={j.step} delay={idx * 90}>
                    <li className="relative grid items-start gap-6 lg:grid-cols-2 lg:gap-12">
                      <span
                        aria-hidden
                        className={`absolute left-0 top-0 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${j.accent} text-sm font-bold text-white shadow-lg shadow-indigo-900/40 ring-4 ring-slate-950 lg:left-[calc(50%-1.5rem)]`}
                      >
                        {j.step}
                      </span>
                      <div
                        className={`pl-20 lg:pl-0 ${
                          alignRight ? "lg:col-start-2" : ""
                        }`}
                      >
                        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.06]">
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-300">
                            Step {j.step}
                          </p>
                          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                            {j.title}
                          </h3>
                          <p className="mt-3 text-lg font-light text-white/80 sm:text-xl">
                            {j.lede}
                          </p>
                          <p className="mt-4 text-base leading-7 text-slate-300">
                            {j.body}
                          </p>
                        </div>
                      </div>
                    </li>
                  </Reveal>
                );
              })}
            </ol>
          </div>

          <Reveal delay={150}>
            <div className="relative mt-14 flex flex-col items-center gap-4 text-center">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white/90 backdrop-blur">
                <span
                  aria-hidden
                  className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-fuchsia-400 shadow-[0_0_18px_rgba(232,121,249,0.9)]"
                />
                The loop never stops — your brain keeps learning, even after IC
              </div>
              <p className="max-w-xl text-sm text-white/60">
                New docs → fresh embeddings → updated scores → sharper answers.
                Run it for one deal or a whole portfolio.
              </p>
            </div>
          </Reveal>
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
                    Log in
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
