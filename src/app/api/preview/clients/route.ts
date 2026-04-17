import { NextResponse } from "next/server";
import { getPreviewClients } from "@/lib/preview/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clients = await getPreviewClients();
    return NextResponse.json({ clients });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to load preview clients: ${message}` },
      { status: 500 },
    );
  }
}
