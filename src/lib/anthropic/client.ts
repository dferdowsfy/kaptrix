import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGoogleApiKey } from "@/lib/env";

export function getGenAI(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(getGoogleApiKey());
}

export const MODELS = {
  PRE_ANALYSIS: "gemini-2.0-flash",
  SYNTHESIS: "gemini-2.0-flash",
  RED_FLAG_DETECTION: "gemini-2.0-flash",
} as const;
