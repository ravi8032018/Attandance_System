"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserMe } from "@/hooks/useUserMe";
import { FacultyAvatar } from "@/components/ui/FacultyAvatar";
import { apiFetch } from "@/lib/api";
import { FeedbackModal } from "@/components/modals/FeedbackModal";

function UserIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function SettingsIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function BellIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function FeedbackIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function HelpIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { user, isStudent, isFaculty, isHod, isAdmin, isCr } = useUserMe();

  // Close popover when clicking outside or hitting Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const firstName = user?.first_name || user?.name || "User";
  const lastName = user?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "User Account";
  const userEmail = user?.email || "";
  const department = user?.department || "";
  const semester = user?.sem || user?.semester || null;

  // Single Authority Badge Resolution (Hierarchy: Admin > HOD > CR > Faculty > Student)
  const authority = isAdmin
    ? {
      title: "System Administrator",
      badge: "Admin",
      badgeStyle: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    }
    : isHod
      ? {
        title: "Head of Department",
        badge: "HOD",
        badgeStyle: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      }
      : isCr
        ? {
          title: "Class Representative",
          badge: "CR",
          badgeStyle: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
        }
        : isFaculty
          ? {
            title: "Faculty Member",
            badge: "Faculty",
            badgeStyle: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
          }
          : {
            title: "Student",
            badge: "Student",
            badgeStyle: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
          };

  // Profile & Action Hrefs
  const profileHref = isAdmin
    ? "/admin/profile"
    : isStudent
      ? "/student/profile"
      : "/faculty/profile";

  const securityHref = isAdmin
    ? "/admin/profile"
    : isStudent
      ? "/student/profile"
      : "/faculty/profile";

  const notificationsHref = isAdmin
    ? "/admin/notifications"
    : isStudent
      ? "/student/notifications"
      : "/faculty/notifications";

  const handleLogout = async () => {
    setOpen(false);
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (e) {
      // Ignore if endpoint missing
    }
    router.push("/login");
  };

  return (
    <>
      <div className="relative" ref={popoverRef}>
        {/* Trigger Button: Clean User Avatar without green dot */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="relative group flex items-center justify-center rounded-2xl p-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:bg-muted/80 active:scale-95"
          title={`${fullName} • ${authority.title}`}
          aria-label="User Profile Menu"
          aria-expanded={open}
          aria-haspopup="true"
        >
          <FacultyAvatar
            firstName={firstName}
            lastName={lastName}
            photoUrl={user?.photo_url}
            size="sm"
          />
        </button>

        {/* Glassmorphic Dropdown Container */}
        {open && (
          <div className="absolute right-0 mt-2.5 w-72 sm:w-80 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl z-50 overflow-hidden text-foreground animate-in fade-in zoom-in-95 duration-150">

            {/* Identity Plate */}
            <div className="p-4 border-b border-border/80 bg-muted/30">
              <div className="flex items-center gap-3.5">
                <FacultyAvatar
                  firstName={firstName}
                  lastName={lastName}
                  photoUrl={user?.photo_url}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-sm font-black text-foreground truncate leading-tight">
                      {fullName}
                    </h4>
                    <span className={`px-2 py-0.5 text-[10px] font-black rounded-md border ${authority.badgeStyle}`}>
                      {authority.badge}
                    </span>
                  </div>
                  {userEmail && (
                    <p className="text-[11px] font-medium text-muted-foreground truncate mt-0.5">
                      {userEmail}
                    </p>
                  )}
                  {(department || semester) && (
                    <p className="text-[10px] font-semibold text-muted-foreground/80 truncate mt-1">
                      {isStudent && semester ? (
                        <>
                          <span className="text-foreground/90 font-bold">Sem {semester}</span>
                          {department ? <> • Dept: <span className="font-bold text-foreground/90">{department}</span></> : null}
                        </>
                      ) : department ? (
                        <>
                          Dept: <span className="font-bold text-foreground/90">{department}</span>
                        </>
                      ) : null}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Matrix */}
            <div className="p-2 space-y-0.5">
              <Link
                href={profileHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-muted/80 transition-all group"
              >
                <UserIcon className="text-indigo-500 group-hover:scale-110 transition-transform" />
                <span>View Profile</span>
              </Link>

              <Link
                href={securityHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-muted/80 transition-all group"
              >
                <SettingsIcon className="text-slate-500 dark:text-slate-400 group-hover:scale-110 transition-transform" />
                <span>Account Security</span>
              </Link>

              <Link
                href={notificationsHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-muted/80 transition-all group"
              >
                <BellIcon className="text-amber-500 group-hover:scale-110 transition-transform" />
                <span>Notification Settings</span>
              </Link>
            </div>

            {/* Feedback & Support Section (Single Icon, Standard Item Style) */}
            <div className="p-2 border-t border-border/80 space-y-0.5 bg-muted/20">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setFeedbackModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-muted/80 transition-all group"
              >
                <FeedbackIcon className="text-indigo-500 group-hover:scale-110 transition-transform" />
                <span>Submit Feedback / Report Bug</span>
              </button>

              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <HelpIcon className="text-muted-foreground" />
                <span>Help &amp; Documentation</span>
              </a>
            </div>

            {/* Controlled Ejection Footer */}
            <div className="p-2 border-t border-border/80 bg-muted/30 space-y-2">
              <div className="px-2 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Session Encrypted
                </span>
                <span className="font-mono text-[9px] text-muted-foreground/70">
                  SAMS v2.0
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all border border-transparent hover:border-rose-500/20 active:scale-95"
              >
                <LogoutIcon />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Global Feedback Modal Payload */}
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
      />
    </>
  );
}
