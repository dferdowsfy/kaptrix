import { createClient } from "@/lib/supabase/server";
import { ScoringPanel } from "@/components/scoring/scoring-panel";
import { ScoreOverview } from "@/components/scoring/score-overview";
import { calculateCompositeScore } from "@/lib/scoring/calculator";
import { calculateCommercialPainConfidence } from "@/lib/scoring/commercial-pain";
import { intakeAnswersToCommercialPainInputs } from "@/lib/scoring/intake-to-commercial-pain";
import type { Score, BenchmarkCase, PatternMatch } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ScoringPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Resolve the authed user up-front so we can fetch their intake
  // answers (per-user row in user_workspace_state). Commercial pain
  // answers are user-scoped today, mirroring the existing intake model.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: scores },
    { data: patternMatches },
    { data: benchmarks },
    { data: evidenceConfidence },
    intakeAnswersRow,
  ] = await Promise.all([
    supabase.from("scores").select("*").eq("engagement_id", id).order("dimension"),
    supabase
      .from("pattern_matches")
      .select("*")
      .eq("engagement_id", id)
      .order("similarity_score", { ascending: false }),
    supabase.from("benchmark_cases").select("*").order("case_anchor_id"),
    supabase
      .from("evidence_confidence")
      .select("composite")
      .eq("engagement_id", id)
      .maybeSingle(),
    user
      ? supabase
          .from("user_workspace_state")
          .select("state")
          .eq("user_id", user.id)
          .eq("engagement_id", id)
          .eq("kind", "intake_answers")
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const scoresList = (scores as Score[]) ?? [];

  // The AI Diligence Score composite for the overview header. Calculator
  // returns a neutral 2.5 for empty scores; treat that as "not scored yet"
  // so the card shows the empty state instead of a misleading midpoint.
  const aiDiligenceComposite =
    scoresList.length > 0 ? calculateCompositeScore(scoresList).composite_score : null;

  // Commercial Pain Confidence — read the intake answers, map display
  // labels to scoring enums, and let the scoring service handle the
  // "no answers yet" → null path. This is the same scoring engine the
  // preview page uses; both surfaces stay in sync.
  const intakeAnswers =
    (intakeAnswersRow.data as { state: Record<string, unknown> } | null)?.state ?? null;
  const commercialPain = calculateCommercialPainConfidence(
    intakeAnswersToCommercialPainInputs(
      intakeAnswers as Parameters<typeof intakeAnswersToCommercialPainInputs>[0],
    ),
  );

  const evidenceCoverageConfidence =
    (evidenceConfidence as { composite: number } | null)?.composite ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Scoring</h2>
        <p className="mt-1 text-sm text-gray-500">
          Score all six dimensions with operator rationale. All sub-criteria
          require a minimum 2-sentence rationale.
        </p>
      </div>

      <ScoreOverview
        commercialPain={commercialPain}
        aiDiligenceComposite={aiDiligenceComposite}
        evidenceCoverageConfidence={evidenceCoverageConfidence}
      />

      <ScoringPanel
        engagementId={id}
        scores={scoresList}
        patternMatches={(patternMatches as PatternMatch[]) ?? []}
        benchmarkCases={(benchmarks as BenchmarkCase[]) ?? []}
      />
    </div>
  );
}
