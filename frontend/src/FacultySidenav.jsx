"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/src/logout";
import { useFacultyMe } from "@/src/getFacultyMe";

const facultyLinks = [
  { href: "/faculty/dashboard", label: "My Dashboard", icon: "📊" },
  { href: "/faculty/profile", label: "My Profile", icon: "👤" },
  { href: "/faculty/list_students", label: "My Students", icon: "🎓" },
  { href: "/faculty/attendance/take", label: "Take Attendance", icon: "📝" },
  { href: "/faculty/attendance/approve", label: "Approve Attendance", icon: "✅" },
];

const hodSections = [
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
      { href: "/faculty/hod/curriculum", label: "Curriculum", icon: "📚" },
      { href: "/faculty/hod/reports", label: "Reports", icon: "📊" },
    ],
  },
];

function NavLinkItem({ link, pathname, expanded, onClick }) {
  const active = pathname === link.href || (link.href !== "/faculty/dashboard" && pathname.startsWith(link.href));

  return (
    <li className="my-0.5">
      <Link
        href={link.href}
        onClick={onClick}
        className={
          "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 min-h-[40px] " +
          (active
            ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground")
        }
        aria-current={active ? "page" : undefined}
        title={!expanded ? link.label : undefined}
      >
        <span aria-hidden="true" className="shrink-0 text-base">
          {link.icon}
        </span>

        {expanded && (
          <span className="whitespace-nowrap overflow-hidden text-ellipsis">
            {link.label}
          </span>
        )}
      </Link>
    </li>
  );
}

function SidebarSection({
  section,
  pathname,
  expanded,
  isOpen,
  onToggle,
  onItemClick,
}) {
  return (
    <div className="mb-2">
      {expanded && (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between rounded-md py-1.5 px-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/60 focus:outline-none"
          aria-expanded={isOpen}
          aria-controls={`section-${section.key}`}
        >
          <span>{section.title}</span>
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
          >
            <path fill="currentColor" d="M9 6l6 6-6 6" />
          </svg>
        </button>
      )}

      {expanded ? (
        <div
          id={`section-${section.key}`}
          className={
            "overflow-hidden transition-all duration-300 ease-in-out " +
            (isOpen ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0")
          }
        >
          <ul className="space-y-0.5 border-l border-border/80 pl-2 ml-1">
            {section.links.map((link) => (
              <NavLinkItem
                key={link.href}
                link={link}
                pathname={pathname}
                expanded={expanded}
                onClick={onItemClick}
              />
            ))}
          </ul>
        </div>
      ) : (
        <ul className="space-y-1">
          {section.links.map((link) => (
            <NavLinkItem
              key={link.href}
              link={link}
              pathname={pathname}
              expanded={expanded}
              onClick={onItemClick}
            />
          ))}
          <div className="h-px my-2 bg-border" aria-hidden="true" />
        </ul>
      )}
    </div>
  );
}

export default function FacultySideNav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [openSections, setOpenSections] = useState({
    facultyWorkspace: true,
    departmentWorkspace: true,
  });

  const { faculty } = useFacultyMe();
  const isHod = faculty?.role?.includes("hod");

  useEffect(() => {
    const saved = window.localStorage.getItem("sidenav-expanded");
    if (saved !== null) {
      setExpanded(saved === "true");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sidenav-expanded", String(expanded));
  }, [expanded]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleSection(sectionKey) {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }

  const content = (
    <div className="flex h-full flex-col justify-between p-3">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎓</span>
            {expanded && <span className="font-bold text-foreground text-base tracking-tight">Academic Portal</span>}
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none min-h-[36px] min-w-[36px] grid place-items-center"
            aria-label="Toggle sidebar"
            onClick={() => setExpanded((prev) => !prev)}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {expanded ? "◀" : "▶"}
          </button>
        </div>

        {/* Navigation Sections */}
        <div id="sidenav-list" className="space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
          {isHod ? (
            hodSections.map((section) => (
              <SidebarSection
                key={section.key}
                section={section}
                pathname={pathname}
                expanded={expanded}
                isOpen={openSections[section.key]}
                onToggle={() => toggleSection(section.key)}
                onItemClick={() => setMobileOpen(false)}
              />
            ))
          ) : (
            <ul className="space-y-0.5">
              {facultyLinks.map((link) => (
                <NavLinkItem
                  key={link.href}
                  link={link}
                  pathname={pathname}
                  expanded={expanded}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className="pt-3 border-t border-border mt-auto">
        <LogoutButton to="/login" expanded={expanded} />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Floating Drawer Trigger */}
      <div className="fixed bottom-4 right-4 z-40 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-xl hover:opacity-90 active:scale-95 transition"
          aria-label="Open Navigation Menu"
        >
          <span>☰ Menu</span>
        </button>
      </div>

      {/* Mobile Drawer Overlay Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-Out Drawer Panel */}
      <aside
        className={
          "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border shadow-2xl transition-transform duration-300 ease-in-out lg:hidden " +
          (mobileOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        {content}
      </aside>

      {/* Desktop Responsive Sidebar */}
      <aside
        id="app-sidenav"
        className={
          "hidden lg:block border-r border-border bg-card/60 backdrop-blur-xs transition-all duration-300 ease-in-out h-screen sticky top-0 shrink-0 " +
          (expanded ? "w-64" : "w-16")
        }
        aria-label="Primary Workspace Navigation"
      >
        {content}
      </aside>
    </>
  );
}
