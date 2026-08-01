"use client";

import React, { useState, useRef, useEffect } from "react";

export interface CustomSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  label?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select option...",
  disabled = false,
  searchable = false,
  className = "",
  label,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) => {
    if (!searchable || !search) return true;
    const q = search.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
      opt.value.toLowerCase().includes(q)
    );
  });

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 rounded-xl border border-border bg-background hover:border-indigo-500/60 flex items-center justify-between px-3.5 py-2 text-sm font-extrabold text-foreground transition-all duration-200 outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed group ${
          isOpen ? "border-indigo-500/80 ring-2 ring-indigo-500/20" : ""
        }`}
      >
        <span className="truncate">
          {selectedOption ? (
            <span className="flex items-center gap-2">
              <span className="font-bold text-foreground truncate">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground font-normal">{placeholder}</span>
          )}
        </span>
        <span
          className={`text-xs text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? "rotate-180 text-indigo-500" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {/* Dropdown Menu Overlay */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-border bg-card shadow-2xl p-2 space-y-1.5 backdrop-blur-md animate-in zoom-in-95 duration-150 max-h-[280px] flex flex-col min-w-[200px]">
          {searchable && (
            <div className="p-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Search options..."
                className="w-full h-9 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground font-semibold outline-none focus:border-indigo-500 transition-colors"
                autoFocus
              />
            </div>
          )}

          <div className="overflow-y-auto space-y-1 flex-1 pr-1">
            {filteredOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 text-center">No options match search.</p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      if (opt.disabled) return;
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all duration-150 ${
                      opt.disabled
                        ? "opacity-50 cursor-not-allowed text-muted-foreground"
                        : isSelected
                        ? "bg-indigo-600/15 border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-extrabold"
                        : "hover:bg-muted/60 text-foreground border border-transparent"
                    }`}
                  >
                    <div className="truncate">
                      <span className="text-xs font-bold block truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-black text-xs shrink-0">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
