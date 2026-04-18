/**
 * Minimal per-process rate limiter for LLM / expensive endpoints.
 *
 * Good enough for a single-instance deployment; for multi-instance,
 * swap the Map for Upstash/Redis or Supabase `rate_limits` table. The
 * surface stays the same.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

export function checkRateLimit(args: {
  key: string;
  limit: number;
  windowSeconds: number;
}): RateLimitResult {
  const now = Date.now();
  const resetAt = now + args.windowSeconds * 1000;
  const existing = buckets.get(args.key);

  if (!existing || existing.resetAt < now) {
    buckets.set(args.key, { count: 1, resetAt });
    return { allowed: true, retryAfterSeconds: 0, remaining: args.limit - 1 };
  }

  if (existing.count >= args.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: args.limit - existing.count,
  };
}

/** Best-effort caller identifier from request headers. */
export function callerKey(
  headers: Headers,
  userId: string | null,
  scope: string,
): string {
  if (userId) return `${scope}:u:${userId}`;
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:ip:${ip}`;
}
