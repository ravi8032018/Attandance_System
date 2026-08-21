"use client";

import React, { useState, useEffect } from "react";
import { TermMode, getSavedTermMode, saveTermMode } from "@/lib/academicTerm";

interface AcademicTermSwitcherProps {
  currentMode?: TermMode;
  onModeChange?: (mode: TermMode) => void;
  className?: string;
}

export function AcademicTermSwitcher({
  currentMode,
  onModeChange,
  className = "",
}: AcademicTermSwitcherProps) {
  const [termMode, setTermMode] = useState<TermMode>(currentMode || "odd");

  useEffect(() => {
    if (currentMode) {
      setTermMode(currentMode);
    } else {
      setTermMode(getSavedTermMode());
    }
  }, [currentMode]);

  const handleSelect = (mode: TermMode) => {
    setTermMode(mode);
    saveTermMode(mode);
    if (onModeChange) {
      onModeChange(mode);
    }
  };

  return (
    <div className={`flex sm:inline-flex items-center justify-between sm:justify-start gap-1 w-full sm:w-auto bg-muted/60 p-1 rounded-xl border border-border/80 text-[11px] sm:text-xs font-bold ${className}`}>
      <span className="px-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground hidden sm:inline">
        🎓 Term:
      </span>
      <button
        type="button"
        onClick={() => handleSelect("odd")}
        className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg transition-all text-center ${
          termMode === "odd"
            ? "bg-indigo-600 text-white shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Odd Semesters"
      >
        <span className="hidden sm:inline">🍂 </span>Odd<span className="hidden sm:inline"> sem</span>
      </button>
      <button
        type="button"
        onClick={() => handleSelect("even")}
        className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg transition-all text-center ${
          termMode === "even"
            ? "bg-indigo-600 text-white shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Even Semesters"
      >
        <span className="hidden sm:inline">🌸 </span>Even<span className="hidden sm:inline"> sem</span>
      </button>
      <button
        type="button"
        onClick={() => handleSelect("all")}
        className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg transition-all text-center ${
          termMode === "all"
            ? "bg-indigo-600 text-white shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="All Semesters"
      >
        <span className="hidden sm:inline">🌐 </span>All
      </button>
    </div>
  );
}
