/**
 * AI Unit Economics classification.
 *
 * Maps the raw 1–5 score on the `ai_unit_economics` sub-criterion
 * (under production_readiness) into one of three investor-facing labels.
 */

export type AiUnitEconomicsClass =
  | "Economically Scalable AI"
  | "Neutral"
  | "Margin Compression Risk";

export function classifyAiUnitEconomics(score: number): AiUnitEconomicsClass {
  if (!Number.isFinite(score)) return "Neutral";
  if (score >= 4) return "Economically Scalable AI";
  if (score <= 2) return "Margin Compression Risk";
  return "Neutral";
}
