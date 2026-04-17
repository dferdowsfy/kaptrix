import { PreAnalysisDashboard } from "@/components/pre-analysis/pre-analysis-dashboard";
import { SectionHeader } from "@/components/preview/preview-shell";
import { demoAnalyses, demoEngagement } from "@/lib/demo-data";

export default function PreviewAnalysisPage() {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 2"
        title="AI-assisted pre-analysis"
        description="Per-document extraction and synthesis for claims, contradictions, red flags, and operator follow-up questions."
      />
      <PreAnalysisDashboard analyses={demoAnalyses} engagementId={demoEngagement.id} />
    </div>
  );
}
