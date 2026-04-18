import { NextRequest, NextResponse } from "next/server";
import { parseDocument } from "@/lib/parsers";
import { logAuditEvent } from "@/lib/audit/logger";
import {
  requireAuth,
  assertEngagementAccess,
  authErrorResponse,
} from "@/lib/security/authz";
import { sha256 } from "@/lib/security/checksum";

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = await requireAuth();
  } catch (err) {
    return authErrorResponse(err);
  }
  const { supabase } = ctx;

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
    .is("deleted_at", null)
    .single();

  if (fetchError || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Defense in depth: verify caller can access this engagement before
  // we download the artifact from storage.
  try {
    await assertEngagementAccess(ctx, doc.engagement_id);
  } catch (err) {
    return authErrorResponse(err);
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
      throw new Error("Artifact download failed");
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Integrity check: reject if the bytes on disk don't match what
    // we hashed at upload time. Protects against in-place tampering.
    if (doc.checksum_sha256) {
      const actual = sha256(buffer);
      if (actual !== doc.checksum_sha256) {
        throw new Error("Artifact integrity check failed");
      }
    }

    const { text, tokenCount } = await parseDocument(buffer, doc.mime_type);

    // Update document with parsed text
    await supabase
      .from("documents")
      .update({
        parsed_text: text,
        token_count: tokenCount,
        parse_status: "parsed",
        last_accessed_at: new Date().toISOString(),
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
    // Never echo raw parser / storage errors to the client — they may
    // reveal filesystem paths or internal error strings. Log the full
    // error server-side for ops, return a generic message.
    const serverMessage =
      err instanceof Error ? err.message : "Parse failed";
    const clientMessage = "Parse failed";
    console.error("[parse] failure", {
      document_id,
      engagement_id: doc.engagement_id,
      error: serverMessage,
    });
    await supabase
      .from("documents")
      .update({ parse_status: "failed", parse_error: clientMessage })
      .eq("id", document_id);

    return NextResponse.json({ error: clientMessage }, { status: 500 });
  }
}
