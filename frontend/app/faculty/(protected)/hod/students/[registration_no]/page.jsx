// app/faculty/(protected)/hod/students/[registration_no]/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TitleCase } from "@/src/_hooks/toTitleCase";
import { apiFetch } from "@/src/api_fetch";
import Breadcrumbs from "@/src/_hooks/breakcrumbs";
import { formatDisplayName, getNameInitials } from "@/src/_hooks/basic_fn";


export default function StudentProfilePage({ params }) {
  const registrationNo = params?.registration_no;
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [s, setS] = useState(null); // student

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr("");

      try {
        const base = process.env.NEXT_PUBLIC_API_BASE;
        const url = `${base}/student/registration-no/${encodeURIComponent(registrationNo)}`;

        const res = await apiFetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (res.status === 404) throw new Error("Student not found");

        const data = await res.json().catch(() => ({}));
        console.log("Fetched student profile data:", data);
        if (!res.ok) {
          throw new Error(data?.detail || data?.message || "Failed to load student profile");
        }

        if (cancelled) return;
        setS(data);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load student profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (registrationNo) run();
    return () => { cancelled = true; };
  }, [registrationNo]);

  const fullName = useMemo(() => formatDisplayName(s?.first_name, s?.last_name), [s]);
  const nameInitials = useMemo(() => getNameInitials(s?.first_name, s?.last_name), [s]);

  const formattedDob = useMemo(() => {
    if (!s?.dob) return "—";
    const dt = new Date(s.dob);
    if (Number.isNaN(dt.getTime())) return s.dob;
    return dt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [s]);

  return (
    <main className="p-4 min-h-full bg-[#f2f5f9] space-y-4">

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "HOD", href: "/faculty/hod" },
          { label: "Student Management", href: "/faculty/hod/students" },
          { label: registrationNo },
        ]}
      />

      {/* Profile Header Card */}
      <section className="rounded-xl border bg-card p-4 shadow-xs transition hover:shadow-sm">
        {loading ? (
          <div className="animate-pulse flex items-start gap-5">
            <div className="h-20 w-20 rounded-full bg-muted shrink-0" />
            <div className="space-y-3 flex-1">
              <div className="h-6 w-48 rounded bg-muted" />
              <div className="h-4 w-64 rounded bg-muted" />
              <div className="h-4 w-80 rounded bg-muted" />
            </div>
          </div>
        ) : err ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{err}</div>
        ) : s ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: avatar + identity */}
            <div className="flex items-start gap-5">
              {/* Photo / Avatar */}
              {s.photo_url ? (
                <img
                  src={s.photo_url}
                  alt={`${nameInitials} photo`}
                  className="h-26 w-56 shrink-0 rounded-full object-cover ring-2 ring-border"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="h-20 w-20 shrink-0 rounded-full grid place-items-center bg-primary/20 text-primary text-xl font-bold ring-2 ring-border"
                  aria-label="avatar initials"
                >
                  {getNameInitials(s.first_name, s.last_name)}
                </div>
              )}

              {/* Identity */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold text-foreground">{fullName}</h1>
                </div>

                <div className="mt-0.5 text-sm text-muted-foreground gap-10">
                  <div className="flex justify-between items-center gap-10 pr-5">
                    <span className="font-medium text-foreground">
                      <b>{" · "}</b>{s.semester ? `Semester ${s.semester}` : "—"}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        s.status?.toLowerCase() === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-warning/20 text-warning"
                      }`}
                    >
                      {TitleCase(s.status || "Unknown")}
                    </span>
                  </div>
                  <p>
                    <span className="font-medium text-foreground">
                      <b>{" · "}</b>Course: {s.course ? TitleCase(s.course) : "—"}
                    </span>
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    <b>{" · "}</b>Registration No:{" "}
                    <span className="font-medium text-foreground">{s.registration_no}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right: back button */}
            <Link
              href="/faculty/hod/students"
              className="self-start shrink-0 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              ← Back to Students
            </Link>
          </div>
        ) : (
          <p className="text-muted-foreground">No profile found.</p>
        )}
      </section>

      {/* Details Sections */}
      {!loading && !err && s && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Personal details */}
          <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-xs transition hover:shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">Personal Details</h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              
              <div>
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {s.email ? (
                    <a
                      href={`mailto:${s.email}`}
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {s.email}
                    </a>
                  ) : "—"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Contact Number</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {s.contact_number || "—"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Date of Birth</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">{formattedDob}</dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Gender</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {TitleCase(s.gender || "—")}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Guardian Email</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {s.guardian_email ? (
                    <a
                      href={`mailto:${s.guardian_email}`}
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {s.guardian_email}
                    </a>
                  ) : "—"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {TitleCase(s.status || "—")}
                </dd>
              </div>
            </dl>
          </div>

          {/* Academic details */}
          <div className="rounded-xl border bg-card p-5 shadow-xs transition hover:shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">Academic Details</h2>
            <dl className="space-y-5">
              <div>
                <dt className="text-sm text-muted-foreground">Department</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {s.department || "—"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Course</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {s.course ? TitleCase(s.course) : "—"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Semester</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {s.semester ? `Semester ${s.semester}` : "—"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Roll Number</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {s.roll_number || "—"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-muted-foreground">Batch</dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {s.batch_name || "—"}
                </dd>
              </div>
            </dl>
          </div>

        </section>
      )}
    </main>
  );
}
