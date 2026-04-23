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
import {
  formatUploadedDocsEvidence,
  readUploadedDocs,
  subscribeUploadedDocs,
} from "@/lib/preview/uploaded-docs";
import {
  readExtractedInsights,
  subscribeExtractedInsights,
} from "@/lib/preview/extracted-insights";
import {
  aggregateContextAdjustment,
  deriveContextSignals,
} from "@/lib/scoring/context";
import { calculateCompositeScore, deriveDecision } from "@/lib/scoring/calculator";
import { startScoreRun, useScoreRunStore } from "@/lib/scoring/score-run-store";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewSnapshot } from "@/hooks/use-preview-data";
import type { Score } from "@/lib/types";
import type { SuggestedScore } from "@/app/api/scores/suggest/route";
import { GenerateButton } from "@/components/preview/generate-button";

// ─── Local cache so returning users see prior suggestions without a reload ───
const SCORE_CACHE_PREFIX = "kaptrix.preview.scoring.v1:";
type ScoreCache = {
  scores: Score[];
  generated_at: string;
  /** Signature of the inputs that produced this cache — if these
   *  change the operator sees an "inputs changed" banner prompting
   *  a re-run so scores stay aligned with the current evidence. */
  inputs_signature?: string;
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

  // Also subscribe to uploaded docs + extracted insights so the scoring
  // prompt reflects the full operator context — not just the structured
  // KB payloads. This is the normalisation layer: every signal the
  // operator has produced (intake, coverage status, uploaded PDFs/PPTX
  // text, LLM-extracted insights) is compacted into one knowledge_base
  // string before we call the scoring LLM.
  const uploadedDocs = useSyncExternalStore(
    subscribeUploadedDocs,
    () => readUploadedDocs(selectedId),
    () => [] as readonly import("@/lib/preview/uploaded-docs").UploadedDoc[],
  );
  const extractedInsights = useSyncExternalStore(
    subscribeExtractedInsights,
    () => readExtractedInsights(selectedId),
    () => [] as import("@/components/documents/knowledge-insights-panel").KnowledgeInsight[],
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

  // Signature of the inputs that would be sent to the scoring LLM. When
  // this changes (new upload, removed file, new insight) we show an
  // "inputs changed — re-run scoring" banner so the operator knows their
  // scores no longer reflect the full evidence set.
  const currentInputsSignature = useMemo(() => {
    const docSig = uploadedDocs
      .filter((d) => d.parse_status === "parsed")
      .map((d) => d.id)
      .sort()
      .join(",");
    const insightSig = extractedInsights
      .map((i) => i.id)
      .sort()
      .join(",");
    const kbStepCount = Object.keys(kb).length;
    return `docs:${docSig}|ins:${insightSig}|kb:${kbStepCount}`;
  }, [uploadedDocs, extractedInsights, kb]);

  const inputsChanged =
    suggestedScores !== null &&
    scoreCache?.inputs_signature !== undefined &&
    scoreCache.inputs_signature !== currentInputsSignature;

  const run = useCallback(() => {
    if (!selectedId) return;
    // Compose the full scoring context: structured KB payloads +
    // uploaded document text + extracted knowledge insights. This is
    // the normalisation layer — every signal the operator has produced
    // flows into the scoring prompt.
    const slice = currentContextSlice(kb, "scoring");
    const kbLines = formatKnowledgeBaseEvidence(slice);
    // Generous budget — server-side merge with preview_uploaded_docs
    // will cap again, but we want the client-built KB to already carry
    // every parsed doc in case the server fetch fails.
    const docLines = formatUploadedDocsEvidence(selectedId, 40_000, 12_000);
    const insightLines = extractedInsights.map(
      (i) =>
        `[extracted-insight · ${i.category} · ${i.confidence}] ${i.insight} (source: ${i.source_document})`,
    );
    const parts: string[] = [];
    if (kbLines.length > 0) {
      parts.push("## Knowledge base", ...kbLines);
    }
    if (docLines.length > 0) {
      parts.push("", "## Uploaded documents", ...docLines);
    }
    if (insightLines.length > 0) {
      parts.push("", "## Extracted insights", ...insightLines);
    }
    const knowledge_base = parts.join("\n");
    // Even when the client has no KB assembled, the server will pull
    // uploaded-doc text from preview_uploaded_docs based on selectedId.
    // Kick off the run regardless; the route will 400 only if BOTH
    // client KB and server-side uploads are empty.
    startScoreRun(selectedId, knowledge_base);
  }, [selectedId, kb, extractedInsights]);

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
      const composite = calculateCompositeScore(scores);
      const contextAdjustment = aggregateContextAdjustment(contextSignals);
      const contextAwareComposite =
        Math.round(
          Math.max(
            0,
            Math.min(5, composite.composite_score + contextAdjustment.composite_delta),
          ) * 10,
        ) / 10;
      const decisionBand = deriveDecision({
        dealStage: engagement.deal_stage,
        status: engagement.status,
        scores,
        analyses,
        contextAdjustment,
      }).label;

      setLiveScores(scores);
      setLiveGeneratedAt(ts);
      writeScoreCache(selectedId, {
        scores,
        generated_at: ts,
        inputs_signature: currentInputsSignature,
      });
      // Write to KB with stale cleared (explicit operator re-run).
      submitScoringToKnowledgeBase({
        clientId: selectedId,
        scores: scoreRun.scores,
        composite_score: composite.composite_score,
        context_aware_composite: contextAwareComposite,
        decision_band: decisionBand,
        autoSync: false,
      });
    }
  }, [
    scoreRun.status,
    scoreRun.clientId,
    scoreRun.scores,
    scoreRun.generated_at,
    selectedId,
    engagement.id,
    engagement.deal_stage,
    engagement.status,
    analyses,
    contextSignals,
    currentInputsSignature,
  ]);

  // (cache restore is now handled synchronously via useMemo above)

  // The scores passed to the panel: LLM suggestions if available, otherwise snapshot.
  const panelScores = suggestedScores ?? (snapshot?.scores ?? []);
  const upstreamChanged =
    (scoringDirty.dirty && suggestedScores !== null) || inputsChanged;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader
          eyebrow="Module 3"
          title="Scoring engine"
          description="Interactive six-dimension scoring with benchmark pattern context. Intake, coverage, insights, and pre-analysis submissions feed directly into the composite and recommendation."
        />
        <GenerateButton
          type="button"
          onClick={() => void run()}
          disabled={loading}
          size="lg"
          className="shrink-0"
        >
          {loading
            ? "Generating scores…"
            : suggestedScores
              ? "Re-generate scores"
              : "Generate scores"}
        </GenerateButton>
      </div>

      {/* KB inputs + stale banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
        <p className="font-semibold text-slate-800">Knowledge base inputs</p>
        {(upstreamChanged || staleUpstream.length > 0) && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            <span className="font-semibold">Upstream context changed.</span>{" "}
            {inputsChanged
              ? "New evidence (uploaded documents or extracted insights) has been added since scores were generated — click Re-generate scores to incorporate it."
              : upstreamChanged
                ? `${scoringDirty.reasons.map((r) => KNOWLEDGE_STEP_LABELS[r]).join(", ")} updated — click Re-generate scores to rebuild from the latest evidence.`
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
