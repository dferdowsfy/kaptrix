import { NextResponse } from "next/server";
import { getPreviewSnapshot } from "@/lib/preview/data";
import { DEFAULT_PREVIEW_CLIENT_ID } from "@/lib/preview-clients";
import { requireAuth, assertEngagementAccess, authErrorResponse } from "@/lib/security/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_CLIENT_IDS = new Set([DEFAULT_PREVIEW_CLIENT_ID]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId =
    url.searchParams.get("client_id") ?? DEFAULT_PREVIEW_CLIENT_ID;

  if (!DEMO_CLIENT_IDS.has(clientId)) {
    try {
      const ctx = await requireAuth();
      await assertEngagementAccess(ctx, clientId);
    } catch (err) {
      return authErrorResponse(err);
    }
  }

  try {
    const snapshot = await getPreviewSnapshot(clientId);
    return NextResponse.json({ client_id: clientId, snapshot });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to load preview snapshot: ${message}` },
      { status: 500 },
    );
  }
}
