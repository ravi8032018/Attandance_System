"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`h-9 w-9 rounded-xl bg-muted animate-pulse ${className}`} />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center h-9 w-9 rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all duration-200 active:scale-95 shadow-xs ${className}`}
      title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
      aria-label={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
    >
      {isDark ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4.5 w-4.5 text-amber-400 transition-transform duration-200 hover:rotate-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400 transition-transform duration-200 hover:-rotate-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}
