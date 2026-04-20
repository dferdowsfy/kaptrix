---
mode: agent
description: Kaptrix LLM infrastructure — self-hosted Ollama, llmChat(), auth headers, token limits, timeout strategy
---

# Kaptrix: LLM Infrastructure

## Self-Hosted Ollama Server
- **Base URL**: `http://72.62.83.236/ollama/v1` (from `SELF_HOSTED_LLM_BASE_URL`)
- **Default model**: `qwen2.5:7b` (from `SELF_HOSTED_LLM_MODEL`)
- **API Key**: `SELF_HOSTED_LLM_API_KEY` env var
- **Hardware**: CPU-only

## Per-Task Model Routing
Use `getSelfHostedLlmModelForTask(task)` from `@/lib/env` to select the right model per workload:

| Task | Default model | tok/s | Env override |
|------|---------------|-------|--------------|
| `chat` | `llama3.2:3b` | ~12 | `SELF_HOSTED_LLM_MODEL_CHAT` |
| `guidance` | `llama3.2:3b` | ~12 | `SELF_HOSTED_LLM_MODEL_GUIDANCE` |
| `report` | `qwen2.5:7b` | ~4.3 | `SELF_HOSTED_LLM_MODEL_REPORT` |
| `positioning` | `qwen2.5:7b` | ~4.3 | `SELF_HOSTED_LLM_MODEL_POSITIONING` |

Pattern in any route:
```typescript
import { getSelfHostedLlmModelForTask } from "@/lib/env";
const { content } = await llmChat({
  model: getSelfHostedLlmModelForTask("chat"),
  messages: [...],
});
```

## CRITICAL: Auth Header
```typescript
// CORRECT — nginx proxy accepts only X-API-Key
headers["X-API-Key"] = apiKey;

// WRONG — nginx returns 401, causes 502 upstream
headers["Authorization"] = `Bearer ${apiKey}`;  // DO NOT USE
```

## `llmChat()` — `src/lib/llm/client.ts`
```typescript
await llmChat({
  messages: [{ role: "system", content: "..." }, { role: "user", content: "..." }],
  temperature: 0.2,       // default, keep low for determinism
  maxTokens: 1400,        // hard cap per-call (Vercel Pro timeout)
  jsonMode: false,        // set true for structured JSON output
  timeoutMs: 295_000,     // default: just under Vercel Pro 300s limit
})
// Returns: { content, model, finishReason }
// Strips <think>...</think> blocks automatically
```

## Env Var Check
```typescript
import { isSelfHostedLlmConfigured } from "@/lib/env";
if (!isSelfHostedLlmConfigured()) {
  return NextResponse.json({ error: "LLM not configured" }, { status: 503 });
}
```
- `isSelfHostedLlmConfigured()` checks for non-placeholder BASE_URL + MODEL
- Detects placeholders: empty, contains `<from`, `your-`, `placeholder`

## Token Budget Rules
- **Per-section max (reports)**: `Math.min(section.maxTokens, 1100)` — never exceed 1100 per call on qwen2.5:7b (fits 300s Vercel limit at 4.3 tok/s)
- **Chat max tokens**: 800 (short answer)
- **Guidance max tokens**: 800 (structured JSON)
- **Positioning max tokens**: 2500 (JSON payload)
- **Evidence context**: ~70KB (truncated with `.slice(0, 70_000)`)
- **Operator KB**: ~20KB (`.slice(0, 20_000)`)
- **Combined evidence**: ~90KB total
- **Prior markdown**: Last 12KB of previous sections (`.slice(-12_000)`)
- **Temperature**: 0.2 for reports/scoring/positioning, 0.3 for chat, 0.7 for suggestion chips

## Error Handling Pattern
```typescript
try {
  const { content } = await llmChat({ ... });
  if (!content) return NextResponse.json({ error: "Empty response" }, { status: 502 });
  return NextResponse.json({ content });
} catch (err) {
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json({ error: `Failed: ${message}` }, { status: 502 });
}
```

## Env Vars
| Variable | Purpose |
|----------|---------|
| `SELF_HOSTED_LLM_BASE_URL` | Ollama server base URL |
| `SELF_HOSTED_LLM_MODEL` | Model name |
| `SELF_HOSTED_LLM_API_KEY` | X-API-Key value |
| `GROQ_API_KEY` | Legacy (not actively used) |
| `OPENROUTER_API_KEY` | Legacy (not actively used) |

## Route Config for Long LLM Calls
```typescript
export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Pro max
```
