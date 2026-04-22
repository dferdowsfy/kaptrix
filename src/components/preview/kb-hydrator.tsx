"use client";

import { useEffect } from "react";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { hydrateKnowledgeBaseFromSupabase } from "@/lib/preview/knowledge-base";

/**
 * Invisible client component that hydrates the localStorage KB cache
 * from Supabase on mount and when the selected client changes. Placed
 * in the preview layout so every module benefits automatically.
 */
export function KbHydrator() {
  const { selectedId } = useSelectedPreviewClient();

  useEffect(() => {
    if (!selectedId) return;
    void hydrateKnowledgeBaseFromSupabase(selectedId);
  }, [selectedId]);

  return null;
}
