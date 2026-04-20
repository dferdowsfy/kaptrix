/**
 * Lightweight OpenRouter client. Uses the OpenAI-compatible
 * /chat/completions endpoint. Pay-per-token, no rate-limit wall.
 */

import { getOpenRouterApiKey } from "@/lib/env";

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterOptions {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
}

export interface OpenRouterResult {
  content: string;
  model: string;
  finishReason: string | null;
}

/** Default model for report-class workloads: cheap, fast, 131K context. */
export const OPENROUTER_REPORT_MODEL = "meta-llama/llama-3.3-70b-instruct";

export async function openRouterChat(
  opts: OpenRouterOptions,
): Promise<OpenRouterResult> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 2000,
    stream: false,
  };
  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const timeoutMs = opts.timeoutMs ?? 120_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://kaptrix.com",
        "X-Title": "Kaptrix",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as { name?: string })?.name === "AbortError") {
      throw new Error(
        `OpenRouter request timed out after ${Math.round(timeoutMs / 1000)}s`,
      );
    }
    throw err;
  }
  clearTimeout(timer);

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenRouter HTTP ${res.status}: ${errText || res.statusText}`);
  }

  const completion = (await res.json()) as {
    choices?: Array<{
      message?: { content?: string | null };
      finish_reason?: string;
    }>;
    error?: { message?: string };
    model?: string;
  };

  if (completion.error?.message) {
    throw new Error(`OpenRouter error: ${completion.error.message}`);
  }

  const content = (completion.choices?.[0]?.message?.content ?? "").trim();
  return {
    content,
    model: completion.model ?? opts.model,
    finishReason: completion.choices?.[0]?.finish_reason ?? null,
  };
}
