
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/faculty/dashboard", label: "Faculty" },
  { href: "/faculty/list_students", label: "Student" },
  { href: "/admin/dashboard", label: "Admin" },
];

export default function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="h-full p-3 bg-slate-50">
      <div className="mb-4 text-md text-right font-semibold text-slate-900">Menu</div>
      <ul className="space-y-2">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={
                  "block rounded-md px-3 py-2 text-md font-mono font-medium text-slate-900 " +
                  (active
                    ? "bg-indigo-200"
                    : "hover:bg-indigo-200")
                }
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}