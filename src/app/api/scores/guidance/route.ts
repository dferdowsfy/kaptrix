import { NextRequest, NextResponse } from "next/server";
import { llmChat } from "@/lib/llm/client";
import { isSelfHostedLlmConfigured, getSelfHostedLlmModelForTask } from "@/lib/env";
import { SCORING_DIMENSIONS } from "@/lib/constants";
import {
  SCORING_GUIDANCE_SYSTEM_PROMPT,
  renderScoringGuidancePrompt,
  type ScoringGuidance,
} from "@/lib/anthropic/prompts/scoring-guidance";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Body {
  dimension: string;
  sub_criterion: string;
  score: number;
  system_context?: string;
  operator_rationale?: string;
}

function isValidScore(score: unknown): score is number {
  if (typeof score !== "number" || Number.isNaN(score)) return false;
  if (score < 0 || score > 5) return false;
  // Must be in 0.5 increments (tolerate float noise)
  const doubled = score * 2;
  return Math.abs(doubled - Math.round(doubled)) < 1e-6;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // Strip ```json fences if the model adds them
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

function isGuidance(value: unknown): value is ScoringGuidance {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.meaning !== "string") return false;
  if (!Array.isArray(v.must_be_true)) return false;
  if (!Array.isArray(v.overrated_if)) return false;
  if (!Array.isArray(v.suggested_evidence_to_request)) return false;
  const next = v.to_reach_next_level as Record<string, unknown> | undefined;
  if (!next || typeof next.delta !== "string" || !Array.isArray(next.gaps)) {
    return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  if (!isSelfHostedLlmConfigured()) {
    return NextResponse.json(
      { error: "Scoring copilot is not configured (self-hosted LLM missing)." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { dimension, sub_criterion, score, system_context, operator_rationale } = body;

  if (!dimension || !sub_criterion) {
    return NextResponse.json(
      { error: "Missing dimension or sub_criterion" },
      { status: 400 },
    );
  }

  if (!isValidScore(score)) {
    return NextResponse.json(
      { error: "Score must be a number between 0 and 5 in 0.5 increments" },
      { status: 400 },
    );
  }

  const dimensionConfig = SCORING_DIMENSIONS.find((d) => d.key === dimension);
  if (!dimensionConfig) {
    return NextResponse.json({ error: `Unknown dimension: ${dimension}` }, { status: 400 });
  }
  const subConfig = dimensionConfig.sub_criteria.find((s) => s.key === sub_criterion);
  if (!subConfig) {
    return NextResponse.json(
      { error: `Unknown sub_criterion: ${sub_criterion} for ${dimension}` },
      { status: 400 },
    );
  }

  const userPrompt = renderScoringGuidancePrompt({
    dimension_key: dimension,
    dimension_name: dimensionConfig.name,
    sub_criterion_key: sub_criterion,
    sub_criterion_name: subConfig.name,
    sub_criterion_description: subConfig.description,
    score,
    system_context,
    operator_rationale,
  });

  const prompt = `${SCORING_GUIDANCE_SYSTEM_PROMPT}\n\n${userPrompt}`;

  try {
    const guidanceModel = getSelfHostedLlmModelForTask("guidance");
    const completion = await llmChat({
      model: guidanceModel,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      maxTokens: 800,
      jsonMode: true,
    });
    const text = (completion.content ?? "").trim();

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON", raw: text },
        { status: 502 },
      );
    }

    if (!isGuidance(parsed)) {
      return NextResponse.json(
        { error: "Model response did not match expected schema", raw: parsed },
        { status: 502 },
      );
    }

    return NextResponse.json({
      guidance: parsed,
      meta: {
        dimension,
        sub_criterion,
        score,
        model: guidanceModel,
        prompt_version: "scoring-guidance@1.0.0",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `LLM request failed: ${message}` },
      { status: 502 },
    );
  }
}
