"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface SubSegment {
  name: string;
  alignment_score: number;
  rationale: string;
  entry_approach: string;
  key_risks: string[];
}

interface EntryStrategy {
  strategy: string;
  rationale: string;
  risk: string;
}

interface StageRecommendation {
  stage: string;
  rationale: string;
}

interface AdjacentCategory {
  name: string;
  rationale: string;
}

interface CategoryToAvoid {
  name: string;
  reason: string;
}

interface PositioningContent {
  sub_segments?: SubSegment[];
  entry_strategies?: EntryStrategy[];
  stage_recommendation?: StageRecommendation;
  adjacent_categories?: AdjacentCategory[];
  categories_to_avoid?: CategoryToAvoid[];
}

interface PositioningInsight {
  content: PositioningContent;
  user_edited_content: PositioningContent | null;
  user_edited_at: string | null;
  generated_at: string;
}

export default function CategoryPositioningPage() {
  const { id: engagementId } = useParams<{ id: string }>();
  const [positioning, setPositioning] = useState<PositioningInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market-intelligence/${engagementId}/positioning`);
      if (res.ok) {
        const data = (await res.json()) as PositioningInsight | null;
        setPositioning(data);
      }
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
      await fetch(`/api/market-intelligence/${engagementId}/positioning/generate`, {
        method: "POST",
      });
      await load();
    } finally {
      setGenerating(false);
    }
  }

  const data = positioning?.user_edited_content ?? positioning?.content ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Positioning</h2>
          <p className="mt-1 text-sm text-slate-500">
            Where to deploy capital or attention within this category given the
            thesis and scores.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={generating}
          className="shrink-0 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-500 disabled:opacity-50"
        >
          {generating ? "Generating…" : positioning ? "Re-generate" : "Generate Positioning"}
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading…</div>
      ) : !positioning ? (
        <div className="rounded-2xl border-2 border-dashed border-fuchsia-200 py-16 text-center">
          <p className="text-sm text-slate-500 mb-3">
            Generate scores first, then run positioning for the best results.
          </p>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating}
            className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500"
          >
            Generate Positioning
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sub-segments */}
          {data?.sub_segments && data.sub_segments.length > 0 && (
            <Section title="Sub-segment Rankings">
              <div className="space-y-3">
                {data.sub_segments
                  .sort((a, b) => b.alignment_score - a.alignment_score)
                  .map((seg, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-800">
                          {seg.name}
                        </h4>
                        <span className="shrink-0 rounded-full bg-fuchsia-100 px-2.5 py-0.5 text-xs font-bold text-fuchsia-700">
                          {seg.alignment_score}/5
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{seg.rationale}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Entry: {seg.entry_approach}
                      </p>
                      {seg.key_risks?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {seg.key_risks.map((r, ri) => (
                            <span
                              key={ri}
                              className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-600 ring-1 ring-rose-200"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </Section>
          )}

          {/* Stage recommendation */}
          {data?.stage_recommendation && (
            <Section title="Stage Recommendation">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <span className="text-lg font-bold text-emerald-800 capitalize">
                  {data.stage_recommendation.stage}
                </span>
                <p className="mt-1 text-sm text-emerald-700">
                  {data.stage_recommendation.rationale}
                </p>
              </div>
            </Section>
          )}

          {/* Entry strategies */}
          {data?.entry_strategies && data.entry_strategies.length > 0 && (
            <Section title="Entry Strategies">
              <div className="grid gap-3 sm:grid-cols-2">
                {data.entry_strategies.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 mb-1">
                      {s.strategy.replace(/_/g, " ")}
                    </p>
                    <p className="text-sm text-slate-700">{s.rationale}</p>
                    <p className="mt-2 text-xs text-rose-600">Risk: {s.risk}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Adjacent categories */}
          {data?.adjacent_categories && data.adjacent_categories.length > 0 && (
            <Section title="Adjacent Categories to Monitor">
              <div className="grid gap-3 sm:grid-cols-2">
                {data.adjacent_categories.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{c.rationale}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Categories to avoid */}
          {data?.categories_to_avoid && data.categories_to_avoid.length > 0 && (
            <Section title="Categories to Avoid">
              <div className="space-y-2">
                {data.categories_to_avoid.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3"
                  >
                    <span className="mt-0.5 text-rose-500">✗</span>
                    <div>
                      <p className="text-sm font-semibold text-rose-800">{c.name}</p>
                      <p className="text-xs text-rose-600">{c.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {positioning.user_edited_at && (
            <p className="text-xs text-slate-400">
              Last edited by operator at {new Date(positioning.user_edited_at).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-500 uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}
