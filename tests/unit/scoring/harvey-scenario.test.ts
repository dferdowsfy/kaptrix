import { buildEngineInputFromPreview } from "@/lib/scoring/engine-preview-adapter";
import { runScoringEngine, engineOutputToScores } from "@/lib/scoring/engine";
import { calculateCompositeScore } from "@/lib/scoring/calculator";
import type { IntakePayload } from "@/lib/preview/kb-format";

// Exact intake from the user's Harvey debug screenshot.
const HARVEY: IntakePayload = {
  kind: "intake",
  regulatory_exposure: ["GDPR / UK GDPR", "CCPA / CPRA", "HIPAA"],
  diligence_priorities: ["Unit economics at scale", "Vendor / model concentration"],
  red_flag_priors: ["Benchmark cherry-picking", "Competitive displacement"],
  training_data_sources: ["Unknown / undocumented"],
  artifacts_received: ["Pitch deck / investor materials"],
  customer_data_usage_rights: "ambiguous",
  alternatives_considered: ["Build in-house"],
  kill_criteria: "Output rises above margin threshold",
} as IntakePayload;

const HARVEY_NO_REG: IntakePayload = { ...HARVEY, regulatory_exposure: [] };

function score(p: IntakePayload) {
  const out = runScoringEngine(buildEngineInputFromPreview({ intake: p }));
  const scores = engineOutputToScores("harvey", out);
  return {
    composite: calculateCompositeScore(scores).composite_score,
    hash: out.inputs_hash,
  };
}

const a = score(HARVEY);
const b = score(HARVEY_NO_REG);
/* eslint-disable no-console */
console.log("\nWITH regulatory:    composite=" + a.composite.toFixed(4) + "  hash=" + a.hash.slice(0, 12));
console.log("WITHOUT regulatory: composite=" + b.composite.toFixed(4) + "  hash=" + b.hash.slice(0, 12));
console.log("Δ composite: " + (b.composite - a.composite).toFixed(4));
console.log("Both rounded to 1 decimal: " + a.composite.toFixed(1) + " vs " + b.composite.toFixed(1) + "\n");
/* eslint-enable no-console */

describe("Harvey intake parity", () => {
  it("hashes differ when regulatory_exposure is added/removed", () => {
    expect(a.hash).not.toBe(b.hash);
  });
  it("composite moves (even if 1-decimal rounded display hides it)", () => {
    expect(b.composite).toBeGreaterThan(a.composite);
  });
});
