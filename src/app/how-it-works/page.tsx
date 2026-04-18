import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How Kaptrix Scores AI Products",
  description:
    "How Kaptrix produces its AI product diligence score — the transparency investors and operators need, without disclosing proprietary logic.",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Hero />
      <main className="mx-auto max-w-5xl px-6 py-16 space-y-20">
        <SixDimensions />
        <HowAScoreIsProduced />
        <Guardrails />
        <WhatWeDoNotDisclose />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      <div
        className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-5xl px-6 py-20 sm:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
          How it works
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
          Defensible AI diligence scores, explained.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
          Kaptrix provides a structured, evidence-based method for assessing AI solutions so leaders can make informed investment and operating decisions with greater confidence.
        Our scoring framework is designed to cut through demos, claims, and surface-level narratives by translating technical, operational, and governance signals into a single auditable assessment. It shows how an AI solution should be evaluated, what evidence matters, and where real strengths or hidden risks exist. The underlying weighting and calibration logic remain proprietary to preserve the integrity and defensibility of the final score.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/preview"
            className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
          >
            Explore the platform
          </Link>
          <a
            href="#six-dimensions"
            className="inline-flex items-center rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            See what we score
          </a>
        </div>
      </div>
    </section>
  );
}

function SixDimensions() {
  const dims: { name: string; summary: string }[] = [
    {
      name: "Product credibility",
      summary:
        "Is the AI core to the value, or a bolt-on? Does real customer usage support the claims made in sales materials?",
    },
    {
      name: "Tooling & vendor exposure",
      summary:
        "How concentrated is the dependency on foundation models or third-party APIs, and how costly is it to switch?",
    },
    {
      name: "Data & sensitivity risk",
      summary:
        "Does the architecture match the sensitivity of the data? Are PII, PHI, and regulated data handled defensibly?",
    },
    {
      name: "Governance & safety",
      summary:
        "Logging, access control, human-in-the-loop, and output risk management — the controls that make failures recoverable.",
    },
    {
      name: "Production readiness",
      summary:
        "Scaling behavior, incident response, model drift, and cost-per-inference at real customer load.",
    },
    {
      name: "Open validation",
      summary:
        "Known unknowns. Areas requiring specialist review, plus technical debt we can see but cannot fully quantify yet.",
    },
  ];
  return (
    <section id="six-dimensions" className="scroll-mt-24">
      <SectionLabel>What we score</SectionLabel>
      <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
        Six dimensions, calibrated for AI product risk.
      </h2>
      <p className="mt-3 max-w-3xl text-slate-600">
        Every engagement is evaluated across the same six dimensions.
        The dimensions themselves are public — the weights, thresholds,
        and calibration against our benchmark set are not.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {dims.map((d) => (
          <div
            key={d.name}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
              {d.name}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{d.summary}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowAScoreIsProduced() {
  const steps: { title: string; body: string }[] = [
    {
      title: "1. Evidence is collected and structured",
      body:
        "Intake captures the deal thesis, priorities, and regulatory exposure. Uploaded documents are parsed, coverage is measured against industry-specific expectations, and gaps are surfaced before they distort the score.",
    },
    {
      title: "2. An AI pass drafts findings, a human operator judges them",
      body:
        "A diligence-trained model extracts claims, red flags, and dependencies. An expert operator reviews, challenges, and scores each sub-criterion with a written rationale. The model never scores alone.",
    },
    {
      title: "3. Context is folded into the composite",
      body:
        "Every submitted step — intake, coverage, insights, pre-analysis — contributes signed adjustments to specific dimensions. Adjustments are capped so that no single input can dominate the operator's judgment.",
    },
    {
      title: "4. Benchmarks calibrate the result",
      body:
        "The composite is compared against a library of historical AI diligence cases and their realized outcomes. This is where our proprietary calibration lives — and where a raw score becomes a defensible recommendation.",
    },
    {
      title: "5. A lifecycle-aware recommendation is emitted",
      body:
        "Pre-investment, active, and post-close engagements are treated differently. A 3.4 before a term sheet is not the same signal as a 3.4 eighteen months into a hold. The platform makes that explicit.",
    },
  ];
  return (
    <section>
      <SectionLabel>How a score is produced</SectionLabel>
      <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
        Five steps. Every score is traceable back through all of them.
      </h2>
      <ol className="mt-8 space-y-4">
        {steps.map((s) => (
          <li
            key={s.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-900">{s.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Guardrails() {
  const guardrails: { title: string; body: string }[] = [
    {
      title: "Skeptical by default",
      body:
        "Our scoring copilot is tuned to push back against operator inflation bias. When a score looks generous relative to the evidence, the platform says so — in writing, on the record.",
    },
    {
      title: "Bounded context effects",
      body:
        "Intake, coverage, insights, and pre-analysis each contribute capped signed adjustments to the score. We make it mathematically impossible for one noisy input to swing the recommendation.",
    },
    {
      title: "Human-in-the-loop, always",
      body:
        "No investment recommendation is emitted without an expert operator reviewing and signing the rationale for every scored sub-criterion.",
    },
    {
      title: "Auditable trail",
      body:
        "Every score, adjustment, red flag, and recommendation points back to the document, page, or submission that produced it. You can follow the chain end-to-end.",
    },
  ];
  return (
    <section>
      <SectionLabel>Guardrails</SectionLabel>
      <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
        What keeps the number honest.
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {guardrails.map((g) => (
          <div
            key={g.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-900">{g.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{g.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhatWeDoNotDisclose() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <SectionLabel>What we deliberately do not disclose</SectionLabel>
      <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
        Transparency without a recipe.
      </h2>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
        We publish the dimensions, the workflow, and the guardrails
        because investors and leaders need to trust the output. We do
        not publish — and will not publish — the specific weights,
        thresholds, calibration curves, benchmark comparators, or prompt
        templates that translate evidence into a final recommendation.
        That calibration is the product. Exposing it would let a target
        teach to the test and would erode the very independence that
        makes our scores useful.
      </p>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
        When you need defensibility for an IC memo, a lender, or a
        portfolio review, we provide the evidence chain that backs each
        score. When you need to understand why a number moved between
        engagements, we provide the signed context adjustments and the
        operator rationales. That is enough to defend a decision. It is
        not enough to reverse-engineer our scoring system.
      </p>
    </section>
  );
}

function CallToAction() {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 text-white shadow-xl sm:p-12">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Want to see a live scorecard?
      </h2>
      <p className="mt-3 max-w-2xl text-indigo-100">
        Explore the operator workspace with anonymized sample clients.
        Every score, red flag, and recommendation in the preview is
        produced by the same platform we use on real engagements.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/preview"
          className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-indigo-900 shadow-sm transition hover:bg-indigo-50"
        >
          Open the platform preview
        </Link>
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-700">
      {children}
    </p>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 px-6 py-8 text-xs text-slate-500 sm:flex-row sm:items-center">
        <p>© {new Date().getFullYear()} Kaptrix. Independent AI product diligence.</p>
        <div className="flex gap-4">
          <Link href="/preview" className="hover:text-slate-800">
            Platform
          </Link>
          <Link href="/how-it-works" className="hover:text-slate-800">
            How it works
          </Link>
        </div>
      </div>
    </footer>
  );
}
