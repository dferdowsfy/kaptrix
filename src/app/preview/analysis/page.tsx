import { PreAnalysisDashboard } from "@/components/pre-analysis/pre-analysis-dashboard";
import { DocumentsPanel } from "@/components/pre-analysis/documents-panel";
import { SectionHeader } from "@/components/preview/preview-shell";
import { demoAnalyses, demoDocuments, demoEngagement } from "@/lib/demo-data";

export default function PreviewAnalysisPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Module 2"
        title="AI-assisted pre-analysis"
        description="Per-document extraction and synthesis for claims, contradictions, red flags, and operator follow-up questions. Add more evidence below — every file becomes context for downstream reasoning."
      />
      <DocumentsPanel baseDocs={demoDocuments} />
      <PreAnalysisDashboard analyses={demoAnalyses} engagementId={demoEngagement.id} />
    </div>
  );
}
