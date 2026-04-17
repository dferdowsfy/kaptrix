import { NextResponse } from "next/server";
import { getPreviewSnapshot } from "@/lib/preview/data";
import { DEFAULT_PREVIEW_CLIENT_ID } from "@/lib/preview-clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId =
    url.searchParams.get("client_id") ?? DEFAULT_PREVIEW_CLIENT_ID;

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
