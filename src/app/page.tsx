import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/home/logo";
import { Reveal } from "@/components/home/reveal";
import { PublicHeader } from "@/components/home/public-header";
import { PlatformShowcase } from "@/components/home/platform-showcase";

export const metadata: Metadata = {
  title: "KAPTRIX | Don't write a check on AI you can't defend",
  description:
    "Evidence-backed AI diligence for investors and operators. Expose fragile systems, score what's real, and produce decision-grade outputs before capital moves.",
};

// ---------------------------------------------------------------------------
// Visual system is intentionally restrained (Stripe / Linear / Vanta):
// - Primary CTA:  bg #0B0B1A, white text, hover #1F1F2E
// - Secondary:    white bg, 1px #E5E7EB border, black text, hover #F9FAFB
// - Accent:       indigo #6B5BFF on eyebrow labels and section borders
// - Dark sections: flat deep-navy, no fuchsia/violet gradients
// ---------------------------------------------------------------------------

const SNAPSHOTS = [
  {
    kicker: "Layer 01",
    title: "Intake & context",
    description: "Scope the deal. Lock the thesis. Set the questions that matter.",
    href: "/preview/intake",
    accent: "from-slate-700/40 via-slate-700/20 to-transparent",
  },
  {
    kicker: "Layer 02",
    title: "Scoring layer",
    description: "Structured dimensions. Every claim traced to evidence.",
    href: "/preview/scoring",
    accent: "from-slate-700/40 via-slate-700/20 to-transparent",
  },
  {
    kicker: "Layer 03",
    title: "Report layer",
    description: "Committee-ready outputs. Full audit trail from artifact to decision.",
    href: "/preview/report",
    accent: "from-slate-700/40 via-slate-700/20 to-transparent",
  },
];

const PROBLEM_BULLETS = [
  "Firms overpay for AI wrappers that look like platforms but collapse at scale.",
  "Model and vendor dependencies go undisclosed until they break post-close.",
  "Demos and founder narrative get scored as capability, not as claims to verify.",
  "Diligence output is unfalsifiable — opinions without evidence, impossible to defend 18 months later.",
  "Internal teams don't have the muscle to pressure-test AI architectures on deal timelines.",
];

const CAPABILITIES = [
  {
    id: "01",
    title: "Forces evidence-backed decisions",
    body: "Every score, claim, and recommendation links to a specific source passage. No evidence, no score.",
    soWhat: "So what: no one on the IC can hide behind vibes.",
  },
  {
    id: "02",
    title: "Exposes where AI breaks in production",
    body: "The scoring engine is tuned for the failure modes AI systems actually exhibit — data drift, eval gaps, prompt fragility, vendor lock, silent degradation.",
    soWhat: "So what: you find the cliff before you drive off it.",
  },
  {
    id: "03",
    title: "Separates real capability from narrative",
    body: "Contradictions between decks, code, contracts, and customer calls surface automatically. Overstated capability gets flagged, not flattered.",
    soWhat: "So what: you stop paying platform multiples for thin wrappers.",
  },
  {
    id: "04",
    title: "Produces decision-grade outputs",
    body: "IC memo, risk register, competitive posture, value-creation plan. Not a slide deck of observations — a package that can stand up at committee.",
    soWhat: "So what: the decision is defensible the day it's made and 18 months later.",
  },
  {
    id: "05",
    title: "Compounds across every deal",
    body: "Every document, adjustment, and investor rationale folds into a private knowledge base. Pattern recognition gets sharper with every engagement.",
    soWhat: "So what: the tenth deal is faster and more accurate than the first.",
  },
  {
    id: "06",
    title: "Converts diligence into execution",
    body: "Findings don't die in a PDF. They translate into a sequenced 100-day and value-creation plan the operating team can actually run.",
    soWhat: "So what: the work you paid for survives signing.",
  },
];

const DELIVERABLES = [
  {
    name: "AI Diligence Report",
    includes:
      "Ten-section master report covering architecture, data, evals, team, moat, vendor risk, scaling, compliance, and commercial posture. Every finding sourced.",
    matters:
      "This is the document the partner reads on the train. It has to survive scrutiny.",
  },
  {
    name: "Investment Committee Memo",
    includes:
      "Recommendation, thesis, key risks, mitigations, and decision rationale — condensed to IC format with links back to the underlying evidence.",
    matters:
      "Gives the committee a clear call, not a summary. Dissent is grounded in the same facts.",
  },
  {
    name: "Technical Risk Register",
    includes:
      "Ranked register of technical, model, data, vendor, and operational risks. Each with severity, likelihood, trigger conditions, and mitigation owner.",
    matters:
      "The thing you hand the post-close team so nothing gets dropped in the first 90 days.",
  },
  {
    name: "Competitive Posture",
    includes:
      "Where the company genuinely leads, where it's exposed, and what happens when the next model release lands. Includes substitution and commoditization analysis.",
    matters:
      "Shows whether the moat is real or a six-month lead dressed up as one.",
  },
  {
    name: "Value Creation & Execution Plan",
    includes:
      "Enhanced 100-day plan: what to fix, scale, restructure, or kill. Sequenced, owner-tagged, tied to thesis levers.",
    matters:
      "The gap between a good thesis and a good return is execution. This is where that gap closes.",
  },
];

const WHY_KAPTRIX = [
  "Evidence over opinion — every claim is traceable, every score is defensible.",
  "Consistency across deals — the same system evaluates every company the same way.",
  "Speed without shortcuts — IC-ready output in days, not months.",
  "Compounding knowledge — every engagement strengthens your proprietary edge.",
  "Decision-grade outputs — built to withstand scrutiny before and after the investment.",
  "Economic reality — evaluates whether AI actually scales profitably, not just technically.",
];

const EXECUTION_BULLETS = [
  "A sequenced 100-day plan with explicit owners, dependencies, and success criteria.",
  "Architecture and data-layer remediation where the diligence surfaced fragility.",
  "Eval, observability, and model-governance scaffolding — what to instrument and when.",
  "Vendor and model-dependency hardening: reduce lock-in, add fallbacks, renegotiate terms.",
  "Commercial and org moves tied directly to thesis levers, not generic best practice.",
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

// Reusable button styles ----------------------------------------------------
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
              Kaptrix pressure-tests AI companies before capital moves.
              Evidence-backed scoring, contradiction detection, and
              decision-grade outputs — so the call you make at IC survives
              the next eighteen months.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/contact" className={BTN_PRIMARY_ON_DARK}>
                Start a diligence engagement
              </Link>
              <Link href="/sample-report" className={BTN_SECONDARY_ON_DARK}>
                See a sample report
              </Link>
              <Link
                href="/preview"
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
          2. PROBLEM
      ==================================================================== */}
      <section className="border-b border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
                The problem
              </p>
              <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
                Most AI diligence is narrative.
                <br />
                <span className="text-slate-600">
                  Narrative is how firms overpay.
                </span>
              </h2>
              <p className="kx-sub mt-8 max-w-2xl">
                The AI category moves faster than diligence can keep up.
                Capability gets confused with capability claims. Vendor
                dependencies hide inside &ldquo;proprietary&rdquo;
                architecture. Post-close, the thing you bought doesn&apos;t
                match the thing you were shown. The bill arrives anyway.
              </p>
            </div>
          </Reveal>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2">
            {PROBLEM_BULLETS.map((b, i) => (
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
              What Kaptrix is
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              A system for evaluating AI companies{" "}
              <span className="text-slate-600">
                before capital moves.
              </span>
            </h2>
            <p className="kx-sub mt-6 max-w-3xl">
              Kaptrix ingests the room — CIMs, contracts, code artifacts,
              customer calls, model specs — and runs a structured,
              evidence-backed evaluation of what&apos;s real, what&apos;s
              fragile, and what contradicts. It produces decision-grade
              outputs: an IC memo, a risk register, a value-creation plan.
              Every score is traceable. Every claim has a source. Every
              contradiction is flagged, not absorbed.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                id: "01",
                title: "Score what's real",
                body: "A fixed rubric, applied the same way every time, to the dimensions that matter for AI: architecture, data, evals, team, moat, vendor risk.",
              },
              {
                id: "02",
                title: "Expose contradictions",
                body: "Decks say one thing. Contracts say another. Code says a third. Kaptrix surfaces the gap and puts it in front of the decision-maker.",
              },
              {
                id: "03",
                title: "Ship defensible outputs",
                body: "Every deliverable carries a full audit trail from artifact to score to recommendation. Defensible at IC. Defensible 18 months later.",
              },
            ].map((layer, idx) => (
              <Reveal key={layer.id} delay={idx * 100}>
                <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-[#E5E7EB] bg-white p-7 shadow-[0_1px_2px_rgba(11,11,26,0.04)] transition hover:border-[#0B0B1A] hover:shadow-[0_8px_24px_-12px_rgba(11,11,26,0.12)]">
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#6B5BFF] via-indigo-400 to-transparent"
                  />
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-indigo-100 bg-indigo-50 text-sm font-semibold text-[#6B5BFF]">
                      {layer.id}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
                      Core
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-medium tracking-tight text-[#0B0B1A]">
                    {layer.title}
                  </h3>
                  <p className="kx-sub mt-3">
                    {layer.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ================================================================
            4. WHAT YOU GET — DELIVERABLES
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
              What you get
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              Concrete outputs.{" "}
              <span className="text-slate-600">Not observations.</span>
            </h2>
            <p className="kx-sub mt-6 max-w-2xl">
              Every engagement produces a defined package of deliverables —
              each one sourced, auditable, and usable by the operating team
              on day one.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            {DELIVERABLES.map((d, i) => (
              <Reveal key={d.name} delay={i * 80}>
                <article className="group flex h-full flex-col rounded-lg border border-[#E5E7EB] bg-white p-7 shadow-[0_1px_2px_rgba(11,11,26,0.04)] transition hover:border-[#0B0B1A] hover:shadow-[0_8px_24px_-12px_rgba(11,11,26,0.10)]">
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
                    <span className="font-semibold text-[#0B0B1A]">
                      Includes:{" "}
                    </span>
                    {d.includes}
                  </p>
                  <p className="kx-sub-sm mt-3 border-t border-[#E5E7EB] pt-4">
                    <span className="font-semibold text-[#0B0B1A]">
                      Why it matters:{" "}
                    </span>
                    {d.matters}
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
            5. CAPABILITIES
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
              Capabilities
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              What Kaptrix forces.{" "}
              <span className="text-slate-600">
                What it makes possible.
              </span>
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {CAPABILITIES.map((c, idx) => (
              <Reveal key={c.id} delay={idx * 80}>
                <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-[#E5E7EB] bg-white p-7 shadow-[0_1px_2px_rgba(11,11,26,0.04)] transition hover:border-[#0B0B1A] hover:shadow-[0_8px_24px_-12px_rgba(11,11,26,0.12)]">
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-[#6B5BFF] via-indigo-300 to-transparent opacity-60 transition group-hover:opacity-100"
                  />
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-indigo-100 bg-indigo-50 text-xs font-semibold text-[#6B5BFF]">
                    {c.id}
                  </span>
                  <h3 className="mt-4 text-lg font-medium tracking-tight text-[#0B0B1A]">
                    {c.title}
                  </h3>
                  <p className="kx-sub-sm mt-3">
                    {c.body}
                  </p>
                  <p className="kx-sub-sm mt-5 border-t border-[#E5E7EB] pt-4 !font-medium !text-[#0B0B1A]">
                    {c.soWhat}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ================================================================
            6. PLATFORM SNAPSHOTS
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
              The platform
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              See the system{" "}
              <span className="text-slate-600">in motion.</span>
            </h2>
            <p className="kx-sub mt-6 max-w-2xl">
              Three layers, one workflow: intake, scoring, and committee-ready
              report. Step through each, or let the preview advance on its
              own.
            </p>
          </Reveal>

          <div className="mt-10">
            <PlatformShowcase steps={SNAPSHOTS} />
          </div>
        </section>

        {/* ================================================================
            7. AI KNOWLEDGE BASE
        ================================================================ */}
        <section className="relative overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_top_left,#1B1F4A_0%,#0D1033_40%,#0A0B1F_75%,#070815_100%)] p-8 text-white sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-[22rem] w-[22rem] rounded-full bg-indigo-500/15 blur-[100px]"
          />
          <Reveal>
            <div className="relative max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                The AI knowledge base
              </p>
              <h2 className="mt-4 text-3xl font-normal leading-[1.1] tracking-tight sm:text-5xl">
                The system gets sharper{" "}
                <span className="bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                  every time you use it.
                </span>
              </h2>
              <p className="mt-6 text-base leading-7 text-slate-100 sm:text-lg">
                Every document you submit, every adjustment an investor makes,
                every contradiction Kaptrix surfaces — it all folds into a
                private knowledge base that belongs to you. Not a generic
                model. Not a shared index. Your institutional memory,
                compounding.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <ul className="relative mt-10 grid gap-3 sm:grid-cols-2">
              {[
                "Stores evidence from every artifact and prior report — nothing gets thrown away.",
                "Tracks patterns across companies, architectures, and failure modes you've already seen.",
                "Improves future scoring accuracy by grounding the next deal in everything the last deal taught you.",
                "Builds institutional memory that survives team turnover and deal cycles.",
                "Compounds intelligence — the tenth engagement is materially sharper than the first.",
              ].map((b, i) => (
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

          <Reveal delay={180}>
            <p className="relative mt-10 max-w-3xl border-t border-white/10 pt-6 text-sm leading-6 text-indigo-100 sm:text-base">
              This is the moat. Generic tools reset with every query. Kaptrix
              accumulates — and the longer you run it, the harder it is for
              anyone else to match what your team sees.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <div className="relative mt-8 rounded-md border border-indigo-300/20 bg-white/[0.04] p-5 text-sm leading-6 text-slate-100">
              <p className="font-semibold text-white">Note on privacy.</p>
              <p className="mt-1">
                Your submissions train <em>your</em> knowledge base only.
                Client data is fully isolated, never shared across workspaces,
                and never used to train models for anyone else. Full audit
                trail available on request.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ================================================================
            8. EXECUTION LAYER
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
              Execution layer
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              Diligence that survives{" "}
              <span className="text-slate-600">signing.</span>
            </h2>
            <p className="kx-sub mt-6 max-w-3xl">
              Analysis without execution is expensive paperwork. Kaptrix
              converts findings into a build-ready plan the operating team
              can run on day one — sequenced, owner-tagged, and tied to the
              thesis levers that actually move returns.
            </p>
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
            9. WHY KAPTRIX
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
                  Why Kaptrix
                </p>
                <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
                  Why this, instead of an internal team or a generic tool?
                </h2>
              </div>
              <div>
                <ul className="space-y-3">
                  {WHY_KAPTRIX.map((b, i) => (
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
                <p className="mt-10 max-w-2xl text-lg font-medium leading-8 text-slate-900">
                  Internal teams are stretched. Generic tools produce generic
                  output.
                  <br />
                  Kaptrix is built for one question: can this decision stand
                  up under real scrutiny — on the way in and on the way out?
                </p>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                  Kaptrix is not another AI tool and not another consulting
                  layer. It is a decision system — grounded in evidence,
                  economics, and reproducibility.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ================================================================
            10. CLOSE / CTA
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
                Before the next check
              </p>
              <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
                You&apos;ll defend this decision for years.{" "}
                <span className="text-slate-600">
                  Make sure the evidence is there.
                </span>
              </h2>
              <p className="kx-sub mt-6">
                Kaptrix is built for the moments where being roughly right on
                narrative isn&apos;t good enough — where the wire goes out,
                the thesis is committed, and someone, eventually, asks how
                the call got made. Bring the evidence.
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
              <Link
                href="/how-it-works"
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
