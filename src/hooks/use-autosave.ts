"use client";

import { useEffect, useRef, useCallback } from "react";

export function useAutosave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  intervalMs = 10000,
) {
  const lastSaved = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const save = useCallback(async () => {
    const serialized = JSON.stringify(data);
    if (serialized !== lastSaved.current) {
      await saveFn(data);
      lastSaved.current = serialized;
    }
  }, [data, saveFn]);

  useEffect(() => {
    timerRef.current = setInterval(save, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [save, intervalMs]);

  return { saveNow: save };
}
