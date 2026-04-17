import { createClient } from "@/lib/supabase/server";
import type { BenchmarkCase } from "@/lib/types";

export default async function BenchmarksPage() {
  const supabase = await createClient();
  const { data: cases } = await supabase
    .from("benchmark_cases")
    .select("*")
    .order("case_anchor_id");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Benchmark Library
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Case anchors and benchmark data from past engagements. Grows with
          every completed diligence.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(cases as BenchmarkCase[])?.map((c) => (
          <div
            key={c.id}
            className="rounded-lg border bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-gray-900">
                {c.case_anchor_id}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {c.composite_score?.toFixed(1)} / 5.0
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-800">
              {c.vertical.replace(/_/g, " ")}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {c.deal_size_band.replace(/_/g, " ")} &middot;{" "}
              {c.ai_architecture_type.replace(/_/g, " ")}
            </p>
            <p className="mt-3 text-xs text-gray-600 line-clamp-3">
              {c.war_story_summary}
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {c.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
