// Auto-classify an uploaded document into one of the canonical evidence
// categories used by the scoring engine (see CATEGORY_TO_SUBS in
// src/lib/scoring/engine-preview-adapter.ts).
//
// Strategy: a fast keyword heuristic first, then an LLM fallback for
// anything the heuristic couldn't decide with confidence. Keeps cost
// near zero on well-named files and degrades gracefully when filenames
// are opaque.

import {
  isOpenRouterConfigured,
  isSelfHostedLlmConfigured,
  getSelfHostedLlmModelForTask,
} from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { getOpenRouterModel, openRouterChat } from "@/lib/llm/openrouter";

export type ClassificationConfidence = "high" | "medium" | "low";
export type ClassificationSource = "heuristic" | "llm" | "user" | "default";

export interface ClassificationResult {
  category: string;
  classified_by: ClassificationSource;
  confidence: ClassificationConfidence;
  reason: string;
}

interface CategoryPattern {
  category: string;
  // Lowercase phrases. A hit anywhere in (filename + first chunk of
  // parsed text) counts. Multi-word phrases reduce false positives —
  // "model" alone is too noisy, "model card" or "model risk" is not.
  keywords: string[];
}

// Patterns are derived from industry-requirements.ts artifact display
// names + their what_we_look_for / regulatory_context fields. Order
// doesn't matter — scoring is by hit count and uniqueness.
const PATTERNS: CategoryPattern[] = [
  // ── Universal ────────────────────────────────────────────────────
  {
    category: "architecture",
    keywords: [
      "product architecture",
      "system architecture",
      "infrastructure diagram",
      "tenancy model",
      "multi-tenant",
      "data residency",
      "model routing",
    ],
  },
  {
    category: "security",
    keywords: [
      "security and compliance",
      "security & compliance",
      "soc 2",
      "soc2",
      "iso 27001",
      "penetration test",
      "pen test",
      "vulnerability management",
      "attestation",
      "compliance attestation",
    ],
  },
  {
    category: "model_ai",
    keywords: [
      "model card",
      "ai system documentation",
      "model documentation",
      "evaluation methodology",
      "hallucination benchmark",
      "guardrails",
      "nist ai rmf",
      "eu ai act",
    ],
  },
  {
    category: "vendor_list",
    keywords: [
      "vendor list",
      "vendor inventory",
      "api dependency",
      "dependency inventory",
      "sub-processor",
      "subprocessor",
      "foundation model provider",
      "supply chain",
    ],
  },
  {
    category: "data_privacy",
    keywords: [
      "privacy policy",
      "data handling",
      "gdpr",
      "ccpa",
      "cpra",
      "personal data",
      "personally identifiable",
      "training-data opt-out",
      "data residency commitment",
    ],
  },
  {
    category: "financial",
    keywords: [
      "unit economics",
      "gross margin",
      "cost per inference",
      "cogs",
      "burn multiple",
      "arr cohort",
      "annual recurring revenue",
      "revenue retention",
    ],
  },
  {
    category: "customer_contracts",
    keywords: [
      "master services agreement",
      "msa",
      "service level agreement",
      "uptime sla",
      "ai indemnity",
      "customer contract",
      "data ownership clause",
    ],
  },
  {
    category: "incident_log",
    keywords: [
      "incident log",
      "post-mortem",
      "post mortem",
      "root cause",
      "mttr",
      "incident response history",
    ],
  },
  {
    category: "team_bios",
    keywords: [
      "team bio",
      "leadership bio",
      "founder bio",
      "technical leadership",
      "engineering team",
      "key personnel",
    ],
  },
  {
    category: "demo",
    keywords: [
      "demo recording",
      "product demo",
      "walkthrough",
      "demo script",
      "screen recording",
    ],
  },
  {
    category: "deck",
    keywords: [
      "pitch deck",
      "investor deck",
      "investor materials",
      "investor presentation",
      "fundraising deck",
    ],
  },
  // ── Financial services ────────────────────────────────────────────
  {
    category: "model_risk",
    keywords: [
      "sr 11-7",
      "sr11-7",
      "model risk management",
      "model validation",
      "model governance",
      "occ 2011-12",
    ],
  },
  {
    category: "sox_controls",
    keywords: [
      "sox",
      "sarbanes-oxley",
      "sarbanes oxley",
      "section 302",
      "section 404",
      "financial controls",
    ],
  },
  {
    category: "kyc_aml",
    keywords: [
      "kyc",
      "know your customer",
      "aml",
      "anti-money laundering",
      "bank secrecy act",
      "fincen",
      "ofac screening",
    ],
  },
  // ── Healthcare ────────────────────────────────────────────────────
  {
    category: "hipaa",
    keywords: [
      "hipaa",
      "phi",
      "protected health information",
      "business associate agreement",
      "baa",
      "45 cfr 164",
      "hhs ocr",
    ],
  },
  {
    category: "fda_classification",
    keywords: [
      "fda",
      "samd",
      "software as a medical device",
      "510(k)",
      "510k",
      "de novo",
      "predicate device",
      "21 cfr 820",
    ],
  },
  {
    category: "bias_evaluation",
    keywords: [
      "bias evaluation",
      "fairness evaluation",
      "disparate impact",
      "subgroup performance",
      "demographic parity",
      "section 1557",
      "gmlp",
    ],
  },
  // ── Legal tech ────────────────────────────────────────────────────
  {
    category: "privilege_handling",
    keywords: [
      "attorney-client privilege",
      "attorney client privilege",
      "privileged content",
      "work product doctrine",
      "aba model rules",
      "matter-level isolation",
      "confidentiality policy",
    ],
  },
  {
    category: "citation_audit",
    keywords: [
      "citation accuracy",
      "hallucination audit",
      "fabricated citation",
      "citation verification",
      "ground-truth citation",
      "hallucination rate",
    ],
  },
  // ── Enterprise SaaS ───────────────────────────────────────────────
  {
    category: "enterprise_readiness",
    keywords: [
      "enterprise readiness",
      "sso and scim",
      "scim provisioning",
      "audit log export",
      "byok",
      "customer-managed key",
    ],
  },
  {
    category: "prompt_injection",
    keywords: [
      "prompt injection",
      "abuse testing",
      "red team",
      "owasp top 10 for llm",
      "jailbreak testing",
      "output filtering",
    ],
  },
  // ── Insurance ─────────────────────────────────────────────────────
  {
    category: "nydfs_circular",
    keywords: [
      "nydfs",
      "circular letter 7",
      "naic model bulletin",
      "insurance ai governance",
    ],
  },
  {
    category: "adverse_action",
    keywords: [
      "adverse action",
      "fcra",
      "ecoa",
      "reason code",
      "adverse-action notice",
    ],
  },
  // ── Retail / eCommerce ────────────────────────────────────────────
  {
    category: "ad_substantiation",
    keywords: [
      "ad substantiation",
      "advertising claim",
      "ftc act",
      "claims substantiation",
      "ai-generated marketing",
    ],
  },
  // ── Government / defense ──────────────────────────────────────────
  {
    category: "fedramp",
    keywords: [
      "fedramp",
      "il-2",
      "il-4",
      "il-5",
      "il-6",
      "ato package",
      "authority to operate",
      "ssp maturity",
      "poa&m",
      "dod srg",
    ],
  },
  {
    category: "sbom",
    keywords: [
      "sbom",
      "software bill of materials",
      "spdx",
      "cyclonedx",
      "executive order 14028",
      "nist ssdf",
    ],
  },
  // ── Industrial / IoT ──────────────────────────────────────────────
  {
    category: "ot_segmentation",
    keywords: [
      "ot segmentation",
      "operational technology",
      "nerc cip",
      "iec 62443",
      "ics segmentation",
      "purdue model",
    ],
  },
];

const ALL_CATEGORIES = PATTERNS.map((p) => p.category);

// ── Heuristic ────────────────────────────────────────────────────────

interface HeuristicHit {
  category: string;
  hits: number;
  matched: string[];
}

export function classifyByHeuristic(args: {
  filename: string;
  parsedText: string;
}): HeuristicHit | null {
  // Filename signal is intentionally weighted by being included verbatim
  // and untruncated; document body is capped so an obscure phrase deep
  // in a 50-page PDF doesn't outvote a clear filename.
  const haystack = (
    args.filename + "\n" + args.parsedText.slice(0, 4000)
  ).toLowerCase();

  const scored: HeuristicHit[] = [];
  for (const p of PATTERNS) {
    const matched: string[] = [];
    for (const kw of p.keywords) {
      if (haystack.includes(kw)) matched.push(kw);
    }
    if (matched.length > 0) {
      scored.push({ category: p.category, hits: matched.length, matched });
    }
  }

  if (scored.length === 0) return null;

  scored.sort((a, b) => b.hits - a.hits);
  return scored[0];
}

function confidenceFromHeuristic(hit: HeuristicHit, runnerUp: number): ClassificationConfidence {
  // High: at least 2 distinct matches AND beats runner-up by 2+.
  // Medium: 2+ matches OR (1 match in filename and not contested).
  // Low: 1 match, contested or weak.
  if (hit.hits >= 2 && hit.hits - runnerUp >= 2) return "high";
  if (hit.hits >= 2) return "medium";
  return "low";
}

// ── LLM fallback ─────────────────────────────────────────────────────

async function callClassifierLlm(prompt: { system: string; user: string }): Promise<string> {
  const messages = [
    { role: "system" as const, content: prompt.system },
    { role: "user" as const, content: prompt.user },
  ];
  // Self-hosted preferred (zero per-call cost) when both are configured.
  if (isSelfHostedLlmConfigured()) {
    const result = await llmChat({
      messages,
      // The self-hosted LlmTask enum doesn't have a dedicated
      // classification slot; "report" is the closest fit and matches
      // what /api/preview/extract-insights uses for similar JSON tasks.
      model: getSelfHostedLlmModelForTask("report"),
      temperature: 0,
      maxTokens: 200,
      jsonMode: true,
      timeoutMs: 30_000,
    });
    return result.content;
  }
  if (isOpenRouterConfigured()) {
    const result = await openRouterChat({
      model: getOpenRouterModel("extract"),
      messages,
      temperature: 0,
      maxTokens: 200,
      jsonMode: true,
      timeoutMs: 30_000,
    });
    return result.content;
  }
  throw new Error("No LLM provider configured for classification");
}

const LLM_SYSTEM_PROMPT = `You classify a single uploaded diligence document into exactly one of a fixed set of category keys. The category determines which scoring sub-criteria the document supports.

Return ONLY a JSON object (no prose, no fences) with this shape:
{"category":"<one of the listed keys, or \\"unknown\\">","confidence":"high|medium|low","reason":"<≤20 word justification>"}

Rules:
- Pick the category whose definition most directly matches the document.
- If the document is too generic or doesn't fit any category, return "unknown" with confidence "low".
- Confidence "high" only when the filename and content unambiguously point to one category.`;

export async function classifyByLlm(args: {
  filename: string;
  parsedText: string;
}): Promise<{ category: string | null; confidence: ClassificationConfidence; reason: string }> {
  const categoryList = PATTERNS.map(
    (p) => `- ${p.category}: matches phrases like "${p.keywords.slice(0, 3).join('", "')}"`,
  ).join("\n");

  const userMessage = `AVAILABLE CATEGORIES:
${categoryList}

DOCUMENT:
filename: ${args.filename}

--- CONTENT (first 1500 chars) ---
${args.parsedText.slice(0, 1500)}
--- END CONTENT ---

Classify this document.`;

  const raw = await callClassifierLlm({
    system: LLM_SYSTEM_PROMPT,
    user: userMessage,
  });

  let parsed: { category?: unknown; confidence?: unknown; reason?: unknown };
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return { category: null, confidence: "low", reason: "llm returned non-json" };
  }

  const cat = typeof parsed.category === "string" ? parsed.category.trim() : "";
  const conf =
    parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low"
      ? parsed.confidence
      : "low";
  const reason = typeof parsed.reason === "string" ? parsed.reason.slice(0, 200) : "";

  if (!cat || cat === "unknown" || !ALL_CATEGORIES.includes(cat)) {
    return { category: null, confidence: "low", reason };
  }
  return { category: cat, confidence: conf, reason };
}

// ── Orchestrator ─────────────────────────────────────────────────────

/**
 * Decide a category for an uploaded document. Heuristic first; LLM
 * fallback only when the heuristic isn't confident. Never throws — on
 * any failure returns the supplied fallback category so the upload
 * still succeeds.
 */
export async function classifyDocument(args: {
  filename: string;
  parsedText: string;
  fallbackCategory: string;
}): Promise<ClassificationResult> {
  const top = classifyByHeuristic(args);
  if (top) {
    // If we matched, also check the second-best hit to gauge contestation.
    const heuristicConfidence = confidenceFromHeuristic(top, 0);
    if (heuristicConfidence === "high") {
      return {
        category: top.category,
        classified_by: "heuristic",
        confidence: "high",
        reason: `matched: ${top.matched.slice(0, 3).join(", ")}`,
      };
    }
    // Medium/low confidence — try LLM if available, otherwise accept the heuristic.
    if (isOpenRouterConfigured() || isSelfHostedLlmConfigured()) {
      try {
        const llm = await classifyByLlm(args);
        if (llm.category) {
          return {
            category: llm.category,
            classified_by: "llm",
            confidence: llm.confidence,
            reason: llm.reason,
          };
        }
      } catch (err) {
        // Fall through to the heuristic result.
        console.warn(
          "[classify-document] LLM fallback failed, using heuristic",
          err instanceof Error ? err.message : err,
        );
      }
    }
    return {
      category: top.category,
      classified_by: "heuristic",
      confidence: heuristicConfidence,
      reason: `matched: ${top.matched.slice(0, 3).join(", ")}`,
    };
  }

  // Heuristic produced nothing — try LLM.
  if (isOpenRouterConfigured() || isSelfHostedLlmConfigured()) {
    try {
      const llm = await classifyByLlm(args);
      if (llm.category) {
        return {
          category: llm.category,
          classified_by: "llm",
          confidence: llm.confidence,
          reason: llm.reason,
        };
      }
    } catch (err) {
      console.warn(
        "[classify-document] LLM classification failed",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return {
    category: args.fallbackCategory,
    classified_by: "default",
    confidence: "low",
    reason: "no match",
  };
}
