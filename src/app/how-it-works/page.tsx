import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/home/public-header";

export const metadata: Metadata = {
  title: "How Kaptrix Works",
  description:
    "The evaluation layer for AI-driven businesses. Structured scoring, evidence-driven adjustments, and a live reasoning surface that holds up under IC scrutiny.",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicHeader />
      <Hero />
      <main className="mx-auto max-w-5xl px-6 py-20 space-y-24">
        <ProblemSection />
        <WhatKaptrixIsSection />
        <CoreIdeaSection />
        <ThreeLayersSection />
        <EvidenceFlowSection />
        <ConfidenceSection />
        <ScrutinySection />
        <DifferentiatorsSection />
        <BoundariesSection />
        <DeliverablesSection />
        <ShiftSection />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      <div
        aria-hidden
        className="absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-indigo-500/30 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -left-24 h-[22rem] w-[22rem] rounded-full bg-fuchsia-500/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-5xl px-6 py-24 sm:py-32">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">
          How Kaptrix Works
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
          The evaluation layer for{" "}
          <span className="bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
            AI-driven businesses.
          </span>
        </h1>
        <p className="mt-8 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
          Kaptrix is an AI system assessment and decision engine. It evaluates
          whether an AI-driven product is credible, durable, and
          investment-worthy based on evidence, not narrative.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/app"
            className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
          >
            Open the platform preview
          </Link>
          <a
            href="#three-layers"
            className="inline-flex items-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            See the three layers
          </a>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Problem                                                                    */
/* -------------------------------------------------------------------------- */

function ProblemSection() {
  const failures = [
    {
      title: "Demos don't generalize",
      body:
        "A polished prototype and a production-grade system can look identical for forty-five minutes.",
    },
    {
      title: "Interviews anchor on narrative",
      body: "Management tells a coherent story. Coherence is not evidence.",
    },
    {
      title: "Workstreams fragment",
      body:
        "Technical, data, and governance analysis live in different workstreams. Nothing stitches them into a single decision.",
    },
    {
      title: "AI systems fail in new ways",
      body:
        "Hidden vendor wrappers, brittle models, unclear data provenance, governance that hasn't caught up. Traditional frameworks weren't built to detect these.",
    },
  ];

  return (
    <Section id="problem" eyebrow="The problem" title="AI diligence has a structural blind spot.">
      <Lede>
        Diligence on AI-driven businesses has a structural
        problem: the thing being evaluated is often the thing least visible in
        a data room. Demos perform. Decks assert. Founders narrate. The
        underlying system, models, dependencies, data posture, controls,
        failure modes, sits behind a layer of interpretation that traditional
        diligence was not designed to penetrate.
      </Lede>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {failures.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-rose-200 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden>
                  <path
                    d="M10 2L1 18h18L10 2zm0 6v4m0 2v.01"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <p className="text-sm font-semibold text-slate-900">{f.title}</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-700">{f.body}</p>
          </div>
        ))}
      </div>
      <Pullquote>
        Kaptrix is built for the moment after that gap becomes visible. It
        gives investment teams a structured, evidence-backed view of whether
        an AI system is real, durable, and worth the capital, and a live
        reasoning surface to interrogate that view as new information arrives.
      </Pullquote>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* What Kaptrix Is                                                            */
/* -------------------------------------------------------------------------- */

function WhatKaptrixIsSection() {
  const pillars = [
    {
      title: "Structured scoring engine",
      body: "The same inputs produce the same output, every time.",
      accent: "from-indigo-500 to-indigo-700",
    },
    {
      title: "Evidence engine",
      body: "Turns artifacts into structured, machine-readable signals.",
      accent: "from-violet-500 to-violet-700",
    },
    {
      title: "Reasoning engine",
      body:
        "Operates continuously on top of both, grounded in what has actually been observed about this specific system.",
      accent: "from-fuchsia-500 to-fuchsia-700",
    },
  ];

  return (
    <Section id="what-it-is" eyebrow="What Kaptrix is" title="Three engines. One platform.">
      <Lede>
        Kaptrix combines three things that don&apos;t usually coexist in a
        single platform. The operator owns the score. The AI expands what the
        operator can see. Evidence, not opinion, is what moves anything.
      </Lede>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {pillars.map((p) => (
          <div
            key={p.title}
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div
              aria-hidden
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${p.accent}`}
            />
            <p className="text-sm font-semibold text-slate-900">{p.title}</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{p.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Core Idea                                                                  */
/* -------------------------------------------------------------------------- */

function CoreIdeaSection() {
  return (
    <Section
      id="core-idea"
      eyebrow="The core idea"
      title="Most AI evaluation tools do one of two things."
    >
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <ContrastCard
          label="They summarize"
          body="They read artifacts and produce a narrative. Fast, but non-defensible."
        />
        <ContrastCard
          label="They score by rubric"
          body="They apply a checklist. Defensible, but static and blind to evidence."
        />
      </div>
      <div className="mt-8 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-700">
          Kaptrix does neither in isolation
        </p>
        <p className="mt-3 text-base leading-8 text-slate-800">
          A rubric-driven scoring engine runs underneath a live reasoning
          layer, with a strict separation between what the operator decides
          and what the AI contributes. The scoring logic is fixed and
          inspectable. The AI layer is bounded and auditable. Together they
          produce something that is both fast and defensible, a combination
          traditional diligence and first-generation AI tools have not
          delivered.
        </p>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Three Layers                                                               */
/* -------------------------------------------------------------------------- */

function ThreeLayersSection() {
  return (
    <Section
      id="three-layers"
      eyebrow="The three layers"
      title="Coordinated. Bounded. Each with a specific job."
    >
      <Lede>
        Understanding the separation between the three layers is the key to
        understanding why the platform&apos;s outputs hold up under scrutiny.
      </Lede>

      <div className="mt-12 space-y-10">
        <LayerCard
          number="01"
          title="The Scoring Engine"
          tagline="Auditable. Operator-controlled."
          accent="indigo"
          body="This is the trust anchor. Every downstream output, insights, comparisons, recommendations, risk flags, rolls up to a score produced by a fixed, inspectable process."
        >
          <SubHeading>Six risk dimensions</SubHeading>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {DIMENSIONS.map((d) => (
              <div
                key={d.name}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                  {d.name}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-slate-700">
                  {d.summary}
                </p>
              </div>
            ))}
          </div>

          <SubHeading className="mt-8">
            Four properties define how this layer behaves
          </SubHeading>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <PropertyTile
              title="Scores are reproducible"
              body="The same inputs produce the same output, every time. No model variance, no drift between runs, no &lsquo;the AI felt differently today.&rsquo;"
            />
            <PropertyTile
              title="Failure-weighted, not feature-weighted"
              body="A system that looks complete on the surface but is weak on claim integrity cannot score its way out through strong peripheral signals."
            />
            <PropertyTile
              title="The operator assigns every base score"
              body="The AI does not. This is a hard architectural constraint, not a configuration setting, not user-toggleable."
            />
            <PropertyTile
              title="Every score carries rationale"
              body="Nothing is stored as a number alone. Every sub-criterion is accompanied by the reasoning that produced it."
            />
          </div>
        </LayerCard>

        <LayerCard
          number="02"
          title="The Evidence Engine"
          tagline="Artifact-driven, not interview-driven."
          accent="violet"
          body="Traditional diligence front-loads interviews because there is no better way to surface hidden structure when starting from zero. Kaptrix inverts this."
        >
          <p className="mt-2 text-sm leading-7 text-slate-700">
            Artifacts come first, architecture diagrams, model documentation,
            policies, contracts, vendor dependencies, logs, metrics, output
            samples. The platform ingests them and extracts structured
            signals: claims made, controls in place, dependencies declared,
            gaps visible.
          </p>
          <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50/60 p-5">
            <p className="text-sm leading-7 text-slate-800">
              <span className="font-semibold text-violet-900">The effect:</span>{" "}
              interviews become <em>targeted follow-up</em> rather than{" "}
              <em>primary discovery</em>. You walk into the management call
              already knowing what is missing, what is inconsistent, and what
              needs pressure.
            </p>
          </div>
        </LayerCard>

        <LayerCard
          number="03"
          title="The Reasoning Engine"
          tagline="Continuous. Grounded. Context-aware."
          accent="fuchsia"
          body="This is the layer most evaluation tools lack entirely, and it is what makes Kaptrix a live system rather than a report generator."
        >
          <SubHeading>Questions it answers in context</SubHeading>
          <ul className="mt-4 space-y-2.5">
            {[
              "Where is this system most likely to fail?",
              "Which claims in the pitch are unsupported by the artifacts provided?",
              "What is missing that should exist for a system at this maturity stage?",
              "How does this system compare to others we have evaluated in the same category?",
              "Where has our confidence in the score shifted since diligence began, and why?",
            ].map((q) => (
              <li
                key={q}
                className="flex gap-3 text-sm leading-7 text-slate-700"
              >
                <span
                  aria-hidden
                  className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-500"
                />
                <span>{q}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm leading-7 text-slate-800">
              <span className="font-semibold text-slate-900">
                Outputs are grounded.
              </span>{" "}
              No generic answers. No hallucinated confidence. If the evidence
              does not support a conclusion, the engine says so, and flags it
              as a gap to close rather than a question to paper over.
            </p>
          </div>
        </LayerCard>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Evidence flow                                                              */
/* -------------------------------------------------------------------------- */

function EvidenceFlowSection() {
  const proposalTypes = [
    {
      label: "Support",
      body: "Evidence that confirms an existing score.",
      tone: "emerald" as const,
    },
    {
      label: "Contradiction",
      body: "Evidence that creates downward pressure.",
      tone: "rose" as const,
    },
    {
      label: "Augmentation",
      body: "Evidence that supports an upward signal.",
      tone: "indigo" as const,
    },
    {
      label: "Gap",
      body: "Missing evidence that should exist but does not.",
      tone: "amber" as const,
    },
  ];

  return (
    <Section
      id="evidence-flow"
      eyebrow="How evidence changes a score"
      title="Evidence never silently modifies a score."
    >
      <Lede>
        When the platform ingests a new artifact and extracts a signal that
        affects the model, it generates a structured proposal. That proposal
        names the sub-criterion it affects, the direction of the pressure it
        creates, the rationale behind it, and the supporting artifacts.
      </Lede>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {proposalTypes.map((p) => (
          <ProposalChip
            key={p.label}
            label={p.label}
            body={p.body}
            tone={p.tone}
          />
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <SubHeading>Bounded. Reviewed. Approved.</SubHeading>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
          <li className="flex gap-3">
            <CheckGlyph />
            <span>
              A single piece of evidence cannot move a score by an arbitrary
              amount. Evidence affecting one dimension cannot bleed into
              another. These are enforced at the engine level, not left to
              operator discipline.
            </span>
          </li>
          <li className="flex gap-3">
            <CheckGlyph />
            <span>
              Proposals are reviewed and approved by the operator before they
              affect the score. Nothing enters the composite without a human
              decision.
            </span>
          </li>
          <li className="flex gap-3">
            <CheckGlyph />
            <span>
              The result is a scoring model that stays <em>live</em> , 
              continuously updated as new artifacts arrive, while remaining{" "}
              <em>controlled</em>.
            </span>
          </li>
        </ul>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Confidence                                                                 */
/* -------------------------------------------------------------------------- */

function ConfidenceSection() {
  return (
    <Section
      id="confidence"
      eyebrow="Confidence is separate from score"
      title="A score tells you where the system landed. Confidence tells you how much to trust that landing."
    >
      <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700">
        Kaptrix calculates confidence independently from the score itself,
        based on how much of the model is actually covered by evidence, the
        quality of the sources feeding it, how recent the evidence is, and how
        consistent the signals are with each other. Confidence{" "}
        <span className="font-semibold text-slate-900">qualifies</span> the
        score. It does not override it.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <ScenarioCard
          tone="warn"
          headline="High score, low confidence"
          body="The evidence we have is positive, but we have not seen enough."
        />
        <ScenarioCard
          tone="go"
          headline="High score, high confidence"
          body="We have seen enough, and it holds up."
        />
      </div>

      <p className="mt-8 max-w-3xl text-sm leading-7 text-slate-600">
        Investment committees need to be able to tell these two states apart.
        Kaptrix makes that distinction visible, explicit, and reviewable.
      </p>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Scrutiny                                                                   */
/* -------------------------------------------------------------------------- */

function ScrutinySection() {
  const traces = [
    "Every score traces to its sub-criteria and the rationale behind them.",
    "Every adjustment traces to the proposal that triggered it and the artifact that supported it.",
    "Every AI-generated insight traces to the signals and evidence it drew from.",
    "No scoring logic is hidden. No adjustments happen silently. No conclusions float free of their evidence base.",
  ];
  return (
    <Section
      id="scrutiny"
      eyebrow="Why this holds up under scrutiny"
      title="Every output can be walked backwards to its source."
    >
      <Lede>
        When an LP, an investment committee, or a legal team asks{" "}
        <em>how did you arrive at this view</em>, the answer needs to be
        traceable.
      </Lede>
      <ul className="mt-8 space-y-3">
        {traces.map((t) => (
          <li
            key={t}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <CheckGlyph />
            <span className="text-sm leading-7 text-slate-700">{t}</span>
          </li>
        ))}
      </ul>
      <Pullquote>
        The audit trail is not a feature bolted on afterward, it is the
        structure the platform is built on. If a conclusion cannot be traced
        to its source, it is not a conclusion Kaptrix will present.
      </Pullquote>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Differentiators                                                            */
/* -------------------------------------------------------------------------- */

function DifferentiatorsSection() {
  return (
    <Section
      id="differentiators"
      eyebrow="What makes Kaptrix different"
      title="Two existing approaches. Each with structural limits."
    >
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <ApproachCard
          label="Manual diligence"
          rows={[
            "Defensible but slow",
            "Inconsistent across deals",
            "Dependent on whichever partner is most technical",
            "Scales poorly, every evaluation starts from zero",
          ]}
        />
        <ApproachCard
          label="First-gen AI analysis tools"
          rows={[
            "Fast but shallow",
            "Summarize without structure",
            "No audit trail behind outputs",
            "No operator judgment inside outputs",
          ]}
        />
      </div>
      <div className="mt-8 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
          What Kaptrix combines
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            "Structured human judgment",
            "Automated evidence extraction",
            "Rubric-driven scoring logic",
            "Full auditability",
            "Continuous reasoning that stays live throughout diligence",
          ].map((r) => (
            <div key={r} className="flex items-start gap-3">
              <CheckGlyph color="emerald" />
              <span className="text-sm leading-7 text-slate-800">{r}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm leading-7 text-slate-700">
          Faster than traditional diligence, more structured than ad hoc
          review, more defensible than pure AI output.
        </p>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Boundaries                                                                 */
/* -------------------------------------------------------------------------- */

function BoundariesSection() {
  const items = [
    {
      title: "Does not predict financial performance",
      body: "Evaluates the AI system itself, not the business built around it.",
    },
    {
      title: "Does not replace full technical or legal diligence",
      body:
        "Compresses the fragmented parts of AI-specific evaluation into a structured layer the rest of diligence can build on.",
    },
    {
      title: "Does not operate as a black-box autonomous evaluator",
      body: "The operator decides. The platform equips that decision.",
    },
    {
      title: "Does not accept claims it cannot trace",
      body:
        "If the evidence is not there, the gap is surfaced, not filled with inference.",
    },
  ];
  return (
    <Section
      id="boundaries"
      eyebrow="What Kaptrix will not do"
      title="Trust also comes from knowing where a system stops."
    >
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <div
            key={it.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                  <path
                    d="M2 6h8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <p className="text-sm font-semibold text-slate-900">{it.title}</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-700">{it.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Deliverables                                                               */
/* -------------------------------------------------------------------------- */

function DeliverablesSection() {
  const items = [
    {
      title: "Composite score",
      body:
        "Calibrated to failure-weighted risk, with a full dimension-level breakdown.",
    },
    {
      title: "Confidence signal",
      body: "Qualifies how much of the model is evidence-backed.",
    },
    {
      title: "Evidence coverage map",
      body: "Showing what has been validated and what has not.",
    },
    {
      title: "Identified gaps & contradictions",
      body: "A structured view of risks requiring follow-up.",
    },
    {
      title: "Complete audit trail",
      body:
        "Linking every output to the artifacts and decisions that produced it.",
    },
    {
      title: "Live reasoning surface",
      body:
        "Continues to answer questions during diligence, at IC, and after close.",
    },
  ];
  return (
    <Section id="deliverables" eyebrow="What you get" title="When diligence concludes.">
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, idx) => (
          <div
            key={it.title}
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
          >
            <span className="absolute right-4 top-4 text-[11px] font-semibold tracking-wider text-indigo-300">
              0{idx + 1}
            </span>
            <p className="text-sm font-semibold text-slate-900">{it.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{it.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* The Shift                                                                  */
/* -------------------------------------------------------------------------- */

function ShiftSection() {
  return (
    <Section id="shift" eyebrow="The shift" title="Small on the surface. Large in practice.">
      <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
        Kaptrix moves the central question of AI diligence from one with no
        defensible answer to one that does.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <QuestionCard
          tone="muted"
          label="Before"
          question="Do we believe this system?"
        />
        <QuestionCard
          tone="primary"
          label="After"
          question="What evidence supports it, what contradicts it, and how much risk remains?"
        />
      </div>

      <p className="mt-8 max-w-3xl text-sm leading-7 text-slate-600">
        Kaptrix is built to answer the second question in real time, with full
        context, and with logic you can defend, in front of an investment
        committee, a board, or an LP.
      </p>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* CTA + Footer                                                               */
/* -------------------------------------------------------------------------- */

function CallToAction() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-fuchsia-900 p-8 text-white shadow-xl sm:p-12">
      <div
        aria-hidden
        className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl"
      />
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-200">
        Built for high-stakes evaluation
      </p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
        For the moments where the decision has to be right and the reasoning
        has to hold up.
      </h2>
      <p className="mt-4 max-w-2xl text-indigo-100">
        Pre-investment evaluation of AI-driven targets. Acquisition diligence.
        Validation of vendor AI claims. Assessment of internal AI initiatives
        where governance and capital exposure intersect. Most valuable when
        decisions must be made quickly, information is incomplete or biased,
        and claims need to be pressure-tested against evidence.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/app"
          className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-indigo-900 shadow-sm transition hover:bg-indigo-50"
        >
          Open the platform preview
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 px-6 py-8 text-xs text-slate-500 sm:flex-row sm:items-center">
        <p>© {new Date().getFullYear()} Kaptrix. Independent AI product diligence.</p>
        <div className="flex gap-4">
          <Link href="/app" className="hover:text-slate-800">
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

/* ========================================================================== */
/* Reusable building blocks                                                   */
/* ========================================================================== */

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-indigo-700">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Lede({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700">
      {children}
    </p>
  );
}

function SubHeading({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 ${className}`}
    >
      {children}
    </p>
  );
}

function Pullquote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="mt-10 rounded-2xl border-l-4 border-indigo-500 bg-indigo-50/50 px-6 py-5 text-base leading-8 text-slate-800">
      {children}
    </blockquote>
  );
}

function ContrastCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-base leading-7 text-slate-800">{body}</p>
    </div>
  );
}

function LayerCard({
  number,
  title,
  tagline,
  accent,
  body,
  children,
}: {
  number: string;
  title: string;
  tagline: string;
  accent: "indigo" | "violet" | "fuchsia";
  body: string;
  children?: React.ReactNode;
}) {
  const accentMap = {
    indigo: {
      ring: "ring-indigo-200",
      bar: "from-indigo-500 to-indigo-700",
      chip: "bg-indigo-100 text-indigo-800",
      number: "text-indigo-300",
    },
    violet: {
      ring: "ring-violet-200",
      bar: "from-violet-500 to-violet-700",
      chip: "bg-violet-100 text-violet-800",
      number: "text-violet-300",
    },
    fuchsia: {
      ring: "ring-fuchsia-200",
      bar: "from-fuchsia-500 to-fuchsia-700",
      chip: "bg-fuchsia-100 text-fuchsia-800",
      number: "text-fuchsia-300",
    },
  }[accent];

  return (
    <article
      className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ${accentMap.ring} sm:p-8`}
    >
      <div
        aria-hidden
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentMap.bar}`}
      />
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${accentMap.chip} inline-block rounded-full px-2.5 py-1`}
          >
            Layer {number}
          </p>
          <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h3>
          <p className="mt-1.5 text-sm font-medium text-slate-600">{tagline}</p>
        </div>
        <span
          className={`hidden text-6xl font-black tracking-tight sm:block ${accentMap.number}`}
        >
          {number}
        </span>
      </div>
      <p className="mt-5 text-sm leading-7 text-slate-700">{body}</p>
      {children && <div className="mt-6">{children}</div>}
    </article>
  );
}

function PropertyTile({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p
        className="mt-1.5 text-sm leading-6 text-slate-700"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </div>
  );
}

function ProposalChip({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone: "emerald" | "rose" | "indigo" | "amber";
}) {
  const map = {
    emerald: {
      ring: "border-emerald-200",
      chip: "bg-emerald-100 text-emerald-800",
      dot: "bg-emerald-500",
    },
    rose: {
      ring: "border-rose-200",
      chip: "bg-rose-100 text-rose-800",
      dot: "bg-rose-500",
    },
    indigo: {
      ring: "border-indigo-200",
      chip: "bg-indigo-100 text-indigo-800",
      dot: "bg-indigo-500",
    },
    amber: {
      ring: "border-amber-200",
      chip: "bg-amber-100 text-amber-800",
      dot: "bg-amber-500",
    },
  }[tone];
  return (
    <div className={`rounded-2xl border ${map.ring} bg-white p-5 shadow-sm`}>
      <div className="flex items-center gap-2">
        <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${map.dot}`} />
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${map.chip}`}
        >
          {label}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{body}</p>
    </div>
  );
}

function ScenarioCard({
  tone,
  headline,
  body,
}: {
  tone: "go" | "warn";
  headline: string;
  body: string;
}) {
  const map =
    tone === "go"
      ? {
          border: "border-emerald-200",
          chip: "bg-emerald-100 text-emerald-800",
          bar: "bg-emerald-500",
          label: "Strong signal",
        }
      : {
          border: "border-amber-200",
          chip: "bg-amber-100 text-amber-800",
          bar: "bg-amber-500",
          label: "Soft signal",
        };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${map.border} bg-white p-6 shadow-sm`}
    >
      <div aria-hidden className={`absolute inset-y-0 left-0 w-1 ${map.bar}`} />
      <span
        className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${map.chip}`}
      >
        {map.label}
      </span>
      <p className="mt-3 text-base font-semibold text-slate-900">{headline}</p>
      <p className="mt-2 text-sm leading-7 text-slate-700">{body}</p>
    </div>
  );
}

function ApproachCard({ label, rows }: { label: string; rows: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <ul className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <li
            key={r}
            className="flex items-start gap-3 text-sm leading-6 text-slate-700"
          >
            <span
              aria-hidden
              className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400"
            />
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuestionCard({
  tone,
  label,
  question,
}: {
  tone: "muted" | "primary";
  label: string;
  question: string;
}) {
  const isPrimary = tone === "primary";
  return (
    <div
      className={
        isPrimary
          ? "rounded-2xl border border-indigo-300 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm"
          : "rounded-2xl border border-slate-200 bg-slate-50/60 p-6 shadow-sm"
      }
    >
      <p
        className={
          isPrimary
            ? "text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700"
            : "text-xs font-semibold uppercase tracking-[0.22em] text-slate-500"
        }
      >
        {label}
      </p>
      <p
        className={
          isPrimary
            ? "mt-3 text-lg font-semibold leading-8 text-slate-900"
            : "mt-3 text-lg font-semibold leading-8 text-slate-700"
        }
      >
        “{question}”
      </p>
    </div>
  );
}

function CheckGlyph({ color = "indigo" }: { color?: "indigo" | "emerald" }) {
  const cls =
    color === "emerald"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
      : "bg-indigo-100 text-indigo-700 ring-indigo-200";
  return (
    <span
      className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ${cls}`}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <path
          d="M2.5 6.5L5 9l4.5-5.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Static content                                                             */
/* -------------------------------------------------------------------------- */

const DIMENSIONS: { name: string; summary: string }[] = [
  {
    name: "Product Credibility",
    summary: "Whether the AI claims being made are real and substantiated.",
  },
  {
    name: "Tooling & Vendor Exposure",
    summary:
      "How much of the system depends on external providers, and how concentrated that dependency is.",
  },
  {
    name: "Data & Sensitivity Risk",
    summary: "How data is sourced, handled, licensed, and protected.",
  },
  {
    name: "Governance & Safety",
    summary:
      "What controls exist, and whether they match the system's operating context.",
  },
  {
    name: "Production Readiness",
    summary:
      "Whether the system is genuinely operational or still prototype-grade.",
  },
  {
    name: "Open Validation",
    summary: "What has been independently verified, and what remains untested.",
  },
];
