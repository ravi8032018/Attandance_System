"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useScrolled } from "@/hooks/useScrolled";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useFacultyMe } from "@/hooks/useFacultyMe";

export function TopHeader() {
  const scrolled = useScrolled({ hideAt: 25, showAt: 8 });
  const { faculty } = useFacultyMe();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const logoSrc = isDark
    ? "/light_logo_aus.png"
    : "/dark_logo_aus.png";

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-card/95 backdrop-blur-md transition-all duration-300 ease-in-out ${scrolled ? "border-b border-border shadow-xs" : "border-b border-border/40"
        }`}
    >
      <div
        className={`w-full max-w-full px-4 sm:px-6 lg:px-8 transition-all duration-300 ease-in-out ${scrolled ? "py-2" : "py-3"
          }`}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Department Branding */}
          <Link href="/faculty/dashboard" className="flex items-center gap-3 group">
            <img
              key={logoSrc}
              src={logoSrc}
              alt="Assam University Logo"
              className={`w-auto object-contain transition-all duration-300 ease-in-out ${scrolled ? "h-9" : "h-12 sm:h-14"
                } ${isDark ? "brightness-110 drop-shadow-sm" : ""}`}
              onError={(e) => {
                // Fallback icon if image fails to load
                (e.target as HTMLImageElement).src =
                  "https://upload.wikimedia.org/wikipedia/en/6/6e/Assam_University_Logo.png";
              }}
            />
            <div className="flex flex-col">
              <div
                className={`font-black tracking-tight text-foreground transition-all duration-300 ease-in-out ${scrolled ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
                  }`}
              >
                AUS&nbsp;<span className="text-indigo-600 dark:text-indigo-400">CS</span>
              </div>

              {/* Subtitle details collapse smoothly on scroll */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${scrolled ? "max-h-0 opacity-0" : "max-h-8 opacity-100"
                  }`}
              >
                <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold text-muted-foreground tracking-tight">
                  <span>Assam University, Silchar</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span>Dept. of Computer Science</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Right Header Navigation & Actions */}
          <div className="flex items-center gap-3">
            {/* Single Button Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
