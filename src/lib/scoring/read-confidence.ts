/**
 * Read Confidence — single source of truth for the 0–100 confidence
 * value that appears on:
 *
 *   - Every report's Decision Snapshot hero card
 *   - The Scoring page's third overview tile
 *   - The Scoring page's hero "Read confidence" chip
 *
 * Derived directly from the AI Diligence composite (0–5) so the same
 * number shows up in every place a confidence is rendered. The
 * legacy textual confidence band ("High" / "Moderate" / "Developing")
 * gets seeded once on engagement creation and never refreshed, so
 * deriving from the live composite avoids the stale 30/100 problem
 * that previously dragged every report.
 */

/**
 * Map a composite score (0–5) to a 0–100 read confidence. Returns
 * null when no composite is available so callers can render a
 * "pending" / "stale" state cleanly.
 */
export function confidenceFromComposite(
  composite: number | null | undefined,
): number | null {
  if (typeof composite !== "number" || !Number.isFinite(composite)) {
    return null;
  }
  if (composite >= 4.5) return 85;
  if (composite >= 4.0) return 75;
  if (composite >= 3.5) return 65;
  if (composite >= 3.0) return 55;
  if (composite >= 2.5) return 45;
  if (composite >= 2.0) return 35;
  return 25;
}

/**
 * Coarse band for chip / badge rendering. Matches the colour palette
 * used by the report Decision Snapshot card.
 */
export type ReadConfidenceBand = "strong" | "moderate" | "weak" | "sparse";

export function readConfidenceBand(pct: number | null): ReadConfidenceBand | null {
  if (pct == null) return null;
  if (pct >= 70) return "strong";
  if (pct >= 50) return "moderate";
  if (pct >= 30) return "weak";
  return "sparse";
}
