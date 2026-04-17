import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/logger";
import { UPLOAD_LIMITS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  if (files.length > UPLOAD_LIMITS.MAX_FILES_PER_UPLOAD) {
    return NextResponse.json(
      { error: `Maximum ${UPLOAD_LIMITS.MAX_FILES_PER_UPLOAD} files per upload` },
      { status: 400 },
    );
  }

  const results = [];

  for (const file of files) {
    if (file.size > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
      results.push({ filename: file.name, error: "File too large (max 100MB)" });
      continue;
    }

    const storagePath = `engagements/${engagementId}/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
      });

    if (uploadError) {
      results.push({ filename: file.name, error: uploadError.message });
      continue;
    }

    // Create document record
    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .insert({
        engagement_id: engagementId,
        category,
        filename: file.name,
        storage_path: storagePath,
        file_size_bytes: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        parse_status: "queued",
      })
      .select()
      .single();

    if (dbError) {
      results.push({ filename: file.name, error: dbError.message });
      continue;
    }

    await logAuditEvent({
      action: "upload",
      entity: "document",
      entity_id: doc.id,
      engagement_id: engagementId,
      metadata: { filename: file.name, category, size: file.size },
    });

    results.push({ filename: file.name, id: doc.id, status: "queued" });
  }

  return NextResponse.json({ results }, { status: 201 });
}
