// PDF report generation — template-driven
// Uses react-pdf for server-side PDF generation

import type { Engagement, ReportData, ScoreDimension } from "@/lib/types";
import { SCORING_DIMENSIONS } from "@/lib/constants";

export interface ReportGenerationInput {
  engagement: Engagement;
  reportData: ReportData;
  watermark?: "draft" | "final" | "confidential";
}

export async function generateReportPdf(
  input: ReportGenerationInput,
): Promise<Buffer> {
  // TODO: Implement with react-pdf or Puppeteer
  // This is the plumbing — actual template rendering will be added in Module 5
  throw new Error("Report PDF generation not yet implemented");
}

export function buildReportData(params: {
  engagement: Engagement;
  compositeScore: number;
  dimensionScores: Record<ScoreDimension, number>;
  keyFindings: ReportData["key_findings"];
  redFlags: ReportData["red_flags"];
  regulatoryExposure: ReportData["regulatory_exposure"];
  openValidationAreas: string[];
  documentInventory: ReportData["document_inventory"];
  convictionStatement: string;
  headlineBullets: string[];
}): ReportData {
  return {
    executive_summary: `Kaptrix conducted a ${SCORING_DIMENSIONS.length}-dimension AI product diligence assessment of ${params.engagement.target_company_name} on behalf of ${params.engagement.client_firm_name}.`,
    composite_score: params.compositeScore,
    conviction_statement: params.convictionStatement,
    headline_bullets: params.headlineBullets,
    dimension_scores: params.dimensionScores,
    key_findings: params.keyFindings,
    red_flags: params.redFlags,
    regulatory_exposure: params.regulatoryExposure,
    open_validation_areas: params.openValidationAreas,
    document_inventory: params.documentInventory,
    limitations: [
      "This assessment is based solely on documents provided by the target company.",
      "No independent technical audit, code review, or infrastructure inspection was performed.",
      "Findings reflect the state of documentation at time of review and may not reflect subsequent changes.",
    ],
    methodology_note:
      "Kaptrix AI Product Diligence employs a structured 6-dimension scoring framework combining automated pre-analysis with expert operator judgment. All scores and findings are operator-confirmed before inclusion in the deliverable.",
  };
}
