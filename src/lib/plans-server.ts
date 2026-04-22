import { getServiceClient } from "@/lib/supabase/service";
import {
  TIERS,
  resolveLimits,
  isUnlimited,
  withinLimit,
  isValidTier,
  type Tier,
  type TierLimits,
  type UsageSnapshot,
} from "@/lib/plans";

export interface UserPlanContext {
  userId: string;
  tier: Tier;
  overrides: Partial<TierLimits> | null;
  limits: TierLimits;
  usage: UsageSnapshot;
}

function daysInMonthUtc(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Returns the billing-cycle start date (UTC) anchored to signup day.
 * Example: signed up on the 24th => each cycle is 24th -> 23rd.
 * For short months, day is clamped (e.g. signup 31st => Feb 28/29).
 */
function getSignupAnchoredPeriodStart(signupAt: string | null | undefined): string {
  const now = new Date();
  const signup = signupAt ? new Date(signupAt) : now;
  const anchorDay = signup.getUTCDate();

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const thisMonthAnchorDay = Math.min(anchorDay, daysInMonthUtc(year, month));
  const useThisMonth = now.getUTCDate() >= thisMonthAnchorDay;

  const targetYear = useThisMonth ? year : month === 0 ? year - 1 : year;
  const targetMonth = useThisMonth ? month : month === 0 ? 11 : month - 1;
  const targetDay = Math.min(anchorDay, daysInMonthUtc(targetYear, targetMonth));

  return new Date(Date.UTC(targetYear, targetMonth, targetDay))
    .toISOString()
    .slice(0, 10);
}

/** Load the tier + current billing-cycle usage for a user. Falls back to starter. */
export async function getUserPlanContext(
  userId: string,
): Promise<UserPlanContext | null> {
  const svc = getServiceClient();
  if (!svc) return null;

  const { data: userRow } = await svc
    .from("users")
    .select("tier, tier_overrides, created_at")
    .eq("id", userId)
    .maybeSingle();

  const tier: Tier = isValidTier(userRow?.tier) ? (userRow!.tier as Tier) : "starter";
  const overrides =
    (userRow?.tier_overrides as Partial<TierLimits> | null | undefined) ?? null;
  const limits = resolveLimits(tier, overrides);

  const periodStartIso = getSignupAnchoredPeriodStart(userRow?.created_at ?? null);

  const [{ data: counters }, { count: activeEngagements }] = await Promise.all([
    svc
      .from("usage_counters")
      .select("reports_generated, ai_queries")
      .eq("user_id", userId)
      .eq("period_start", periodStartIso)
      .maybeSingle(),
    svc
      .from("engagements")
      .select("id", { count: "exact", head: true })
      .eq("assigned_operator_id", userId)
      .neq("status", "delivered"),
  ]);

  const usage: UsageSnapshot = {
    reports_generated: counters?.reports_generated ?? 0,
    ai_queries: counters?.ai_queries ?? 0,
    active_engagements: activeEngagements ?? 0,
  };

  return { userId, tier, overrides, limits, usage };
}

export interface LimitCheck {
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
  tier: Tier;
  tier_label: string;
}

export function checkReportLimit(ctx: UserPlanContext): LimitCheck {
  const ok = withinLimit(ctx.usage.reports_generated, ctx.limits.max_reports_per_month);
  return {
    allowed: ok,
    tier: ctx.tier,
    tier_label: TIERS[ctx.tier].label,
    limit: isUnlimited(ctx.limits.max_reports_per_month)
      ? undefined
      : ctx.limits.max_reports_per_month,
    current: ctx.usage.reports_generated,
    reason: ok
      ? undefined
      : `You have reached your report limit (${ctx.limits.max_reports_per_month}) for your current billing cycle on the ${TIERS[ctx.tier].label} plan. Upgrade to generate more.`,
  };
}

export function checkAiQueryLimit(ctx: UserPlanContext): LimitCheck {
  const ok = withinLimit(
    ctx.usage.ai_queries,
    ctx.limits.max_ai_queries_per_month,
  );
  return {
    allowed: ok,
    tier: ctx.tier,
    tier_label: TIERS[ctx.tier].label,
    limit: isUnlimited(ctx.limits.max_ai_queries_per_month)
      ? undefined
      : ctx.limits.max_ai_queries_per_month,
    current: ctx.usage.ai_queries,
    reason: ok
      ? undefined
      : `You have used all ${ctx.limits.max_ai_queries_per_month} AI queries included in the ${TIERS[ctx.tier].label} plan for your current billing cycle. Upgrade for more headroom.`,
  };
}

export function checkEngagementLimit(ctx: UserPlanContext): LimitCheck {
  const ok = withinLimit(ctx.usage.active_engagements, ctx.limits.max_engagements);
  return {
    allowed: ok,
    tier: ctx.tier,
    tier_label: TIERS[ctx.tier].label,
    limit: isUnlimited(ctx.limits.max_engagements)
      ? undefined
      : ctx.limits.max_engagements,
    current: ctx.usage.active_engagements,
    reason: ok
      ? undefined
      : `The ${TIERS[ctx.tier].label} plan allows up to ${ctx.limits.max_engagements} active engagements. Archive an existing engagement or upgrade to add more.`,
  };
}

/** Atomically increment the billing-cycle counter (best-effort). */
export async function recordUsage(
  userId: string,
  kind: "reports" | "ai_queries",
  delta = 1,
) {
  const svc = getServiceClient();
  if (!svc) return;
  await svc.rpc("increment_usage", {
    p_user_id: userId,
    p_kind: kind,
    p_delta: delta,
  });
}
