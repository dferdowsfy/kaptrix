import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseDocument } from "@/lib/parsers";
import { logAuditEvent } from "@/lib/audit/logger";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { document_id } = await request.json();

  if (!document_id) {
    return NextResponse.json(
      { error: "Missing document_id" },
      { status: 400 },
    );
  }

  // Get document record
  const { data: doc, error: fetchError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", document_id)
    .single();

  if (fetchError || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Update status to parsing
  await supabase
    .from("documents")
    .update({ parse_status: "parsing" })
    .eq("id", document_id);

  try {
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download: ${downloadError?.message}`);
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const { text, tokenCount } = await parseDocument(buffer, doc.mime_type);

    // Update document with parsed text
    await supabase
      .from("documents")
      .update({
        parsed_text: text,
        token_count: tokenCount,
        parse_status: "parsed",
      })
      .eq("id", document_id);

    await logAuditEvent({
      action: "parse",
      entity: "document",
      entity_id: document_id,
      engagement_id: doc.engagement_id,
      metadata: { token_count: tokenCount },
    });

    return NextResponse.json({
      id: document_id,
      status: "parsed",
      token_count: tokenCount,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Parse failed";
    await supabase
      .from("documents")
      .update({ parse_status: "failed", parse_error: errorMessage })
      .eq("id", document_id);

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
