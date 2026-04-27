/**
 * Three-card scoring overview that sits at the top of the scoring/results
 * page. Each card represents a distinct lens on the engagement and is
 * never combined into a single number:
 *
 *   1. Commercial Pain Confidence (0–100, separate scoring layer)
 *   2. AI Diligence Score (0–5, the existing six-dimension composite)
 *   3. Evidence Coverage Confidence (0–1, evidence_confidence layer)
 *
 * Below the cards, a banner reads the four-quadrant interpretation
 * (strong signal / execution risk / commercially weak / likely pass).
 *
 * Intentionally a server-safe component — no hooks, no event handlers —
 * so it can be embedded in either a server page or a client page.
 */

import {
  COMMERCIAL_PAIN_FACTOR_LABELS,
  interpretCommercialPainAndDiligence,
  type CommercialPainResult,
} from "@/lib/scoring/commercial-pain";

interface Props {
  commercialPain: CommercialPainResult | null;
  /**
   * The existing AI Diligence Score composite on the 0–5 scale.
   * Pass null for engagements with no scoring activity yet.
   */
  aiDiligenceComposite: number | null;
  /**
   * Evidence Coverage Confidence on the 0–1 scale (the `composite` field
   * on the evidence_confidence row). Null = not computed yet.
   */
  evidenceCoverageConfidence: number | null;
}

const BAND_STYLES: Record<
  CommercialPainResult["band"],
  { chip: string; bar: string }
> = {
  strong: {
    chip: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
    bar: "bg-emerald-500",
  },
  moderate: {
    chip: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    bar: "bg-amber-500",
  },
  weak: {
    chip: "bg-orange-100 text-orange-800 ring-1 ring-orange-200",
    bar: "bg-orange-500",
  },
  not_validated: {
    chip: "bg-rose-100 text-rose-800 ring-1 ring-rose-200",
    bar: "bg-rose-500",
  },
};

const TONE_STYLES: Record<"go" | "warn" | "stop", string> = {
  go: "border-emerald-300 bg-emerald-50 text-emerald-900",
  warn: "border-amber-300 bg-amber-50 text-amber-900",
  stop: "border-rose-300 bg-rose-50 text-rose-900",
};

const EVIDENCE_SOURCE_LABEL: Record<
  NonNullable<CommercialPainResult>["evidence_source"],
  string
> = {
  intake: "Intake-only claims",
  artifact_backed: "Artifact-backed support",
  mixed: "Mixed (intake + artifact)",
};

function CardShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      <div className="mt-4 flex-1">{children}</div>
    </div>
  );
}

function CommercialPainCard({ result }: { result: CommercialPainResult | null }) {
  if (result == null) {
    return (
      <CardShell
        eyebrow="01 · Commercial"
        title="Commercial Pain Confidence"
        subtitle="Is the problem real, urgent, and worth solving?"
      >
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
          Commercial Pain Validation not yet completed.
        </div>
      </CardShell>
    );
  }

  const styles = BAND_STYLES[result.band];

  return (
    <CardShell
      eyebrow="01 · Commercial"
      title="Commercial Pain Confidence"
      subtitle="Is the problem real, urgent, and worth solving?"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tabular-nums text-slate-900">
          {result.score}
        </span>
        <span className="text-sm font-normal text-slate-400">/ 100</span>
        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles.chip}`}
        >
          {result.band_label}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${styles.bar} transition-all`}
          style={{ width: `${result.score}%` }}
        />
      </div>

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Source
      </p>
      <p className="mt-0.5 text-xs text-slate-700">
        {EVIDENCE_SOURCE_LABEL[result.evidence_source]}
      </p>

      {result.top_drivers.length > 0 && (
        <>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Key drivers
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
            {result.top_drivers.map((d) => (
              <li key={d.factor} className="flex items-baseline justify-between">
                <span>{d.label}</span>
                <span className="ml-2 tabular-nums text-slate-500">
                  +{d.weighted.toFixed(0)} pts
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {result.missing_factors.length > 0 && (
        <>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Missing commercial evidence
          </p>
          <p className="mt-1 text-xs text-slate-700">
            {result.missing_factors
              .map((f) => COMMERCIAL_PAIN_FACTOR_LABELS[f])
              .join(", ")}
          </p>
        </>
      )}
    </CardShell>
  );
}

function bandFor0to5(score: number): { label: string; chip: string; bar: string } {
  if (score >= 4) {
    return {
      label: "Strong",
      chip: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
      bar: "bg-emerald-500",
    };
  }
  if (score >= 3) {
    return {
      label: "Moderate",
      chip: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
      bar: "bg-amber-500",
    };
  }
  if (score >= 2) {
    return {
      label: "Weak",
      chip: "bg-orange-100 text-orange-800 ring-1 ring-orange-200",
      bar: "bg-orange-500",
    };
  }
  return {
    label: "Not Validated",
    chip: "bg-rose-100 text-rose-800 ring-1 ring-rose-200",
    bar: "bg-rose-500",
  };
}

function AiDiligenceCard({ composite }: { composite: number | null }) {
  if (composite == null) {
    return (
      <CardShell
        eyebrow="02 · Technical"
        title="AI Diligence Score"
        subtitle="Is the AI capability credible, scalable, governable, and defensible?"
      >
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
          Not yet scored.
        </div>
      </CardShell>
    );
  }

  const styles = bandFor0to5(composite);

  return (
    <CardShell
      eyebrow="02 · Technical"
      title="AI Diligence Score"
      subtitle="Is the AI capability credible, scalable, governable, and defensible?"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tabular-nums text-slate-900">
          {composite.toFixed(1)}
        </span>
        <span className="text-sm font-normal text-slate-400">/ 5.0</span>
        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles.chip}`}
        >
          {styles.label}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${styles.bar} transition-all`}
          style={{ width: `${(composite / 5) * 100}%` }}
        />
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Six-dimension weighted composite — see the full breakdown below.
      </p>
    </CardShell>
  );
}

function EvidenceCoverageCard({
  confidence,
}: {
  confidence: number | null;
}) {
  if (confidence == null) {
    return (
      <CardShell
        eyebrow="03 · Evidence"
        title="Evidence Coverage Confidence"
        subtitle="How much of the conclusion is artifact-backed versus intake-claimed?"
      >
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
          Evidence confidence has not been computed yet.
        </div>
      </CardShell>
    );
  }

  const pct = Math.round(confidence * 100);
  const label =
    pct >= 80 ? "Strong" : pct >= 60 ? "Moderate" : pct >= 40 ? "Weak" : "Sparse";
  const chip =
    pct >= 80
      ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
      : pct >= 60
        ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
        : pct >= 40
          ? "bg-orange-100 text-orange-800 ring-1 ring-orange-200"
          : "bg-rose-100 text-rose-800 ring-1 ring-rose-200";
  const bar =
    pct >= 80
      ? "bg-emerald-500"
      : pct >= 60
        ? "bg-amber-500"
        : pct >= 40
          ? "bg-orange-500"
          : "bg-rose-500";

  return (
    <CardShell
      eyebrow="03 · Evidence"
      title="Evidence Coverage Confidence"
      subtitle="How much of the conclusion is artifact-backed versus intake-claimed?"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tabular-nums text-slate-900">
          {pct}
          <span className="text-2xl text-slate-400">%</span>
        </span>
        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${chip}`}
        >
          {label}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${bar} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Coverage, source quality, recency, and consistency — qualifies the
        scores above without ever modifying them.
      </p>
    </CardShell>
  );
}

export function ScoreOverview({
  commercialPain,
  aiDiligenceComposite,
  evidenceCoverageConfidence,
}: Props) {
  const interpretation = interpretCommercialPainAndDiligence(
    commercialPain,
    aiDiligenceComposite,
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CommercialPainCard result={commercialPain} />
        <AiDiligenceCard composite={aiDiligenceComposite} />
        <EvidenceCoverageCard confidence={evidenceCoverageConfidence} />
      </div>

      {interpretation && (
        <div
          className={`rounded-xl border-2 px-5 py-4 ${TONE_STYLES[interpretation.tone]}`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
            Combined reading
          </p>
          <p className="mt-1 text-base font-semibold">{interpretation.headline}</p>
          <p className="mt-1 text-sm opacity-90">{interpretation.detail}</p>
        </div>
      )}
    </div>
  );
}
