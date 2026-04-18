import type { SVGProps } from "react";

type LogoProps = {
  className?: string;
  markClassName?: string;
  wordClassName?: string;
};

export function Logo({ className, markClassName, wordClassName }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark className={markClassName} />
      <span
        className={`font-black uppercase tracking-[0.22em] ${
          wordClassName ?? "text-base"
        }`}
      >
        KAPTRIX
      </span>
    </span>
  );
}

export function LogoMark({
  className,
  ...rest
}: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={className ?? "h-6 w-6"}
      {...rest}
    >
      <defs>
        <linearGradient id="kaptrix-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="55%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#e879f9" />
        </linearGradient>
      </defs>
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="8"
        fill="url(#kaptrix-mark)"
      />
      <path
        d="M10 8.5V23.5M10 16L20 8.5M10 16L20 23.5"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
