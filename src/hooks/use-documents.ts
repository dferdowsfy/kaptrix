"use client";

import useSWR from "swr";
import type { Document } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useDocuments(engagementId: string) {
  const { data, error, isLoading, mutate } = useSWR<Document[]>(
    `/api/documents?engagement_id=${engagementId}`,
    fetcher,
  );

  return { documents: data, error, isLoading, mutate };
}
