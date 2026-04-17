import { SectionHeader } from "@/components/preview/preview-shell";
import { ExecutiveReport } from "@/components/reports/executive-report";
import { demoExecutiveReport } from "@/lib/demo-data";

export default function PreviewReportPage() {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 5"
        title="Executive report"
        description="Structured, consulting-style output with clear headings, argument flow, and evidence-grounded recommendations."
      />
      <ExecutiveReport data={demoExecutiveReport} />
    </div>
  );
}
