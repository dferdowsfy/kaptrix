"use client";

import { useSyncExternalStore } from "react";
import { SectionHeader } from "@/components/preview/preview-shell";
import { ScoringPanel } from "@/components/scoring/scoring-panel";
import {
  demoBenchmarkCases,
  demoEngagement,
  demoPatternMatches,
  demoScores,
} from "@/lib/demo-data";
import {
  readClientKb,
  subscribeKnowledgeBase,
  KNOWLEDGE_STEP_LABELS,
  submitScoringToKnowledgeBase,
  type KnowledgeEntry,
  type KnowledgeStep,
} from "@/lib/preview/knowledge-base";
import { deriveContextSignals } from "@/lib/scoring/context";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewSnapshot } from "@/hooks/use-preview-data";

const EMPTY_KB: Partial<Record<KnowledgeStep, KnowledgeEntry>> = {};

export default function PreviewScoringPage() {
  const { selectedId } = useSelectedPreviewClient();
  const { snapshot } = usePreviewSnapshot(selectedId);

  const engagement = snapshot?.engagement ?? demoEngagement;
  const scores = snapshot?.scores ?? demoScores;
  const patternMatches = snapshot?.patternMatches ?? demoPatternMatches;
  const benchmarks = snapshot?.benchmarks ?? demoBenchmarkCases;
  const analyses = snapshot?.analyses ?? [];

  const kb = useSyncExternalStore(
    subscribeKnowledgeBase,
    () => readClientKb(selectedId),
    () => EMPTY_KB,
  );
  const contextSignals = deriveContextSignals(kb);
  const submittedSteps = (Object.keys(kb) as KnowledgeStep[]).filter(
    (k) => kb[k],
  );
  const missingSteps = (
    ["intake", "coverage", "insights", "pre_analysis"] as KnowledgeStep[]
  ).filter((s) => !submittedSteps.includes(s));

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 3"
        title="Scoring engine"
        description="Interactive six-dimension scoring with benchmark pattern context. Intake, coverage, insights, and pre-analysis submissions feed directly into the composite and recommendation."
      />
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
        <p className="font-semibold text-slate-800">Knowledge base inputs</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {submittedSteps.length === 0 && (
            <span className="text-slate-500">
              No steps submitted yet — the recommendation is based on operator
              scores alone.
            </span>
          )}
          {submittedSteps.map((s) => (
            <span
              key={s}
              className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800"
              title={kb[s]?.summary}
            >
              ✓ {KNOWLEDGE_STEP_LABELS[s]}
            </span>
          ))}
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
      <ScoringPanel
        engagementId={engagement.id}
        scores={scores}
        patternMatches={patternMatches}
        benchmarkCases={benchmarks}
        dealStage={engagement.deal_stage}
        status={engagement.status}
        analyses={analyses}
        contextSignals={contextSignals}
        previewMode
        onScoresChange={(snap) => {
          if (!selectedId) return;
          submitScoringToKnowledgeBase({
            clientId: selectedId,
            scores: snap.scores,
            composite_score: snap.composite_score,
            context_aware_composite: snap.context_aware_composite,
            decision_band: snap.decision_band,
          });
        }}
      />
    </div>
  );
}
