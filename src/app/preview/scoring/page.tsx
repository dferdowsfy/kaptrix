"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { SectionHeader } from "@/components/preview/preview-shell";
import { ScoringPanel } from "@/components/scoring/scoring-panel";
import {
  demoBenchmarkCases,
  demoEngagement,
  demoPatternMatches,
} from "@/lib/demo-data";
import {
  readClientKb,
  subscribeKnowledgeBase,
  KNOWLEDGE_STEP_LABELS,
  submitScoringToKnowledgeBase,
  isStageDirty,
  currentContextSlice,
  formatKnowledgeBaseEvidence,
  type KnowledgeEntry,
  type KnowledgeStep,
} from "@/lib/preview/knowledge-base";
import { deriveContextSignals } from "@/lib/scoring/context";
import { startScoreRun, useScoreRunStore } from "@/lib/scoring/score-run-store";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewSnapshot } from "@/hooks/use-preview-data";
import type { Score } from "@/lib/types";
import type { SuggestedScore } from "@/app/api/scores/suggest/route";

// ─── Local cache so returning users see prior suggestions without a reload ───
const SCORE_CACHE_PREFIX = "kaptrix.preview.scoring.v1:";
type ScoreCache = {
  scores: Score[];
  generated_at: string;
};

function readScoreCache(clientId: string | null | undefined): ScoreCache | null {
  if (!clientId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SCORE_CACHE_PREFIX + clientId);
    return raw ? (JSON.parse(raw) as ScoreCache) : null;
  } catch {
    return null;
  }
}
function writeScoreCache(clientId: string, cache: ScoreCache): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SCORE_CACHE_PREFIX + clientId, JSON.stringify(cache));
  } catch {
    /* ignore quota */
  }
}

function suggestedToScore(s: SuggestedScore, engagementId: string): Score {
  const now = new Date().toISOString();
  return {
    id: `suggest-${s.dimension}-${s.sub_criterion}`,
    engagement_id: engagementId,
    dimension: s.dimension as Score["dimension"],
    sub_criterion: s.sub_criterion,
    score_0_to_5: s.score_0_to_5,
    weight: 1,
    operator_rationale: s.rationale,
    evidence_citations: [],
    pattern_match_case_id: null,
    created_at: now,
    updated_at: now,
    updated_by: null,
  };
}

const EMPTY_KB: Partial<Record<KnowledgeStep, KnowledgeEntry>> = {};

export default function PreviewScoringPage() {
  const { selectedId } = useSelectedPreviewClient();
  const { snapshot } = usePreviewSnapshot(selectedId);
  const scoreRun = useScoreRunStore();

  const engagement = snapshot?.engagement ?? demoEngagement;
  const patternMatches = snapshot?.patternMatches ?? demoPatternMatches;
  const benchmarks = snapshot?.benchmarks ?? demoBenchmarkCases;
  const analyses = snapshot?.analyses ?? [];

  // Read cache synchronously on every client change — no flash on navigation.
  const scoreCache = useMemo(() => readScoreCache(selectedId), [selectedId]);
  // Live scores come only from the current LLM run; null until a run completes.
  const [liveScores, setLiveScores] = useState<Score[] | null>(null);
  const [liveGeneratedAt, setLiveGeneratedAt] = useState<string | null>(null);
  // Clear live state whenever the selected client changes.
  useEffect(() => {
    setLiveScores(null);
    setLiveGeneratedAt(null);
  }, [selectedId]);
  // Effective values: live run > localStorage cache.
  const suggestedScores = liveScores ?? scoreCache?.scores ?? null;
  const generatedAt = liveGeneratedAt ?? scoreCache?.generated_at ?? null;

  const kb = useSyncExternalStore(
    subscribeKnowledgeBase,
    () => readClientKb(selectedId),
    () => EMPTY_KB,
  );

  const contextSignals = deriveContextSignals(currentContextSlice(kb, "scoring"));
  const submittedSteps = (Object.keys(kb) as KnowledgeStep[]).filter((k) => kb[k]);
  const missingSteps = (
    ["intake", "coverage", "insights", "pre_analysis"] as KnowledgeStep[]
  ).filter((s) => !submittedSteps.includes(s));
  const scoringDirty = isStageDirty(kb, "scoring");
  const staleUpstream = (
    ["intake", "coverage", "insights", "pre_analysis"] as KnowledgeStep[]
  ).filter((s) => kb[s]?.stale);

  // Derive loading/error from the global store (visible across navigation).
  const isMyRun = scoreRun.clientId === selectedId;
  const loading = isMyRun && scoreRun.status === "running";
  const storeError = isMyRun && scoreRun.status === "error" ? (scoreRun.error ?? "Score generation failed.") : null;

  const run = useCallback(() => {
    if (!selectedId) return;
    const slice = currentContextSlice(kb, "scoring");
    const knowledge_base = formatKnowledgeBaseEvidence(slice).join("\n");
    if (!knowledge_base.trim()) {
      // Not enough context — handled via storeError display below.
      startScoreRun(selectedId, "");
      return;
    }
    startScoreRun(selectedId, knowledge_base);
  }, [selectedId, kb]);

  // React when the global store completes for our client.
  useEffect(() => {
    if (
      scoreRun.status === "done" &&
      scoreRun.clientId === selectedId &&
      scoreRun.scores &&
      selectedId
    ) {
      const scores = scoreRun.scores.map((s) => suggestedToScore(s, engagement.id));
      const ts = scoreRun.generated_at ?? new Date().toISOString();
      setLiveScores(scores);
      setLiveGeneratedAt(ts);
      writeScoreCache(selectedId, { scores, generated_at: ts });
      // Write to KB with stale cleared (explicit operator re-run).
      submitScoringToKnowledgeBase({
        clientId: selectedId,
        scores: scoreRun.scores,
        composite_score: null,
        context_aware_composite: null,
        decision_band: null,
        autoSync: false,
      });
    }
  }, [scoreRun.status, scoreRun.clientId, scoreRun.scores, scoreRun.generated_at, selectedId, engagement.id]);

  // (cache restore is now handled synchronously via useMemo above)

  // The scores passed to the panel: LLM suggestions if available, otherwise snapshot.
  const panelScores = suggestedScores ?? (snapshot?.scores ?? []);
  const upstreamChanged = scoringDirty.dirty && suggestedScores !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader
          eyebrow="Module 3"
          title="Scoring engine"
          description="Interactive six-dimension scoring with benchmark pattern context. Intake, coverage, insights, and pre-analysis submissions feed directly into the composite and recommendation."
        />
        <button
          type="button"
          onClick={() => void run()}
          disabled={loading}
          className="shrink-0 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Generating…" : suggestedScores ? "Re-run scoring" : "Generate scores"}
        </button>
      </div>

      {/* KB inputs + stale banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
        <p className="font-semibold text-slate-800">Knowledge base inputs</p>
        {(upstreamChanged || staleUpstream.length > 0) && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            <span className="font-semibold">Upstream context changed.</span>{" "}
            {upstreamChanged
              ? `${scoringDirty.reasons.map((r) => KNOWLEDGE_STEP_LABELS[r]).join(", ")} updated — click Re-run scoring to regenerate.`
              : `Re-submit ${staleUpstream.map((r) => KNOWLEDGE_STEP_LABELS[r]).join(", ")} to clear the stale flag.`}
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {submittedSteps.length === 0 && (
            <span className="text-slate-500">No steps submitted yet.</span>
          )}
          {submittedSteps.map((s) => {
            const stale = kb[s]?.stale === true;
            return (
              <span
                key={s}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  stale
                    ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
                    : "bg-emerald-100 text-emerald-800"
                }`}
                title={
                  stale
                    ? `Stale — invalidated by ${(kb[s]?.stale_because ?? []).map((r) => KNOWLEDGE_STEP_LABELS[r]).join(", ") || "upstream change"}`
                    : kb[s]?.summary
                }
              >
                {stale ? "⚠" : "✓"} {KNOWLEDGE_STEP_LABELS[s]}
                {stale ? " (stale)" : ""}
              </span>
            );
          })}
          {missingSteps.map((s) => (
            <span
              key={s}
              className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200"
            >
              · {KNOWLEDGE_STEP_LABELS[s]} pending
            </span>
          ))}
        </div>
      </div>

      {!suggestedScores && !(snapshot?.scores?.length) && !loading && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 py-10 text-center">
          <p className="text-sm font-medium text-slate-600">No scores generated yet.</p>
          <p className="mt-1 text-xs text-slate-400">
            Complete the Intake questionnaire, then click &ldquo;Generate scores&rdquo; above.
          </p>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Analysing knowledge base and generating scores…
          <p className="mt-2 text-xs text-slate-400">
            You can navigate to other pages — scoring continues in the background.
          </p>
        </div>
      )}

      {storeError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {storeError}
        </div>
      )}

      {generatedAt && !loading && (
        <p className="text-right text-[11px] text-slate-400">
          Scores generated {new Date(generatedAt).toLocaleString()} · LLM suggestions — adjust as needed
        </p>
      )}

      {(suggestedScores || snapshot?.scores) && !loading && (
        <ScoringPanel
          engagementId={engagement.id}
          scores={panelScores}
          patternMatches={patternMatches}
          benchmarkCases={benchmarks}
          dealStage={engagement.deal_stage}
          status={engagement.status}
          analyses={analyses}
          contextSignals={contextSignals}
          previewMode
          scoringStale={upstreamChanged}
          onForceResync={() => void run()}
          onScoresChange={(snap) => {
            if (!selectedId) return;
            submitScoringToKnowledgeBase({
              clientId: selectedId,
              scores: snap.scores,
              composite_score: snap.composite_score,
              context_aware_composite: snap.context_aware_composite,
              decision_band: snap.decision_band,
              autoSync: true,
            });
          }}
        />
      )}
    </div>
  );
}
