/**
 * WHAT MATTERS MOST — four compact cards summarizing the scoring page
 * for an executive scan: top strengths, top risks, missing evidence,
 * and recommendation conditions.
 *
 * Pure presentational. The parent derives each list from real data
 * (dimensions, red flags, source-mix, decision rationale) and passes
 * it in. The component never invents items — empty states render as
 * a single muted line.
 */

interface CardSpec {
  title: string;
  tone: "strength" | "risk" | "missing" | "condition";
  items: string[];
  emptyText: string;
}

const TONE_STYLES: Record<
  CardSpec["tone"],
  { ring: string; iconBg: string; icon: React.ReactNode; bullet: string }
> = {
  strength: {
    ring: "border-emerald-200",
    iconBg: "bg-emerald-100 text-emerald-700",
    bullet: "text-emerald-500",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  risk: {
    ring: "border-rose-200",
    iconBg: "bg-rose-100 text-rose-700",
    bullet: "text-rose-500",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
        <path d="M10 2L1 18h18L10 2zm0 5l5.7 10H4.3L10 7zm0 3v4m0 2v.5" />
        <path
          d="M10 11v-3"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="10" cy="14.5" r="0.7" fill="white" />
      </svg>
    ),
  },
  missing: {
    ring: "border-amber-200",
    iconBg: "bg-amber-100 text-amber-700",
    bullet: "text-amber-500",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
        <path
          fillRule="evenodd"
          d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 4a1 1 0 011 1v3a1 1 0 11-2 0V7a1 1 0 011-1zm0 7a1 1 0 100 2 1 1 0 000-2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  condition: {
    ring: "border-violet-200",
    iconBg: "bg-violet-100 text-violet-700",
    bullet: "text-violet-500",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
        <path
          fillRule="evenodd"
          d="M10 1l8 4v5a8 8 0 01-8 8 8 8 0 01-8-8V5l8-4zm-1 8.6l-2.3-2.3-1.4 1.4L9 12.4l5.7-5.7-1.4-1.4L9 9.6z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

function Card({ spec }: { spec: CardSpec }) {
  const style = TONE_STYLES[spec.tone];
  return (
    <div
      className={`flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm ${style.ring}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.iconBg}`}
        >
          {style.icon}
        </span>
        <h3 className="text-sm font-semibold text-slate-900">{spec.title}</h3>
      </div>
      {spec.items.length === 0 ? (
        <p className="mt-3 text-xs text-slate-400">{spec.emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
          {spec.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className={`mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current ${style.bullet}`}
              />
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface Props {
  topStrengths: string[];
  topRisks: string[];
  missingEvidence: string[];
  recommendationConditions: string[];
}

export function WhatMattersMost({
  topStrengths,
  topRisks,
  missingEvidence,
  recommendationConditions,
}: Props) {
  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        What matters most
      </p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          spec={{
            title: "Top strengths",
            tone: "strength",
            items: topStrengths,
            emptyText: "Strengths surface once dimensions are scored.",
          }}
        />
        <Card
          spec={{
            title: "Top risks",
            tone: "risk",
            items: topRisks,
            emptyText: "No critical risks detected yet.",
          }}
        />
        <Card
          spec={{
            title: "Missing evidence",
            tone: "missing",
            items: missingEvidence,
            emptyText: "All key evidence appears to be in place.",
          }}
        />
        <Card
          spec={{
            title: "Recommendation conditions",
            tone: "condition",
            items: recommendationConditions,
            emptyText: "No conditions yet — review the recommendation above.",
          }}
        />
      </div>
    </section>
  );
}
