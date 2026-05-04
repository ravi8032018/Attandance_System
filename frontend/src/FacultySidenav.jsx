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
      { href: "/faculty/hod/dashboard", label: "HOD Dashboard", icon: "🏛️" },
      { href: "/faculty/hod/faculty", label: "Faculty Management", icon: "👥" },
      { href: "/faculty/hod/students", label: "Student Management", icon: "🎓" },
      { href: "/faculty/hod/curriculum", label: "Curriculum", icon: "📚" },
      { href: "/faculty/hod/reports", label: "Reports", icon: "📊" },
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
          "flex items-center gap-3 rounded-md p-1 text-sm font-medium text-foreground transition-colors " +
          (active ? "bg-primary/30" : "hover:bg-primary/10")
        }
        aria-current={active ? "page" : undefined}
        title={!expanded ? link.label : undefined}
      >
        <span aria-hidden="true" className="shrink-0 text-lg pl-1">
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
    <div className="">
      {/* section header when sidenav is expanded */}
      {expanded && (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between rounded-md pt-2 pb-2 pl-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted focus:outline-none "
          aria-expanded={isOpen}
          aria-controls={`section-${section.key}`}
        >
          <span className="px-1">{section.title}</span>

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

      {/* items in each section */}
      {expanded ? (
        <div
          id={`section-${section.key}`}
          className={
            "overflow-hidden transition-all duration-300 ease-in-out pl-3 " +
            (isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0")
          }
        >
          <ul className="space-y-0 pl-1 border-l-2 border-border">
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
        // item in section when closed
        <ul className="space-y-1">
          {section.links.map((link) => (
            <NavLinkItem
              key={link.href}
              link={link}
              pathname={pathname}
              expanded={expanded}
            />
          ))}
        <div className="h-[3px] mb-2 bg-border" aria-hidden="true" />

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
        "border-r border-border bg-muted/30 transition-all duration-300 ease-in-out " +
        (expanded ? "w-64" : "w-14")
      }
      aria-label="Primary"
    >
      <div className="flex min-h-scree flex-col justify-between">
        <div>
          {/* menu part */}
          <div className="flex items-center justify-between">
            {/* expanded menu> */}
            {expanded ? (
              <div className="flex gap-40 items-baseline text-md font-semibold text-foreground mx-4 my-1 ">
                <span>Menu</span>
                <button
                  type="button"
                  className="px-1.5 rounded-sm text-foreground font-semibold hover:bg-muted focus:outline-none"
                  aria-label="Toggle sidebar"
                  aria-expanded={expanded}
                  aria-controls="sidenav-list"
                  onClick={() => setExpanded((prev) => !prev)}
                  title={expanded ? "Collapse sidebar" : "Expand sidebar"}
                  >
                    ☰
                </button>
              </div>
            ) : (
              <div className="pt-1 pl-3.5 text-lg font-semibold text-foreground transition-all duration-300 ease-in-out">
                <button
                  type="button"
                  className="rounded p-1.5 text-foreground font-semibold hover:bg-muted focus:outline-none"
                  aria-label="Toggle sidebar"
                  aria-expanded={expanded}
                  aria-controls="sidenav-list"
                  onClick={() => setExpanded((prev) => !prev)}
                  title={expanded ? "Collapse sidebar" : "Expand sidebar"}
                >
                  ☰
                </button>
              </div>
            )}
          </div>
            {/* hod sections */}
          <div id="sidenav-list" className="space-y-0 overflow-y-auto px-2">
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

            {/* logout button */}
        {expanded ? (
              <div className="m-2 pt-2 border-t-2 border-border ">
                <div className="" aria-hidden="true" />
                <LogoutButton to="/login" className=""/>
              </div>
            ) : (
              <div className="ml-2 mr-2 mt-1  ">
                <div className="" aria-hidden="true" />
                <LogoutButton to="/login" expanded={expanded} />
              </div>
            )}
        
      </div>
    </aside>
  );
}
