"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface MiScore {
  id: string;
  dimension: string;
  score_0_to_5: number;
  llm_justification: string | null;
  operator_override: boolean;
  operator_rationale: string | null;
  generated_by_model: string | null;
  generated_at: string;
}

const DIMENSION_LABELS: Record<string, string> = {
  thesis_durability: "Thesis Durability",
  category_attractiveness: "Category Attractiveness",
  competitive_defensibility: "Competitive Defensibility",
  timing_confidence: "Timing Confidence",
  threat_concentration: "Threat Concentration",
  evidence_strength: "Evidence Strength",
  signal_noise_ratio: "Signal/Noise Ratio",
};

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 5) * 100;
  const color =
    score >= 4 ? "bg-emerald-500" : score >= 3 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-sm font-bold text-slate-800">
        {score.toFixed(1)}/5
      </span>
    </div>
  );
}

export default function CategoryScoringPage() {
  const { id: engagementId } = useParams<{ id: string }>();
  const [scores, setScores] = useState<MiScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingDimension, setEditingDimension] = useState<string | null>(null);
  const [overrideScore, setOverrideScore] = useState("");
  const [overrideRationale, setOverrideRationale] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market-intelligence/${engagementId}/scores`);
      if (res.ok) setScores((await res.json()) as MiScore[]);
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate() {
    setGenerating(true);
    try {
      await fetch(`/api/market-intelligence/${engagementId}/scores/generate`, {
        method: "POST",
      });
      await load();
    } finally {
      setGenerating(false);
    }
  }

  async function saveOverride(dimension: string) {
    setSaving(true);
    try {
      const scoreVal = parseFloat(overrideScore);
      await fetch(`/api/market-intelligence/${engagementId}/scores`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dimension,
          operator_override: true,
          score_0_to_5: isNaN(scoreVal) ? undefined : scoreVal,
          operator_rationale: overrideRationale,
        }),
      });
      setEditingDimension(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const composite =
    scores.length > 0
      ? scores.reduce((s, sc) => s + Number(sc.score_0_to_5), 0) / scores.length
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Scoring</h2>
          <p className="mt-1 text-sm text-slate-500">
            LLM-scored rubric across 7 MI dimensions. Override any score with an operator rationale.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={generating}
          className="shrink-0 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-500 disabled:opacity-50"
        >
          {generating ? "Generating…" : scores.length > 0 ? "Re-score" : "Generate Scores"}
        </button>
      </div>

      {composite !== null && (
        <div className="rounded-2xl border border-fuchsia-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">Composite Score</p>
            <p className="text-3xl font-bold text-fuchsia-700">
              {composite.toFixed(1)}<span className="text-base text-slate-400">/5</span>
            </p>
          </div>
          <div className="mt-3">
            <div className="h-3 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all"
                style={{ width: `${(composite / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading scores…</div>
      ) : scores.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-fuchsia-200 py-16 text-center">
          <p className="text-sm text-slate-500 mb-3">
            No scores generated yet. Evidence and insights improve accuracy.
          </p>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating}
            className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate Scores"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {scores.map((sc) => (
            <div
              key={sc.dimension}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">
                      {DIMENSION_LABELS[sc.dimension] ?? sc.dimension}
                    </h3>
                    {sc.operator_override && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                        Overridden
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <ScoreBar score={Number(sc.score_0_to_5)} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {sc.operator_override
                      ? sc.operator_rationale
                      : sc.llm_justification}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDimension(sc.dimension);
                    setOverrideScore(String(sc.score_0_to_5));
                    setOverrideRationale(sc.operator_rationale ?? "");
                  }}
                  className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Override
                </button>
              </div>

              {editingDimension === sc.dimension && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex gap-3">
                    <div className="w-24">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        New Score
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        step={0.5}
                        value={overrideScore}
                        onChange={(e) => setOverrideScore(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Rationale *
                      </label>
                      <textarea
                        rows={2}
                        value={overrideRationale}
                        onChange={(e) => setOverrideRationale(e.target.value)}
                        className="block w-full resize-none rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
                        placeholder="Why are you overriding this score?"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingDimension(null)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveOverride(sc.dimension)}
                      disabled={saving || !overrideRationale.trim()}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-400 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save Override"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
