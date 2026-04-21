import { NextResponse } from "next/server";
import { getPreviewClients } from "@/lib/preview/data";
import { requireAuth } from "@/lib/security/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Scope real engagements to the signed-in user; admins see everything.
    // Unauthenticated visitors only get the built-in demo roster.
    let ownerId: string | null = null;
    let includeAllEngagements = false;
    try {
      const ctx = await requireAuth();
      ownerId = ctx.userId;
      includeAllEngagements = ctx.role === "admin";
    } catch {
      ownerId = null;
    }
    const clients = await getPreviewClients({ ownerId, includeAllEngagements });
    return NextResponse.json({ clients });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to load preview clients: ${message}` },
      { status: 500 },
    );
  }
}
