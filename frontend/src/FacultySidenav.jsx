// app/components/sidenav.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import LogoutButton from "@/src/logout";

const links = [
  { href: "/faculty/dashboard", label: "My Dashboard", icon: "👩‍🏫" },
  { href: "/faculty/list_students", label: "Students", icon: "🎓" },
  { href: "/faculty/take-attendance", label: "Take Attendance", icon: "🛠️" },
];

export default function FacultySideNav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = React.useState(true);

  React.useEffect(() => {
    const saved = localStorage.getItem("sidenav-expanded");
    if (saved !== null) setExpanded(saved === "true");
  }, []);

  React.useEffect(() => {
    localStorage.setItem("sidenav-expanded", String(expanded));
  }, [expanded]);

  return (
    <aside
      id="app-sidenav"
      className={
        // sticky + full viewport height
        "bg-[#f8fafb] border-slate-300 " +
        "transition-all duration-300 ease-in-out " +
        (expanded ? "w-64" : "w-16")
      }
      aria-label="Primary"
    >
      <div className="flex h-auto flex-col justify-between ">
        {/* Top: title + toggle + links */}
        <div>
          <div className="flex items-center justify-between p-3">
            <div className={"text-md font-semibold text-slate-900 overflow-hidden " + (expanded ? "opacity-100" : "opacity-0 pointer-events-none")}>
              Menu
            </div>
            <button
              type="button"
              className="rounded p-2 text-slate-600 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Toggle sidebar"
              aria-expanded={expanded}
              aria-controls="sidenav-list"
              onClick={() => setExpanded((e) => !e)}
              title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" className={"transition-transform " + (expanded ? "" : "rotate-180")}>
                <path fill="currentColor" d="M9 6l6 6-6 6" />
              </svg>
              {/*menu flip arrow*/}
            </button>
          </div>

          <ul id="sidenav-list" className="px-2 space-y-0 overflow-y-auto">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <li key={l.href} className="my-1">
                  <Link
                    href={l.href}
                    className={
                      "flex items-center rounded-md px-2 py-2 text-sm font-medium text-slate-900 transition-colors " +
                      (active ? "bg-indigo-200" : "hover:bg-indigo-200")
                    }
                    aria-current={active ? "page" : undefined}
                    title={!expanded ? l.label : undefined}
                  >
                    <span aria-hidden="true" className="shrink-0 text-lg">{l.icon}</span>
                    <span
                      className={
                        "whitespace-nowrap overflow-hidden transition-opacity duration-200 " +
                        (expanded ? "opacity-100" : "opacity-0 pointer-events-none")
                      }
                    >
                      {l.label}
                    </span>
                  </Link>
                </li>

              );
            })}
          </ul>

          {/* Bottom: divider + logout pinned */}
          <div className="p-2">
            <div className="border-t-2 border-slate-300 pt-2 mt-1 " aria-hidden="true" />
            <LogoutButton to="/login" />
          </div>
        </div>
      </div>
    </aside>
  );
}
