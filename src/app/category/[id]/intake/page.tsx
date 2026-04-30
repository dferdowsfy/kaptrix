"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { IntakeQuestionnaire } from "@/components/engagements/intake-questionnaire";
import { CATEGORY_INTAKE_QUESTIONS } from "@/lib/category-intake/questions";
import { calculateCategoryDiligenceConfidence } from "@/lib/category-intake/scoring";

type Answers = Record<string, string | number | string[]>;

const EMPTY: Answers = {};

function localKey(engagementId: string): string {
  return `kaptrix.category.intake.answers.v1:${engagementId}`;
}

function readLocal(engagementId: string | null | undefined): Answers {
  if (!engagementId || typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(localKey(engagementId));
    return raw ? (JSON.parse(raw) as Answers) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeLocal(engagementId: string, answers: Answers): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(localKey(engagementId), JSON.stringify(answers));
  } catch {
    /* ignore quota */
  }
}

export default function CategoryIntakePage() {
  const params = useParams<{ id: string }>();
  const engagementId = params.id;

  const [hydrateToken, setHydrateToken] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate on mount: pull server answers, fall back to localStorage so
  // the operator never loses an in-flight answer when re-routing.
  const hydrate = useCallback(async () => {
    if (!engagementId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/category/intake-answers?engagement_id=${encodeURIComponent(engagementId)}`,
      );
      let serverAnswers: Answers = EMPTY;
      if (res.ok) {
        const body = (await res.json()) as { answers?: Answers };
        if (body.answers && typeof body.answers === "object") {
          serverAnswers = body.answers;
        }
      }
      const local = readLocal(engagementId);
      const merged = Object.keys(serverAnswers).length > 0 ? serverAnswers : local;
      setAnswers(merged);
      writeLocal(engagementId, merged);
      setHydrateToken((t) => t + 1);
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const onChange = useCallback(
    (next: Answers) => {
      if (!engagementId) return;
      setAnswers(next);
      writeLocal(engagementId, next);
      // Debounced server save — same 600ms cadence as target intake.
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void fetch("/api/category/intake-answers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ engagement_id: engagementId, answers: next }),
          keepalive: true,
        }).catch(() => {
          /* network blip — local copy still has it */
        });
      }, 600);
    },
    [engagementId],
  );

  // Last-chance flush before tab close.
  useEffect(() => {
    if (!engagementId) return;
    const handler = () => {
      try {
        const blob = new Blob(
          [JSON.stringify({ engagement_id: engagementId, answers })],
          { type: "application/json" },
        );
        navigator.sendBeacon?.("/api/category/intake-answers", blob);
      } catch {
        /* best-effort */
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [engagementId, answers]);

  const score = calculateCategoryDiligenceConfidence(answers);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Loading category intake…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
          AI Category Diligence
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
          Category intake
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Answer the structured questions on the left. Every answer is a
          multiple-choice option that maps to the deterministic Category
          Diligence Confidence score (0–100, shown below). Free-form text
          is intentionally avoided — it makes scoring drift and reports
          unreliable.
        </p>

        {/* Live score chip — same shape as Commercial Pain Confidence on
            the target pathway. Disappears until at least one categorical
            answer is entered. */}
        {score && (
          <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
                Category Diligence Confidence
              </p>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-slate-900">
                  {score.score}
                </span>
                <span className="text-xs text-slate-500">/ 100</span>
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    score.band === "strong"
                      ? "bg-emerald-100 text-emerald-800"
                      : score.band === "moderate"
                        ? "bg-amber-100 text-amber-800"
                        : score.band === "weak"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {score.band_label}
                </span>
              </div>
            </div>
            {score.top_drivers.length > 0 && (
              <div className="ml-2 hidden text-xs text-slate-700 sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Top drivers
                </p>
                <p className="mt-0.5">
                  {score.top_drivers
                    .map((d) => `${d.label} +${d.weighted.toFixed(0)}`)
                    .join(" · ")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <IntakeQuestionnaire
        key={hydrateToken}
        questions={CATEGORY_INTAKE_QUESTIONS}
        initialAnswers={answers}
        onChange={onChange}
        industryDisplayName="AI Category Diligence"
      />
    </div>
  );
}
