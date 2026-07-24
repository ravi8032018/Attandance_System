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
        const base = process.env.NEXT_PUBLIC_API_BASE  ;
        const res = await apiFetch(`${base}/student/me`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (res.status === 401) {
          console.log("--> response status 401 from get /student/me in Student dashboard : ");
          if (typeof window !== "undefined") window.location.href = "/login";
          return;
        }

        const data = await res.json().catch(() => ({}));
        console.log("--> data from get /student/me : ",data);
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
        <h1 className="text-2xl font-semibold text-foreground">
          Student Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {student?.first_name || "student"}
        </p>
      </header>

      {loading ? (
        <div className="space-y-4">
          <div className="h-24 w-full max-w-xl animate-pulse rounded-xl bg-muted" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      ) : err ? (
        <p className="text-sm text-error">{err}</p>
      ) : student ? (
        <div className="space-y-6">
          {/* Top card: basic info */}
        <section className="mb-4 rounded-xl border bg-card p-4 shadow-sm hover:shadow-lg">
            {loading ? (
            <div className="animate-pulse">
                <div className="h-13 w-60 rounded bg-muted" />
                <div className="mt-2 h-4 w-96 rounded bg-muted" />
            </div>
            ) : err ? (
            <div className="text-error">{err}</div>
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
                        className="h-16 w-16 rounded-full grid place-items-center ring-2 ring-border bg-primary/20 text-primary"
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
                    <p className="mt-0.5 text-muted-foreground">
                    Reg no: <span className="font-medium">{student.registration_no}<br></br></span>
                    </p>
                    <p className="text-muted-foreground">
                    Course: {student.course ?? "—"}<br></br>Sem: {student.semester ?? "—"}
                    </p>
                </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col sm:items-end sm:justify-end pt-21">
                <div className="flex gap-2">
                <a
                    href={`#`}
                    className="inline-flex items-center justify-center rounded-md border-2 border-primary bg-primary px-3 py-2 text-sm text-white hover:opacity-90 shadow-sm hover:shadow-md"
                >
                    View attendance
                </a>
                    <button className="rounded-md border border-primary bg-primary px-3 py-2 text-sm text-white hover:opacity-90 shadow-sm hover:shadow-md">
                    Message student
                    </button>
                    <button className="rounded-md border px-3 py-2 text-sm border-primary bg-primary hover:opacity-90 text-white shadow-sm hover:drop-shadow-md">
                    Export profile
                    </button>
                </div>
                </div>
            </div>
            ) : (
            <div className="text-muted-foreground">No profile found.</div>
            )}
        </section>

          {/* Second row: quick tiles with attendance progress */}
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Overall Attendance
                </h3>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  (student?.attendance_percentage ?? 82) >= 75
                    ? "bg-success/15 text-success border border-success/30"
                    : (student?.attendance_percentage ?? 82) >= 60
                    ? "bg-warning/15 text-warning border border-warning/30"
                    : "bg-error/15 text-error border border-error/30"
                }`}>
                  {student?.attendance_percentage != null ? `${student.attendance_percentage}%` : "82% (Good)"}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    (student?.attendance_percentage ?? 82) >= 75
                      ? "bg-success"
                      : (student?.attendance_percentage ?? 82) >= 60
                      ? "bg-warning"
                      : "bg-error"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, student?.attendance_percentage ?? 82))}%` }}
                />
              </div>

              <p className="mt-2.5 text-xs text-muted-foreground">
                Minimum requirement: 75% for semester exam eligibility.
              </p>
              <a
                href="/student/profile"
                className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
              >
                View detailed roster → 
              </a>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Profile</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Update contact details and guardian info.
              </p>
              <a
                href="/student/profile"
                className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
              >
                Edit profile →
              </a>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">
                Security
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Change your account password.
              </p>
              <a
                href="/student/security"
                className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
              >
                Change password →
              </a>
            </div>
          </section>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No profile data found.</p>
      )}
    </main>
  );
}
