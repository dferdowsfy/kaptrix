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

export function isGoogleConfigured(): boolean {
  const apiKey = getGoogleApiKey();
  if (!apiKey) return false;
  return !isPlaceholder(apiKey);
}

export function getGoogleApiKey(): string {
  return getServerEnv("GOOGLE_API_KEY") || getServerEnv("GEMINI_API_KEY");
}