"use client";

import { SectionHeader } from "@/components/preview/preview-shell";
import {
  KnowledgeInsightsPanel,
  type KnowledgeInsight,
} from "@/components/documents/knowledge-insights-panel";
import { demoDocuments, demoKnowledgeInsights } from "@/lib/demo-data";
import {
  PREVIEW_INTAKE_STORAGE_KEY,
  mergeInsightIntoAnswers,
  type PreviewAnswers,
} from "@/lib/preview-intake";

export default function PreviewInsightsPage() {
  const handleInsertToIntake = (insight: KnowledgeInsight) => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(PREVIEW_INTAKE_STORAGE_KEY);
    let answers: PreviewAnswers = {};

    if (raw) {
      try {
        answers = JSON.parse(raw) as PreviewAnswers;
      } catch {
        answers = {};
      }
    }

    const next = mergeInsightIntoAnswers(answers, insight);
    window.localStorage.setItem(PREVIEW_INTAKE_STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 1"
        title="Document intelligence"
        description="Ask evidence-backed questions and promote relevant insights into the intake model to continuously enrich contextual understanding."
      />
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <KnowledgeInsightsPanel
          documents={demoDocuments}
          insights={demoKnowledgeInsights}
          onInsertToIntake={handleInsertToIntake}
        />
      </div>
    </div>
  );
}
