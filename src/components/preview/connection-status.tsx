"use client";

import { useEffect, useState } from "react";

type Status = { supabase: boolean; groq: boolean } | null;

export function ConnectionStatus() {
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/preview/status", { cache: "no-store" });
        if (!cancelled && res.ok) {
          setStatus(await res.json());
        }
      } catch {
        if (!cancelled) setStatus({ supabase: false, groq: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) {
    return (
      <span
        className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-slate-400"
        title="Checking connections…"
      />
    );
  }

  const allGood = status.supabase && status.groq;

  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        allGood
          ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
          : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"
      }`}
      title={allGood ? "Online" : "Offline"}
    />
  );
}
