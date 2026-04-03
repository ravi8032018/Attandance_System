// app/components/sidenav.jsx
"use client";

import React from "react";
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
      { href: "/hod/dashboard", label: "HOD Dashboard", icon: "🏛️" },
      { href: "/hod/faculty", label: "Faculty Management", icon: "👥" },
      { href: "/hod/students", label: "Student Management", icon: "🎓" },
      { href: "/hod/curriculum", label: "Curriculum", icon: "📚" },
      { href: "/hod/reports", label: "Reports", icon: "📊" },
    ],
  },
];

function NavLinkItem({ link, pathname, expanded }) {
  const active = pathname === link.href || pathname.startsWith(link.href + "/");

  return (
    <li className="my-1">
      <Link
        href={link.href}
        className={
          "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-slate-900 transition-colors " +
          (active ? "bg-indigo-200" : "hover:bg-indigo-100")
        }
        aria-current={active ? "page" : undefined}
        title={!expanded ? link.label : undefined}
      >
        <span aria-hidden="true" className="shrink-0 text-lg">
          {link.icon}
        </span>

        {expanded && (
          <span className="whitespace-nowrap overflow-hidden">
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
}) {
  return (
    <div className="rounded-lg">
      {expanded && (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-100"
          aria-expanded={isOpen}
          aria-controls={`section-${section.key}`}
        >
          <span>{section.title}</span>

          <svg
            aria-hidden="true"
            width="16"
            height="16"
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
            (isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0")
          }
        >
          <ul className="space-y-0">
            {section.links.map((link) => (
              <NavLinkItem
                key={link.href}
                link={link}
                pathname={pathname}
                expanded={expanded}
              />
            ))}
          </ul>
        </div>
      ) : (
        <ul className="space-y-0">
          {section.links.map((link) => (
            <NavLinkItem
              key={link.href}
              link={link}
              pathname={pathname}
              expanded={expanded}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function FacultySideNav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = React.useState(true);

  const [openSections, setOpenSections] = React.useState({
    facultyWorkspace: true,
    departmentWorkspace: true,
  });

  const { faculty } = useFacultyMe();
  const isHod = faculty?.role?.includes("hod");

  React.useEffect(() => {
    const saved = window.localStorage.getItem("sidenav-expanded");
    if (saved !== null) {
      setExpanded(saved === "true");
    }
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem("sidenav-expanded", String(expanded));
  }, [expanded]);

  function toggleSection(sectionKey) {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }

  return (
    <aside
      id="app-sidenav"
      className={
        "border-r border-slate-300 bg-[#f8fafb] transition-all duration-300 ease-in-out " +
        (expanded ? "w-64" : "w-16")
      }
      aria-label="Primary"
    >
      <div className="flex min-h-screen flex-col justify-between">
        <div>
          <div className="flex items-center justify-between p-3">
            {expanded ? (
              <div className="text-md font-semibold text-slate-900">Menu</div>
            ) : (
              <div />
            )}

            <button
              type="button"
              className="rounded p-2 text-slate-600 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Toggle sidebar"
              aria-expanded={expanded}
              aria-controls="sidenav-list"
              onClick={() => setExpanded((prev) => !prev)}
              title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                className={expanded ? "transition-transform" : "rotate-180 transition-transform"}
              >
                <path fill="currentColor" d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>

          <div id="sidenav-list" className="space-y-4 overflow-y-auto px-2">
            {isHod ? (
              hodSections.map((section) => (
                <SidebarSection
                  key={section.key}
                  section={section}
                  pathname={pathname}
                  expanded={expanded}
                  isOpen={openSections[section.key]}
                  onToggle={() => toggleSection(section.key)}
                />
              ))
            ) : (
              <ul className="space-y-0">
                {facultyLinks.map((link) => (
                  <NavLinkItem
                    key={link.href}
                    link={link}
                    pathname={pathname}
                    expanded={expanded}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="p-2">
          <div className="mt-1 border-t-2 border-slate-300 pt-2" aria-hidden="true" />
          <LogoutButton to="/login" />
        </div>
      </div>
    </aside>
  );
}