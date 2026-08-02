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
    <div className={`inline-flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/80 text-xs font-bold ${className}`}>
      <span className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground hidden sm:inline">
        🎓 Term:
      </span>
      <button
        type="button"
        onClick={() => handleSelect("odd")}
        className={`px-2.5 py-1 rounded-lg transition-all ${
          termMode === "odd"
            ? "bg-indigo-600 text-white shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Odd Semesters"
      >
        🍂 Odd sem
      </button>
      <button
        type="button"
        onClick={() => handleSelect("even")}
        className={`px-2.5 py-1 rounded-lg transition-all ${
          termMode === "even"
            ? "bg-indigo-600 text-white shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Even Semesters"
      >
        🌸 Even sem
      </button>
      <button
        type="button"
        onClick={() => handleSelect("all")}
        className={`px-2.5 py-1 rounded-lg transition-all ${
          termMode === "all"
            ? "bg-indigo-600 text-white shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="All Semesters"
      >
        🌐 All
      </button>
    </div>
  );
}
