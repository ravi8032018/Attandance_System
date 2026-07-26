"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserMe } from "@/hooks/useUserMe";
import { FacultyAvatar } from "@/components/ui/FacultyAvatar";
import { apiFetch } from "@/lib/api";

function UserIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function LogoutIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

export function UserProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { user, isStudent, isHod, isAdmin } = useUserMe();

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const firstName = user?.first_name || user?.name || "User";
  const lastName = user?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();

  const roleTitle = isStudent
    ? `Student ${user?.registration_no ? `(${user.registration_no})` : ""}`
    : isAdmin
    ? "System Administrator"
    : isHod
    ? "HOD / Professor"
    : "Faculty Member";

  const profileHref = isStudent
    ? "/student/profile"
    : "/faculty/profile";

  const dashboardHref = isStudent
    ? "/student/dashboard"
    : isAdmin
    ? "/admin/dashboard"
    : "/faculty/dashboard";

  const handleLogout = async () => {
    setOpen(false);
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (e) {
      // Ignore if endpoint is not present
    }
    router.push("/login");
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button: User Avatar */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center rounded-xl p-1 hover:bg-muted/80 border border-transparent hover:border-border transition-all duration-200 active:scale-95 shadow-xs"
        title={fullName}
        aria-label="User Menu"
      >
        <FacultyAvatar
          firstName={firstName}
          lastName={lastName}
          photoUrl={user?.photo_url}
          size="sm"
        />
      </button>

      {/* Popover Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-card border border-border shadow-2xl z-50 overflow-hidden text-foreground animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header Card Info */}
          <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-3">
            <FacultyAvatar
              firstName={firstName}
              lastName={lastName}
              photoUrl={user?.photo_url}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-extrabold text-foreground truncate leading-tight">
                {fullName}
              </h4>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate mt-0.5">
                {roleTitle}
              </p>
              {user?.email && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {user.email}
                </p>
              )}
            </div>
          </div>

          {/* Action Links */}
          <div className="p-2 space-y-1">
            <Link
              href={dashboardHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-colors"
            >
              <span>📊</span>
              <span>My Dashboard</span>
            </Link>

            <Link
              href={profileHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-colors"
            >
              <UserIcon className="text-indigo-500" />
              <span>My Profile</span>
            </Link>
          </div>

          {/* Footer: Sign Out Button */}
          <div className="p-2 border-t border-border bg-muted/20">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogoutIcon />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
