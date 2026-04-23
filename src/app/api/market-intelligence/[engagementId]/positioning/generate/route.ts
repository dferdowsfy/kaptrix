import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertEngagementAccess } from "@/lib/security/authz";
import { isOpenRouterConfigured, isSelfHostedLlmConfigured } from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { openRouterChat, getOpenRouterModel } from "@/lib/llm/openrouter";
import { getServiceClient } from "@/lib/supabase/service";
import {
  POSITIONING_SYSTEM_PROMPT,
  buildPositioningUserPrompt,
} from "@/lib/market-intelligence/prompts/positioning-generator";
import { logAuditEvent } from "@/lib/audit/logger";
import type { MiScore, MiInsight } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

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

  const [{ data: profile }, { data: scores }, { data: insights }] = await Promise.all([
    svc
      .from("engagement_category_profile")
      .select("thesis, category_name, time_horizon_months, peer_categories")
      .eq("engagement_id", engagementId)
      .maybeSingle(),
    svc
      .from("mi_scores")
      .select("dimension, score_0_to_5, llm_justification, operator_override, operator_rationale")
      .eq("engagement_id", engagementId),
    svc
      .from("mi_insights")
      .select("insight_type, content, user_edited_content")
      .eq("engagement_id", engagementId)
      .not("insight_type", "eq", "positioning"),
  ]);

  if (!profile) {
    return NextResponse.json({ error: "No category profile found" }, { status: 404 });
  }

  const scoresSummary = (
    (scores ?? []) as Pick<MiScore, "dimension" | "score_0_to_5" | "llm_justification" | "operator_override" | "operator_rationale">[]
  )
    .map((s) => {
      const justification = s.operator_override
        ? s.operator_rationale
        : s.llm_justification;
      return `${s.dimension}: ${s.score_0_to_5}/5 — ${(justification ?? "").slice(0, 200)}`;
    })
    .join("\n")
    .slice(0, 4000);

  const insightsSummary = (
    (insights ?? []) as Pick<MiInsight, "insight_type" | "content" | "user_edited_content">[]
  )
    .map((i) => {
      const c = i.user_edited_content ?? i.content;
      return `[${i.insight_type}] ${JSON.stringify(c).slice(0, 400)}`;
    })
    .join("\n")
    .slice(0, 4000);

  const userPrompt = buildPositioningUserPrompt({
    category_name: profile.category_name,
    thesis: profile.thesis ?? "",
    time_horizon_months: profile.time_horizon_months,
    scores_summary: scoresSummary,
    insights_summary: insightsSummary,
    peer_categories: Array.isArray(profile.peer_categories)
      ? (profile.peer_categories as string[])
      : [],
  });

  let rawContent: string;
  let modelUsed: string;

  try {
    if (isOpenRouterConfigured()) {
      const resp = await openRouterChat({
        model: getOpenRouterModel("positioning"),
        messages: [
          { role: "system", content: POSITIONING_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        maxTokens: 2500,
        jsonMode: true,
      });
      rawContent = resp.content;
      modelUsed = resp.model;
    } else {
      const resp = await llmChat({
        messages: [
          { role: "system", content: POSITIONING_SYSTEM_PROMPT },
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

  // Parse JSON from response.
  let content: Record<string, unknown>;
  try {
    const trimmed = rawContent.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const candidate = fenced ? fenced[1] : trimmed;
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    content =
      first >= 0 && last > first
        ? (JSON.parse(candidate.slice(first, last + 1)) as Record<string, unknown>)
        : {};
  } catch {
    content = { raw: rawContent };
  }

  const { data, error } = await svc
    .from("mi_insights")
    .upsert(
      {
        engagement_id: engagementId,
        insight_type: "positioning",
        content,
        raw_llm_output: rawContent,
        generated_by_model: modelUsed,
        generated_at: new Date().toISOString(),
        user_edited_at: null,
        user_edited_content: null,
      },
      { onConflict: "engagement_id,insight_type" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    action: "mi.positioning.generate",
    entity: "mi_insights",
    engagement_id: engagementId,
    metadata: { model: modelUsed },
  });

  return NextResponse.json(data);
}
