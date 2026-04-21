/**
 * Vision LLM client. Routes multimodal (image + text) requests to a
 * vision-capable model. Prefers OpenRouter when an API key is
 * configured (Claude 3.5 Sonnet / GPT-4o class), and falls back to a
 * self-hosted vision model via the OpenAI-compatible /chat/completions
 * endpoint (e.g. a LLaVA- or Llama-3.2-Vision-class Ollama model).
 *
 * Both providers accept the OpenAI multimodal content format:
 *   [{ type: "text", text }, { type: "image_url", image_url: { url } }]
 * The url can be a data: URL, which is how we pass the raw bytes
 * without needing object storage.
 */

import {
  getOpenRouterApiKey,
  getSelfHostedLlmApiKey,
  getSelfHostedLlmBaseUrl,
  isOpenRouterConfigured,
  isSelfHostedLlmConfigured,
} from "@/lib/env";

export interface VisionExtractArgs {
  imageDataUrl: string;
  prompt: string;
  /** Override model selection; otherwise we pick the best available. */
  model?: string;
  /** Soft cap on output tokens. */
  maxTokens?: number;
  /** Abort after this many ms. Defaults to 120s. */
  timeoutMs?: number;
}

/** Default OpenRouter vision model — cheap Llama 3.2 Vision (11B).
 *  Roughly $0.055 / 1M input tokens + $0.055 / 1M output tokens at the
 *  time of writing, i.e. orders of magnitude cheaper than Claude 3.5
 *  Sonnet or GPT-4o. Operators can override per-request via `model`
 *  or globally via the OPENROUTER_VISION_MODEL env var. */
const DEFAULT_OPENROUTER_VISION_MODEL = "meta-llama/llama-3.2-11b-vision-instruct";

/** Env var an operator can set to override the self-hosted vision model. */
const SELF_HOSTED_VISION_MODEL_ENV = "SELF_HOSTED_LLM_VISION_MODEL";

export async function visionExtract(args: VisionExtractArgs): Promise<string> {
  if (isOpenRouterConfigured()) {
    return visionViaOpenRouter(args);
  }
  if (isSelfHostedLlmConfigured()) {
    return visionViaSelfHosted(args);
  }
  throw new Error(
    "No vision-capable LLM provider is configured. Set OPENROUTER_API_KEY or SELF_HOSTED_LLM_BASE_URL + SELF_HOSTED_LLM_VISION_MODEL.",
  );
}

async function visionViaOpenRouter(args: VisionExtractArgs): Promise<string> {
  const apiKey = getOpenRouterApiKey();
  const envOverride = (process.env.OPENROUTER_VISION_MODEL ?? "").trim();
  const model = args.model ?? (envOverride || DEFAULT_OPENROUTER_VISION_MODEL);

  const body = {
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: args.prompt },
          {
            type: "image_url",
            image_url: { url: args.imageDataUrl },
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: args.maxTokens ?? 4000,
    stream: false,
  };

  const content = await postJson({
    url: "https://openrouter.ai/api/v1/chat/completions",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "https://kaptrix.com",
      "X-Title": "Kaptrix",
    },
    body,
    timeoutMs: args.timeoutMs ?? 120_000,
    providerLabel: "OpenRouter vision",
  });
  return content;
}

async function visionViaSelfHosted(args: VisionExtractArgs): Promise<string> {
  const baseUrl = getSelfHostedLlmBaseUrl().replace(/\/$/, "");
  const apiKey = getSelfHostedLlmApiKey();
  const envOverride = (process.env[SELF_HOSTED_VISION_MODEL_ENV] ?? "").trim();
  const model = args.model ?? (envOverride || "llama3.2-vision");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers["X-API-Key"] = apiKey;

  const body = {
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: args.prompt },
          {
            type: "image_url",
            image_url: { url: args.imageDataUrl },
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: args.maxTokens ?? 4000,
    stream: false,
  };

  return postJson({
    url: `${baseUrl}/chat/completions`,
    headers,
    body,
    timeoutMs: args.timeoutMs ?? 180_000,
    providerLabel: "Self-hosted vision",
  });
}

async function postJson(args: {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  timeoutMs: number;
  providerLabel: string;
}): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs);

  let res: Response;
  try {
    res = await fetch(args.url, {
      method: "POST",
      headers: args.headers,
      body: JSON.stringify(args.body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as { name?: string })?.name === "AbortError") {
      throw new Error(
        `${args.providerLabel} request timed out after ${Math.round(args.timeoutMs / 1000)}s`,
      );
    }
    throw err;
  }
  clearTimeout(timer);

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `${args.providerLabel} HTTP ${res.status}: ${errText || res.statusText}`,
    );
  }

  const completion = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
    error?: { message?: string };
  };

  if (completion.error?.message) {
    throw new Error(`${args.providerLabel} error: ${completion.error.message}`);
  }

  const raw = completion.choices?.[0]?.message?.content ?? "";
  return typeof raw === "string" ? raw : "";
}
