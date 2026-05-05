/**
 * DECISION SNAPSHOT — hero card.
 *
 * The single most important block on the scoring page. Answers in one
 * glance: what's the recommendation, why, and which axes drove it?
 *
 * Pure presentational — receives a fully-formed decision result and
 * the four-quadrant interpretation from the parent. Never computes
 * decisions itself.
 */

import type { DecisionResult } from "@/lib/scoring/calculator";
import type {
  CommercialPainInterpretation,
  CommercialPainResult,
} from "@/lib/scoring/commercial-pain";
import { confidenceFromComposite } from "@/lib/scoring/read-confidence";

interface Props {
  decision: DecisionResult | null;
  interpretation: CommercialPainInterpretation | null;
  /** Phase-2 commercial pain band — drives the chip text/color. */
  commercialPainBand: CommercialPainResult["band"] | null;
  /** AI Diligence composite (0–5) — drives the strong/moderate chip
   *  AND the Read Confidence chip (the same value shown on every
   *  report's Decision Snapshot hero). */
  aiDiligenceComposite: number | null;
}

const TONE_BG: Record<"go" | "warn" | "stop", string> = {
  go: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white",
  warn: "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white",
  stop: "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-white",
};

const TONE_RING: Record<"go" | "warn" | "stop", string> = {
  go: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  warn: "bg-amber-100 text-amber-700 ring-amber-200",
  stop: "bg-rose-100 text-rose-700 ring-rose-200",
};

const CHIP_TONE: Record<"go" | "warn" | "stop", string> = {
  go: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  stop: "border-rose-200 bg-rose-50 text-rose-800",
};

function ToneIcon({ tone }: { tone: "go" | "warn" | "stop" }) {
  if (tone === "go") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path
          d="M8 12.5l3 3 5-6"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }
  if (tone === "warn") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden>
        <path
          d="M12 3l10 18H2L12 3z"
          fill="currentColor"
        />
        <path
          d="M12 10v5"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="18" r="1" fill="white" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path
        d="M8 8l8 8M16 8l-8 8"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface ChipSpec {
  label: string;
  tone: "go" | "warn" | "stop";
}

function deriveChips(
  aiDiligenceComposite: number | null,
  commercialPainBand: CommercialPainResult["band"] | null,
): ChipSpec[] {
  const chips: ChipSpec[] = [];

  if (aiDiligenceComposite == null) {
    chips.push({ label: "AI diligence not yet scored", tone: "warn" });
  } else if (aiDiligenceComposite >= 4) {
    chips.push({ label: "AI diligence strong", tone: "go" });
  } else if (aiDiligenceComposite >= 3) {
    chips.push({ label: "AI diligence moderate", tone: "warn" });
  } else {
    chips.push({ label: "AI diligence weak", tone: "stop" });
  }

  if (commercialPainBand == null) {
    chips.push({ label: "Commercial pain not yet validated", tone: "warn" });
  } else if (commercialPainBand === "strong") {
    chips.push({ label: "Commercial pain confidence strong", tone: "go" });
  } else if (commercialPainBand === "moderate") {
    chips.push({
      label: "Commercial pain confidence moderate",
      tone: "warn",
    });
  } else if (commercialPainBand === "weak") {
    chips.push({ label: "Commercial pain confidence weak", tone: "stop" });
  } else {
    chips.push({ label: "Commercial pain not validated", tone: "stop" });
  }

  // Read Confidence chip — same 0–100 value the reports show.
  const readConfidence = confidenceFromComposite(aiDiligenceComposite);
  if (readConfidence == null) {
    chips.push({ label: "Read confidence pending", tone: "warn" });
  } else if (readConfidence >= 70) {
    chips.push({ label: `Read confidence ${readConfidence}/100`, tone: "go" });
  } else if (readConfidence >= 50) {
    chips.push({ label: `Read confidence ${readConfidence}/100`, tone: "warn" });
  } else {
    chips.push({ label: `Read confidence ${readConfidence}/100`, tone: "stop" });
  }

  return chips;
}

export function DecisionSnapshotHero({
  decision,
  interpretation,
  commercialPainBand,
  aiDiligenceComposite,
}: Props) {
  const tone: "go" | "warn" | "stop" = decision?.tone ?? "warn";
  const chips = deriveChips(aiDiligenceComposite, commercialPainBand);

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border ${TONE_BG[tone]} px-6 py-6 shadow-sm sm:px-8 sm:py-7`}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Decision snapshot
        </p>

        <div className="mt-3 flex items-center gap-3">
          <span
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${TONE_RING[tone]} ring-1`}
          >
            <ToneIcon tone={tone} />
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {decision?.label ?? "Awaiting scores"}
          </h2>
        </div>

        {decision?.summary && (
          <p className="mt-3 max-w-2xl text-sm font-medium text-slate-700">
            {decision.summary}
          </p>
        )}

        {interpretation && (
          <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-900">
            {interpretation.headline}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${CHIP_TONE[chip.tone]}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {chip.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
