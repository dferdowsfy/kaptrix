import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

interface GenerateButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
}

export function GenerateButton({
  children,
  className = "",
  variant = "primary",
  size = "md",
  ...props
}: GenerateButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-semibold transition disabled:cursor-not-allowed";

  const sizeClasses: Record<Size, string> = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  };

  const variantClasses: Record<Variant, string> = {
    primary:
      "bg-gray-900 text-white shadow-sm hover:bg-gray-800 disabled:bg-gray-300 disabled:text-white/90",
    secondary:
      "border border-gray-300 bg-white text-gray-700 hover:border-gray-400 disabled:opacity-50",
  };

  return (
    <button
      {...props}
      className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
