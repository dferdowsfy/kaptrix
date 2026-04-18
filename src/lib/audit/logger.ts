import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface AuditEntry {
  action: string;
  entity: string;
  entity_id?: string;
  engagement_id?: string;
  metadata?: Record<string, unknown>;
  /** "success" | "failure" | "blocked" when relevant. */
  result?: string;
  provider?: string;
  model?: string;
}

/**
 * Append-only audit event writer. Captures request IP + user agent
 * when invoked from a request-scoped context. Failures are swallowed —
 * audit logging must never break the originating request.
 */
export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let ip: string | null = null;
    let userAgent: string | null = null;
    try {
      const h = await headers();
      ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        null;
      userAgent = h.get("user-agent");
    } catch {
      // Outside of a request scope (e.g. scripts). Fine to skip.
    }

    await supabase.from("audit_log").insert({
      user_id: user?.id ?? null,
      engagement_id: entry.engagement_id ?? null,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entity_id ?? null,
      metadata: entry.metadata ?? {},
      ip_address: ip,
      user_agent: userAgent,
      provider: entry.provider ?? null,
      model: entry.model ?? null,
      result: entry.result ?? null,
    });
  } catch {
    // Swallow — never let audit failures surface.
  }
}
