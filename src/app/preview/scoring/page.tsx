import { SectionHeader } from "@/components/preview/preview-shell";
import { ScoringPanel } from "@/components/scoring/scoring-panel";
import {
  demoBenchmarkCases,
  demoEngagement,
  demoPatternMatches,
  demoScores,
} from "@/lib/demo-data";

export default function PreviewScoringPage() {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 3"
        title="Scoring engine"
        description="Interactive six-dimension scoring with benchmark pattern context. In preview mode, edits remain local."
      />
      <ScoringPanel
        engagementId={demoEngagement.id}
        scores={demoScores}
        patternMatches={demoPatternMatches}
        benchmarkCases={demoBenchmarkCases}
        previewMode
      />
    </div>
  );
}
