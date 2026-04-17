"use client";

import { PreAnalysisDashboard } from "@/components/pre-analysis/pre-analysis-dashboard";
import { DocumentsPanel } from "@/components/pre-analysis/documents-panel";
import { SectionHeader } from "@/components/preview/preview-shell";
import { demoAnalyses, demoDocuments, demoEngagement } from "@/lib/demo-data";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewSnapshot } from "@/hooks/use-preview-data";

export default function PreviewAnalysisPage() {
  const { selectedId } = useSelectedPreviewClient();
  const { snapshot } = usePreviewSnapshot(selectedId);
  const documents = snapshot?.documents ?? demoDocuments;
  const analyses = snapshot?.analyses ?? demoAnalyses;
  const engagementId = snapshot?.engagement.id ?? demoEngagement.id;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Module 2"
        title="AI-assisted pre-analysis"
        description="Per-document extraction and synthesis for claims, contradictions, red flags, and operator follow-up questions. Add more evidence below — every file becomes context for downstream reasoning."
      />
      <DocumentsPanel baseDocs={documents} />
      <PreAnalysisDashboard analyses={analyses} engagementId={engagementId} />
    </div>
  );
}
