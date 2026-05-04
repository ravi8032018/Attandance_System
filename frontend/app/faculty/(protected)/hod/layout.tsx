"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HodLayout({ children }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const api = process.env.NEXT_PUBLIC_API_BASE;

        const res = await fetch(`${api}/faculty/me`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          if (!cancelled) router.replace("/login");
          return;
        }

        const data = await res.json().catch(() => null);
        console.log("HOD Layout - Fetched user details:", data); // Debug log

        if (!data) {
          if (!cancelled) router.replace("/login");
          return;
        }

        const rolesRaw = data?.role ?? data?.roles ?? data?.token_role ?? [];
        const roles = Array.isArray(rolesRaw)
          ? rolesRaw.map((r) => String(r).toLowerCase().trim())
          : [String(rolesRaw).toLowerCase().trim()];

        const isHod = roles.includes("hod");
        console.log("HOD Layout - User roles:", roles, "Is HOD?", isHod); // Debug log

        if (!cancelled && !isHod) {
          router.replace("/faculty/dashboard");
          return;
        }
      } catch (e) {
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
    return <div className="p-6 text-sm text-muted-foreground">Checking session…</div>;
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row md:overflow-hidden">
      <aside className="bg-muted border-r-2 border-[#d2d9d8]">
        {/* <FacultySideNav /> */}
      </aside>

      <main className="flex-1 p-6 md:overflow-y-auto md:p-0">
        {children}
      </main>
    </div>
  );
}