/**
 * LLM Boundary Policy.
 *
 * Decides whether evidence may leave our infrastructure, to which
 * provider, and enforces redaction before egress. Every inference
 * decision is logged so we can reconstruct what was sent where.
 *
 *   tier 0 (internal_only)  → Groq/self-hosted only. No external providers.
 *   tier 1 (redacted_ok)    → External allowed after sanitizeForExternalLLM.
 *   tier 2 (public)         → External allowed as-is (benchmarks, public data).
 *
 * Engagements or artifacts can set `external_inference_allowed = false`
 * to force tier 0 regardless of content.
 */

import { sanitizeForExternalLLM } from "@/lib/sanitize";
import { logAuditEvent } from "@/lib/audit/logger";

export type Provider = "groq" | "openrouter" | "self_hosted";
export type SensitivityTier = "internal_only" | "redacted_ok" | "public";

export interface InferenceRequest {
  provider: Provider;
  model: string;
  tier: SensitivityTier;
  engagementId?: string;
  externalInferenceAllowed?: boolean; // engagement-level override
  /** Payload to be sent downstream. */
  content: string;
  /** Optional operator/actor metadata for audit. */
  actor?: { userId?: string | null; role?: string | null };
}

export interface InferenceDecision {
  allowed: boolean;
  reason: string;
  /** Content safe to send to the chosen provider. May be redacted. */
  safeContent: string;
  provider: Provider;
}

const EXTERNAL_PROVIDERS: Provider[] = ["openrouter"];

/**
 * Gate an outbound inference request. Caller should pass the resulting
 * `safeContent` to the provider SDK. Decisions are audit-logged.
 */
export async function gateInference(
  req: InferenceRequest,
): Promise<InferenceDecision> {
  const isExternal = EXTERNAL_PROVIDERS.includes(req.provider);

  // Hard stop: engagement flagged no-external.
  if (isExternal && req.externalInferenceAllowed === false) {
    const decision: InferenceDecision = {
      allowed: false,
      reason: "engagement_external_inference_disabled",
      safeContent: "",
      provider: req.provider,
    };
    await auditDecision(req, decision, 0);
    return decision;
  }

  // Hard stop: tier 0 content cannot go to external providers.
  if (isExternal && req.tier === "internal_only") {
    const decision: InferenceDecision = {
      allowed: false,
      reason: "tier_internal_only_blocks_external",
      safeContent: "",
      provider: req.provider,
    };
    await auditDecision(req, decision, 0);
    return decision;
  }

  // Tier 1 external → redact.
  let safeContent = req.content;
  if (isExternal && req.tier === "redacted_ok") {
    safeContent = sanitizeForExternalLLM(req.content);
  }

  const decision: InferenceDecision = {
    allowed: true,
    reason: isExternal ? "external_allowed_redacted" : "internal_allowed",
    safeContent,
    provider: req.provider,
  };
  await auditDecision(req, decision, safeContent.length);
  return decision;
}

async function auditDecision(
  req: InferenceRequest,
  decision: InferenceDecision,
  sentChars: number,
): Promise<void> {
  try {
    await logAuditEvent({
      action: decision.allowed ? "llm.inference" : "llm.inference.blocked",
      entity: "inference",
      engagement_id: req.engagementId,
      metadata: {
        provider: req.provider,
        model: req.model,
        tier: req.tier,
        reason: decision.reason,
        sent_chars: sentChars,
        // Never log prompt text — only a fingerprint for correlation.
        content_preview_hash: fingerprint(req.content),
        actor_role: req.actor?.role ?? null,
      },
    });
  } catch {
    // Audit must not break inference flow.
  }
}

function fingerprint(s: string): string {
  // Lightweight FNV-1a for log correlation; not for security.
  let h = 0x811c9dc5;
  for (let i = 0; i < Math.min(s.length, 4096); i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
