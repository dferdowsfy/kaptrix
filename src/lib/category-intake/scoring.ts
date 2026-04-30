/**
 * Category Diligence Confidence — deterministic scoring (0–100).
 *
 * Same shape as Commercial Pain Confidence: a fixed weighted sum over
 * categorical answers. No LLM is consulted to assign the numeric value;
 * the raw display labels from the intake form map through fixed enums.
 *
 * Same answers → same score. Returns null when no answers are present
 * so legacy / fresh engagements show "Not yet completed" instead of a
 * misleading 0.
 *
 * The eight weighted factors:
 *   - Market growth                      18%
 *   - AI necessity                       16%
 *   - Problem severity                   14%
 *   - Demand signal strength             12%
 *   - Outcome proof tier                 10%
 *   - Defensibility (moats present)      10%
 *   - Buying urgency                      8%
 *   - Regulatory clarity                  6%
 *   - Unit-economics outlook              6%
 *
 * Sums to 100%. All factor scores are 0–5; the final score is the
 * weighted sum scaled to 0–100 (raw * 20 * weight).
 */

export type CategoryDiligenceBand = "strong" | "moderate" | "weak" | "not_validated";

export interface CategoryDiligenceFactorBreakdown {
  raw: number; // 0–5
  weighted: number; // contribution to the 0–100 total
  label: string;
}

export type CategoryDiligenceFactor =
  | "market_growth"
  | "ai_necessity"
  | "problem_severity"
  | "demand_signal"
  | "outcome_proof"
  | "defensibility"
  | "buying_urgency"
  | "regulatory_clarity"
  | "unit_economics";

export interface CategoryDiligenceResult {
  score: number; // 0–100, integer
  band: CategoryDiligenceBand;
  band_label: "Strong" | "Moderate" | "Weak" | "Not Validated";
  breakdown: Record<CategoryDiligenceFactor, CategoryDiligenceFactorBreakdown>;
  top_drivers: { factor: CategoryDiligenceFactor; label: string; weighted: number }[];
  missing_factors: CategoryDiligenceFactor[];
}

const WEIGHTS: Record<CategoryDiligenceFactor, number> = {
  market_growth: 0.18,
  ai_necessity: 0.16,
  problem_severity: 0.14,
  demand_signal: 0.12,
  outcome_proof: 0.10,
  defensibility: 0.10,
  buying_urgency: 0.08,
  regulatory_clarity: 0.06,
  unit_economics: 0.06,
};

const FACTOR_LABEL: Record<CategoryDiligenceFactor, string> = {
  market_growth: "Market growth",
  ai_necessity: "AI necessity",
  problem_severity: "Problem severity",
  demand_signal: "Demand signal strength",
  outcome_proof: "Outcome proof",
  defensibility: "Defensibility",
  buying_urgency: "Buying urgency",
  regulatory_clarity: "Regulatory clarity",
  unit_economics: "Unit-economics outlook",
};

const GROWTH_MAP: Record<string, number> = {
  "Hyper-growth (>50% YoY)": 5,
  "High growth (25–50% YoY)": 4,
  "Moderate growth (10–25% YoY)": 3,
  "Slow growth (<10% YoY)": 1,
  "Flat or declining": 0,
  Unknown: 0,
};

const AI_NECESSITY_MAP: Record<string, number> = {
  "Yes — AI is the only viable path": 5,
  "Mostly — non-AI alternatives are weaker but viable": 4,
  "Partially — AI is one of several routes": 3,
  "Weakly — non-AI alternatives are competitive": 2,
  "No — AI is not required": 0,
  Unknown: 0,
};

const SEVERITY_MAP: Record<string, number> = {
  "Mission-critical": 5,
  High: 4,
  Moderate: 3,
  Low: 1,
  Unclear: 0,
};

const OUTCOME_PROOF_MAP: Record<string, number> = {
  "Proven with customer data": 5,
  "Proven with case studies": 4,
  "Partially supported by usage metrics": 3,
  "Supported by testimonials only": 2,
  "Claimed by management only": 1,
  "Not proven": 0,
  Unknown: 0,
};

const URGENCY_MAP: Record<string, number> = {
  Immediate: 5,
  "Near-term": 4,
  "Medium-term": 3,
  "Long-term": 2,
  "No clear urgency": 1,
  Unknown: 0,
};

const REGULATORY_MAP: Record<string, number> = {
  "Clear — established framework, low ambiguity": 5,
  "Mostly clear — minor open questions": 4,
  "Mixed — some areas defined, others in flux": 3,
  "Unclear — active rulemaking / litigation": 1,
  "Hostile — likely tightening": 0,
  Unknown: 0,
};

const UNIT_ECONOMICS_MAP: Record<string, number> = {
  "Healthy — high gross margin (>70%)": 5,
  "Workable — gross margin 50–70%": 4,
  "Margin-compressed — gross margin 30–50%": 2,
  "Loss-making at scale (<30%)": 0,
  Unknown: 0,
};

// Multi-select demand signals — strongest tier wins.
const DEMAND_HIGH = new Set([
  "Public reference customers paying real money",
  "Active analyst coverage (Gartner, Forrester)",
  "Reported pilot-to-paid conversion above 40%",
  "Top-down enterprise mandates",
]);
const DEMAND_MED = new Set([
  "Multiple recent funding rounds in the space",
  "Bottoms-up adoption / PLG signals",
]);
const DEMAND_WEAK = new Set(["Mostly noise / press cycle"]);

function scoreDemandSignal(answer: string[] | undefined): number {
  if (!answer || answer.length === 0) return 0;
  if (answer.some((a) => DEMAND_HIGH.has(a))) return 5;
  if (answer.some((a) => DEMAND_MED.has(a))) return 3;
  if (answer.some((a) => DEMAND_WEAK.has(a))) return 1;
  return 0;
}

// Defensibility — count of credible moats.
const REAL_MOATS = new Set([
  "Proprietary data / data flywheel",
  "Workflow lock-in / deep integration",
  "Distribution / channel exclusivity",
  "Regulatory / compliance certifications",
  "Network effects",
  "Brand / trust",
]);
function scoreDefensibility(answer: string[] | undefined): number {
  if (!answer || answer.length === 0) return 0;
  const count = answer.filter((a) => REAL_MOATS.has(a)).length;
  if (answer.includes("None obvious — commoditized")) return 0;
  if (count >= 3) return 5;
  if (count === 2) return 4;
  if (count === 1) return 3;
  return 1;
}

type RawValue = string | number | string[] | undefined;
type Answers = Record<string, RawValue>;

function asString(v: RawValue): string | undefined {
  if (v == null || v === "") return undefined;
  if (Array.isArray(v)) return v.length > 0 ? String(v[0]) : undefined;
  return String(v);
}
function asArray(v: RawValue): string[] | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string" && v) return [v];
  return undefined;
}

function bandFor(score: number): {
  band: CategoryDiligenceBand;
  label: CategoryDiligenceResult["band_label"];
} {
  if (score >= 80) return { band: "strong", label: "Strong" };
  if (score >= 60) return { band: "moderate", label: "Moderate" };
  if (score >= 40) return { band: "weak", label: "Weak" };
  return { band: "not_validated", label: "Not Validated" };
}

function weightedContribution(raw: number, factor: CategoryDiligenceFactor): number {
  return (raw / 5) * WEIGHTS[factor] * 100;
}

/**
 * Returns null when no category-intake answers are present.
 */
export function calculateCategoryDiligenceConfidence(
  answers: Answers | null | undefined,
): CategoryDiligenceResult | null {
  if (!answers) return null;

  const growth = GROWTH_MAP[asString(answers["category_growth_rate"]) ?? ""] ?? 0;
  const necessity =
    AI_NECESSITY_MAP[asString(answers["category_ai_necessity"]) ?? ""] ?? 0;
  const severity =
    SEVERITY_MAP[asString(answers["category_problem_severity"]) ?? ""] ?? 0;
  const demand = scoreDemandSignal(asArray(answers["category_demand_signal"]));
  const proof =
    OUTCOME_PROOF_MAP[asString(answers["category_outcome_proof"]) ?? ""] ?? 0;
  const defensibility = scoreDefensibility(asArray(answers["category_moats"]));
  const urgency =
    URGENCY_MAP[asString(answers["category_buying_urgency"]) ?? ""] ?? 0;
  const regulatory =
    REGULATORY_MAP[asString(answers["category_regulatory_clarity"]) ?? ""] ?? 0;
  const econ =
    UNIT_ECONOMICS_MAP[asString(answers["category_unit_economics"]) ?? ""] ?? 0;

  const rawByFactor: Record<CategoryDiligenceFactor, number> = {
    market_growth: growth,
    ai_necessity: necessity,
    problem_severity: severity,
    demand_signal: demand,
    outcome_proof: proof,
    defensibility,
    buying_urgency: urgency,
    regulatory_clarity: regulatory,
    unit_economics: econ,
  };

  // No answers at all → not yet completed.
  const anyAnswered = Object.values(rawByFactor).some((v) => v > 0);
  if (!anyAnswered) return null;

  const breakdown = Object.fromEntries(
    (Object.keys(rawByFactor) as CategoryDiligenceFactor[]).map((f) => [
      f,
      {
        raw: rawByFactor[f],
        weighted: weightedContribution(rawByFactor[f], f),
        label: FACTOR_LABEL[f],
      },
    ]),
  ) as Record<CategoryDiligenceFactor, CategoryDiligenceFactorBreakdown>;

  const total = Object.values(breakdown).reduce((s, e) => s + e.weighted, 0);
  const score = Math.round(total);
  const { band, label } = bandFor(score);

  const factors = Object.keys(rawByFactor) as CategoryDiligenceFactor[];
  const top_drivers = factors
    .filter((f) => rawByFactor[f] > 0)
    .map((f) => ({
      factor: f,
      label: FACTOR_LABEL[f],
      weighted: breakdown[f].weighted,
    }))
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 3);
  const missing_factors = factors.filter((f) => rawByFactor[f] === 0);

  return { score, band, band_label: label, breakdown, top_drivers, missing_factors };
}
