/**
 * Tiered pricing + limits for Kaptrix.
 *
 * Three tiers: starter | professional | institutional.
 * Admins are forced to 'institutional' via the DB trigger.
 *
 * Limits can be overridden per-user via public.users.tier_overrides
 * (JSONB). A value of `null` or `-1` on an override field means
 * "unlimited" and bypasses the gate.
 */

export type Tier = "starter" | "professional" | "institutional";

// Which report / analysis module a user is attempting to generate.
// Each tier can allowlist a subset and cap each module independently.
export type ReportKind =
  | "ic_memo"          // IC-ready memo / full report export
  | "scoring"          // Scoring module re-run
  | "positioning"      // Contextual positioning analysis
  | "insights"         // Insights / risk digest
  | "coverage"         // Coverage diff / gap reanalysis
  | "pre_analysis";    // Artifact pre-analysis pass

export const ALL_REPORT_KINDS: ReportKind[] = [
  "ic_memo",
  "scoring",
  "positioning",
  "insights",
  "coverage",
  "pre_analysis",
];

export const REPORT_KIND_LABEL: Record<ReportKind, string> = {
  ic_memo:      "IC memo / full report",
  scoring:      "Scoring run",
  positioning:  "Positioning analysis",
  insights:     "Insights digest",
  coverage:     "Coverage analysis",
  pre_analysis: "Artifact pre-analysis",
};

export interface TierLimits {
  /** Max concurrently-active engagements. -1 = unlimited. */
  max_engagements: number;
  /** Max reports (any kind) generated per signup-anchored billing cycle. -1 = unlimited. */
  max_reports_per_month: number;
  /** Max AI/chat queries per signup-anchored billing cycle. -1 = unlimited. */
  max_ai_queries_per_month: number;
  /** Which report kinds this tier is allowed to generate. */
  reports_enabled: ReportKind[];
  /** Per-report cycle caps. Missing key inherits max_reports_per_month. -1 = unlimited. */
  per_report_caps: Partial<Record<ReportKind, number>>;
  /** Whether benchmarking / positioning module is unlocked. */
  benchmarking_enabled: boolean;
  /** Whether advanced / IC-grade report exports are unlocked. */
  advanced_reports_enabled: boolean;
  /** Whether priority processing indicator is shown. */
  priority_processing: boolean;
  /** Whether the tier supports multi-user collaboration. */
  team_collaboration: boolean;
}

export interface TierDefinition {
  id: Tier;
  label: string;
  tagline: string;
  target: string;
  limits: TierLimits;
}

export const TIERS: Record<Tier, TierDefinition> = {
  starter: {
    id: "starter",
    label: "Starter",
    tagline: "For individual operators getting started",
    target: "Individual operators · small teams",
    limits: {
      max_engagements: 3,
      max_reports_per_month: 10,
      max_ai_queries_per_month: 100,
      reports_enabled: ["scoring", "insights", "coverage", "pre_analysis"],
      per_report_caps: {
        scoring:      5,
        insights:     5,
        coverage:     10,
        pre_analysis: 10,
      },
      benchmarking_enabled: false,
      advanced_reports_enabled: false,
      priority_processing: false,
      team_collaboration: false,
    },
  },
  professional: {
    id: "professional",
    label: "Professional",
    tagline: "For small funds and active diligence teams",
    target: "Small funds · active diligence teams",
    limits: {
      max_engagements: 10,
      max_reports_per_month: 40,
      max_ai_queries_per_month: 500,
      reports_enabled: [
        "ic_memo",
        "scoring",
        "positioning",
        "insights",
        "coverage",
        "pre_analysis",
      ],
      per_report_caps: {
        ic_memo:      10,
        scoring:      20,
        positioning:  10,
        insights:     20,
        coverage:     40,
        pre_analysis: 40,
      },
      benchmarking_enabled: true,
      advanced_reports_enabled: true,
      priority_processing: false,
      team_collaboration: false,
    },
  },
  institutional: {
    id: "institutional",
    label: "Institutional",
    tagline: "For large PE / enterprise users",
    target: "Large PE · enterprise",
    limits: {
      max_engagements: -1,
      max_reports_per_month: -1,
      max_ai_queries_per_month: 2000,
      reports_enabled: [
        "ic_memo",
        "scoring",
        "positioning",
        "insights",
        "coverage",
        "pre_analysis",
      ],
      per_report_caps: {
        ic_memo:      -1,
        scoring:      -1,
        positioning:  -1,
        insights:     -1,
        coverage:     -1,
        pre_analysis: -1,
      },
      benchmarking_enabled: true,
      advanced_reports_enabled: true,
      priority_processing: true,
      team_collaboration: true,
    },
  },
};

export const ALL_TIERS: Tier[] = ["starter", "professional", "institutional"];

export function isValidTier(value: unknown): value is Tier {
  return typeof value === "string" && (ALL_TIERS as string[]).includes(value);
}

/** Merge a user's tier defaults with per-user overrides. */
export function resolveLimits(
  tier: Tier | null | undefined,
  overrides: Partial<TierLimits> | null | undefined,
): TierLimits {
  const base = TIERS[tier ?? "starter"].limits;
  if (!overrides) return base;
  return {
    max_engagements: pickLimit(overrides.max_engagements, base.max_engagements),
    max_reports_per_month: pickLimit(
      overrides.max_reports_per_month,
      base.max_reports_per_month,
    ),
    max_ai_queries_per_month: pickLimit(
      overrides.max_ai_queries_per_month,
      base.max_ai_queries_per_month,
    ),
    reports_enabled: Array.isArray(overrides.reports_enabled)
      ? (overrides.reports_enabled.filter((k): k is ReportKind =>
          (ALL_REPORT_KINDS as string[]).includes(k as string),
        ) as ReportKind[])
      : base.reports_enabled,
    per_report_caps:
      overrides.per_report_caps && typeof overrides.per_report_caps === "object"
        ? { ...base.per_report_caps, ...overrides.per_report_caps }
        : base.per_report_caps,
    benchmarking_enabled:
      typeof overrides.benchmarking_enabled === "boolean"
        ? overrides.benchmarking_enabled
        : base.benchmarking_enabled,
    advanced_reports_enabled:
      typeof overrides.advanced_reports_enabled === "boolean"
        ? overrides.advanced_reports_enabled
        : base.advanced_reports_enabled,
    priority_processing:
      typeof overrides.priority_processing === "boolean"
        ? overrides.priority_processing
        : base.priority_processing,
    team_collaboration:
      typeof overrides.team_collaboration === "boolean"
        ? overrides.team_collaboration
        : base.team_collaboration,
  };
}

/** Cap for a specific report kind; falls back to the aggregate cap. */
export function reportKindCap(
  limits: TierLimits,
  kind: ReportKind,
): number {
  const v = limits.per_report_caps[kind];
  return typeof v === "number" ? v : limits.max_reports_per_month;
}

export function isReportKindEnabled(
  limits: TierLimits,
  kind: ReportKind,
): boolean {
  return limits.reports_enabled.includes(kind);
}

function pickLimit(override: unknown, fallback: number): number {
  if (typeof override !== "number") return fallback;
  return override;
}

export function isUnlimited(limit: number): boolean {
  return limit < 0;
}

/** True if an action is within limits. */
export function withinLimit(current: number, limit: number): boolean {
  if (isUnlimited(limit)) return true;
  return current < limit;
}

export interface UsageSnapshot {
  reports_generated: number;
  ai_queries: number;
  active_engagements: number;
}

export function buildUsageView(
  tier: Tier,
  overrides: Partial<TierLimits> | null | undefined,
  usage: UsageSnapshot,
) {
  const limits = resolveLimits(tier, overrides);
  return {
    tier,
    tier_label: TIERS[tier].label,
    limits,
    usage,
    remaining: {
      engagements: isUnlimited(limits.max_engagements)
        ? null
        : Math.max(0, limits.max_engagements - usage.active_engagements),
      reports: isUnlimited(limits.max_reports_per_month)
        ? null
        : Math.max(0, limits.max_reports_per_month - usage.reports_generated),
      ai_queries: isUnlimited(limits.max_ai_queries_per_month)
        ? null
        : Math.max(
            0,
            limits.max_ai_queries_per_month - usage.ai_queries,
          ),
    },
  };
}
