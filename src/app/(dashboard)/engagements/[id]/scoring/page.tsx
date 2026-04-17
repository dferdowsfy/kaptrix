import { createClient } from "@/lib/supabase/server";
import { ScoringPanel } from "@/components/scoring/scoring-panel";
import type { Score, BenchmarkCase, PatternMatch } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ScoringPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: scores }, { data: patternMatches }, { data: benchmarks }] =
    await Promise.all([
      supabase
        .from("scores")
        .select("*")
        .eq("engagement_id", id)
        .order("dimension"),
      supabase
        .from("pattern_matches")
        .select("*")
        .eq("engagement_id", id)
        .order("similarity_score", { ascending: false }),
      supabase.from("benchmark_cases").select("*").order("case_anchor_id"),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Scoring</h2>
        <p className="mt-1 text-sm text-gray-500">
          Score all six dimensions with operator rationale. All sub-criteria
          require a minimum 2-sentence rationale.
        </p>
      </div>

      <ScoringPanel
        engagementId={id}
        scores={(scores as Score[]) ?? []}
        patternMatches={(patternMatches as PatternMatch[]) ?? []}
        benchmarkCases={(benchmarks as BenchmarkCase[]) ?? []}
      />
    </div>
  );
}
