import { NextRequest, NextResponse } from "next/server";
import { parseDocument } from "@/lib/parsers";
import { UPLOAD_LIMITS } from "@/lib/constants";
import { validateUpload } from "@/lib/security/upload-validator";
import { requireAuth, authErrorResponse } from "@/lib/security/authz";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Lightweight parse endpoint used by the preview "diligence documents"
 * uploader. We do NOT persist the file anywhere — the caller keeps
 * extracted text client-side (localStorage) keyed to their engagement
 * and uses it as chat/KB context. This avoids burdening preview users
 * with storage/RLS setup while still exercising the real parser stack
 * (PDF text, DOCX, XLSX, PPTX, and vision-based image OCR).
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
  } catch (err) {
    return authErrorResponse(err);
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const headBytes = buffer.subarray(0, 16);

  const validation = validateUpload({
    filename: file.name,
    declaredMime: file.type,
    size: buffer.byteLength,
    headBytes,
  });
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.reason ?? "Invalid upload" },
      { status: 400 },
    );
  }

  if (buffer.byteLength > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  try {
    const { text, tokenCount } = await parseDocument(
      buffer,
      validation.effectiveMime!,
    );
    return NextResponse.json({
      text,
      tokenCount,
      mime: validation.effectiveMime,
      filename: file.name,
      size: buffer.byteLength,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Parse failed: ${message}` },
      { status: 500 },
    );
  }
}
