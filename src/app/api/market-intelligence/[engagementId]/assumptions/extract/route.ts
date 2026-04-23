import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertEngagementAccess } from "@/lib/security/authz";
import { isOpenRouterConfigured, isSelfHostedLlmConfigured } from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { openRouterChat, getOpenRouterModel } from "@/lib/llm/openrouter";
import { getServiceClient } from "@/lib/supabase/service";
import {
  ASSUMPTION_SYSTEM_PROMPT,
  buildAssumptionUserPrompt,
  parseAssumptions,
} from "@/lib/market-intelligence/prompts/assumption-extractor";
import { logAuditEvent } from "@/lib/audit/logger";
import type { MiIntakeQuestion } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  const { engagementId } = await params;

  try {
    const authCtx = await requireAuth();
    await assertEngagementAccess(authCtx, engagementId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOpenRouterConfigured() && !isSelfHostedLlmConfigured()) {
    return NextResponse.json({ error: "No LLM provider configured." }, { status: 503 });
  }

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // Fetch thesis + answered intake from DB.
  const [{ data: profile }, { data: intake }] = await Promise.all([
    svc
      .from("engagement_category_profile")
      .select("thesis, category_name")
      .eq("engagement_id", engagementId)
      .maybeSingle(),
    svc
      .from("mi_intake_questions")
      .select("questions")
      .eq("engagement_id", engagementId)
      .maybeSingle(),
  ]);

  if (!profile?.thesis) {
    return NextResponse.json({ error: "No thesis found for this engagement" }, { status: 400 });
  }

  const questions: MiIntakeQuestion[] = Array.isArray(intake?.questions)
    ? (intake.questions as MiIntakeQuestion[])
    : [];

  const userPrompt = buildAssumptionUserPrompt({
    thesis: profile.thesis,
    category_name: profile.category_name,
    answered_questions: questions,
  });

  let rawContent: string;
  let modelUsed: string;

  try {
    if (isOpenRouterConfigured()) {
      const resp = await openRouterChat({
        model: getOpenRouterModel("extract"),
        messages: [
          { role: "system", content: ASSUMPTION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        maxTokens: 2000,
        jsonMode: true,
      });
      rawContent = resp.content;
      modelUsed = resp.model;
    } else {
      const resp = await llmChat({
        messages: [
          { role: "system", content: ASSUMPTION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        maxTokens: 2000,
        jsonMode: true,
      });
      rawContent = resp.content;
      modelUsed = "self_hosted";
    }
  } catch (err) {
    return NextResponse.json(
      { error: `LLM error: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 502 },
    );
  }

  let assumptions;
  try {
    assumptions = parseAssumptions(rawContent, engagementId);
  } catch (err) {
    return NextResponse.json(
      { error: `Parse error: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 502 },
    );
  }

  // Delete existing assumptions and replace (re-extraction = fresh start).
  await svc.from("mi_thesis_assumptions").delete().eq("engagement_id", engagementId);

  const { data, error } = await svc
    .from("mi_thesis_assumptions")
    .insert(assumptions)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    action: "mi.assumptions.extract",
    entity: "mi_thesis_assumptions",
    engagement_id: engagementId,
    metadata: { count: assumptions.length, model: modelUsed },
  });

  return NextResponse.json(data);
}
