"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function FacultyProtectedLayout({ children }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const api = process.env.NEXT_PUBLIC_API_BASE;
        const res = await fetch(`${api}/verify-me`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          if (!cancelled) router.replace("/login");
          return;
        }

        const data = await res.json().catch(() => null);
        if (!data) {
          if (!cancelled) router.replace("/login");
          return;
        }

        const rolesRaw = data?.role ?? data?.roles ?? data?.token_role ?? [];
        const roles = Array.isArray(rolesRaw)
          ? rolesRaw.map((r) => String(r).toLowerCase().trim())
          : [String(rolesRaw).toLowerCase().trim()];

        const allowed = roles.includes("faculty") || roles.includes("hod");

        if (!cancelled && !allowed) {
          router.replace("/login");
          return;
        }
      } catch {
        if (!cancelled) router.replace("/login");
        return;
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    return <div className="p-6 text-sm text-slate-600">Checking session…</div>;
  }

  return <>{children}</>;
}