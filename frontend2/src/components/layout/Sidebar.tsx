"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFacultyMe } from "@/hooks/useFacultyMe";

interface NavLink {
  href: string;
  label: string;
  icon: string;
}

interface NavSection {
  key: "facultyWorkspace" | "departmentWorkspace";
  title: string;
  links: NavLink[];
}

const facultyLinks: NavLink[] = [
  { href: "/faculty/dashboard", label: "My Dashboard", icon: "📊" },
  { href: "/faculty/profile", label: "My Profile", icon: "👤" },
  { href: "/faculty/list_students", label: "My Students", icon: "🎓" },
  { href: "/faculty/attendance/take", label: "Take Attendance", icon: "📝" },
  { href: "/faculty/attendance/approve", label: "Approve Attendance", icon: "✅" },
];

const hodSections: NavSection[] = [
  {
    key: "facultyWorkspace",
    title: "Faculty Workspace",
    links: [
      { href: "/faculty/dashboard", label: "My Dashboard", icon: "📊" },
      { href: "/faculty/profile", label: "My Profile", icon: "👤" },
      { href: "/faculty/list_students", label: "My Students", icon: "🎓" },
      { href: "/faculty/attendance/take", label: "Take Attendance", icon: "📝" },
      { href: "/faculty/attendance/approve", label: "Approve Attendance", icon: "✅" },
    ],
  },
  {
    key: "departmentWorkspace",
    title: "Department Workspace",
    links: [
      { href: "/faculty/hod/dashboard", label: "HOD Dashboard", icon: "🏛️" },
      { href: "/faculty/hod/faculty", label: "Faculty Management", icon: "👥" },
      { href: "/faculty/hod/students", label: "Student Management", icon: "🎓" },
      { href: "/faculty/hod/curriculum", label: "Curriculum Catalog", icon: "📚" },
      { href: "/faculty/hod/reports", label: "Reports & Analytics", icon: "📈" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isHod } = useFacultyMe();

  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    facultyWorkspace: true,
    departmentWorkspace: true,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("portal_sidebar_expanded");
      if (saved !== null) {
        setExpanded(saved === "true");
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("portal_sidebar_expanded", String(next));
      } catch (e) {
        // Ignore
      }
      return next;
    });
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const activeInDepartment = pathname.includes("/hod/");

  const navContent = (
    <div className="flex h-full flex-col justify-between p-3.5">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white text-xl">
              🎓
            </div>
            {expanded && (
              <div className="truncate">
                <span className="font-extrabold text-foreground text-sm tracking-tight block truncate">
                  Academic Portal
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider block text-indigo-600 dark:text-indigo-400">
                  {isHod ? (activeInDepartment ? "Dept Workspace" : "Faculty Workspace") : "Faculty Mode"}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleExpanded}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150 min-h-[36px] min-w-[36px] grid place-items-center"
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {expanded ? "◀" : "▶"}
          </button>
        </div>

        {/* Links List */}
        <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
          {isHod ? (
            hodSections.map((sec) => (
              <div key={sec.key} className="mb-4">
                {expanded && (
                  <button
                    type="button"
                    onClick={() => toggleSection(sec.key)}
                    className="flex w-full items-center justify-between py-1.5 px-2 text-left text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80 hover:text-foreground rounded-lg transition-colors duration-150"
                  >
                    <span>{sec.title}</span>
                    <span className={`text-[10px] transition-transform duration-150 ${openSections[sec.key] ? "rotate-90" : ""}`}>
                      ▶
                    </span>
                  </button>
                )}

                <div className={expanded ? (openSections[sec.key] ? "mt-1 space-y-1 border-l-2 border-border pl-2.5 ml-1.5" : "hidden") : "space-y-1"}>
                  {sec.links.map((link) => {
                    const active = pathname === link.href || (link.href !== "/faculty/dashboard" && pathname.startsWith(link.href));
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        title={!expanded ? link.label : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors duration-150 min-h-[42px] ${
                          active
                            ? "bg-indigo-600 dark:bg-indigo-500 text-white"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span className="shrink-0 text-base">{link.icon}</span>
                        {expanded && <span className="truncate">{link.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-1">
              {facultyLinks.map((link) => {
                const active = pathname === link.href || (link.href !== "/faculty/dashboard" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={!expanded ? link.label : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors duration-150 min-h-[42px] ${
                      active
                        ? "bg-indigo-600 dark:bg-indigo-500 text-white"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="shrink-0 text-base">{link.icon}</span>
                    {expanded && <span className="truncate">{link.label}</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* User Logout Footer */}
      <div className="pt-3 border-t border-border mt-auto">
        <Link
          href="/login"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors duration-150"
        >
          <span className="text-base">🚪</span>
          {expanded && <span>Sign Out</span>}
        </Link>
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
          className="flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 text-xs font-extrabold shadow-lg active:scale-95 transition-all duration-150"
        >
          <span>☰ Portal Menu</span>
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 solid-card border-r border-border shadow-xl transition-transform duration-200 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop Responsive Sidebar */}
      <aside
        className={`hidden lg:block border-r border-border solid-card transition-all duration-200 ease-out h-screen sticky top-0 shrink-0 ${
          expanded ? "w-64" : "w-20"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
