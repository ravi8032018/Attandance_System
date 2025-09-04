"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function ProfileClient({ registrationNo, initialTab = "overview" }) {
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [s, setS] = useState(null); // student

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr("");
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

        // Try direct profile endpoint if you have it: /student/{registration_no}
        let url = `${base}/student/registration-no/${encodeURIComponent(registrationNo)}`;
        let res = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });

        // If API doesn’t support item-by-id, fall back to list-by-filter:
        if (res.status === 404) {
          const listUrl = `${base}/student/?registration_no=${encodeURIComponent(registrationNo)}&limit=1`;
          res = await fetch(listUrl, { credentials: "include", headers: { Accept: "application/json" } });
        }
        console.log("--> res: ",res);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            typeof data?.detail === "string"
              ? data.detail
              : Array.isArray(data?.detail) && data.detail?.msg
              ? data.detail.msg
              : data?.message || "Failed to load profile";
          throw new Error(msg);
        }

        let student = data;
        if (!student?.registration_no && Array.isArray(data?.data)) {
          student = data.data ?? null;
        }
        if (cancelled) return;
        setS(student);
        console.log("--> Student: ",student);
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
  }, [registrationNo]);

  const fullName = useMemo(() => {
    const fn = (s?.first_name ?? "").trim();
    const ln = (s?.last_name ?? "").trim();
    return [fn, ln].filter(Boolean).join(" ") || "—";
  }, [s]);

  return (
    <main className="p-4 h-full bg-[#f2f5f9]">
      {/* Breadcrumbs */}
      <nav className="mb-4 text-md text-slate-700 ">
        <Link href="/faculty/dashboard" className="hover:underline">Dashboard</Link>
        <span className="mx-1">/</span>
        <Link href="/faculty/list_students" className="hover:underline">Students</Link>
        <span className="mx-1">/</span>
        <span className="text-slate-900">{registrationNo}</span>
      </nav>

      {/* Header */}
    <div className={`grid grid-cols-2 sm:grid-cols-1`}>
      <section className="mb-4 rounded-lg border bg-white p-4">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-13 w-60 rounded bg-slate-200" />
            <div className="mt-2 h-4 w-96 rounded bg-slate-200" />
          </div>
        ) : err ? (
          <div className="text-rose-700">{err}</div>
        ) : s ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Avatar + identity */}
            <div className="flex items-start gap-4">
              {/* Avatar with image + initials fallback */}
              <div className="relative">
                {s.photo_url ? (
                  <img
                    src={s.photo_url}
                    alt={`${fullName} photo`}
                    className="h-27 w-30 rounded-full object-cover ring-2 ring-gray-500"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="h-16 w-16 rounded-full grid place-items-center ring-2 ring-slate-200 bg-indigo-100 text-indigo-800"
                    aria-label="avatar initials"
                  >
                    <span className="text-lg font-semibold">
                      {(s.first_name).toUpperCase()}
                      {(s.last_name).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Identity text */}
              <div>
                <h1 className="text-xl font-semibold">{fullName}</h1>
                <p className="mt-0.5 text-slate-600">
                  Reg_no: <span className="font-medium">{s.registration_no}<br></br></span>
                </p>
                <p className="text-slate-600">
                  Course: {s.course ?? "—"}• Sem: {s.sem ?? "—"}
                </p>
                <p className="text-slate-600">
                  Status:{" "}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                      s.status === "active"
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                    }`}
                  >
                    {s.status ?? "—"}
                  </span>
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-col items-stretch gap-2 sm:items-end sm:justify-end">
              <a
                href={`/dashboard/faculty/students/${encodeURIComponent(registrationNo)}/attendance`}
                className="inline-flex items-center justify-center rounded-md border-2 border-indigo-600 bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
              >
                View attendance
              </a>
              <div className="flex gap-2">
                <button className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">
                  Message student
                </button>
                <button className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">
                  Export profile
                </button>
              </div>
            </div>
          </div>

        ) : (
          <div className="text-slate-600">No profile found.</div>
        )}
      </section>
    </div>

      {/* Tabs */}
      <section className="mb-3">
        <div className="flex border-b">
          {["overview", "attendance", "courses"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                tab === t ? "border-slate-900 text-slate-900" : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {tab === "overview" && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Left: details */}
          <div className="lg:col-span-2 rounded-lg border bg-white p-4">
            <h2 className="mb-3 text-base font-semibold">Student details</h2>
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-4 w-64 rounded bg-slate-200" />
                ))}
              </div>
            ) : s ? (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Email</dt>
                  <dd className="text-sm">{s.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Roll number</dt>
                  <dd className="text-sm">{s.roll_number ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Contact</dt>
                  <dd className="text-sm">{s.contact_number ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Guardian email</dt>
                  <dd className="text-sm">{s.guardian_email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Course</dt>
                  <dd className="text-sm">{s.course ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Semester</dt>
                  <dd className="text-sm">{s.sem ?? "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate-600">No data.</p>
            )}
          </div>

          {/* Right: contact/guardian */}
          <div className="rounded-lg border bg-white p-4">
            <h2 className="mb-3 text-base font-semibold">Contact & Guardian</h2>
            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 w-56 rounded bg-slate-200" />
                <div className="h-4 w-48 rounded bg-slate-200" />
                <div className="h-4 w-40 rounded bg-slate-200" />
              </div>
            ) : s ? (
              <ul className="space-y-2 text-sm">
                <li><span className="text-slate-500">Phone:</span> {s.contact_number ?? "—"}</li>
                <li><span className="text-slate-500">Email:</span> {s.email ?? "—"}</li>
                <li><span className="text-slate-500">Guardian:</span> {s.guardian_email ?? "—"}</li>
              </ul>
            ) : null}
          </div>
        </section>
      )}

      {tab === "attendance" && (
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-base font-semibold">Attendance</h2>
          <p className="text-sm text-slate-600">Hook this to /attendance?registration_no={registrationNo} and show per-course stats and a timeline.</p>
        </section>
      )}

      {tab === "courses" && (
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-base font-semibold">Courses</h2>
          <p className="text-sm text-slate-600">List enrolled courses with credits and instructor, connect to your courses endpoint.</p>
        </section>
      )}
    </main>
  );
}
