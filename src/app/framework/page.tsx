import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/home/public-header";
import { Reveal } from "@/components/home/reveal";

export const metadata: Metadata = {
  title: "Framework — How Kaptrix Scores AI Companies",
  description:
    "Evidence over claims. Structure over vibes. The Kaptrix framework for evaluating AI companies across six failure-weighted dimensions.",
};

const DIMENSIONS = [
  {
    id: "01",
    name: "Product Credibility",
    body: "Is AI genuinely core to the product, or decorative? Do customer outcomes match the claims?",
  },
  {
    id: "02",
    name: "Tooling & Vendor Exposure",
    body: "How concentrated is the stack, and how costly is substitution if a vendor changes terms?",
  },
  {
    id: "03",
    name: "Data & Sensitivity Risk",
    body: "Does data sensitivity match the tooling, and are regulated categories handled correctly?",
  },
  {
    id: "04",
    name: "Governance & Safety Posture",
    body: "When the system behaves badly, is it observable, controllable, and accountable?",
  },
  {
    id: "05",
    name: "Production-Readiness Signals",
    body: "Will it hold under real load, real incidents, and real inference economics?",
  },
  {
    id: "06",
    name: "Open Validation Areas",
    body: "What remains unverified, where is technical debt hiding, and which unknowns still matter?",
  },
];

const PRINCIPLES = [
  {
    title: "Evidence, not adjectives",
    body: "Every score is tied to an artifact. If it cannot be cited, it cannot be scored.",
  },
  {
    title: "Missing information is a finding",
    body: "Unknowns are surfaced, not imputed. A dense gap register is itself a signal.",
  },
  {
    title: "Non-compensatory by design",
    body: "Strength in one dimension cannot paper over a failure in another. Guardrails catch what an average would hide.",
  },
  {
    title: "Lifecycle-aware recommendations",
    body: "Diligencing a deal, monitoring a live engagement, and reviewing a portfolio company are different questions with different answers.",
  },
  {
    title: "Two reviewers, then calibration",
    body: "Every evaluation is dual-scored. Where reviewers disagree, the reasoning is the deliverable.",
  },
];

const DELIVERS = [
  "Dimensional scores",
  "Evidence gap register",
  "Red-flag surfacing",
  "A clear committee-ready recommendation",
];

export default function FrameworkPage() {
  return (
    <div className="min-h-screen bg-[#070815] text-white">
      <PublicHeader />

      {/* ====================================================================
          HERO
      ==================================================================== */}
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,#1B1F4A_0%,#0D1033_35%,#0A0B1F_65%,#070815_100%)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-indigo-500/25 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 bottom-0 h-[20rem] w-[20rem] rounded-full bg-fuchsia-500/15 blur-[100px]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-28 sm:pt-32 lg:pb-32">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">
              The Framework
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl font-light leading-[1.05] tracking-tight sm:text-6xl lg:text-[5.25rem] kx-fade-in">
              How Kaptrix scores{" "}
              <span className="bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                AI companies.
              </span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-100 sm:text-xl">
              Evidence over claims. Structure over vibes.
            </p>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
              Most AI evaluations lean on demos, founder charisma, and scattered
              documentation. The result is inconsistent calls and expensive
              surprises. Kaptrix replaces that with a structured, repeatable
              framework that separates what is proven from what is claimed, and
              turns the gap between the two into the central object of the
              review.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-medium text-[#0B0B1A] transition hover:bg-[#F9FAFB]"
              >
                Start a diligence engagement
              </Link>
              <a
                href="#dimensions"
                className="inline-flex items-center justify-center rounded-md border border-white/25 bg-transparent px-6 py-3 text-base font-medium text-white transition hover:bg-white/5"
              >
                See the six dimensions
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <main className="relative">
        {/* ambient background graphics across the page */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute left-1/2 top-[10%] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-indigo-700/10 blur-[120px]" />
          <div className="absolute right-[-10%] top-[40%] h-[24rem] w-[24rem] rounded-full bg-fuchsia-600/10 blur-[120px]" />
          <div className="absolute left-[-10%] top-[70%] h-[24rem] w-[24rem] rounded-full bg-sky-500/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl space-y-28 px-6 py-24 sm:py-28">
          {/* ================================================================
              SIX DIMENSIONS
          ================================================================ */}
          <section id="dimensions" className="scroll-mt-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                Six dimensions we evaluate
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                Failure modes,{" "}
                <span className="bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                  not feature lists.
                </span>
              </h2>
            </Reveal>

            <div className="mt-14 grid gap-5 lg:grid-cols-2">
              {DIMENSIONS.map((d, idx) => (
                <Reveal key={d.id} delay={idx * 80}>
                  <article className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-sm transition hover:border-indigo-300/40 hover:bg-white/[0.05]">
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-transparent"
                    />
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-300">
                          Dimension
                        </span>
                        <h3 className="mt-3 text-2xl font-medium tracking-tight text-white">
                          {d.name}
                        </h3>
                      </div>
                      <span
                        aria-hidden
                        className="text-5xl font-black tracking-tight text-white/10 transition group-hover:text-indigo-300/40 sm:text-6xl"
                      >
                        {d.id}
                      </span>
                    </div>
                    <p className="mt-5 text-base leading-7 text-slate-300">
                      {d.body}
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ================================================================
              HOW WE THINK ABOUT SCORING
          ================================================================ */}
          <section className="border-t border-white/10 pt-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                How we think about scoring
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                Five rules,{" "}
                <span className="text-slate-400">non-negotiable.</span>
              </h2>
            </Reveal>

            <ul className="mt-14 space-y-4">
              {PRINCIPLES.map((p, i) => (
                <Reveal key={p.title} delay={i * 70}>
                  <li className="group flex items-start gap-5 rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-indigo-300/40 hover:bg-white/[0.05]">
                    <span
                      aria-hidden
                      className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-indigo-400/30 bg-indigo-500/10 text-sm font-semibold text-indigo-200"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-lg font-medium tracking-tight text-white">
                        {p.title}
                      </p>
                      <p className="mt-2 text-base leading-7 text-slate-300">
                        {p.body}
                      </p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ul>
          </section>

          {/* ================================================================
              WHAT KAPTRIX DELIVERS
          ================================================================ */}
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-900/40 via-[#0D1033] to-fuchsia-900/30 p-8 sm:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-[100px]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-[100px]"
            />
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
                What Kaptrix delivers
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.1] tracking-tight sm:text-5xl">
                A defensible{" "}
                <span className="bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                  evaluation profile.
                </span>
              </h2>
              <p className="mt-6 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">
                Dimensional scores, an evidence gap register, red-flag
                surfacing, and a clear recommendation you can take into
                committee.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <ul className="relative mt-10 grid gap-3 sm:grid-cols-2">
                {DELIVERS.map((d) => (
                  <li
                    key={d}
                    className="flex items-start gap-3 rounded-md border border-white/10 bg-white/[0.04] p-4 text-base leading-6 text-slate-100"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 ring-1 ring-indigo-300/40"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        aria-hidden
                      >
                        <path
                          d="M2.5 6.5L5 9l4.5-5.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                          className="text-indigo-200"
                        />
                      </svg>
                    </span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>

          {/* ================================================================
              BUILT FOR
          ================================================================ */}
          <section className="border-t border-white/10 pt-24">
            <Reveal>
              <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                    Built for
                  </p>
                  <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                    Capital allocators evaluating{" "}
                    <span className="text-slate-400">AI-heavy software.</span>
                  </h2>
                </div>
                <ul className="space-y-3">
                  {[
                    "Private equity",
                    "Growth equity",
                    "Family offices",
                    "Corporate development teams",
                  ].map((b) => (
                    <li
                      key={b}
                      className="flex gap-3 border-b border-white/10 pb-3 text-lg font-medium leading-8 text-slate-100 last:border-b-0"
                    >
                      <span
                        aria-hidden
                        className="mt-3 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-300"
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </section>

          {/* ================================================================
              CTA / NDA
          ================================================================ */}
          <section className="border-t border-white/10 pt-24">
            <Reveal>
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                  Under NDA
                </p>
                <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                  The full methodology,{" "}
                  <span className="text-slate-400">
                    sub-criteria, and decision thresholds.
                  </span>
                </h2>
                <p className="mt-6 text-base leading-7 text-slate-300 sm:text-lg">
                  Kaptrix is an AI diligence platform. The full scoring
                  methodology, including sub-criteria and decision thresholds,
                  is available under NDA.
                </p>
                <div className="mt-10 flex flex-wrap gap-3">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-medium text-[#0B0B1A] transition hover:bg-[#F9FAFB]"
                  >
                    Request access
                  </Link>
                  <Link
                    href="/sample-report"
                    className="inline-flex items-center justify-center rounded-md border border-white/25 bg-transparent px-6 py-3 text-base font-medium text-white transition hover:bg-white/5"
                  >
                    See a sample report
                  </Link>
                </div>
              </div>
            </Reveal>
          </section>
        </div>
      </main>

      {/* ====================================================================
          FOOTER
      ==================================================================== */}
      <footer className="border-t border-white/10 bg-[#070815]">
        <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-slate-400">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm font-semibold uppercase tracking-[0.32em] text-white">
              Kaptrix
            </span>
            <p>© {new Date().getFullYear()} Kaptrix · AI Diligence Platform</p>
            <div className="flex items-center gap-6">
              <Link
                href="/how-it-works"
                className="transition hover:text-white"
              >
                How it works
              </Link>
              <Link href="/framework" className="transition hover:text-white">
                Framework
              </Link>
              <Link href="/contact" className="transition hover:text-white">
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
