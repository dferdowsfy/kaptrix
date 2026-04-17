import { IndustryCoverageMatrix } from "@/components/documents/industry-coverage-matrix";
import { SectionHeader } from "@/components/preview/preview-shell";
import { demoDocuments } from "@/lib/demo-data";

export default function PreviewCoveragePage() {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 1"
        title="Industry-calibrated coverage matrix"
        description="Switch industries and Kaptrix pre-populates expected artifacts, highlights missing evidence, and explains confidence impacts."
      />
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <IndustryCoverageMatrix documents={demoDocuments} />
      </div>
    </div>
  );
}
