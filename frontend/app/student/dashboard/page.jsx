// src/student/StudentDashboardClient.tsx
"use client";

import { apiFetch } from "@/src/api_fetch";
import { useEffect, useState } from "react";

export default function StudentDashboardClient() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr("");
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
        const res = await apiFetch(`${base}/student/me`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (res.status === 401) {
          if (typeof window !== "undefined") window.location.href = "/login";
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            typeof data?.detail === "string"
              ? data.detail
              : data?.message || "Failed to load profile";
          throw new Error(msg);
        }

        if (cancelled) return;
        setStudent(data);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const fullName =
    (student?.first_name || "") + (student?.last_name ? " " + student.last_name : "");

  return (
    <main className="p-6">
      {/* <NotificationPanel /> */}
      {/* Header similar in spirit to faculty dashboard */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Student Dashboard
        </h1>
        <p className="text-sm text-slate-600">
          Welcome back, {student?.first_name || "student"}
        </p>
      </header>

      {loading ? (
        <div className="space-y-4">
          <div className="h-24 w-full max-w-xl animate-pulse rounded-xl bg-slate-100" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      ) : err ? (
        <p className="text-sm text-rose-700">{err}</p>
      ) : student ? (
        <div className="space-y-6">
          {/* Top card: basic info */}
        <section className="mb-4 rounded-xl border bg-white p-4 shadow-sm hover:shadow-lg">
            {loading ? (
            <div className="animate-pulse">
                <div className="h-13 w-60 rounded bg-slate-200" />
                <div className="mt-2 h-4 w-96 rounded bg-slate-200" />
            </div>
            ) : err ? (
            <div className="text-rose-700">{err}</div>
            ) : student ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: Avatar + identity */}
                <div className="flex items-start gap-3">
                {/* Avatar with image + initials fallback */}
                <div className="relative">
                    {student.photo_url ? (
                    <img
                        src={student.photo_url}
                        alt={`${fullName} photo`}
                        className="h-auto w-55 rounded-full object-cover ring-1 ring-gray-500"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                    />
                    ) : (
                    <div
                        className="h-16 w-16 rounded-full grid place-items-center ring-2 ring-slate-200 bg-indigo-100 text-indigo-800"
                        aria-label="avatar initials"
                    >
                        <span className="font-semibold">
                        {(student.first_name)?.toUpperCase() || ""}
                        {(student.last_name)?.toUpperCase() || ""}
                        </span>
                    </div>
                    )}
                </div>

                {/* Identity text */}
                <div className={`text-md`}>
                    <h1 className="text-2xl font-semibold">{fullName}</h1>
                    <p className="mt-0.5 text-slate-600">
                    Reg no: <span className="font-medium">{student.registration_no}<br></br></span>
                    </p>
                    <p className="text-slate-600">
                    Course: {student.course ?? "—"}<br></br>Sem: {student.semester ?? "—"}
                    </p>
                </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col sm:items-end sm:justify-end pt-21">
                <div className="flex gap-2">
                <a
                    href={`#`}
                    className="inline-flex items-center justify-center rounded-md border-2 border-indigo-600 bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 shadow-sm hover:shadow-md"
                >
                    View attendance
                </a>
                    <button className="rounded-md border border-indigo-600 bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 shadow-sm hover:shadow-md">
                    Message student
                    </button>
                    <button className="rounded-md border px-3 py-2 text-sm border-indigo-600 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:drop-shadow-md">
                    Export profile
                    </button>
                </div>
                </div>
            </div>
            ) : (
            <div className="text-slate-600">No profile found.</div>
            )}
        </section>

          {/* Second row: quick tiles (you can later wire to attendance, courses etc.) */}
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Attendance
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                View your subject‑wise attendance.
              </p>
              <a
                href="/student/attendance"
                className="mt-3 inline-flex text-xs font-medium text-indigo-600 hover:underline"
              >
                Open → 
              </a>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Profile</h3>
              <p className="mt-1 text-xs text-slate-600">
                Update contact details and guardian info.
              </p>
              <a
                href="/student/profile"
                className="mt-3 inline-flex text-xs font-medium text-indigo-600 hover:underline"
              >
                Edit profile →
              </a>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Security
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Change your account password.
              </p>
              <a
                href="/student/security"
                className="mt-3 inline-flex text-xs font-medium text-indigo-600 hover:underline"
              >
                Change password →
              </a>
            </div>
          </section>
        </div>
      ) : (
        <p className="text-sm text-slate-600">No profile data found.</p>
      )}
    </main>
  );
}
