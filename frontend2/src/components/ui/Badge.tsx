import React from "react";

export type BadgeVariant = "primary" | "success" | "warning" | "error" | "muted" | "secondary";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; dot: string }> = {
  primary: {
    bg: "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800/80",
    dot: "bg-indigo-600 dark:bg-indigo-400",
  },
  success: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/80",
    dot: "bg-emerald-600 dark:bg-emerald-400",
  },
  warning: {
    bg: "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/80",
    dot: "bg-amber-600 dark:bg-amber-400",
  },
  error: {
    bg: "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/80",
    dot: "bg-rose-600 dark:bg-rose-400",
  },
  muted: {
    bg: "bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700",
    dot: "bg-slate-500 dark:bg-slate-400",
  },
  secondary: {
    bg: "bg-slate-100 text-slate-800 border-slate-200/80 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800",
    dot: "bg-indigo-600 dark:bg-indigo-400",
  },
};

export function Badge({ children, variant = "primary", pulse = false, className = "" }: BadgeProps) {
  const style = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide transition-colors duration-150 ${style.bg} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot} ${pulse ? "animate-pulse" : ""}`} />
      {children}
    </span>
  );
}
