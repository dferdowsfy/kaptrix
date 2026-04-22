// LLM-based scoring suggestion for the preview workspace.
//
// POST /api/scores/suggest
//   body: { knowledge_base: string }
//   → { scores: SuggestedScore[] }
//
// Strategy: fan out into 6 parallel dimension-level LLM calls (one per
// scoring dimension, 4-5 sub-criteria each) instead of one monolithic
// prompt. Each call is fast (~15-30s), they run concurrently, so the
// total wall-clock time is bounded by the slowest dimension rather than
// the sum of all 24 sub-criteria. This prevents the 295s timeout.

import { NextResponse } from "next/server";
import {
  isSelfHostedLlmConfigured,
  getSelfHostedLlmModelForTask,
  isOpenRouterConfigured,
} from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { openRouterChat, getOpenRouterModel } from "@/lib/llm/openrouter";
import { SCORING_DIMENSIONS } from "@/lib/constants";
import type { DimensionConfig } from "@/lib/types";
import {
  AuthError,
  assertPreviewTabVisible,
  authErrorResponse,
  requireAuth,
} from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 300;

export interface SuggestedScore {
  dimension: string;
  sub_criterion: string;
  score_0_to_5: number;
  rationale: string;
}

interface SuggestBody {
  knowledge_base?: string;
  /** When supplied, the route pulls every persisted artifact for this
   *  client from preview_uploaded_docs + preview_snapshots and merges
   *  their text into the scoring prompt server-side. */
  client_id?: string;
}

// ── Terse prompt builder for one dimension ────────────────────────────────────
//
// Full band descriptions are omitted from the prompt — they add many tokens
// but the model only needs the label to calibrate. The operator can read the
// full band description in the UI.

function buildDimensionSystemPrompt(dim: DimensionConfig): string {
  const criteria = dim.sub_criteria
    .map((sub) => {
      const bands = sub.score_bands
        ? sub.score_bands
            .map((b) => `${b.max}="${b.label}"`)
            .join(", ")
        : "0–5";
      return `  • ${sub.key} (${sub.name}): ${sub.description}\n    Bands: ${bands}`;
    })
    .join("\n\n");

  return `You are an AI diligence analyst scoring the "${dim.name}" dimension.

RULES
- Scores must be multiples of 0.5 in [0, 5].
- Ground every score in specific evidence from the knowledge base. Do NOT invent facts.
- If no relevant evidence: score 0.0, rationale "Insufficient evidence provided."
- Default toward the lower band when uncertain (lack of evidence = risk signal).
- Rationale: 1–2 sentences citing the specific evidence.

SUB-CRITERIA FOR THIS DIMENSION
${criteria}

Return ONLY valid JSON — no prose, no markdown, no code fences:
{"scores":[{"dimension":"${dim.key}","sub_criterion":"<key>","score_0_to_5":<0–5 in 0.5 steps>,"rationale":"<1-2 sentences>"},...]}

Return exactly ${dim.sub_criteria.length} score object(s), one per sub-criterion listed above.`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

function isValidSuggestedScore(v: unknown): v is SuggestedScore {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.dimension === "string" &&
    typeof s.sub_criterion === "string" &&
    typeof s.score_0_to_5 === "number" &&
    s.score_0_to_5 >= 0 &&
    s.score_0_to_5 <= 5 &&
    typeof s.rationale === "string"
  );
}

function snapToHalf(n: number): number {
  return Math.round(Math.max(0, Math.min(5, n)) * 2) / 2;
}

// ── Per-dimension LLM call ────────────────────────────────────────────────────

async function scoreDimension(
  dim: DimensionConfig,
  knowledge_base: string,
  useSelfHosted: boolean,
): Promise<SuggestedScore[]> {
  const systemPrompt = buildDimensionSystemPrompt(dim);
  const userPrompt = `ENGAGEMENT KNOWLEDGE BASE\n${knowledge_base}\n\nScore the ${dim.sub_criteria.length} sub-criteria above. Return only the JSON.`;

  const messages: { role: "system" | "user"; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // Output per dimension: 4-5 scores with longer, evidence-citing
  // rationales. 1200 gives headroom for dense rationales without
  // triggering JSON truncation.
  const maxTokens = 1200;

  let raw: string;
  if (useSelfHosted) {
    const result = await llmChat({
      messages,
      model: getSelfHostedLlmModelForTask("report"),
      temperature: 0.1,
      maxTokens,
      jsonMode: true,
    });
    raw = result.content;
  } else {
    const result = await openRouterChat({
      model: getOpenRouterModel("scoring"),
      messages,
      temperature: 0.1,
      maxTokens,
      jsonMode: true,
    });
    raw = result.content;
  }

  const parsed = extractJson(raw) as Record<string, unknown>;
  const rawScores = Array.isArray(parsed?.scores) ? parsed.scores : [];
  return rawScores
    .filter(isValidSuggestedScore)
    .map((s) => ({ ...s, score_0_to_5: snapToHalf(s.score_0_to_5) }));
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // Anonymous callers may use the public preview demo. Authenticated users
  // respect admin-hidden tab visibility.
  try {
    const authCtx = await requireAuth();
    assertPreviewTabVisible(authCtx, "scoring");
  } catch (err) {
    if (!(err instanceof AuthError) || err.status !== 401) {
      return authErrorResponse(err);
    }
  }

  let body: SuggestBody;
  try {
    body = (await req.json()) as SuggestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Merge client-supplied knowledge_base with server-side retrieval
  // from Supabase so scoring always sees every uploaded artifact,
  // every stored snapshot field, and the structured intake/insights
  // blob the client assembles. Uploaded-doc text is the biggest
  // signal — we give it a generous 24k budget so a multi-slide deck
  // actually influences the scores instead of being truncated.
  const clientKb = (body.knowledge_base ?? "").trim();
  const clientId = (body.client_id ?? "").trim();
  const parts: string[] = [];

  if (clientKb) parts.push(clientKb);

  if (clientId) {
    const supabase = getServiceClient();
    if (supabase) {
      try {
        const { data: uploaded } = await supabase
          .from("preview_uploaded_docs")
          .select("filename, category, parsed_text, parse_status")
          .eq("client_id", clientId)
          .order("uploaded_at", { ascending: false });

        if (uploaded && uploaded.length > 0) {
          const docLines: string[] = [];
          let used = 0;
          const MAX_TOTAL = 40_000;
          const MAX_PER_DOC = 12_000;
          for (const d of uploaded) {
            if (!d.parsed_text) continue;
            const header = `[uploaded · ${d.filename} · ${d.category}]`;
            const remaining = MAX_TOTAL - used;
            if (remaining <= header.length + 64) break;
            const budget = Math.min(MAX_PER_DOC, remaining - header.length - 1);
            const body = (d.parsed_text as string).slice(0, budget).trim();
            const line = `${header}\n${body}`;
            docLines.push(line);
            used += line.length + 1;
          }
          if (docLines.length > 0) {
            parts.push(
              "## Uploaded documents (full parsed text from Supabase)",
              ...docLines,
            );
          }
        }
      } catch (err) {
        console.warn(
          "[scores/suggest] uploaded-docs fetch failed",
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  // Cap the composite KB at 64k chars. The scoring model (gpt-5-nano by
  // default) has ample context headroom, and each per-dimension prompt
  // appends ~400 tokens of criteria text on top of this.
  const knowledge_base = parts.join("\n\n").slice(0, 64_000);
  if (!knowledge_base) {
    return NextResponse.json(
      { error: "knowledge_base is required" },
      { status: 400 },
    );
  }

  const useSelfHosted = isSelfHostedLlmConfigured();
  const useOpenRouter = isOpenRouterConfigured();

  if (!useSelfHosted && !useOpenRouter) {
    return NextResponse.json(
      { error: "No LLM provider configured (set SELF_HOSTED_LLM_* or OPENROUTER_API_KEY)." },
      { status: 503 },
    );
  }

  // Fan out: 6 parallel dimension-level calls. Each generates 4-5 scores and
  // finishes in seconds; total time = max(all 6), not sum(all 24).
  const results = await Promise.allSettled(
    SCORING_DIMENSIONS.map((dim) => scoreDimension(dim, knowledge_base, useSelfHosted && !useOpenRouter)),
  );

  const scores: SuggestedScore[] = [];
  const errors: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const dim = SCORING_DIMENSIONS[i];
    if (result.status === "fulfilled") {
      // Backfill any missing sub-criteria with a 0 score so the panel always
      // has a complete set (avoids rendering gaps in the scoring panel).
      const returned = new Set(result.value.map((s) => s.sub_criterion));
      scores.push(...result.value);
      for (const sub of dim.sub_criteria) {
        if (!returned.has(sub.key)) {
          scores.push({
            dimension: dim.key,
            sub_criterion: sub.key,
            score_0_to_5: 0,
            rationale: "Insufficient evidence provided.",
          });
        }
      }
    } else {
      errors.push(`${dim.key}: ${result.reason instanceof Error ? result.reason.message : "failed"}`);
      // Backfill the whole dimension with 0s on error.
      for (const sub of dim.sub_criteria) {
        scores.push({
          dimension: dim.key,
          sub_criterion: sub.key,
          score_0_to_5: 0,
          rationale: "Score generation failed for this dimension.",
        });
      }
    }
  }

  if (scores.length === 0) {
    return NextResponse.json(
      { error: `All dimensions failed: ${errors.join("; ")}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ scores, ...(errors.length > 0 ? { partial_errors: errors } : {}) });
}
