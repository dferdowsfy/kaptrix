function isPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.includes("<from") ||
    normalized.includes("your-") ||
    normalized.includes("placeholder")
  );
}

function getServerEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return false;

  const hasValidUrl = /^https?:\/\//i.test(url);
  return hasValidUrl && !isPlaceholder(url) && !isPlaceholder(anonKey);
}

export function isGroqConfigured(): boolean {
  const apiKey = getGroqApiKey();
  if (!apiKey) return false;
  return !isPlaceholder(apiKey);
}

export function getGroqApiKey(): string {
  return getServerEnv("GROQ_API_KEY");
}

export function isOpenRouterConfigured(): boolean {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) return false;
  return !isPlaceholder(apiKey);
}

export function getOpenRouterApiKey(): string {
  return getServerEnv("OPENROUTER_API_KEY");
}

export interface OpenRouterEnvDebugInfo {
  configured: boolean;
  present: boolean;
  length: number;
  placeholderDetected: boolean;
  matchingEnvKeys: string[];
}

export function getOpenRouterEnvDebugInfo(): OpenRouterEnvDebugInfo {
  const key = getOpenRouterApiKey();
  const matchingEnvKeys = Object.keys(process.env)
    .filter((name) => name.toUpperCase().includes("OPENROUTER"))
    .sort();

  return {
    configured: isOpenRouterConfigured(),
    present: key.length > 0,
    length: key.length,
    placeholderDetected: isPlaceholder(key),
    matchingEnvKeys,
  };
}

// -------------------- Self-hosted LLM (Ollama) --------------------

export function isSelfHostedLlmConfigured(): boolean {
  const baseUrl = getSelfHostedLlmBaseUrl();
  const model = getSelfHostedLlmModel();
  if (!baseUrl || !model) return false;
  return !isPlaceholder(baseUrl) && !isPlaceholder(model);
}

export function getSelfHostedLlmBaseUrl(): string {
  return getServerEnv("SELF_HOSTED_LLM_BASE_URL");
}

export function getSelfHostedLlmModel(): string {
  return getServerEnv("SELF_HOSTED_LLM_MODEL");
}

export function getSelfHostedLlmApiKey(): string {
  return getServerEnv("SELF_HOSTED_LLM_API_KEY");
}

/**
 * Per-task model routing. Each task can override the default model via
 * a dedicated env var. Falls back to SELF_HOSTED_LLM_MODEL if unset.
 *
 * Rationale (CPU-only Ollama at ~4–12 tok/s):
 *   - chat / guidance: latency-sensitive, short outputs → use a faster
 *     3B-class model (e.g. llama3.2:3b, ~12 tok/s).
 *   - report / positioning: quality-sensitive, longer outputs, JSON mode →
 *     use the stronger 7B default (qwen2.5:7b, ~4 tok/s).
 */
export type LlmTask = "chat" | "guidance" | "report" | "positioning";

export function getSelfHostedLlmModelForTask(task: LlmTask): string {
  const envKey: Record<LlmTask, string> = {
    chat: "SELF_HOSTED_LLM_MODEL_CHAT",
    guidance: "SELF_HOSTED_LLM_MODEL_GUIDANCE",
    report: "SELF_HOSTED_LLM_MODEL_REPORT",
    positioning: "SELF_HOSTED_LLM_MODEL_POSITIONING",
  };
  const override = getServerEnv(envKey[task]);
  if (override && !isPlaceholder(override)) return override;
  return getSelfHostedLlmModel();
}