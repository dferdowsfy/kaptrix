import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertEngagementAccess } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";
import { MI_REPORT_SECTIONS } from "@/lib/market-intelligence/prompts/report-sections";
import { logAuditEvent } from "@/lib/audit/logger";

export const runtime = "nodejs";
export const maxDuration = 600;

const SECTION_ROUTE_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXTAUTH_URL ??
  "http://localhost:3000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  const { engagementId } = await params;

  try {
    const authCtx = await requireAuth();
    await assertEngagementAccess(authCtx, engagementId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data, error } = await svc
    .from("mi_reports")
    .select("*")
    .eq("engagement_id", engagementId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  const { engagementId } = await params;

  let authCtx: Awaited<ReturnType<typeof requireAuth>>;
  try {
    authCtx = await requireAuth();
    await assertEngagementAccess(authCtx, engagementId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { section_ids?: string[]; tier_depth?: string };
  const sectionIds = body.section_ids ?? MI_REPORT_SECTIONS.map((s) => s.id);

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // Determine next version number.
  const { data: latest } = await svc
    .from("mi_reports")
    .select("version")
    .eq("engagement_id", engagementId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = (latest?.version ?? 0) + 1;

  // Generate each section sequentially (avoids LLM rate limit spikes).
  const sectionMarkdowns: Record<string, string> = {};
  const sectionStatus: Record<string, "generated" | "error"> = {};

  // Get auth cookie to forward to the section route call.
  const cookieHeader = req.headers.get("cookie") ?? "";

  for (const sectionId of sectionIds) {
    try {
      const resp = await fetch(
        `${SECTION_ROUTE_BASE}/api/market-intelligence/${engagementId}/report/section`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: cookieHeader,
          },
          body: JSON.stringify({ section_id: sectionId }),
        },
      );
      if (resp.ok) {
        const json = (await resp.json()) as { content: string };
        sectionMarkdowns[sectionId] = json.content;
        sectionStatus[sectionId] = "generated";
      } else {
        sectionStatus[sectionId] = "error";
      }
    } catch {
      sectionStatus[sectionId] = "error";
    }
  }

  // Concatenate sections in canonical order.
  const fullMarkdown = MI_REPORT_SECTIONS.filter((s) => sectionIds.includes(s.id))
    .map((s) => sectionMarkdowns[s.id] ?? `## ${s.label}\n\n_Section generation failed._`)
    .join("\n\n---\n\n");

  const { data, error } = await svc
    .from("mi_reports")
    .insert({
      engagement_id: engagementId,
      version: nextVersion,
      content_markdown: fullMarkdown,
      section_status: sectionStatus,
      tier_depth: body.tier_depth ?? null,
      generated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    action: "mi.report.generate",
    entity: "mi_reports",
    engagement_id: engagementId,
    metadata: { version: nextVersion, section_count: sectionIds.length },
  });

  return NextResponse.json(data);
}
