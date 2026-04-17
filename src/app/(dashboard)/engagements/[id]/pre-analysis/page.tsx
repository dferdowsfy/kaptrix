import { createClient } from "@/lib/supabase/server";
import { PreAnalysisDashboard } from "@/components/pre-analysis/pre-analysis-dashboard";
import type { PreAnalysis } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PreAnalysisPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: analyses } = await supabase
    .from("pre_analyses")
    .select("*")
    .eq("engagement_id", id)
    .order("run_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pre-Analysis</h2>
          <p className="mt-1 text-sm text-gray-500">
            AI-assisted pre-analysis results. For operator review only — never
            client-visible.
          </p>
        </div>
        <form action={`/api/pre-analysis`} method="POST">
          <input type="hidden" name="engagement_id" value={id} />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
          >
            Run Pre-Analysis
          </button>
        </form>
      </div>

      <PreAnalysisDashboard
        analyses={(analyses as PreAnalysis[]) ?? []}
        engagementId={id}
      />
    </div>
  );
}
