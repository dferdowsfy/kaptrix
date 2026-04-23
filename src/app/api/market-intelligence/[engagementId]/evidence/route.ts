import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertEngagementAccess } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";
import type { MiEvidenceSourceType } from "@/lib/types";

export const runtime = "nodejs";

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
    .from("mi_evidence_items")
    .select("*")
    .eq("engagement_id", engagementId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
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

  const contentType = req.headers.get("content-type") ?? "";
  let body: {
    source_type: MiEvidenceSourceType;
    source_name: string;
    source_url?: string;
    excerpt?: string;
    full_text?: string;
    confidence?: "high" | "medium" | "low";
    recency_date?: string;
  };

  if (contentType.includes("multipart/form-data")) {
    // File upload: parse form data, treat text fields + file content.
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    let fullText: string | undefined;
    if (file) {
      // Read file as text (PDFs should be pre-parsed client side for now;
      // raw text for .txt / .md; otherwise store as-is for later parse).
      try {
        fullText = await file.text();
      } catch {
        fullText = undefined;
      }
    }
    body = {
      source_type: (formData.get("source_type") as MiEvidenceSourceType) ?? "other",
      source_name: (formData.get("source_name") as string) ?? (file?.name ?? "uploaded file"),
      source_url: (formData.get("source_url") as string | null) ?? undefined,
      excerpt: (formData.get("excerpt") as string | null) ?? undefined,
      full_text: fullText,
      confidence: (formData.get("confidence") as "high" | "medium" | "low") ?? "medium",
      recency_date: (formData.get("recency_date") as string | null) ?? undefined,
    };
  } else {
    body = (await req.json()) as typeof body;
  }

  if (!body.source_type || !body.source_name) {
    return NextResponse.json(
      { error: "source_type and source_name are required" },
      { status: 400 },
    );
  }

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data, error } = await svc
    .from("mi_evidence_items")
    .insert({
      engagement_id: engagementId,
      source_type: body.source_type,
      source_name: body.source_name,
      source_url: body.source_url ?? null,
      excerpt: body.excerpt ?? null,
      full_text: body.full_text ?? null,
      storage_path: null,
      recency_date: body.recency_date ?? null,
      confidence: body.confidence ?? "medium",
      created_by: authCtx.userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
