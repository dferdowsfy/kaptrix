"use client";

import { IndustryCoverageMatrix } from "@/components/documents/industry-coverage-matrix";
import { SectionHeader } from "@/components/preview/preview-shell";
import { demoDocuments } from "@/lib/demo-data";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewSnapshot } from "@/hooks/use-preview-data";

export default function PreviewCoveragePage() {
  const { selectedId } = useSelectedPreviewClient();
  const { snapshot } = usePreviewSnapshot(selectedId);
  const documents = snapshot?.documents ?? demoDocuments;

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 1"
        title="Industry-calibrated coverage matrix"
        description="Switch industries and Kaptrix pre-populates expected artifacts, highlights missing evidence, and explains confidence impacts."
      />
      <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
        <IndustryCoverageMatrix documents={documents} />
      </div>
    </div>
  );
}
