/**
 * Short-lived signed URL helper for private storage buckets.
 *
 * The `documents` bucket MUST remain private. Never surface public URLs.
 * All client-visible download URLs should be produced here, after an
 * explicit authorization check (see `assertEngagementAccess`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_SIGNED_URL_TTL_SECONDS = 60;

export async function createDocumentSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  ttlSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
): Promise<{ url: string | null; error?: string }> {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, ttlSeconds);

  if (error || !data?.signedUrl) {
    return { url: null, error: error?.message ?? "Failed to sign URL" };
  }
  return { url: data.signedUrl };
}
