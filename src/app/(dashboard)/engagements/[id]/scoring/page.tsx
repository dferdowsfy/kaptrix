import { createClient } from "@/lib/supabase/server";
import { ScoringPanel } from "@/components/scoring/scoring-panel";
import { ScoreOverview } from "@/components/scoring/score-overview";
import { DecisionSnapshotHero } from "@/components/scoring/decision-snapshot-hero";
import { WhatMattersMost } from "@/components/scoring/what-matters-most";
import {
  calculateCompositeScore,
  deriveDecision,
} from "@/lib/scoring/calculator";
import {
  calculateCommercialPainConfidence,
  interpretCommercialPainAndDiligence,
} from "@/lib/scoring/commercial-pain";
import { intakeAnswersToCommercialPainInputs } from "@/lib/scoring/intake-to-commercial-pain";
import type {
  Score,
  BenchmarkCase,
  PatternMatch,
  PreAnalysis,
} from "@/lib/types";

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
    { data: engagement },
    { data: analysesData },
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
      .from("engagements")
      .select("deal_stage, status")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("pre_analyses").select("*").eq("engagement_id", id),
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
  const analyses = (analysesData as PreAnalysis[]) ?? [];

  // Composite + per-dimension details. Calculator returns a neutral 2.5
  // for empty scores; treat that as "not scored yet" so the card shows
  // the empty state instead of a misleading midpoint.
  const compositeResult =
    scoresList.length > 0 ? calculateCompositeScore(scoresList) : null;
  const aiDiligenceComposite = compositeResult?.composite_score ?? null;

  const intakeAnswers =
    (intakeAnswersRow.data as { state: Record<string, unknown> } | null)?.state ?? null;
  const commercialPain = calculateCommercialPainConfidence(
    intakeAnswersToCommercialPainInputs(
      intakeAnswers as Parameters<typeof intakeAnswersToCommercialPainInputs>[0],
    ),
  );

  // Decision + interpretation for the hero card. Same calculator the
  // ScoringPanel uses internally — single source of truth.
  const decision =
    scoresList.length > 0 && engagement
      ? deriveDecision({
          dealStage: (engagement as { deal_stage: string }).deal_stage as Parameters<
            typeof deriveDecision
          >[0]["dealStage"],
          status: (engagement as { status: string }).status as Parameters<
            typeof deriveDecision
          >[0]["status"],
          scores: scoresList,
          analyses,
          priorComposite: null,
          contextAdjustment: null,
        })
      : null;
  const interpretation = interpretCommercialPainAndDiligence(
    commercialPain,
    aiDiligenceComposite,
  );

  // Top strengths / risks from real dimension scores only. Empty when
  // nothing in the right band — the WhatMattersMost component renders
  // a clean fallback.
  const dims = compositeResult?.dimension_details ?? [];
  const sorted = [...dims].sort((a, b) => b.average_score - a.average_score);
  const topStrengths = sorted
    .filter((d) => d.average_score >= 4)
    .slice(0, 3)
    .map((d) => `${d.name} — ${d.average_score.toFixed(1)} / 5`);
  const topRisks = sorted
    .filter((d) => d.average_score < 3.5)
    .slice(-3)
    .reverse()
    .map((d) => `${d.name} — ${d.average_score.toFixed(1)} / 5`);

  const missingEvidence: string[] = [];
  if (commercialPain && commercialPain.missing_factors.length > 0) {
    missingEvidence.push(
      `Commercial pain factors missing: ${commercialPain.missing_factors.length}`,
    );
  }
  if (aiDiligenceComposite == null) {
    missingEvidence.push("Read Confidence not yet computed");
  }

  const recommendationConditions = (decision?.rationale ?? []).slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Scoring</h2>
        <p className="mt-1 text-sm text-gray-500">
          Score all six dimensions with operator rationale. All sub-criteria
          require a minimum 2-sentence rationale.
        </p>
      </div>

      {decision && (
        <DecisionSnapshotHero
          decision={decision}
          interpretation={interpretation}
          commercialPainBand={commercialPain?.band ?? null}
          aiDiligenceComposite={aiDiligenceComposite}
        />
      )}

      <ScoreOverview
        commercialPain={commercialPain}
        aiDiligenceComposite={aiDiligenceComposite}
        hideInterpretationBanner={decision != null}
      />

      {decision && (
        <WhatMattersMost
          topStrengths={topStrengths}
          topRisks={topRisks}
          missingEvidence={missingEvidence}
          recommendationConditions={recommendationConditions}
        />
      )}

      <ScoringPanel
        engagementId={id}
        scores={scoresList}
        patternMatches={(patternMatches as PatternMatch[]) ?? []}
        benchmarkCases={(benchmarks as BenchmarkCase[]) ?? []}
      />
    </div>
  );
}
