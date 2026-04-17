import type { KnowledgeInsight } from "@/components/documents/knowledge-insights-panel";

export const PREVIEW_INTAKE_STORAGE_KEY = "kaptrix.preview.intake.answers";

export type PreviewAnswers = Record<string, string | number | string[]>;

export function mapInsightToIntakeField(insight: KnowledgeInsight): string | null {
  if (!insight.suggested_intake_field) return null;

  const idByField: Record<string, string> = {
    "Red flag priors": "red_flag_priors",
    "Primary AI architecture": "primary_architecture",
    "Regulatory exposure": "regulatory_exposure",
    "Known vendor or model dependencies": "known_vendors",
    "Diligence priorities": "diligence_priorities",
  };

  return idByField[insight.suggested_intake_field] ?? null;
}

export function mergeInsightIntoAnswers(
  prev: PreviewAnswers,
  insight: KnowledgeInsight,
): PreviewAnswers {
  const targetId = mapInsightToIntakeField(insight);
  if (!targetId || !insight.suggested_intake_value) return prev;

  const next = { ...prev };
  const existing = next[targetId];

  if (["red_flag_priors", "regulatory_exposure", "diligence_priorities"].includes(targetId)) {
    const values = Array.isArray(existing) ? existing : [];
    if (!values.includes(insight.suggested_intake_value)) {
      next[targetId] = [...values, insight.suggested_intake_value];
    }
    return next;
  }

  next[targetId] = insight.suggested_intake_value;
  return next;
}
