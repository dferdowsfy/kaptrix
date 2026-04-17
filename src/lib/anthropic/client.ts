import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  defaultHeaders: {
    // Zero data retention — Anthropic does not store or train on this data
    "anthropic-beta": "zdr-2024-07-01",
  },
});

export { anthropic };

export const MODELS = {
  PRE_ANALYSIS: "claude-sonnet-4-20250514",
  SYNTHESIS: "claude-opus-4-20250514",
  RED_FLAG_DETECTION: "claude-opus-4-20250514",
} as const;
