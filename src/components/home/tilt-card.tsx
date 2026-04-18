"use client";

import { useEffect, useRef, type ReactNode } from "react";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Magnetic / tilt hover effect inspired by apple.com/services tiles.
 * On pointer move, applies a small 3D rotation + highlight. Purely visual.
 */
export function TiltCard({ children, className = "" }: TiltCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    let raf = 0;
    const handleMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width; // 0..1
      const y = (e.clientY - rect.top) / rect.height;
      const rx = (0.5 - y) * 6; // deg
      const ry = (x - 0.5) * 8;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--mx", `${x * 100}%`);
        el.style.setProperty("--my", `${y * 100}%`);
        el.style.setProperty("--rx", `${rx}deg`);
        el.style.setProperty("--ry", `${ry}deg`);
      });
    };
    const reset = () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("pointermove", handleMove);
    el.addEventListener("pointerleave", reset);
    return () => {
      el.removeEventListener("pointermove", handleMove);
      el.removeEventListener("pointerleave", reset);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={`tilt-card ${className}`}>
      <div className="tilt-card-inner">{children}</div>
    </div>
  );
}
