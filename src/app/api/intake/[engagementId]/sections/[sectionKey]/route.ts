// Per-engagement, per-section intake response API. Phase 1 powers the
// Commercial Pain Validation section but the route is generic so future
// typed sections plug in without new endpoints.
//
// GET  /api/intake/{engagementId}/sections/{sectionKey}
//   → { authenticated, structured_answers, raw_text }
//
// PUT  /api/intake/{engagementId}/sections/{sectionKey}
//   body: {
//     structured_answers?: Record<string, string|number|string[]|null>,
//     raw_text?: Record<string, string>,
//     // OR a single flat answers map and the server splits it:
//     answers?: Record<string, string|number|string[]|null>,
//     company_id?: string | null,
//   }
//   → { ok, intake_response_id, kb_chunk_ids }

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  partitionAnswers,
  saveSectionResponse,
  loadSectionResponse,
  type SectionAnswersPayload,
} from "@/lib/intake/persistence";
import { getIntakeSection } from "@/lib/intake/sections";
import type {
  IntakeAnswerValue,
  IntakeRawText,
  IntakeStructuredAnswers,
} from "@/lib/intake/sections/types";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ engagementId: string; sectionKey: string }>;
}

interface PutBody {
  structured_answers?: IntakeStructuredAnswers;
  raw_text?: IntakeRawText;
  answers?: Record<string, IntakeAnswerValue | undefined>;
  company_id?: string | null;
}

export async function GET(_req: Request, context: RouteContext) {
  const { engagementId, sectionKey } = await context.params;
  if (!engagementId || !sectionKey) {
    return NextResponse.json(
      { error: "Missing engagementId or sectionKey" },
      { status: 400 },
    );
  }

  const section = getIntakeSection(sectionKey);
  if (!section) {
    return NextResponse.json(
      { error: `Unknown section: ${sectionKey}` },
      { status: 404 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({
      authenticated: false,
      structured_answers: {},
      raw_text: {},
    });
  }

  try {
    const existing = await loadSectionResponse(supabase, sectionKey, {
      engagement_id: engagementId,
      user_id: user.id,
    });
    return NextResponse.json({
      authenticated: true,
      section_key: sectionKey,
      structured_answers: existing?.structured_answers ?? {},
      raw_text: existing?.raw_text ?? {},
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request, context: RouteContext) {
  const { engagementId, sectionKey } = await context.params;
  if (!engagementId || !sectionKey) {
    return NextResponse.json(
      { error: "Missing engagementId or sectionKey" },
      { status: 400 },
    );
  }

  const section = getIntakeSection(sectionKey);
  if (!section) {
    return NextResponse.json(
      { error: `Unknown section: ${sectionKey}` },
      { status: 404 },
    );
  }

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated", authenticated: false },
      { status: 401 },
    );
  }

  let payload: SectionAnswersPayload;
  if (body.answers && typeof body.answers === "object") {
    payload = partitionAnswers(section, body.answers);
  } else {
    payload = {
      structured_answers: body.structured_answers ?? {},
      raw_text: body.raw_text ?? {},
    };
  }

  try {
    const result = await saveSectionResponse(supabase, section, {
      engagement_id: engagementId,
      company_id: body.company_id ?? null,
      user_id: user.id,
      structured_answers: payload.structured_answers,
      raw_text: payload.raw_text,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
