import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isFreeFormField,
  type IntakeAnswerValue,
  type IntakeRawText,
  type IntakeSectionDef,
  type IntakeStructuredAnswers,
} from "./sections/types";

export interface SectionAnswersPayload {
  /** Single / multi / scale fields keyed by field id. */
  structured_answers: IntakeStructuredAnswers;
  /** short_text / long_text fields keyed by field id. */
  raw_text: IntakeRawText;
}

export interface SaveSectionInput extends SectionAnswersPayload {
  engagement_id: string;
  company_id?: string | null;
  user_id: string;
  source_type?: "intake" | "artifact" | "expert_interview" | "system";
}

export interface SaveSectionResult {
  intake_response_id: string;
  kb_chunk_ids: string[];
}

/**
 * Split a flat answer map into the structured / raw-text shape that
 * `intake_responses` expects. Unknown keys are ignored so callers can
 * pass the engagement-wide answer blob without filtering it first.
 */
export function partitionAnswers(
  section: IntakeSectionDef,
  answers: Record<string, IntakeAnswerValue | undefined>,
): SectionAnswersPayload {
  const structured_answers: IntakeStructuredAnswers = {};
  const raw_text: IntakeRawText = {};

  for (const field of section.fields) {
    const value = answers[field.key];
    if (value === undefined || value === null) continue;
    if (isFreeFormField(field)) {
      if (typeof value === "string" && value.trim().length > 0) {
        raw_text[field.key] = value;
      }
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      structured_answers[field.key] = value;
      continue;
    }
    if (typeof value === "string") {
      if (value.trim().length === 0) continue;
      structured_answers[field.key] = value;
      continue;
    }
    structured_answers[field.key] = value;
  }

  return { structured_answers, raw_text };
}

interface ChunkSpec {
  field_key: string;
  field_label: string;
  content: string;
}

function buildChunkSpecs(
  section: IntakeSectionDef,
  rawText: IntakeRawText,
): ChunkSpec[] {
  const specs: ChunkSpec[] = [];
  for (const field of section.fields) {
    if (!isFreeFormField(field)) continue;
    const value = rawText[field.key];
    if (typeof value !== "string") continue;
    const content = value.trim();
    if (content.length === 0) continue;
    specs.push({
      field_key: field.key,
      field_label: field.label,
      content,
    });
  }
  return specs;
}

/**
 * Metadata contract for intake-sourced KB chunks. Phase 1 callers must
 * not deviate from this shape — downstream phases reconcile artifacts
 * against this exact metadata.
 */
export function buildChunkMetadata(args: {
  section: IntakeSectionDef;
  field_key: string;
  field_label: string;
  source_type: SaveSectionInput["source_type"];
}): Record<string, unknown> {
  return {
    source_type: "intake",
    section: args.section.section_key,
    evidence_status: "intake_claim",
    requires_artifact_support: true,
    field_key: args.field_key,
    field_label: args.field_label,
    captured_source_type: args.source_type ?? "intake",
  };
}

/**
 * Upsert one section's answers into `intake_responses` and mirror
 * every free-form field into `kb_chunks`. Returns the row ids.
 *
 * The function is idempotent — calling it twice with the same payload
 * updates the existing rows in place rather than creating duplicates.
 */
export async function saveSectionResponse(
  supabase: SupabaseClient,
  section: IntakeSectionDef,
  input: SaveSectionInput,
): Promise<SaveSectionResult> {
  const sourceType = input.source_type ?? "intake";

  const responseRow = {
    engagement_id: input.engagement_id,
    company_id: input.company_id ?? null,
    user_id: input.user_id,
    section_key: section.section_key,
    source_type: sourceType,
    structured_answers: input.structured_answers,
    raw_text: input.raw_text,
  };

  const { data: response, error: respErr } = await supabase
    .from("intake_responses")
    .upsert(responseRow, { onConflict: "engagement_id,section_key,user_id" })
    .select("id")
    .single();

  if (respErr || !response) {
    throw new Error(
      respErr?.message ?? "Failed to upsert intake_responses row",
    );
  }

  const responseId = response.id as string;
  const specs = buildChunkSpecs(section, input.raw_text);

  // Wipe-and-reinsert keeps the chunk set in sync with the live answers.
  // Free-form fields the user has now cleared get removed; the rest are
  // re-upserted below. RLS limits the delete to this user's own rows.
  const { error: deleteErr } = await supabase
    .from("kb_chunks")
    .delete()
    .eq("engagement_id", input.engagement_id)
    .eq("section", section.section_key)
    .eq("user_id", input.user_id);
  if (deleteErr) {
    throw new Error(deleteErr.message);
  }

  if (specs.length === 0) {
    return { intake_response_id: responseId, kb_chunk_ids: [] };
  }

  const chunkRows = specs.map((spec) => ({
    engagement_id: input.engagement_id,
    company_id: input.company_id ?? null,
    user_id: input.user_id,
    source_type: sourceType,
    section: section.section_key,
    field_key: spec.field_key,
    intake_response_id: responseId,
    content: spec.content,
    metadata: buildChunkMetadata({
      section,
      field_key: spec.field_key,
      field_label: spec.field_label,
      source_type: sourceType,
    }),
  }));

  const { data: chunks, error: chunkErr } = await supabase
    .from("kb_chunks")
    .upsert(chunkRows, {
      onConflict: "engagement_id,section,field_key,user_id",
    })
    .select("id");

  if (chunkErr) {
    throw new Error(chunkErr.message);
  }

  return {
    intake_response_id: responseId,
    kb_chunk_ids: (chunks ?? []).map((c) => c.id as string),
  };
}

export async function loadSectionResponse(
  supabase: SupabaseClient,
  sectionKey: string,
  args: { engagement_id: string; user_id: string },
): Promise<SectionAnswersPayload | null> {
  const { data, error } = await supabase
    .from("intake_responses")
    .select("structured_answers, raw_text")
    .eq("engagement_id", args.engagement_id)
    .eq("section_key", sectionKey)
    .eq("user_id", args.user_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    structured_answers:
      (data.structured_answers as IntakeStructuredAnswers | null) ?? {},
    raw_text: (data.raw_text as IntakeRawText | null) ?? {},
  };
}
