// app/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        // TODO: replace with your real aggregate API when you have one
        // for now we just set dummy numbers
        const fake = {
          totalStudents: 0,
          totalFaculty: 0,
          activeCourses: 0,
        };
        if (!cancelled) setStats(fake);
      } catch (e) {
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
          <h1 className="text-2xl font-semibold text-slate-900">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-600">
            Overview of students, faculty and courses.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : err ? (
        <p className="text-sm text-rose-700">{err}</p>
      ) : (
        <div className="space-y-6">
          {/* Top stats cards */}
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700">
                Total students
              </h2>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats?.totalStudents ?? 0}
              </p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700">
                Total faculty
              </h2>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats?.totalFaculty ?? 0}
              </p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700">
                Active courses
              </h2>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats?.activeCourses ?? 0}
              </p>
            </div>
          </section>

          {/* Placeholder for upcoming sections */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
              Quick actions
            </h2>
            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href="/admin/students"
                className="rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700"
              >
                Manage students
              </a>
              <a
                href="/admin/faculty"
                className="rounded-md border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50"
              >
                Manage faculty
              </a>
              <a
                href="/admin/settings"
                className="rounded-md border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50"
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
