import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/home/logo";
import { Reveal } from "@/components/home/reveal";
import { PublicHeader } from "@/components/home/public-header";
import { PlatformShowcase } from "@/components/home/platform-showcase";

export const metadata: Metadata = {
  title: "KAPTRIX | Technical diligence for AI investments",
  description:
    "Evidence-first, committee-ready technical diligence for institutional investors evaluating AI companies.",
};

// ---------------------------------------------------------------------------
// Visual system (deliberately restrained — Stripe / Linear / Vanta, not crypto):
// - Primary CTA:  bg #0B0B1A, white text, hover #1F1F2E
// - Secondary:    white bg, 1px #E5E7EB border, black text, hover #F9FAFB
// - Accent:       indigo #6B5BFF used only for eyebrow labels and section borders
// - Dark sections: flat #0B0B1A (no fuchsia/violet gradients, no glow)
// ---------------------------------------------------------------------------

const SNAPSHOTS = [
  {
    kicker: "Layer 01",
    title: "Intake & context",
    description: "Investor-defined scope and deal context.",
    href: "/preview/intake",
    accent: "from-slate-700/40 via-slate-700/20 to-transparent",
  },
  {
    kicker: "Layer 02",
    title: "Scoring layer",
    description: "Deterministic dimensions with evidence links.",
    href: "/preview/scoring",
    accent: "from-slate-700/40 via-slate-700/20 to-transparent",
  },
  {
    kicker: "Layer 03",
    title: "Report layer",
    description: "Investment-ready output with full auditability.",
    href: "/preview/report",
    accent: "from-slate-700/40 via-slate-700/20 to-transparent",
  },
];

const LAYERS = [
  {
    id: "01",
    title: "Deterministic scoring engine",
    body: "A fixed methodology where the same inputs always produce the same base score. No hidden model behavior.",
    pillar: "AI expands coverage, detects contradictions, and proposes bounded adjustments.",
  },
  {
    id: "02",
    title: "Adaptive knowledge brain",
    body: "Every document, claim, and precedent is ingested into a private knowledge base that grounds decisions in the strongest, most current evidence available.",
    pillar: "Investment teams approve, reject, and own final scoring rationale.",
  },
  {
    id: "03",
    title: "Expert reasoning surface",
    body: "AI expands coverage while investors stay accountable for final decisions, rationale quality, and confidence judgment.",
    pillar: "The platform preserves a full audit trail for every score change.",
  },
];

const JOURNEY = [
  {
    step: "01",
    title: "Frame the deal",
    lede: "Start with context, not a blank model.",
    body: "Answer the 14-section intake to lock the industry, stage, thesis, and the questions your IC actually cares about. The platform tailors every downstream prompt to that frame.",
  },
  {
    step: "02",
    title: "Upload the room",
    lede: "CIMs, financials, contracts, customer calls — drop them in.",
    body: "Kaptrix parses, chunks, and embeds every document into a private vector index for that one client. Nothing leaks across firms, and nothing is thrown away.",
  },
  {
    step: "03",
    title: "Score with evidence",
    lede: "Deterministic rubric. Every line traced to a quote.",
    body: "The engine scores each dimension using the same rubric every time, while the RAG layer surfaces the exact passages that justify — or contradict — each claim.",
  },
  {
    step: "04",
    title: "The brain keeps learning",
    lede: "Every submission trains the client's own deal intelligence continuously.",
    body: "New documents, adjustments, and investor rationale fold back into the client's knowledge base. Ask a question tomorrow and the brain answers with everything you've ever fed it — not a generic model.",
  },
  {
    step: "05",
    title: "Ship the memo",
    lede: "IC-ready, fully auditable, on brand.",
    body: "Generate the IC memo, risk register, or positioning deck in one click. Every number links back to its source document, its score history, and the investor who signed off.",
  },
];

const MARQUEE = [
  "Deterministic scoring",
  "Evidence-backed AI",
  "Investor judgment",
  "Full audit trail",
  "IC-ready reports",
  "Bounded adjustments",
  "Confidence signals",
  "Pattern library",
];

// Reusable button styles ----------------------------------------------------
const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-md bg-[#0B0B1A] px-6 py-3 text-base font-medium text-white transition hover:bg-[#1F1F2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B0B1A]";
const BTN_SECONDARY =
  "inline-flex items-center justify-center rounded-md border border-[#E5E7EB] bg-white px-6 py-3 text-base font-medium text-[#0B0B1A] transition hover:bg-[#F9FAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B0B1A]";
// Same primary, but inverted for use on dark backgrounds
const BTN_PRIMARY_ON_DARK =
  "inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-medium text-[#0B0B1A] transition hover:bg-[#F9FAFB]";
const BTN_SECONDARY_ON_DARK =
  "inline-flex items-center justify-center rounded-md border border-white/25 bg-transparent px-6 py-3 text-base font-medium text-white transition hover:bg-white/5";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-[#0B0B1A]">
      <PublicHeader />

      {/* ====================================================================
          1. HERO — tightened, no boxed callout, flat dark background
      ==================================================================== */}
      <section className="relative overflow-hidden bg-[#0B0B1A] text-white">
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-28 sm:pt-32 lg:pb-28">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9B8CFF]">
              AI diligence, rebuilt
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl font-light leading-[1.05] tracking-tight sm:text-6xl lg:text-[5.5rem] kx-fade-in">
              An AI brain
              <br />
              <span className="text-white/70">for every deal.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Technical diligence for AI investments — evidence-first,
              committee-ready, and built to stand up to the scrutiny of real
              investment committees.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/contact" className={BTN_PRIMARY_ON_DARK}>
                Discuss an engagement
              </Link>
              <Link href="#how-it-works" className={BTN_SECONDARY_ON_DARK}>
                See how it works
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Marquee strip */}
        <div className="marquee relative border-t border-white/10 bg-[#0B0B1A] py-4">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#0B0B1A] to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#0B0B1A] to-transparent"
          />
          <div className="marquee-track text-xs font-medium uppercase tracking-[0.32em] text-slate-500 sm:text-sm">
            {MARQUEE.map((word, i) => (
              <span key={i} className="inline-flex items-center">
                <span>{word}</span>
                {i < MARQUEE.length - 1 && (
                  <span
                    aria-hidden
                    className="ml-6 inline-block h-1 w-1 rounded-full bg-slate-600"
                  />
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          2. OUR STORY — muted, prose, left-aligned 600px column
      ==================================================================== */}
      <section className="border-b border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
          <Reveal>
            <div className="max-w-[600px]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
                Our story
              </p>
              <h2 className="mt-4 text-3xl font-normal leading-[1.2] tracking-tight text-[#0B0B1A] sm:text-4xl">
                We kept watching smart investors buy AI companies they
                didn&apos;t fully understand.
              </h2>
              <div className="mt-8 space-y-5 text-base leading-7 text-slate-700">
                <p>
                  Every year, billions flow into AI companies based on decks,
                  demos, and founder conviction. We watched it happen — from
                  the inside. As AI builders, technical leaders, and advisors
                  to institutional investors, we kept seeing the same pattern:
                  brilliant investors writing large checks on AI systems whose
                  actual architecture, data dependencies, and failure modes
                  were never meaningfully examined.
                </p>
                <p>
                  The reason wasn&apos;t laziness. It was a structural gap.
                  Traditional diligence teams weren&apos;t built to evaluate
                  AI-specific risk. AI specialists weren&apos;t built to
                  deliver committee-ready work product. And the models
                  themselves keep getting better, blurring the line between
                  genuine capability and convincing simulation.
                </p>
                <p>
                  Kaptrix was built by people who have lived on both sides of
                  this — shipping AI systems at scale, and being retained by
                  institutional investors to evaluate them. We built the
                  system we wished we had: evidence-first, traceable, and
                  specifically designed for the failure modes AI investments
                  actually exhibit.
                </p>
                <p>
                  As AI keeps advancing, the question isn&apos;t whether to
                  invest in it. The question is how to invest in it
                  defensibly — with evidence, not narrative.
                </p>
                <p className="font-medium text-[#0B0B1A]">
                  That&apos;s what Kaptrix is for.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-28 px-6 py-24 sm:py-28">
        {/* ================================================================
            3. PLATFORM LAYERS (now folds in Decision Integrity points)
        ================================================================ */}
        <section id="how-it-works" className="scroll-mt-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
              Platform layers
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              One workflow.{" "}
              <span className="text-slate-500">Three clear layers.</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {LAYERS.map((layer, idx) => (
              <Reveal key={layer.id} delay={idx * 100}>
                <article className="group flex h-full flex-col rounded-lg border border-[#E5E7EB] bg-white p-7 transition hover:border-[#0B0B1A]">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E5E7EB] bg-[#FAFAFA] text-sm font-semibold text-[#0B0B1A]">
                      {layer.id}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Layer
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-medium tracking-tight text-[#0B0B1A]">
                    {layer.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">
                    {layer.body}
                  </p>
                  <p className="mt-6 border-t border-[#E5E7EB] pt-4 text-sm leading-6 text-slate-500">
                    {layer.pillar}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ================================================================
            4. DELIVERABLES — new section
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
                  Deliverables
                </p>
                <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
                  See what a Kaptrix engagement actually produces.
                </h2>
                <p className="mt-6 text-base leading-7 text-slate-600">
                  Every engagement ends with committee-ready work product. A
                  ten-section Master Diligence Report. An IC memo with clear
                  recommendation. A technical risk register with mitigations.
                  A 100-day post-close plan. Built to survive the scrutiny of
                  a real investment committee — and to leave a full audit
                  trail when someone asks, 18 months later, what exactly was
                  reviewed.
                </p>
                <div className="mt-8">
                  <Link href="/contact?intent=sample" className={BTN_PRIMARY}>
                    Request a sample report
                  </Link>
                </div>
              </div>

              {/* CSS-only stacked-document mock — no purple, no glow */}
              <div className="relative mx-auto h-[360px] w-full max-w-md">
                <div className="absolute right-2 top-6 h-[300px] w-[230px] -rotate-3 rounded-md border border-[#E5E7EB] bg-white shadow-[0_20px_40px_-20px_rgba(11,11,26,0.18)]">
                  <div className="px-5 pt-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                      Investment committee
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#0B0B1A]">
                      IC Memo
                    </p>
                    <div className="mt-4 space-y-1.5">
                      <div className="h-1.5 w-full rounded bg-slate-200" />
                      <div className="h-1.5 w-11/12 rounded bg-slate-200" />
                      <div className="h-1.5 w-9/12 rounded bg-slate-200" />
                      <div className="mt-3 h-1.5 w-full rounded bg-slate-200" />
                      <div className="h-1.5 w-10/12 rounded bg-slate-200" />
                      <div className="h-1.5 w-7/12 rounded bg-slate-200" />
                    </div>
                  </div>
                </div>
                <div className="absolute left-2 top-2 h-[320px] w-[250px] rotate-2 rounded-md border border-[#E5E7EB] bg-white shadow-[0_28px_60px_-25px_rgba(11,11,26,0.22)]">
                  <div className="px-5 pt-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6B5BFF]">
                      Master diligence
                    </p>
                    <p className="mt-2 text-base font-medium text-[#0B0B1A]">
                      Ten-section report
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Confidential — Investor distribution only
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-1.5">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className="rounded border border-[#E5E7EB] bg-[#FAFAFA] px-2 py-1.5 text-[9px] font-medium uppercase tracking-wider text-slate-500"
                        >
                          §{(i + 1).toString().padStart(2, "0")}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ================================================================
            5. PLATFORM SNAPSHOTS — desaturated stepper
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
              Platform snapshots
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              See the product{" "}
              <span className="text-slate-500">in motion.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">
              Step through each layer of the platform. The preview advances on
              its own, or jump to a layer from the stepper.
            </p>
          </Reveal>

          <div className="mt-10">
            <PlatformShowcase steps={SNAPSHOTS} />
          </div>
        </section>

        {/* ================================================================
            6. DEAL BRAIN / RAG STORY — flat dark navy, no fuchsia
        ================================================================ */}
        <section className="overflow-hidden rounded-2xl bg-[#0B0B1A] p-8 text-white sm:p-14">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9B8CFF]">
                The deal intelligence engine
              </p>
              <h2 className="mt-4 text-3xl font-normal leading-[1.1] tracking-tight sm:text-5xl">
                Every submission{" "}
                <span className="text-white/70">trains your deal brain.</span>
              </h2>
              <p className="mt-6 text-base leading-7 text-slate-300 sm:text-lg">
                Kaptrix is not a one-shot model. Each client gets its own
                private RAG engine that gets sharper with every document,
                adjustment, and investor note. The longer you work the deal,
                the more useful the system becomes — only for you.
              </p>
            </div>
          </Reveal>

          {/* Timeline — single neutral rail, no rainbow gradients */}
          <div className="relative mt-14">
            <div
              aria-hidden
              className="pointer-events-none absolute left-5 top-2 bottom-2 w-px bg-white/10"
            />
            <ol className="space-y-8">
              {JOURNEY.map((j, idx) => (
                <Reveal key={j.step} delay={idx * 100}>
                  <li className="relative grid gap-4 lg:grid-cols-[3rem_1fr]">
                    <span
                      aria-hidden
                      className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-md border border-white/15 bg-[#14142B] text-xs font-semibold text-white lg:static"
                    >
                      {j.step}
                    </span>
                    <div className="pl-14 lg:pl-0">
                      <h3 className="text-lg font-medium text-white sm:text-xl">
                        {j.title}
                      </h3>
                      <p className="mt-1 text-sm text-white/70 sm:text-base">
                        {j.lede}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
                        {j.body}
                      </p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>

          {/* Privacy callout */}
          <Reveal delay={120}>
            <div className="mt-12 rounded-md border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-300">
              <p className="font-semibold text-white">Note on privacy.</p>
              <p className="mt-1">
                Your submissions train <em>your</em> deal brain. Client data is
                fully isolated, never shared across workspaces, and never used
                to improve models for other clients. Full audit trail available
                on request.
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <p className="mt-10 max-w-2xl text-sm leading-6 text-slate-400">
              The loop continues across the life of the engagement: new
              documents → fresh embeddings → updated scores → sharper answers.
              Run it for one deal or a whole portfolio.
            </p>
          </Reveal>
        </section>

        {/* ================================================================
            7. CLOSING — replaces "Trusted by investment committees"
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
                What it&apos;s for
              </p>
              <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
                Built for how investment decisions actually get made.
              </h2>
              <p className="mt-6 text-base leading-7 text-slate-600">
                Kaptrix is designed for investors who need defensible technical
                diligence on AI companies — fast, evidence-backed, and
                auditable. Every engagement produces committee-ready
                deliverables with a full audit trail from artifact to score to
                decision.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/contact" className={BTN_PRIMARY}>
                  Discuss an engagement
                </Link>
                <Link href="#how-it-works" className={BTN_SECONDARY}>
                  See how it works
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ====================================================================
          8. FOOTER — minimal, with contact + legal disclaimer
      ==================================================================== */}
      <footer className="border-t border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Logo wordClassName="text-sm text-[#0B0B1A]" markClassName="h-5 w-5" />
            <p>© {new Date().getFullYear()} Kaptrix</p>
            <div className="flex items-center gap-6">
              <Link
                href="#how-it-works"
                className="transition hover:text-[#0B0B1A]"
              >
                How it works
              </Link>
              <Link
                href="/preview"
                className="transition hover:text-[#0B0B1A]"
              >
                Platform
              </Link>
              <Link
                href="/contact"
                className="transition hover:text-[#0B0B1A]"
              >
                Contact
              </Link>
            </div>
          </div>
          <p className="mt-8 max-w-3xl text-xs leading-5 text-slate-400">
            Kaptrix is an advisory and technology practice. Engagements are
            governed by individual letters of engagement. Not investment
            advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
