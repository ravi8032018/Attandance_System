"use client";

import { useEffect, useState } from "react";

export default function AdminDashboardClient() {
  const [stats, setStats] = useState<null | {
    totalStudents: number;
    totalFaculty: number;
    activeCourses: number;
  }>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const fake = {
          totalStudents: 0,
          totalFaculty: 0,
          activeCourses: 0,
        };
        if (!cancelled) setStats(fake);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load stats");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6">
      <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of students, faculty and courses.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : err ? (
        <p className="text-sm text-error">{err}</p>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">
                Total students
              </h2>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {stats?.totalStudents ?? 0}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">
                Total faculty
              </h2>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {stats?.totalFaculty ?? 0}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">
                Active courses
              </h2>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {stats?.activeCourses ?? 0}
              </p>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Quick actions
            </h2>
            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href="/admin/students"
                className="rounded-md bg-primary px-3 py-2 text-white hover:opacity-90"
              >
                Manage students
              </a>
              <a
                href="/admin/faculty"
                className="rounded-md border border-border px-3 py-2 text-foreground hover:bg-muted"
              >
                Manage faculty
              </a>
              <a
                href="/admin/settings"
                className="rounded-md border border-border px-3 py-2 text-foreground hover:bg-muted"
              >
                System settings
              </a>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
