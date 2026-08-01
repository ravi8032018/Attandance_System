import React from "react";

export type StatCardVariant = "indigo" | "emerald" | "blue" | "amber" | "rose" | "purple";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: StatCardVariant;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
}

const iconVariantStyles: Record<StatCardVariant, string> = {
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800/80",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/80",
  blue: "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/80",
  amber: "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/80",
  rose: "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/80",
  purple: "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/80"
};

export function StatCard({
  title,
  value,
  description,
  subtitle,
  icon,
  variant = "indigo",
  trend,
  className = "",
}: StatCardProps) {
  const iconStyle = iconVariantStyles[variant] || iconVariantStyles.indigo;
  const subText = description || subtitle;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl solid-card solid-card-hover p-5 border border-border ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <h3 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {value}
          </h3>
        </div>
        {icon && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg font-bold shadow-xs transition-colors duration-150 ${iconStyle}`}
          >
            {icon}
          </div>
        )}
      </div>

      {(subText || trend) && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`inline-flex items-center font-extrabold px-2.5 py-0.5 rounded-full text-[11px] border ${trend.positive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/80"
                : "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/80"
                }`}
            >
              {trend.positive ? "↑" : "↓"} {trend.value}
            </span>
          )}
          {subText && (
            <span className="text-muted-foreground font-semibold">{subText}</span>
          )}
        </div>
      )}
    </div>
  );
}
