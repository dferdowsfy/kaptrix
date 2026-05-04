// One-off demo anonymization. The Harvey engagement is shared as a
// CounselFlow AI sample with an external practitioner; this rewrites
// every reference (target name, artifact filenames, inline mentions)
// before the evidence reaches the LLM so the model never sees the
// real name. Remove this module once the demo is delivered.

const DEMO_NAME_OVERRIDES: Record<string, { display: string; prefix: string }> = {
  Harvey: { display: "CounselFlow AI", prefix: "CounselFlow" },
};

export function getDemoDisplayName(originalTarget: string): string | null {
  return DEMO_NAME_OVERRIDES[originalTarget]?.display ?? null;
}

export function applyDemoAnonymization(text: string, originalTarget: string): string {
  const override = DEMO_NAME_OVERRIDES[originalTarget];
  if (!override) return text;
  return text
    .replace(new RegExp(`\\b${originalTarget}_`, "g"), `${override.prefix}_`)
    .replace(new RegExp(`\\b${originalTarget}\\b`, "g"), override.display);
}
