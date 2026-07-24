import React from "react";

export type BadgeVariant = "primary" | "success" | "warning" | "error" | "muted" | "secondary";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  error: "bg-error/15 text-error border-error/30",
  muted: "bg-muted text-muted-foreground border-border",
  secondary: "bg-secondary text-secondary-foreground border-border",
};

export function Badge({ children, variant = "primary", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-all ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
