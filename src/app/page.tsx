import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/home/logo";
import { Reveal } from "@/components/home/reveal";
import { PublicHeader } from "@/components/home/public-header";
import { PlatformShowcase } from "@/components/home/platform-showcase";
import { ScrollToTop } from "@/components/home/scroll-to-top";
import { HeroArcBackdrop } from "@/components/landing/hero-arc-backdrop";
import { ScrollPlayVideo } from "@/components/landing/scroll-play-video";

export const metadata: Metadata = {
  title:
    "Kaptrix | A fast, evidence-backed read on a company before you commit",
  description:
    "Kaptrix turns messy company data into a clear view of risks, gaps, and opportunities — in hours, not weeks.",
};

// ---------------------------------------------------------------------------
// Visual system: Stripe / Linear restraint.
// Primary CTA #0B0B1A · Secondary white/border · Accent indigo #6B5BFF.
// ---------------------------------------------------------------------------

const HERO_PROOF = [
  "Key risks and gaps surfaced clearly.",
  "Every conclusion tied back to specific evidence.",
  "Clear next steps you can act on this week.",
];

const COST_OF_WRONG = [
  "You burn weeks reconciling decks, contracts, and spreadsheets that disagree.",
  "Important risks stay buried until you're already deep in the process.",
  "A confident narrative gets mistaken for a real, working capability.",
  "You can't clearly explain how the call was made when someone asks later.",
];

const HOW_IT_WORKS = [
  {
    id: "01",
    step: "Upload",
    line: "Drop in the company's documents — pitch decks, financials, contracts, product materials, anything you have.",
  },
  {
    id: "02",
    step: "Structure",
    line: "Kaptrix organizes it against a consistent framework so you can see strengths, gaps, and risks side by side.",
  },
  {
    id: "03",
    step: "Read",
    line: "Get a clear, structured view of the company you can review, share, or hand to your team.",
  },
];

const SNAPSHOTS = [
  {
    kicker: "Step 01",
    title: "Upload",
    description: "Bring the documents you already have. Kaptrix takes it from there.",
    href: "/demo/intake",
    accent: "from-slate-700/40 via-slate-700/20 to-transparent",
  },
  {
    kicker: "Step 02",
    title: "Structure",
    description: "A consistent view of the company — risks, gaps, and capabilities in one place.",
    href: "/demo/scoring",
    accent: "from-slate-700/40 via-slate-700/20 to-transparent",
  },
  {
    kicker: "Step 03",
    title: "Read",
    description: "A clear company read you can review, share, or export.",
    href: "/demo/report",
    accent: "from-slate-700/40 via-slate-700/20 to-transparent",
  },
];

const DELIVERABLES = [
  {
    name: "Company Readiness Report",
    what: "A complete, structured view of the company — covering risks, gaps, capabilities, and areas that need attention before moving forward.",
    why: "The single document that tells you, end to end, what's real and what needs more work.",
  },
  {
    name: "Executive Decision Brief",
    what: "A clear, concise summary of the company — key strengths, key risks, and what matters most for decision-making.",
    why: "What you read first. Built so anyone on the team can get aligned in minutes.",
  },
  {
    name: "Technical Risk Register",
    what: "Top risks across systems, data, and operations — each with impact, likelihood, and what needs to be addressed.",
    why: "A practical list of what could go wrong and what to do about it.",
  },
  {
    name: "Market & Capability Overview",
    what: "Where the company stands — what it does well, where it falls behind, and what could impact its position.",
    why: "Tells you whether the strengths are durable or just a moment in time.",
  },
  {
    name: "Action Plan (30/60/90 Days)",
    what: "Clear next steps to improve the company — prioritized actions tied to risk reduction and opportunity.",
    why: "A read isn't useful if it stops at observation. This is what to actually do.",
  },
  {
    name: "Evidence Confidence Report",
    what: "Shows what's supported by real data — and where information is missing or unclear.",
    why: "Tells you which parts of the read you can lean on and which still need more proof.",
  },
];

const DIFFERENTIATION = [
  "Evidence-backed — every conclusion ties to a specific source.",
  "Structured — the same clear framework applied to every company.",
  "Fast — a real read in hours, not weeks.",
  "Honest — gaps and unknowns are surfaced, not hidden.",
  "Practical — every read ends in clear next steps you can act on.",
];

const EXECUTION_BULLETS = [
  "A 30/60/90-day plan with owners, dependencies, and what success looks like.",
  "Top risks to address first, with the specific work needed to close them.",
  "Quick wins surfaced alongside longer-term improvements.",
  "Everything tied back to the evidence so the team knows the why.",
];

const MOAT_BULLETS = [
  "Every company you upload becomes part of your private library.",
  "Patterns and lessons carry from one read to the next.",
  "Knowledge stays with the team, even as people change.",
  "The tenth read is sharper than the first — without extra effort.",
];

const MARQUEE = [
  "Evidence-backed",
  "Structured",
  "Fast",
  "Clear",
  "Practical",
  "Outcome-focused",
  "Risk-aware",
  "Decision-ready",
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
        <HeroArcBackdrop />
        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-28 sm:pt-32 lg:pb-28">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
              A clear read on a company, fast
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl font-light leading-[1.05] tracking-tight sm:text-6xl lg:text-[5.25rem] kx-fade-in">
              Get a fast, evidence-backed read
              <br />
              <span className="bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                on a company before you commit.
              </span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-100 sm:text-xl">
              Kaptrix turns messy company data into a clear view of risks,
              gaps, and opportunities — in hours, not weeks.
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
                Get a Kaptrix Quick Read
              </Link>
              <Link href="/sample-report" className={BTN_SECONDARY_ON_DARK}>
                See a sample read
              </Link>
              <Link
                href="/demo"
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
          1.5 PLATFORM DEMO REEL
      ==================================================================== */}
      <section className="relative overflow-hidden bg-[#070815] py-16 sm:py-20 lg:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-1/2 h-[24rem] w-[24rem] -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-1/2 h-[24rem] w-[24rem] -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-[100px]"
        />
        <div className="relative mx-auto max-w-5xl px-6">
          <Reveal>
            <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
              See it in motion
            </p>
            <h2 className="mt-4 text-center text-3xl font-light tracking-tight text-white sm:text-4xl lg:text-5xl">
              A clearer view{" "}
              <span className="bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                in hours.
              </span>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-10 sm:mt-12">
              <ScrollPlayVideo />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ====================================================================
          2. THE PROBLEM
      ==================================================================== */}
      <section className="border-b border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
                The problem
              </p>
              <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
                Most teams evaluate companies from{" "}
                <span className="text-slate-600">fragmented data.</span>
              </h2>
              <p className="kx-sub mt-6 max-w-2xl">
                Documents, decks, spreadsheets, and assumptions. It takes days
                or weeks to understand what&apos;s real, what&apos;s missing,
                and where the risks are. Kaptrix gives you a structured view
                in hours.
              </p>
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
              Not just a report —{" "}
              <span className="text-slate-600">a clear, structured view of the company.</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {[
              {
                id: "01",
                title: "Key risks surfaced clearly",
                body: "What could go wrong, what's already going wrong, and where attention is needed first — laid out plainly.",
              },
              {
                id: "02",
                title: "Evidence tied to every conclusion",
                body: "Every point in the read links back to a specific document or data point so the team can see exactly where it came from.",
              },
              {
                id: "03",
                title: "Gaps and unknowns identified",
                body: "Kaptrix flags what's missing, unclear, or unsupported — so you know which parts of the read still need more proof.",
              },
              {
                id: "04",
                title: "Actionable next steps",
                body: "Every read ends with clear, prioritized actions — what to address first, what's a quick win, and what needs more work.",
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
              Upload.{" "}
              <span className="text-slate-600">Structure. Read.</span>
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
              What you get
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              A clear company read.{" "}
              <span className="text-slate-600">Backed by evidence. Ready to share.</span>
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
                      Read
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
                See a sample read
              </Link>
            </div>
          </Reveal>
        </section>

        {/* ================================================================
            5.5 WHO IT'S FOR
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
              Who it&apos;s for
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              Built for the people who{" "}
              <span className="text-slate-600">need to understand a company quickly.</span>
            </h2>
          </Reveal>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2">
            {[
              {
                name: "Small investment teams",
                body: "Get a fast, structured read before you commit time or capital to a longer process.",
              },
              {
                name: "Advisors evaluating companies",
                body: "Walk into the conversation with a clear view of strengths, risks, and what to ask next.",
              },
              {
                name: "Operators preparing for diligence",
                body: "See your own company the way an outside reviewer would — and fix the gaps before they're found.",
              },
              {
                name: "Firms handling compliance workflows",
                body: "Apply a consistent, evidence-backed read across companies without rebuilding the work each time.",
              },
            ].map((row, i) => (
              <Reveal key={row.name} delay={i * 80}>
                <li className="flex h-full flex-col rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_2px_rgba(11,11,26,0.04)]">
                  <h3 className="text-base font-semibold tracking-tight text-[#0B0B1A]">
                    {row.name}
                  </h3>
                  <p className="kx-sub-sm mt-2">{row.body}</p>
                </li>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* ================================================================
            6. WHY KAPTRIX
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
                  Why Kaptrix
                </p>
                <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
                  Clear answers.{" "}
                  <span className="text-slate-600">Not more noise.</span>
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
            7. ACTION PLAN
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
              Next steps
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              Every read ends in{" "}
              <span className="text-slate-600">a clear plan.</span>
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
            8. KNOWLEDGE BASE
        ================================================================ */}
        <section className="relative overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_top_left,#1B1F4A_0%,#0D1033_40%,#0A0B1F_75%,#070815_100%)] p-8 text-white sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-[22rem] w-[22rem] rounded-full bg-indigo-500/15 blur-[100px]"
          />
          <Reveal>
            <div className="relative max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                Your library
              </p>
              <h2 className="mt-4 text-3xl font-normal leading-[1.1] tracking-tight sm:text-5xl">
                Knowledge that{" "}
                <span className="bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                  builds with you.
                </span>
              </h2>
              <p className="mt-6 text-base leading-7 text-slate-100 sm:text-lg">
                Every company you upload becomes part of your private library
                — fully isolated, never shared, and yours alone.
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
                Before you commit
              </p>
              <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
                Before you commit time, capital, or resources —{" "}
                <span className="text-slate-600">get a clear read first.</span>
              </h2>
              <p className="kx-sub mt-6">
                Kaptrix gives you a fast, structured, evidence-backed read on a
                company before you spend time or money.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/contact" className={BTN_PRIMARY}>
                  Get a Kaptrix Quick Read
                </Link>
                <Link href="/sample-report" className={BTN_SECONDARY}>
                  See a sample read
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
              <Link href="/framework" className="transition hover:text-[#0B0B1A]">
                Framework
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
