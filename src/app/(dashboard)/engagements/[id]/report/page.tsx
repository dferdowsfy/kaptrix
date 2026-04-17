import { createClient } from "@/lib/supabase/server";
import { ReportPreview } from "@/components/reports/report-preview";
import { ReportVersionList } from "@/components/reports/report-version-list";
import type { Report, Engagement } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: engagement }, { data: reports }] = await Promise.all([
    supabase.from("engagements").select("*").eq("id", id).single(),
    supabase
      .from("reports")
      .select("*")
      .eq("engagement_id", id)
      .order("version", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Report</h2>
          <p className="mt-1 text-sm text-gray-500">
            Generate and manage the branded diligence report.
          </p>
        </div>
        <form action="/api/reports/generate" method="POST">
          <input type="hidden" name="engagement_id" value={id} />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
          >
            Generate Report
          </button>
        </form>
      </div>

      <ReportVersionList reports={(reports as Report[]) ?? []} />

      {reports && reports.length > 0 && (
        <ReportPreview
          report={reports[0] as Report}
          engagement={engagement as Engagement}
        />
      )}
    </div>
  );
}
