// Unified LLM client — routes ALL platform AI calls to the
// self-hosted Ollama instance configured via SELF_HOSTED_LLM_*
// environment variables. OpenRouter / Groq are no longer used.

import {
  getSelfHostedLlmApiKey,
  getSelfHostedLlmBaseUrl,
  getSelfHostedLlmModel,
  isSelfHostedLlmConfigured,
} from "@/lib/env";

export interface LlmChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmChatOptions {
  messages: LlmChatMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
  /** If true, ask the model to return JSON (Ollama supports "format": "json"). */
  jsonMode?: boolean;
  /** Abort the fetch after this many ms. Defaults to 295_000 (just under Vercel Pro's 300s cap). */
  timeoutMs?: number;
}

export interface LlmChatResult {
  content: string;
  model: string;
  finishReason: string | null;
}

/** Strip <think>...</think> reasoning blocks some models emit. */
function stripThink(s: string): string {
  return s.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export function assertLlmConfigured(): void {
  if (!isSelfHostedLlmConfigured()) {
    throw new Error(
      "Self-hosted LLM is not configured. Set SELF_HOSTED_LLM_BASE_URL and SELF_HOSTED_LLM_MODEL in your environment.",
    );
  }
}

export async function llmChat(opts: LlmChatOptions): Promise<LlmChatResult> {
  assertLlmConfigured();

  const baseUrl = getSelfHostedLlmBaseUrl().replace(/\/$/, "");
  const apiKey = getSelfHostedLlmApiKey();
  const model = opts.model ?? getSelfHostedLlmModel();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
    headers["X-API-Key"] = apiKey;
  }

  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 2000,
    stream: false,
  };
  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const timeoutMs = opts.timeoutMs ?? 295_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as { name?: string })?.name === "AbortError") {
      throw new Error(
        `LLM request timed out after ${Math.round(timeoutMs / 1000)}s`,
      );
    }
    throw err;
  }
  clearTimeout(timer);

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`LLM HTTP ${res.status}: ${errText || res.statusText}`);
  }

  const completion = (await res.json()) as {
    choices?: Array<{
      message?: { content?: string | null; reasoning?: string | null };
      finish_reason?: string;
    }>;
    error?: { message?: string };
    model?: string;
  };

  if (completion.error?.message) {
    throw new Error(`LLM error: ${completion.error.message}`);
  }

  const msg = completion.choices?.[0]?.message;
  const rawContent = (msg?.content ?? "").toString();
  const rawReasoning = (msg?.reasoning ?? "").toString();

  let content = stripThink(rawContent);
  if (!content) content = stripThink(rawReasoning);

  return {
    content,
    model: completion.model ?? model,
    finishReason: completion.choices?.[0]?.finish_reason ?? null,
  };
}
