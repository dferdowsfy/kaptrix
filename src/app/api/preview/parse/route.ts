import { NextRequest, NextResponse } from "next/server";
import { parseDocument } from "@/lib/parsers";
import { UPLOAD_LIMITS } from "@/lib/constants";
import { validateUpload } from "@/lib/security/upload-validator";
import { requireAuth, authErrorResponse } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";
import {
  classifyDocument,
  type ClassificationResult,
} from "@/lib/preview/classify-document";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Parse + persist an uploaded artifact. Extracted text is written to
 * the `preview_uploaded_docs` table (global retrieval KB) whenever the
 * caller supplies a `client_id`, so every downstream surface (chat,
 * scoring, insights, reports) can read the artifact server-side rather
 * than relying on client-side localStorage.
 *
 * The caller also keeps the response text client-side for immediate
 * UI hydration (coverage matrix, insights extraction). Persisting is
 * best-effort — parse never fails just because the DB write failed.
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

  // Optional persistence metadata. When all three are present we write
  // the parsed text into Supabase so the chat assistant + scoring +
  // report engines can retrieve it server-side.
  const clientId = (formData.get("client_id") as string | null)?.trim() || null;
  const docId = (formData.get("doc_id") as string | null)?.trim() || null;
  const category =
    (formData.get("category") as string | null)?.trim() || "other";
  // Optional subject_kind tag — lets the Category Diligence preview flow
  // mark its uploaded KB rows so later surfaces (coverage, scoring) can
  // filter appropriately. Unknown / missing values are left as NULL and
  // treated as "inherit from engagement" downstream.
  const rawSubjectKind =
    (formData.get("subject_kind") as string | null)?.trim() || null;
  const subjectKind =
    rawSubjectKind === "target" || rawSubjectKind === "category"
      ? rawSubjectKind
      : null;

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

    // Auto-classify when the caller didn't pin a specific category. The
    // per-row Upload buttons in the coverage matrix supply the artifact's
    // real category; the generic drop-zone defaults to "other" and the
    // "custom_*" prefix is reserved for user-defined slots — both should
    // be reclassified using filename + parsed content so the scoring
    // engine gets evidence under the right sub-criteria.
    const shouldClassify =
      !category ||
      category === "other" ||
      category.startsWith("custom_");

    let classification: ClassificationResult = {
      category,
      classified_by: "user",
      confidence: "high",
      reason: "user-supplied category",
    };
    if (shouldClassify && text.trim().length > 0) {
      try {
        classification = await classifyDocument({
          filename: file.name,
          parsedText: text,
          fallbackCategory: category,
        });
      } catch (err) {
        // Never fail the upload because classification failed.
        console.warn(
          "[preview/parse] auto-classify failed, keeping caller-supplied category",
          err instanceof Error ? err.message : err,
        );
      }
    }
    const finalCategory = classification.category;

    // Persistence outcome flags so the client can surface diagnostics
    // when an upload reaches "✓ Ready" but the row never lands in
    // preview_uploaded_docs (and therefore never reaches scoring).
    let persisted = false;
    let persistSkippedReason: string | null = null;
    let persistError: string | null = null;

    if (!clientId || !docId) {
      persistSkippedReason = "missing_client_or_doc_id";
    } else if (!text.trim()) {
      // Image-only / scanned PDFs commonly parse to empty text. Without
      // this signal the row would silently be dropped.
      persistSkippedReason = "empty_parsed_text";
    } else {
      const supabase = getServiceClient();
      if (!supabase) {
        persistSkippedReason = "service_client_unavailable";
        console.warn(
          "[preview/parse] KB persist skipped — getServiceClient() returned null (check NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
        );
      } else {
        const { error: upsertError } = await supabase
          .from("preview_uploaded_docs")
          .upsert(
            {
              id: docId,
              client_id: clientId,
              filename: file.name,
              category: finalCategory,
              mime_type: validation.effectiveMime,
              file_size_bytes: buffer.byteLength,
              parsed_text: text,
              token_count: tokenCount,
              parse_status: "parsed",
              updated_at: new Date().toISOString(),
              ...(subjectKind ? { subject_kind: subjectKind } : {}),
            },
            { onConflict: "id" },
          );
        if (upsertError) {
          persistError = upsertError.message;
          console.warn(
            "[preview/parse] KB persist failed",
            upsertError.message,
          );
        } else {
          persisted = true;
        }
      }
    }

    return NextResponse.json({
      text,
      tokenCount,
      mime: validation.effectiveMime,
      filename: file.name,
      size: buffer.byteLength,
      persisted,
      // Auto-classification result so the client can update its
      // localStorage record (so the coverage matrix routes the file to
      // the right artifact row without a reload).
      category: finalCategory,
      classified_by: classification.classified_by,
      classification_confidence: classification.confidence,
      classification_reason: classification.reason,
      ...(persistSkippedReason ? { persist_skipped_reason: persistSkippedReason } : {}),
      ...(persistError ? { persist_error: persistError } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Parse failed: ${message}` },
      { status: 500 },
    );
  }
}
