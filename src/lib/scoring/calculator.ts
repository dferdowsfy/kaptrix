import { SCORING_DIMENSIONS } from "@/lib/constants";
import type { Score, ScoreDimension } from "@/lib/types";

export interface CompositeResult {
  composite_score: number;
  dimension_scores: Record<ScoreDimension, number>;
  dimension_details: {
    dimension: ScoreDimension;
    name: string;
    weight: number;
    average_score: number;
    sub_scores: { sub_criterion: string; score: number }[];
  }[];
}

export function calculateCompositeScore(scores: Score[]): CompositeResult {
  const dimensionDetails = SCORING_DIMENSIONS.map((dim) => {
    const dimScores = scores.filter((s) => s.dimension === dim.key);
    const average =
      dimScores.length > 0
        ? dimScores.reduce((sum, s) => sum + s.score_0_to_5, 0) / dimScores.length
        : 0;

    return {
      dimension: dim.key,
      name: dim.name,
      weight: dim.weight,
      average_score: Math.round(average * 10) / 10,
      sub_scores: dimScores.map((s) => ({
        sub_criterion: s.sub_criterion,
        score: s.score_0_to_5,
      })),
    };
  });

  const dimension_scores = Object.fromEntries(
    dimensionDetails.map((d) => [d.dimension, d.average_score]),
  ) as Record<ScoreDimension, number>;

  const composite_score =
    Math.round(
      dimensionDetails.reduce((sum, d) => sum + d.average_score * d.weight, 0) * 10,
    ) / 10;

  return {
    composite_score,
    dimension_scores,
    dimension_details: dimensionDetails,
  };
}

export function isFullyScored(scores: Score[]): boolean {
  return SCORING_DIMENSIONS.every((dim) =>
    dim.sub_criteria.every((sub) =>
      scores.some(
        (s) =>
          s.dimension === dim.key &&
          s.sub_criterion === sub.key &&
          s.operator_rationale.length >= 20,
      ),
    ),
  );
}
