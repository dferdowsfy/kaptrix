import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { logAuditEvent } from "@/lib/audit/logger";
import { UPLOAD_LIMITS } from "@/lib/constants";
import {
  requireAuth,
  assertEngagementAccess,
  authErrorResponse,
} from "@/lib/security/authz";
import {
  validateUpload,
  buildStoragePath,
} from "@/lib/security/upload-validator";
import { sha256 } from "@/lib/security/checksum";

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = await requireAuth();
  } catch (err) {
    return authErrorResponse(err);
  }
  const { supabase, userId } = ctx;

  const formData = await request.formData();
  const engagementId = formData.get("engagement_id") as string;
  const category = formData.get("category") as string;
  const files = formData.getAll("files") as File[];

  if (!engagementId || !category) {
    return NextResponse.json(
      { error: "Missing engagement_id or category" },
      { status: 400 },
    );
  }

  try {
    await assertEngagementAccess(ctx, engagementId);
  } catch (err) {
    return authErrorResponse(err);
  }

  if (files.length > UPLOAD_LIMITS.MAX_FILES_PER_UPLOAD) {
    return NextResponse.json(
      { error: `Maximum ${UPLOAD_LIMITS.MAX_FILES_PER_UPLOAD} files per upload` },
      { status: 400 },
    );
  }

  const results: Array<Record<string, unknown>> = [];

  for (const file of files) {
    // Read full buffer once: size check, magic-byte sniff, and checksum.
    const buffer = Buffer.from(await file.arrayBuffer());
    const headBytes = buffer.subarray(0, 16);

    const validation = validateUpload({
      filename: file.name,
      declaredMime: file.type,
      size: buffer.byteLength,
      headBytes,
    });
    if (!validation.ok) {
      results.push({ filename: file.name, error: validation.reason });
      continue;
    }

    const effectiveMime = validation.effectiveMime!;
    const extension = file.name.slice(file.name.lastIndexOf(".") + 1);
    const documentId = randomUUID();
    const storagePath = buildStoragePath({
      engagementId,
      documentId,
      extension,
    });
    const checksum = sha256(buffer);

    // Dedup: same engagement + same checksum = already uploaded.
    const { data: existing } = await supabase
      .from("documents")
      .select("id, filename")
      .eq("engagement_id", engagementId)
      .eq("checksum_sha256", checksum)
      .is("deleted_at", null)
      .maybeSingle();
    if (existing) {
      results.push({
        filename: file.name,
        id: existing.id,
        status: "duplicate",
      });
      continue;
    }

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: effectiveMime,
        upsert: false,
      });

    if (uploadError) {
      results.push({ filename: file.name, error: uploadError.message });
      continue;
    }

    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .insert({
        id: documentId,
        engagement_id: engagementId,
        category,
        filename: file.name,
        storage_path: storagePath,
        file_size_bytes: buffer.byteLength,
        mime_type: effectiveMime,
        uploaded_by: userId,
        parse_status: "queued",
        checksum_sha256: checksum,
      })
      .select()
      .single();

    if (dbError) {
      // Best-effort rollback so we never leave orphan storage objects.
      await supabase.storage.from("documents").remove([storagePath]);
      results.push({ filename: file.name, error: dbError.message });
      continue;
    }

    await logAuditEvent({
      action: "upload",
      entity: "document",
      entity_id: doc.id,
      engagement_id: engagementId,
      metadata: {
        filename: file.name,
        category,
        size: buffer.byteLength,
        mime: effectiveMime,
        checksum_sha256: checksum,
      },
    });

    results.push({ filename: file.name, id: doc.id, status: "queued" });
  }

  return NextResponse.json({ results }, { status: 201 });
}
