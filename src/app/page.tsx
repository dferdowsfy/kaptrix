import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/home/logo";
import { Reveal } from "@/components/home/reveal";
import { PublicHeader } from "@/components/home/public-header";
import { PlatformShowcase } from "@/components/home/platform-showcase";
import { ScrollToTop } from "@/components/home/scroll-to-top";

export const metadata: Metadata = {
  title: "KAPTRIX | Don't write a check on AI you can't defend",
  description:
    "Evidence-backed AI diligence for investors and operators. Score what's real, expose contradictions, produce decision-grade outputs before capital moves.",
};

// ---------------------------------------------------------------------------
// Visual system (unchanged): Stripe / Linear restraint.
// Primary CTA #0B0B1A · Secondary white/border · Accent indigo #6B5BFF.
// ---------------------------------------------------------------------------

const HERO_PROOF = [
  "Every score traced to a specific source passage.",
  "Contradictions across decks, contracts, and code flagged automatically.",
  "IC-ready outputs defensible at committee — and eighteen months later.",
];

const COST_OF_WRONG = [
  "Overpay for a wrapper priced like a platform.",
  "Undisclosed vendor and model dependencies surface post-close.",
  "Narrative scored as capability; the cliff appears in quarter three.",
  "A thesis you can't defend when LPs, the board, or the exit committee asks how the call got made.",
];

const HOW_IT_WORKS = [
  {
    id: "01",
    step: "Intake",
    line: "Ingest the full room — CIMs, contracts, code artifacts, customer calls, model specs.",
  },
  {
    id: "02",
    step: "Scoring",
    line: "Apply a fixed rubric to the dimensions that break AI companies — every score tied to evidence.",
  },
  {
    id: "03",
    step: "Outputs",
    line: "Ship an IC memo, risk register, and execution plan with a full audit trail from artifact to decision.",
  },
];

const SNAPSHOTS = [
  {
    kicker: "Layer 01",
    title: "Intake & context",
    description: "Scope the deal. Lock the thesis. Set the questions that matter.",
    href: "/app/intake",
    accent: "from-slate-700/40 via-slate-700/20 to-transparent",
  },
  {
    kicker: "Layer 02",
    title: "Scoring layer",
    description: "Structured dimensions. Every claim traced to evidence.",
    href: "/app/scoring",
    accent: "from-slate-700/40 via-slate-700/20 to-transparent",
  },
  {
    kicker: "Layer 03",
    title: "Report layer",
    description: "Committee-ready outputs. Full audit trail from artifact to decision.",
    href: "/app/report",
    accent: "from-slate-700/40 via-slate-700/20 to-transparent",
  },
];

const DELIVERABLES = [
  {
    name: "AI Diligence Report",
    what: "Ten-section master report: architecture, data, evals, team, moat, vendor risk, scaling, compliance, commercial posture.",
    why: "The document the partner reads on the train. It has to survive scrutiny.",
  },
  {
    name: "Investment Committee Memo",
    what: "Recommendation, thesis, key risks, mitigations, and decision rationale — condensed to IC format.",
    why: "A clear call, not a summary. Dissent is grounded in the same facts.",
  },
  {
    name: "Technical Risk Register",
    what: "Ranked register of technical, model, data, vendor, and operational risks with severity, triggers, and owners.",
    why: "The handoff to the post-close team so nothing drops in the first 90 days.",
  },
  {
    name: "Competitive Posture",
    what: "Where the company leads, where it's exposed, and what happens when the next model release lands.",
    why: "Tells you whether the moat is real or a six-month lead dressed up as one.",
  },
  {
    name: "Value Creation & Execution Plan",
    what: "Sequenced 100-day plan: what to fix, scale, restructure, or kill — owner-tagged, tied to thesis levers.",
    why: "The gap between a good thesis and a good return is execution. This is where that gap closes.",
  },
];

const DIFFERENTIATION = [
  "Evidence or nothing — no score exists without a source passage behind it.",
  "Tuned to AI failure modes — data drift, eval gaps, prompt fragility, vendor lock, silent degradation.",
  "Contradiction-native — the gap between deck, contract, and code is the product, not an afterthought.",
  "Reproducible — the same rubric applied the same way across every deal in the pipeline.",
  "Compounding — your private knowledge base gets sharper with every engagement you run through it.",
];

const EXECUTION_BULLETS = [
  "Sequenced 100-day plan with owners, dependencies, and success criteria.",
  "Architecture and data-layer remediation targeted at the fragility diligence surfaced.",
  "Eval, observability, and model-governance scaffolding — instrumented before it breaks.",
  "Vendor and model hardening: reduce lock-in, add fallbacks, renegotiate before leverage shifts.",
];

const MOAT_BULLETS = [
  "Every artifact, adjustment, and rationale folds into your private index — nothing is discarded.",
  "Patterns across architectures and failure modes carry from deal to deal.",
  "Institutional memory survives team turnover and market cycles.",
  "The tenth engagement is materially sharper — and harder to match — than the first.",
];

const MARQUEE = [
  "Evidence-backed",
  "Decision-grade",
  "Contradiction-aware",
  "Audit-trailed",
  "Execution-ready",
  "Compounds per deal",
  "Vendor-risk mapped",
  "IC-ready",
];

const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-md bg-[#0B0B1A] px-6 py-3 text-base font-medium text-white transition hover:bg-[#1F1F2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B0B1A]";
const BTN_SECONDARY =
  "inline-flex items-center justify-center rounded-md border border-[#E5E7EB] bg-white px-6 py-3 text-base font-medium text-[#0B0B1A] transition hover:bg-[#F9FAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B0B1A]";
const BTN_PRIMARY_ON_DARK =
  "inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-medium text-[#0B0B1A] transition hover:bg-[#F9FAFB]";
const BTN_SECONDARY_ON_DARK =
  "inline-flex items-center justify-center rounded-md border border-white/25 bg-transparent px-6 py-3 text-base font-medium text-white transition hover:bg-white/5";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-[#0B0B1A]">
      <ScrollToTop />
      <PublicHeader />

      {/* ====================================================================
          1. HERO
      ==================================================================== */}
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,#1B1F4A_0%,#0D1033_35%,#0A0B1F_65%,#070815_100%)] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 bottom-0 h-[18rem] w-[18rem] rounded-full bg-sky-500/10 blur-[100px]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-28 sm:pt-32 lg:pb-28">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
              AI diligence, rebuilt for capital decisions
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl font-light leading-[1.05] tracking-tight sm:text-6xl lg:text-[5.25rem] kx-fade-in">
              Don&apos;t write a check on
              <br />
              <span className="bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                AI you can&apos;t defend.
              </span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-100 sm:text-xl">
              Kaptrix pressure-tests AI companies before capital moves —
              scoring what&apos;s real, exposing what contradicts, and
              producing the decision-grade package your IC can stand behind.
            </p>

            <ul className="mt-8 space-y-2.5">
              {HERO_PROOF.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-3 text-base leading-7 text-slate-100 sm:text-lg"
                >
                  <span
                    aria-hidden
                    className="mt-2.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-300"
                  />
                  <span>{p}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/contact" className={BTN_PRIMARY_ON_DARK}>
                Start a diligence engagement
              </Link>
              <Link href="/sample-report" className={BTN_SECONDARY_ON_DARK}>
                See a sample report
              </Link>
              <Link
                href="/app"
                className="ml-1 inline-flex items-center gap-2 rounded-full border-2 border-indigo-400/60 bg-white/10 px-5 py-2.5 text-base font-semibold text-white backdrop-blur transition hover:border-white hover:bg-white/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="-ml-0.5"><polygon points="6 4 20 12 6 20 6 4" /></svg>
                Try the demo
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="marquee relative border-t border-white/10 bg-[#070815] py-4">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#070815] to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#070815] to-transparent"
          />
          <div className="marquee-track text-xs font-medium uppercase tracking-[0.32em] text-slate-300 sm:text-sm">
            {MARQUEE.map((word, i) => (
              <span key={i} className="inline-flex items-center">
                <span>{word}</span>
                {i < MARQUEE.length - 1 && (
                  <span
                    aria-hidden
                    className="ml-6 inline-block h-1 w-1 rounded-full bg-indigo-400/60"
                  />
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          2. THE COST OF BEING WRONG
      ==================================================================== */}
      <section className="border-b border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
                The cost of being wrong
              </p>
              <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
                The check clears fast.{" "}
                <span className="text-slate-600">The bill comes later.</span>
              </h2>
            </div>
          </Reveal>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2">
            {COST_OF_WRONG.map((b, i) => (
              <Reveal key={i} delay={i * 80}>
                <li className="kx-sub-sm flex gap-3 rounded-lg border border-[#E5E7EB] border-l-[3px] border-l-[#6B5BFF] bg-white p-5 shadow-[0_1px_2px_rgba(11,11,26,0.04)] transition hover:border-l-[#0B0B1A] hover:shadow-[0_4px_12px_-4px_rgba(11,11,26,0.08)]">
                  <span
                    aria-hidden
                    className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[#6B5BFF]"
                  />
                  <span>{b}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-28 px-6 py-24 sm:py-28">
        {/* ================================================================
            3. WHAT KAPTRIX DOES
        ================================================================ */}
        <section>
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
              What Kaptrix does
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              A decision system.{" "}
              <span className="text-slate-600">Not a report generator.</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {[
              {
                id: "01",
                title: "Ingests the evidence",
                body: "CIMs, contracts, code, customer calls, model specs — pulled in, parsed, and indexed as the source of truth for the engagement.",
              },
              {
                id: "02",
                title: "Scores what's real",
                body: "A fixed rubric applied to the dimensions that actually break AI companies. Every score tied back to a specific passage.",
              },
              {
                id: "03",
                title: "Exposes contradictions",
                body: "Decks claim one thing; contracts and code say another. The gap is surfaced, not absorbed.",
              },
              {
                id: "04",
                title: "Ships decision-grade outputs",
                body: "IC memo, risk register, execution plan — each one defensible on the way in and on the way out.",
              },
            ].map((layer, idx) => (
              <Reveal key={layer.id} delay={idx * 90}>
                <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-[#E5E7EB] bg-white p-7 shadow-[0_1px_2px_rgba(11,11,26,0.04)] transition hover:border-[#0B0B1A] hover:shadow-[0_8px_24px_-12px_rgba(11,11,26,0.12)]">
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#6B5BFF] via-indigo-400 to-transparent"
                  />
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-indigo-100 bg-indigo-50 text-sm font-semibold text-[#6B5BFF]">
                    {layer.id}
                  </span>
                  <h3 className="mt-5 text-xl font-medium tracking-tight text-[#0B0B1A]">
                    {layer.title}
                  </h3>
                  <p className="kx-sub mt-3">{layer.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ================================================================
            4. HOW IT WORKS — 3 steps
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
              How it works
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              Intake.{" "}
              <span className="text-slate-600">Scoring. Outputs.</span>
            </h2>
          </Reveal>

          <ol className="mt-12 grid gap-6 lg:grid-cols-3">
            {HOW_IT_WORKS.map((s, idx) => (
              <Reveal key={s.id} delay={idx * 90}>
                <li className="flex h-full flex-col rounded-lg border border-[#E5E7EB] bg-white p-7 shadow-[0_1px_2px_rgba(11,11,26,0.04)]">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#0B0B1A] text-sm font-semibold text-white">
                      {s.id}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                      {s.step}
                    </span>
                  </div>
                  <p className="kx-sub mt-5">{s.line}</p>
                </li>
              </Reveal>
            ))}
          </ol>

          <div className="mt-14">
            <PlatformShowcase steps={SNAPSHOTS} />
          </div>
        </section>

        {/* ================================================================
            5. OUTPUTS
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
              Outputs
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              What lands on your desk.{" "}
              <span className="text-slate-600">Sourced. Auditable. Usable.</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            {DELIVERABLES.map((d, i) => (
              <Reveal key={d.name} delay={i * 80}>
                <article className="flex h-full flex-col rounded-lg border border-[#E5E7EB] bg-white p-7 shadow-[0_1px_2px_rgba(11,11,26,0.04)] transition hover:border-[#0B0B1A] hover:shadow-[0_8px_24px_-12px_rgba(11,11,26,0.10)]">
                  <div className="mb-4 flex items-center gap-3">
                    <span
                      aria-hidden
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-indigo-100 bg-indigo-50 text-xs font-semibold text-[#6B5BFF]"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Deliverable
                    </span>
                  </div>
                  <h3 className="text-xl font-medium tracking-tight text-[#0B0B1A]">
                    {d.name}
                  </h3>
                  <p className="kx-sub-sm mt-3">
                    <span className="font-semibold text-[#0B0B1A]">What:{" "}</span>
                    {d.what}
                  </p>
                  <p className="kx-sub-sm mt-3 border-t border-[#E5E7EB] pt-4">
                    <span className="font-semibold text-[#0B0B1A]">Why it matters:{" "}</span>
                    {d.why}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="mt-10">
              <Link href="/sample-report" className={BTN_PRIMARY}>
                See a sample report
              </Link>
            </div>
          </Reveal>
        </section>

        {/* ================================================================
            6. DIFFERENTIATION
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
                  Why Kaptrix
                </p>
                <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
                  Not another tool.{" "}
                  <span className="text-slate-600">Not another consultant.</span>
                </h2>
              </div>
              <ul className="space-y-3">
                {DIFFERENTIATION.map((b, i) => (
                  <li
                    key={i}
                    className="flex gap-3 border-b border-[#E5E7EB] pb-3 text-lg font-medium leading-8 text-slate-900 last:border-b-0"
                  >
                    <span
                      aria-hidden
                      className="mt-3 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#6B5BFF]"
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* ================================================================
            7. EXECUTION LAYER
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
              Execution layer
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              This doesn&apos;t die{" "}
              <span className="text-slate-600">in a PDF.</span>
            </h2>
          </Reveal>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {EXECUTION_BULLETS.map((b, i) => (
              <Reveal key={i} delay={i * 70}>
                <li className="kx-sub-sm flex items-start gap-4 rounded-lg border border-[#E5E7EB] border-l-[3px] border-l-[#0B0B1A] bg-white p-5 shadow-[0_1px_2px_rgba(11,11,26,0.04)] transition hover:shadow-[0_4px_12px_-4px_rgba(11,11,26,0.08)]">
                  <span
                    aria-hidden
                    className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#0B0B1A] text-[11px] font-semibold text-white"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{b}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* ================================================================
            8. KNOWLEDGE BASE / MOAT
        ================================================================ */}
        <section className="relative overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_top_left,#1B1F4A_0%,#0D1033_40%,#0A0B1F_75%,#070815_100%)] p-8 text-white sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-[22rem] w-[22rem] rounded-full bg-indigo-500/15 blur-[100px]"
          />
          <Reveal>
            <div className="relative max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                The moat
              </p>
              <h2 className="mt-4 text-3xl font-normal leading-[1.1] tracking-tight sm:text-5xl">
                Intelligence that{" "}
                <span className="bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                  compounds.
                </span>
              </h2>
              <p className="mt-6 text-base leading-7 text-slate-100 sm:text-lg">
                Your submissions train <em>your</em> private knowledge base —
                fully isolated, never shared, never used to train models for
                anyone else.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <ul className="relative mt-10 grid gap-3 sm:grid-cols-2">
              {MOAT_BULLETS.map((b, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-100"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-300"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* ================================================================
            9. FINAL CLOSE
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
                Before the wire goes out
              </p>
              <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
                Don&apos;t write a check on{" "}
                <span className="text-slate-600">AI you can&apos;t defend.</span>
              </h2>
              <p className="kx-sub mt-6">
                You&apos;ll answer for this decision — at the next IC, at the
                board, at the exit. Bring the evidence.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/contact" className={BTN_PRIMARY}>
                  Start a diligence engagement
                </Link>
                <Link href="/sample-report" className={BTN_SECONDARY}>
                  See a sample report
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ====================================================================
          FOOTER
      ==================================================================== */}
      <footer className="border-t border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-slate-600">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Logo wordClassName="text-sm text-[#0B0B1A]" markClassName="h-5 w-5" />
            <p>© {new Date().getFullYear()} Kaptrix</p>
            <div className="flex items-center gap-6">
              <Link href="/how-it-works" className="transition hover:text-[#0B0B1A]">
                How it works
              </Link>
              <Link href="/app" className="transition hover:text-[#0B0B1A]">
                Platform
              </Link>
              <Link href="/contact" className="transition hover:text-[#0B0B1A]">
                Contact
              </Link>
            </div>
          </div>
          <p className="mt-8 max-w-3xl text-xs leading-5 text-slate-500">
            Kaptrix is an advisory and technology practice. Engagements are
            governed by individual letters of engagement. Not investment
            advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
