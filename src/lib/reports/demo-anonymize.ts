// Demo anonymization for sample reports shared with external
// practitioners. When an engagement's target name appears in
// DEMO_NAME_OVERRIDES, the route layer rewrites every reference
// (target name, artifact filename prefix, inline mentions) before the
// evidence reaches the LLM, sets `DEMO MODE: true` in the user
// prompt, and the rendered report shows DEMO_SUBTITLE in place of the
// timestamp. For any engagement NOT in this map, all of this is a
// strict no-op — non-demo reports must never carry demo phrasing.

/**
 * Generic demo subtitle. Tied to the demo-mode flag, not to any
 * particular sample target. Anything that needs to render the demo
 * subtitle must read this value rather than hardcoding the string.
 */
export const DEMO_SUBTITLE =
  "Sample / Fictional Target — Generated to demonstrate Kaptrix methodology";

/**
 * Map of real engagement target names → demo display config. Add a
 * key here to anonymize a specific engagement when it is generated as
 * a sample. Remove the key (or the whole entry) to drop demo mode
 * for that engagement.
 */
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

/**
 * Strings that may appear ONLY in demo-mode reports. If any of these
 * appear in non-demo output, generation must be blocked — this
 * indicates either a prompt that hardcodes demo phrasing or a route
 * that mis-routed a non-demo engagement through the demo override.
 */
const DEMO_LEAKAGE_PATTERNS: string[] = [
  ...Object.values(DEMO_NAME_OVERRIDES).flatMap((o) => [o.display, o.prefix]),
  "Sample / Fictional Target",
  "Generated to demonstrate Kaptrix methodology",
];

/**
 * Scan generated report content for demo strings. Returns the first
 * pattern that leaked (case-insensitive substring match) when isDemo
 * is false; returns null when isDemo is true or no leakage found.
 */
export function detectDemoLeakage(
  content: string,
  isDemo: boolean,
): string | null {
  if (isDemo) return null;
  const haystack = content.toLowerCase();
  for (const needle of DEMO_LEAKAGE_PATTERNS) {
    if (haystack.includes(needle.toLowerCase())) return needle;
  }
  return null;
}
