// // sidenav.jsx
// "use client";
//
// import Link from "next/link";
// import { usePathname } from "next/navigation";
//
// const links = [
//   { href: "/faculty/dashboard", label: "Faculty" },
//   { href: "/faculty/list_students", label: "Student" },
//   { href: "/admin/dashboard", label: "Admin" },
// ];
//
// export default function SideNav() {
//   const pathname = usePathname();
//   return (
//     <nav className="h-full p-3 bg-slate-50">
//       <div className="mb-4 text-md text-right font-semibold text-slate-900">Menu</div>
//       <ul className="space-y-2">
//         {links.map((l) => {
//           const active = pathname === l.href || pathname.startsWith(l.href + "/");
//           return (
//             <li key={l.href}>
//               <Link
//                 href={l.href}
//                 className={
//                   "block rounded-md px-3 py-2 text-md font-mono font-medium text-slate-900 " +
//                   (active
//                     ? "bg-indigo-200"
//                     : "hover:bg-indigo-200")
//                 }
//               >
//                 {l.label}
//               </Link>
//             </li>
//           );
//         })}
//       </ul>
//     </nav>
//   );
// }


// app/components/sidenav.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const links = [
  { href: "/faculty/dashboard", label: "Faculty", icon: "👩‍🏫" },
  { href: "/faculty/list_students", label: "Student", icon: "🎓" },
  { href: "/admin/dashboard", label: "Admin", icon: "🛠️" },
];

export default function SideNav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = React.useState(true);

  // Optional: remember last state
  React.useEffect(() => {
    const saved = localStorage.getItem("sidenav-expanded");
    if (saved !== null) setExpanded(saved === "true");
  }, []);
  React.useEffect(() => {
    localStorage.setItem("sidenav-expanded", String(expanded));
  }, [expanded]);

  return (
    <nav
      id="app-sidenav"
      className={
        "h-full bg-slate-50 border-r border-slate-200 transition-all duration-300 ease-in-out " +
        (expanded ? "w-64" : "w-16")
      }
      aria-label="Primary"
    >
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
          {/* simple chevron icon */}
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" className={"transition-transform " + (expanded ? "" : "rotate-180")}>
            <path fill="currentColor" d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <ul id="sidenav-list" className="px-2 space-y-1">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={
                  "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-slate-900 transition-colors " +
                  (active ? "bg-indigo-200" : "hover:bg-indigo-200")
                }
                aria-current={active ? "page" : undefined}
                title={!expanded ? l.label : undefined}
              >
                <span aria-hidden="true" className="shrink-0 text-lg">
                  {l.icon}
                </span>
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
    </nav>
  );
}
