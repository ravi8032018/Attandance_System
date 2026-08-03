"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useScrolled } from "@/hooks/useScrolled";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationPopover } from "@/components/notifications/NotificationPopover";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useUserMe } from "@/hooks/useUserMe";

export function TopHeader() {
  const scrolled = useScrolled({ hideAt: 25, showAt: 8 });
  const { isStudent, isAdmin } = useUserMe();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const logoSrc = isDark
    ? "/light_logo_aus.png"
    : "/dark_logo_aus.png";

  const homeHref = isStudent
    ? "/student/dashboard"
    : isAdmin
      ? "/admin/dashboard"
      : "/faculty/dashboard";

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
          <Link href={homeHref} className="flex items-center gap-3 group">
            <img
              key={logoSrc}
              src={logoSrc}
              alt="Assam University Logo"
              className={`w-auto object-contain transition-all duration-300 ease-in-out ${scrolled ? "h-9" : "h-12 sm:h-14"
                } ${isDark ? "brightness-110 drop-shadow-sm" : ""}`}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://upload.wikimedia.org/wikipedia/en/6/6e/Assam_University_Logo.png";
              }}
            />
            <div className="flex flex-col justify-center">
              <div
                className={`font-extrabold tracking-tight transition-all duration-300 ease-in-out flex items-center gap-1.5 ${scrolled ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
                  }`}
              >
                <span className="text-primary dark:text-primary">SAMS</span>
                <span className="pb-1 font-semibold text-muted-foreground/70 text-[0.90em]">&nbsp;|&nbsp;</span>
                <span className="text-foreground/90 dark:text-foreground/90">AUS</span>
              </div>

              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${scrolled ? "max-h-0 opacity-0" : "max-h-8 opacity-100"
                  }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11.5px] font-medium text-muted-foreground tracking-normal">
                  <span>Student Attendance &amp; Management System</span>
                  <span className="font-semibold text-[1.1em] text-muted-foreground/70">•</span>
                  <span>Dept. of Computer Science</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Right Header Actions Order: ThemeToggle -> NotificationPopover -> UserProfileMenu */}
          <div
            className={`flex items-center transition-all duration-300 ease-in-out ${scrolled ? "gap-2 sm:gap-3" : "gap-5"
              }`}
          >
            <div
              className={`transition-all duration-300 ease-in-out transform origin-center ${scrolled ? "scale-85 sm:scale-90" : "scale-100"
                }`}
            >
              <ThemeToggle />
            </div>
            <div
              className={`transition-all duration-300 ease-in-out transform origin-center ${scrolled ? "scale-85 sm:scale-90" : "scale-100"
                }`}
            >
              <NotificationPopover />
            </div>
            <div
              className={`transition-all duration-300 ease-in-out transform origin-center ${scrolled ? "scale-85 sm:scale-90" : "scale-100"
                }`}
            >
              <UserProfileMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
