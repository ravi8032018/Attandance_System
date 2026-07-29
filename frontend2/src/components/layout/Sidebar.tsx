"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserMe } from "@/hooks/useUserMe";
import { useNotifications } from "@/hooks/useNotifications";
import { apiFetch } from "@/lib/api";

interface NavItem {
  href: string;
  label: string;
  badge?: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

// Vector Icons (24px x 24px)
function DashboardIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-6 h-6 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function ProfileIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-6 h-6 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function NotificationIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-6 h-6 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function StudentsIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-6 h-6 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  );
}

function TakeAttendanceIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-6 h-6 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function ApproveAttendanceIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-6 h-6 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function HodDashboardIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-6 h-6 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0l2 2m-2-2l-2 2" />
    </svg>
  );
}

function FacultyManagementIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-6 h-6 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function CurriculumIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-6 h-6 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function ReportsIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-6 h-6 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function HamburgerIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

const studentNavItems: NavItem[] = [
  { href: "/student/dashboard", label: "My Dashboard", icon: DashboardIcon },
  { href: "/student/profile", label: "My Profile", icon: ProfileIcon },
  { href: "/student/reports", label: "My Reports", icon: ReportsIcon },
  { href: "/student/notifications", label: "Notifications & Alerts", icon: NotificationIcon },
];

const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/admin/departments", label: "Departments", icon: FacultyManagementIcon },
  { href: "/admin/students", label: "Students", icon: StudentsIcon },
  { href: "/admin/courses", label: "Courses", icon: CurriculumIcon },
  { href: "/admin/reports", label: "Reports & Analytics", icon: ReportsIcon },
  { href: "/student/notifications", label: "Notifications & Alerts", icon: NotificationIcon },
];

const facultyNavItems: NavItem[] = [
  { href: "/faculty/dashboard", label: "My Dashboard", icon: DashboardIcon },
  { href: "/faculty/profile", label: "My Profile", icon: ProfileIcon },
  { href: "/faculty/list_students", label: "My Students", icon: StudentsIcon },
  { href: "/faculty/attendance/take", label: "Take Attendance", icon: TakeAttendanceIcon },
  { href: "/faculty/attendance/approve", label: "Approve Attendance", icon: ApproveAttendanceIcon },
  { href: "/faculty/reports", label: "Reports & Analytics", icon: ReportsIcon },
  { href: "/faculty/notifications", label: "Notifications & Alerts", icon: NotificationIcon },
];

const hodNavItems: NavItem[] = [
  { href: "/faculty/hod/dashboard", label: "HoD Dashboard", icon: HodDashboardIcon },
  { href: "/faculty/hod/faculty", label: "Faculty Registry", icon: FacultyManagementIcon },
  { href: "/faculty/hod/students", label: "Student Registry", icon: StudentsIcon },
  { href: "/faculty/hod/curriculum", label: "Curriculum Catalog", icon: CurriculumIcon },
  { href: "/faculty/hod/reports", label: "Reports & Analytics", icon: ReportsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isStudent, isFaculty, isHod, isAdmin, isCr } = useUserMe();
  const { unreadCount } = useNotifications(10000);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeStudentNavItems: NavItem[] = [
    ...studentNavItems,
    ...(isCr ? [{ href: "/student/cr", label: "CR Console", icon: TakeAttendanceIcon, badge: "CR" }] : []),
  ];

  useEffect(() => {
    try {
      const saved = localStorage.getItem("portal_sidebar_expanded");
      if (saved !== null) {
        setExpanded(saved === "true");
      }
    } catch (e) {
      // Fallback
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Fetch pending attendance approvals count for Faculty / HOD
  useEffect(() => {
    if (isFaculty || isHod) {
      async function fetchPendingCount() {
        try {
          const res = await apiFetch("/attendance/approvals?status=pending");
          if (res.ok) {
            const data = await res.json();
            setPendingApprovalsCount(data.total || (data.items ? data.items.length : 0));
          }
        } catch (e) {
          // Silent catch
        }
      }

      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 10000);
      return () => clearInterval(interval);
    }
  }, [isFaculty, isHod]);

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("portal_sidebar_expanded", String(next));
      } catch (e) {
        // Fallback
      }
      return next;
    });
  }

  // Check active navigation link
  const isLinkActive = (href: string) => {
    if (
      href === "/faculty/dashboard" ||
      href === "/student/dashboard" ||
      href === "/admin/dashboard" ||
      href === "/faculty/hod/dashboard"
    ) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const renderNavSection = (title: string, items: NavItem[], isExpanded: boolean, isMobileDrawer: boolean) => (
    <div>
      <div
        className={`px-2 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70 ${isExpanded ? "max-h-8 opacity-100 py-1 mb-1" : "max-h-0 opacity-0 py-0 mb-0"
          }`}
      >
        {title}
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const active = isLinkActive(item.href);
          const IconComponent = item.icon;

          const isNotificationItem = item.href.includes("notifications");
          const isApproveItem = item.href.includes("/attendance/approve");

          const showNotifDot = isNotificationItem && unreadCount > 0;
          const showApproveDot = isApproveItem && pendingApprovalsCount > 0;
          const hasRedDot = showNotifDot || showApproveDot;

          const displayBadge = showNotifDot
            ? unreadCount > 9 ? "9+" : String(unreadCount)
            : showApproveDot
              ? String(pendingApprovalsCount)
              : item.badge;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (isMobileDrawer) setMobileOpen(false);
              }}
              title={!isExpanded ? item.label : undefined}
              className={`group relative flex items-center rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-300 ease-in-out h-10 ${active
                ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm font-bold"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <IconComponent
                  className={`w-6 h-6 transition-transform duration-200 group-hover:scale-105 ${active ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                />
                {/* Red Dot indicator on icon when sidebar is collapsed */}
                {hasRedDot && !isExpanded && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-card animate-pulse" />
                )}
              </div>

              <span
                className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? "max-w-48 opacity-100 ml-3" : "max-w-0 opacity-0 ml-0"
                  }`}
              >
                {item.label}
              </span>

              {/* Glowing Red Dot or Count Badge when sidebar is expanded */}
              {displayBadge && isExpanded && (
                <span
                  className={`ml-auto flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${hasRedDot
                      ? "bg-rose-500 text-white shadow-xs animate-pulse"
                      : active
                        ? "bg-white/20 text-white"
                        : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                    }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                  <span>{displayBadge}</span>
                </span>
              )}

              {!isExpanded && (
                <div className="absolute left-full ml-3 z-50 hidden group-hover:flex items-center gap-2 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-3 py-1.5 text-xs font-bold whitespace-nowrap shadow-lg">
                  <span>{item.label}</span>
                  {hasRedDot && (
                    <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  const renderNavContent = (isExpanded: boolean, isMobileDrawer = false) => (
    <div className="flex h-full flex-col justify-between p-3 select-none pb-6">
      {/* Top Header: Hamburger Toggle */}
      <div className="shrink-0 flex items-center justify-between pb-2 mb-2 border-b border-border/70">
        <button
          type="button"
          onClick={() => {
            if (isMobileDrawer) {
              setMobileOpen(false);
            } else {
              toggleExpanded();
            }
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-card hover:bg-muted text-foreground border border-border transition-all duration-300 active:scale-95 shadow-xs ml-2"
          title={isMobileDrawer ? "Close Menu" : isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          aria-label="Toggle Sidebar Menu"
        >
          <HamburgerIcon />
        </button>
      </div>

      {/* Middle Navigation Groups */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-0 custom-scrollbar">
        {isStudent ? (
          renderNavSection("Student Workspace", activeStudentNavItems, isExpanded, isMobileDrawer)
        ) : isAdmin ? (
          renderNavSection("System Administration", adminNavItems, isExpanded, isMobileDrawer)
        ) : (
          <>
            {renderNavSection("Faculty Workspace", facultyNavItems, isExpanded, isMobileDrawer)}
            {isHod && renderNavSection("Department Management", hodNavItems, isExpanded, isMobileDrawer)}
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Trigger Button */}
      <div className="fixed bottom-5 right-5 z-40 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-extrabold shadow-xl active:scale-95 transition-all duration-150 relative"
        >
          <span>☰ Menu</span>
          {(unreadCount > 0 || pendingApprovalsCount > 0) && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
          )}
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {renderNavContent(true, true)}
      </aside>

      {/* Desktop Responsive Sidebar below TopHeader */}
      <aside
        className={`hidden lg:block border-r border-border/70 bg-card/90 backdrop-blur-md transition-all duration-300 ease-in-out sticky top-[57px] h-[calc(100vh-57px)] shrink-0 ${expanded ? "w-60" : "w-20"
          }`}
      >
        {renderNavContent(expanded, false)}
      </aside>
    </>
  );
}
