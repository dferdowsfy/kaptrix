"use client";

import { SectionHeader } from "@/components/preview/preview-shell";
import { ScoringPanel } from "@/components/scoring/scoring-panel";
import {
  demoBenchmarkCases,
  demoEngagement,
  demoPatternMatches,
  demoScores,
} from "@/lib/demo-data";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewSnapshot } from "@/hooks/use-preview-data";

export default function PreviewScoringPage() {
  const { selectedId } = useSelectedPreviewClient();
  const { snapshot } = usePreviewSnapshot(selectedId);

  const engagement = snapshot?.engagement ?? demoEngagement;
  const scores = snapshot?.scores ?? demoScores;
  const patternMatches = snapshot?.patternMatches ?? demoPatternMatches;
  const benchmarks = snapshot?.benchmarks ?? demoBenchmarkCases;
  const analyses = snapshot?.analyses ?? [];

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 3"
        title="Scoring engine"
        description="Interactive six-dimension scoring with benchmark pattern context. In preview mode, edits remain local."
      />
      <ScoringPanel
        engagementId={engagement.id}
        scores={scores}
        patternMatches={patternMatches}
        benchmarkCases={benchmarks}
        dealStage={engagement.deal_stage}
        status={engagement.status}
        analyses={analyses}
        previewMode
      />
    </div>
  );
}
