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

const DEMO_DISPLAY_NAMES = new Set(
  Object.values(DEMO_NAME_OVERRIDES).map((o) => o.display),
);

export function isDemoDisplayName(name: string | null | undefined): boolean {
  return !!name && DEMO_DISPLAY_NAMES.has(name);
}

export function applyDemoAnonymization(text: string, originalTarget: string): string {
  const override = DEMO_NAME_OVERRIDES[originalTarget];
  if (!override) return text;
  return text
    .replace(new RegExp(`\\b${originalTarget}_`, "g"), `${override.prefix}_`)
    .replace(new RegExp(`\\b${originalTarget}\\b`, "g"), override.display);
}
