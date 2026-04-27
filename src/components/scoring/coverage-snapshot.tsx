/**
 * COVERAGE SNAPSHOT — five-pill breakdown of how each sub-criterion was
 * scored: artifact-supported, artifact-only, intake-only, contradictory,
 * or insufficient.
 *
 * Pure presentational. Counts come from the deterministic engine output.
 * The visual goal is to make "we're leaning on intake claims" or "we
 * have insufficient evidence" impossible to miss.
 */

interface Bucket {
  key: "artifact_supported" | "artifact_only" | "intake_only" | "contradictory" | "insufficient";
  label: string;
  count: number;
  total: number;
  ring: string;
  bg: string;
  text: string;
  icon: React.ReactNode;
  legend: string;
}

interface Props {
  /** Sub-criteria total — typically 24. */
  total: number;
  artifactSupported: number;
  artifactOnly: number;
  intakeOnly: number;
  contradictory: number;
  insufficient: number;
}

export function CoverageSnapshot({
  total,
  artifactSupported,
  artifactOnly,
  intakeOnly,
  contradictory,
  insufficient,
}: Props) {
  const safeTotal = total > 0 ? total : 1;
  const buckets: Bucket[] = [
    {
      key: "artifact_supported",
      label: "Artifact supported",
      count: artifactSupported,
      total,
      ring: "border-emerald-200",
      bg: "bg-emerald-50",
      text: "text-emerald-900",
      legend: "Strong evidence",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-emerald-600" aria-hidden>
          <path d="M12 2l9 4v6c0 5-3.8 9.4-9 10-5.2-.6-9-5-9-10V6l9-4zm-1 12.5l5-5-1.4-1.4L11 11.7 8.4 9 7 10.4l4 4z" />
        </svg>
      ),
    },
    {
      key: "artifact_only",
      label: "Artifact only",
      count: artifactOnly,
      total,
      ring: "border-blue-200",
      bg: "bg-blue-50",
      text: "text-blue-900",
      legend: "Limited validation",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-blue-600" aria-hidden>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13z" />
        </svg>
      ),
    },
    {
      key: "intake_only",
      label: "Intake only",
      count: intakeOnly,
      total,
      ring: "border-amber-200",
      bg: "bg-amber-50",
      text: "text-amber-900",
      legend: "No supporting artifacts",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-amber-600" aria-hidden>
          <path d="M12 1l3 5h6l-4.5 4.4L18 17l-6-3-6 3 1.5-6.6L3 6h6l3-5z" />
        </svg>
      ),
    },
    {
      key: "contradictory",
      label: "Contradictory",
      count: contradictory,
      total,
      ring: "border-rose-200",
      bg: "bg-rose-50",
      text: "text-rose-900",
      legend: "Conflicting signals",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-rose-600" aria-hidden>
          <path d="M3 3l8 8-8 8 2 2 8-8 8 8 2-2-8-8 8-8-2-2-8 8-8-8z" />
        </svg>
      ),
    },
    {
      key: "insufficient",
      label: "Insufficient",
      count: insufficient,
      total,
      ring: "border-slate-200",
      bg: "bg-slate-50",
      text: "text-slate-900",
      legend: "Insufficient info",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-slate-500" aria-hidden>
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm.6-5.6L13 12.4V14h-2v-2.5l1.6-1.6a2 2 0 10-3.4-1.4H7a4 4 0 116.6 3z" />
        </svg>
      ),
    },
  ];

  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Coverage snapshot
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {buckets.map((b) => {
          const pct = Math.round((b.count / safeTotal) * 100);
          return (
            <div
              key={b.key}
              className={`rounded-xl border ${b.ring} ${b.bg} p-3.5`}
            >
              <div className="flex items-center gap-2">
                {b.icon}
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  {b.label}
                </p>
              </div>
              <p className={`mt-2 text-2xl font-bold tabular-nums ${b.text}`}>
                {b.count}
                <span className="ml-1 text-sm font-normal text-slate-400">
                  / {b.total}
                </span>
              </p>
              <p className="text-[11px] text-slate-500">{pct}%</p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        {buckets.map((b) => (
          <span key={`${b.key}-legend`} className="inline-flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                b.key === "artifact_supported"
                  ? "bg-emerald-500"
                  : b.key === "artifact_only"
                    ? "bg-blue-500"
                    : b.key === "intake_only"
                      ? "bg-amber-500"
                      : b.key === "contradictory"
                        ? "bg-rose-500"
                        : "bg-slate-400"
              }`}
            />
            {b.legend}
          </span>
        ))}
      </div>
    </section>
  );
}
