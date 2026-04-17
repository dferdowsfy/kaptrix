import { createClient } from "@/lib/supabase/server";

export interface AuditEntry {
  action: string;
  entity: string;
  entity_id?: string;
  engagement_id?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("audit_log").insert({
    user_id: user?.id ?? null,
    engagement_id: entry.engagement_id ?? null,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entity_id ?? null,
    metadata: entry.metadata ?? {},
  });
}
