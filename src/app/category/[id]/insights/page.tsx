"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type InsightType =
  | "pressure_test"
  | "structure_map"
  | "threat_model"
  | "company_shortlist"
  | "gap_map"
  | "adjacent_category"
  | "timing_read";

interface Insight {
  id: string;
  insight_type: InsightType;
  content: Record<string, unknown>;
  generated_at: string;
  user_edited_at: string | null;
  user_edited_content: Record<string, unknown> | null;
}

const INSIGHT_TABS: { id: InsightType; label: string }[] = [
  { id: "pressure_test", label: "Pressure Test" },
  { id: "structure_map", label: "Structure Map" },
  { id: "threat_model", label: "Threat Model" },
  { id: "company_shortlist", label: "Company Shortlist" },
  { id: "gap_map", label: "Gap Map" },
  { id: "adjacent_category", label: "Adjacent Categories" },
  { id: "timing_read", label: "Timing Read" },
];

export default function CategoryInsightsPage() {
  const { id: engagementId } = useParams<{ id: string }>();
  const [insights, setInsights] = useState<Partial<Record<InsightType, Insight>>>({});
  const [activeTab, setActiveTab] = useState<InsightType>("pressure_test");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<InsightType | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        INSIGHT_TABS.map((t) =>
          fetch(`/api/market-intelligence/${engagementId}/insights/${t.id}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ),
      );
      const map: Partial<Record<InsightType, Insight>> = {};
      INSIGHT_TABS.forEach((t, i) => {
        if (results[i]) map[t.id] = results[i] as Insight;
      });
      setInsights(map);
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function generateAll() {
    setGenerating(true);
    try {
      await fetch(`/api/market-intelligence/${engagementId}/insights/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await loadAll();
    } finally {
      setGenerating(false);
    }
  }

  async function generateOne(type: InsightType) {
    setGeneratingType(type);
    try {
      await fetch(`/api/market-intelligence/${engagementId}/insights/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ types: [type] }),
      });
      const res = await fetch(`/api/market-intelligence/${engagementId}/insights/${type}`);
      if (res.ok) {
        const data = (await res.json()) as Insight;
        setInsights((prev) => ({ ...prev, [type]: data }));
      }
    } finally {
      setGeneratingType(null);
    }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(editContent) as Record<string, unknown>;
      } catch {
        parsed = { text: editContent };
      }
      const res = await fetch(
        `/api/market-intelligence/${engagementId}/insights/${activeTab}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_edited_content: parsed }),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as Insight;
        setInsights((prev) => ({ ...prev, [activeTab]: data }));
        setEditMode(false);
      }
    } finally {
      setSaving(false);
    }
  }

  const currentInsight = insights[activeTab];
  const displayContent =
    currentInsight?.user_edited_content ?? currentInsight?.content ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Insights</h2>
          <p className="mt-1 text-sm text-slate-500">
            LLM-generated structured insights from thesis, intake, and evidence.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void generateAll()}
          disabled={generating}
          className="shrink-0 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-500 disabled:opacity-50"
        >
          {generating ? "Generating all…" : "Generate All"}
        </button>
      </div>

      {/* Insight type tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
        {INSIGHT_TABS.map((tab) => {
          const has = !!insights[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setEditMode(false);
              }}
              className={[
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition",
                activeTab === tab.id
                  ? "bg-white shadow-sm text-fuchsia-700"
                  : "text-slate-500 hover:text-slate-700",
              ].join(" ")}
            >
              {tab.label}
              {has && (
                <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active insight panel */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-700">
            {INSIGHT_TABS.find((t) => t.id === activeTab)?.label}
          </h3>
          <div className="flex gap-2">
            {currentInsight && !editMode && (
              <button
                type="button"
                onClick={() => {
                  setEditContent(
                    JSON.stringify(displayContent, null, 2),
                  );
                  setEditMode(true);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Edit
              </button>
            )}
            {editMode && (
              <>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveEdit()}
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => void generateOne(activeTab)}
              disabled={generatingType === activeTab}
              className="rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
            >
              {generatingType === activeTab ? "Generating…" : "Re-generate"}
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : !currentInsight ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500 mb-3">
                No insight generated yet for this type.
              </p>
              <button
                type="button"
                onClick={() => void generateOne(activeTab)}
                disabled={generatingType === activeTab}
                className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
              >
                {generatingType === activeTab ? "Generating…" : "Generate"}
              </button>
            </div>
          ) : editMode ? (
            <textarea
              rows={20}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="block w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 focus:border-fuchsia-400 focus:outline-none"
            />
          ) : (
            <InsightContent content={displayContent} />
          )}
          {currentInsight?.user_edited_at && (
            <p className="mt-3 text-[11px] text-slate-400">
              Operator-edited at {new Date(currentInsight.user_edited_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightContent({ content }: { content: Record<string, unknown> | null }) {
  if (!content) return null;
  return (
    <div className="space-y-4">
      {Object.entries(content).map(([key, value]) => (
        <div key={key}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
            {key.replace(/_/g, " ")}
          </p>
          <InsightValue value={value} />
        </div>
      ))}
    </div>
  );
}

function InsightValue({ value }: { value: unknown }) {
  if (value === null || value === undefined)
    return <span className="text-sm text-slate-400">—</span>;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    return <p className="text-sm text-slate-700">{String(value)}</p>;
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-2">
        {value.map((item, i) => (
          <li key={i} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {typeof item === "object" && item !== null ? (
              <ObjectGrid obj={item as Record<string, unknown>} />
            ) : (
              String(item)
            )}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return <ObjectGrid obj={value as Record<string, unknown>} />;
  }
  return <p className="text-sm text-slate-500">{JSON.stringify(value)}</p>;
}

function ObjectGrid({ obj }: { obj: Record<string, unknown> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(obj).map(([k, v]) => (
        <span key={k} className="text-xs text-slate-600">
          <strong>{k.replace(/_/g, " ")}:</strong>{" "}
          {Array.isArray(v)
            ? (v as unknown[]).join(", ")
            : String(v ?? "—")}
        </span>
      ))}
    </div>
  );
}
