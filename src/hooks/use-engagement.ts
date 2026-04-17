"use client";

import useSWR from "swr";
import type { Engagement } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useEngagement(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Engagement>(
    `/api/engagements/${id}`,
    fetcher,
  );

  return { engagement: data, error, isLoading, mutate };
}

export function useEngagements() {
  const { data, error, isLoading, mutate } = useSWR<Engagement[]>(
    "/api/engagements",
    fetcher,
  );

  return { engagements: data, error, isLoading, mutate };
}
