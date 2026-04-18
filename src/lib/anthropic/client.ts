import Groq from "groq-sdk";
import { getGroqApiKey } from "@/lib/env";

let _client: Groq | null = null;

export function getGroqClient(): Groq {
  if (!_client) {
    _client = new Groq({ apiKey: getGroqApiKey() });
  }
  return _client;
}

export const MODELS = {
  PRE_ANALYSIS: "llama-3.3-70b-versatile",
  SYNTHESIS: "llama-3.3-70b-versatile",
  RED_FLAG_DETECTION: "llama-3.3-70b-versatile",
} as const;
