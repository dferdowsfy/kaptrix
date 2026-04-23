import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertEngagementAccess } from "@/lib/security/authz";
import { isOpenRouterConfigured, isSelfHostedLlmConfigured } from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { openRouterChat, getOpenRouterModel } from "@/lib/llm/openrouter";
import { getServiceClient } from "@/lib/supabase/service";
import {
  INTAKE_SYSTEM_PROMPT,
  buildIntakeUserPrompt,
  parseIntakeQuestions,
  type IntakeGeneratorInput,
} from "@/lib/market-intelligence/prompts/intake-generator";
import { logAuditEvent } from "@/lib/audit/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Body {
  category_name: string;
  thesis: string;
  time_horizon_months?: number | null;
  peer_categories?: string[];
  deal_stage?: string;
  tier?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  const { engagementId } = await params;

  let authCtx: Awaited<ReturnType<typeof requireAuth>>;
  try {
    authCtx = await requireAuth();
    await assertEngagementAccess(authCtx, engagementId);
  } catch (err) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOpenRouterConfigured() && !isSelfHostedLlmConfigured()) {
    return NextResponse.json(
      { error: "No LLM provider configured." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.category_name || !body.thesis) {
    return NextResponse.json(
      { error: "category_name and thesis are required" },
      { status: 400 },
    );
  }

  const input: IntakeGeneratorInput = {
    category_name: body.category_name,
    thesis: body.thesis,
    time_horizon_months: body.time_horizon_months ?? null,
    peer_categories: body.peer_categories ?? [],
    deal_stage: body.deal_stage ?? "preliminary",
    tier: body.tier ?? "standard",
  };

  const userPrompt = buildIntakeUserPrompt(input);

  let rawContent: string;
  let modelUsed: string;

  try {
    if (isOpenRouterConfigured()) {
      const resp = await openRouterChat({
        model: getOpenRouterModel("extract"),
        messages: [
          { role: "system", content: INTAKE_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        maxTokens: 3000,
        jsonMode: true,
      });
      rawContent = resp.content;
      modelUsed = resp.model;
    } else {
      const resp = await llmChat({
        messages: [
          { role: "system", content: INTAKE_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        maxTokens: 2500,
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

  let questions;
  try {
    questions = parseIntakeQuestions(rawContent);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to parse LLM response: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 502 },
    );
  }

  const svc = getServiceClient();
  if (!svc) {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }

  const { data, error } = await svc
    .from("mi_intake_questions")
    .upsert(
      {
        engagement_id: engagementId,
        questions,
        generated_by_model: modelUsed,
        generated_at: new Date().toISOString(),
        confirmed_at: null,
        status: "draft",
      },
      { onConflict: "engagement_id" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent({
    action: "mi.intake.generate",
    entity: "mi_intake_questions",
    entity_id: data.id,
    engagement_id: engagementId,
    metadata: { question_count: questions.length, model: modelUsed },
  });

  return NextResponse.json(data);
}
