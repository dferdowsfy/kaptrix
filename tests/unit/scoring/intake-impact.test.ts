/**
 * Intake → Engine → Composite pipeline test.
 *
 * Proves the deterministic pipeline is wired and responsive: editing
 * intake actually moves the composite, and re-running the same input
 * yields byte-identical scores.
 */

import {
  buildEngineInputFromPreview,
} from "@/lib/scoring/engine-preview-adapter";
import { runScoringEngine, engineOutputToScores } from "@/lib/scoring/engine";
import {
  calculateCompositeScore,
  deriveDecision,
} from "@/lib/scoring/calculator";
import type { IntakePayload } from "@/lib/preview/kb-format";

const ENGAGEMENT_ID = "harvey-test";

const EMPTY_INTAKE: IntakePayload = { kind: "intake" } as IntakePayload;

const NEGATIVE_INTAKE: IntakePayload = {
  kind: "intake",
  regulatory_exposure: ["GDPR / UK GDPR", "CCPA / CPRA", "HIPAA"],
  training_data_sources: ["public web scraping", "licensed corpora"],
  customer_data_usage_rights: "ambiguous",
  lock_in_tolerance: "must avoid all lock-in",
  data_readiness: "no central data platform — siloed",
  business_continuity_requirement: "minutes",
  kill_criteria: "",
  alternatives_considered: [],
  red_flag_priors: [
    "model hallucinations in legal answers",
    "vendor concentration",
  ],
} as IntakePayload;

const POSITIVE_INTAKE: IntakePayload = {
  kind: "intake",
  regulatory_exposure: ["none"],
  training_data_sources: ["licensed corpora", "first-party customer data"],
  customer_data_usage_rights: "per-tenant isolation; explicit opt-in",
  lock_in_tolerance: "comfortable with managed services",
  data_readiness: "central data platform in place",
  business_continuity_requirement: "hours",
  artifacts_received: [
    "SOC 2 / ISO 27001",
    "Model / AI system documentation",
    "Benchmarks / evaluations",
  ],
  kill_criteria: "Margin <30%, eval pass <85%, churn >2% MoM",
  alternatives_considered: ["build in-house", "Harvey", "CoCounsel"],
} as IntakePayload;

// Synthetic uploaded docs — present in the POSITIVE scenario only.
// The engine's `docArtifacts` requires `parse_status === "parsed"` to
// emit `supports_high` evidence. Each category maps to multiple
// sub-criteria via CATEGORY_TO_SUBS in engine-preview-adapter.
const POSITIVE_UPLOADED_DOCS = [
  {
    id: "doc-soc2",
    engagement_id: "harvey-test",
    filename: "SOC2_Type_II.pdf",
    mime_type: "application/pdf",
    size_bytes: 1,
    category: "security",
    parse_status: "parsed" as const,
    parsed_text: "SOC 2 Type II report",
    extracted_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "doc-arch",
    engagement_id: "harvey-test",
    filename: "Architecture.pdf",
    mime_type: "application/pdf",
    size_bytes: 1,
    category: "architecture",
    parse_status: "parsed" as const,
    parsed_text: "System architecture diagram",
    extracted_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "doc-model",
    engagement_id: "harvey-test",
    filename: "Model_Card.pdf",
    mime_type: "application/pdf",
    size_bytes: 1,
    category: "model_ai",
    parse_status: "parsed" as const,
    parsed_text: "Model card and eval results",
    extracted_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "doc-incident",
    engagement_id: "harvey-test",
    filename: "Incident_Log.pdf",
    mime_type: "application/pdf",
    size_bytes: 1,
    category: "incident_log",
    parse_status: "parsed" as const,
    parsed_text: "Incident log",
    extracted_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "doc-team",
    engagement_id: "harvey-test",
    filename: "Team_Bios.pdf",
    mime_type: "application/pdf",
    size_bytes: 1,
    category: "team_bios",
    parse_status: "parsed" as const,
    parsed_text: "Team bios",
    extracted_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "doc-data",
    engagement_id: "harvey-test",
    filename: "Data_Privacy.pdf",
    mime_type: "application/pdf",
    size_bytes: 1,
    category: "data_privacy",
    parse_status: "parsed" as const,
    parsed_text: "Data privacy assessment",
    extracted_at: "2026-01-01T00:00:00Z",
  },
];

function score(
  intake: IntakePayload,
  uploadedDocs: typeof POSITIVE_UPLOADED_DOCS = [],
) {
  const engineInput = buildEngineInputFromPreview({ intake, uploadedDocs });
  const engineOut = runScoringEngine(engineInput);
  const scores = engineOutputToScores(ENGAGEMENT_ID, engineOut);
  const composite = calculateCompositeScore(scores);
  const decision = deriveDecision({
    dealStage: "preliminary",
    status: "active",
    scores,
    analyses: [],
  });
  return {
    composite: composite.composite_score,
    dimension_scores: composite.dimension_scores,
    inputs_hash: engineOut.inputs_hash,
    decision: decision.label,
  };
}

describe("intake → engine pipeline", () => {
  it("prints all three scenarios side by side", () => {
    const a = score(EMPTY_INTAKE);
    const b = score(NEGATIVE_INTAKE);
    const c = score(POSITIVE_INTAKE, POSITIVE_UPLOADED_DOCS);
    /* eslint-disable no-console */
    console.log("\n┌──────────────────────────────────────────────────────────");
    console.log("│  Intake → Engine → Composite (Harvey synthetic engagement)");
    console.log("└──────────────────────────────────────────────────────────");
    console.log("                                COMPOSITE   DECISION");
    console.log("                                ---------   ---------");
    console.log(
      `  EMPTY intake (no answers)       ${a.composite.toFixed(2).padStart(5)}      ${a.decision}`,
    );
    console.log(
      `  NEGATIVE intake (high red)      ${b.composite.toFixed(2).padStart(5)}      ${b.decision}`,
    );
    console.log(
      `  POSITIVE intake (artifacts)     ${c.composite.toFixed(2).padStart(5)}      ${c.decision}`,
    );
    console.log(
      `\n  Δ negative→positive: +${(c.composite - b.composite).toFixed(2)}\n`,
    );
    console.log("  Per-dimension breakdown (negative vs positive):");
    for (const dim of Object.keys(b.dimension_scores)) {
      const bv = b.dimension_scores[dim as keyof typeof b.dimension_scores];
      const cv = c.dimension_scores[dim as keyof typeof c.dimension_scores];
      console.log(
        `    ${dim.padEnd(22)} ${bv.toFixed(2)}  →  ${cv.toFixed(2)}   (Δ ${cv > bv ? "+" : ""}${(cv - bv).toFixed(2)})`,
      );
    }
    console.log(
      `\n  Inputs hash (proves engine sees different inputs):`,
    );
    console.log(`    NEGATIVE  ${b.inputs_hash}`);
    console.log(`    POSITIVE  ${c.inputs_hash}`);
    console.log("");
    /* eslint-enable no-console */
  });

  it("positive intake (with artifacts) outscores negative intake", () => {
    const b = score(NEGATIVE_INTAKE);
    const c = score(POSITIVE_INTAKE, POSITIVE_UPLOADED_DOCS);
    expect(c.composite).toBeGreaterThan(b.composite);
  });

  it("negative and positive scenarios produce DIFFERENT hashes", () => {
    const b = score(NEGATIVE_INTAKE);
    const c = score(POSITIVE_INTAKE, POSITIVE_UPLOADED_DOCS);
    expect(b.inputs_hash).not.toBe(c.inputs_hash);
  });

  it("re-running the same intake produces byte-identical hash + composite", () => {
    const r1 = score(NEGATIVE_INTAKE);
    const r2 = score(NEGATIVE_INTAKE);
    expect(r2.inputs_hash).toBe(r1.inputs_hash);
    expect(r2.composite).toBe(r1.composite);
    expect(r2.dimension_scores).toEqual(r1.dimension_scores);
  });
});
