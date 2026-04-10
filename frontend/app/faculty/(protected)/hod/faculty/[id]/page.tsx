"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TitleCase } from "@/src/_hooks/toTitleCase";
import { apiFetch } from "@/src/api_fetch";
import Breadcrumbs from "@/src/_hooks/breakcrumbs";
import qs from "@/src/_hooks/qs";
// import { getFacultyList } from "@/src/_hooks/getSubjectsList";
import { useFacultySubjects } from "@/src/_hooks/get_subjects_list_for_faculty";


export default function FacultyProfileClient({ params }) {
  const facultyId = params?.id;
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [f, setF] = useState(null); // faculty
  const [tab, setTab] = useState("overview");
  const { subjects, loading: subjectsLoading, error: subjectsError } = useFacultySubjects(facultyId);
  
  // Fetch faculty profile
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr("");

      try {
        const base = process.env.NEXT_PUBLIC_API_BASE;
        const url = `${base}/faculty/faculty-id/${encodeURIComponent(facultyId)}`;

        const res = await apiFetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (res.status === 404) {
          throw new Error("Faculty not found");
        }

        const data = await res.json().catch(() => ({}));
        console.log("Fetched faculty profile:", data);
        if (!res.ok) {
          const msg =
            typeof data?.detail === "string"
              ? data.detail
              : data?.message || "Failed to load faculty profile";
          throw new Error(msg);
        }

        if (cancelled) return;
        setF(data);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load faculty profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (facultyId) run();

    return () => {
      cancelled = true;
    };
  }, [facultyId]);

  const fullName = useMemo(() => {
    const fn = (f?.first_name ?? "").trim();
    const ln = (f?.last_name ?? "").trim();
    return [fn, ln].filter(Boolean).join(" ") || "—";
  }, [f]);

  const formattedDob = useMemo(() => {
    if (!f?.dob) return "—";
    const dt = new Date(f.dob);
    if (Number.isNaN(dt.getTime())) return f.dob;
    return dt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [f]);

  const subjectsLength = subjects?.length ?? 0;

  return (
    <main className="p-4 h-full bg-[#f2f5f9]">
      {/* Breadcrumbs */}
      <Breadcrumbs
          items={[
            { label: "HOD", href: "/hod" },
            { label: "Faculty Management", href: "/hod/faculty" },
            { label: facultyId },
          ]}
        />

      {/* Header */}
      <div className="grid grid-cols-2 sm:grid-cols-1">
        <section className="mb-4 rounded-xl border bg-white p-4 shadow-sm hover:shadow-lg">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-6 w-60 rounded bg-slate-200" />
              <div className="mt-2 h-4 w-96 rounded bg-slate-200" />
            </div>
          ) : err ? (
            <div className="text-rose-700">{err}</div>
          ) : f ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Left: avatar + identity */}
              <div className="flex items-start gap-5">
                {/* image */}
                <div className="relative">
                  {f.photo_url ? (
                    <img
                      src={f.photo_url}
                      alt={`${fullName} photo`}
                      className="h-29 w-55 rounded-full object-cover ring-1 ring-gray-500"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className="h-26 w-26 rounded-full grid place-items-center ring-2 ring-slate-200 bg-indigo-100 text-indigo-800"
                      aria-label="avatar initials"
                    >
                      <span className="font-semibold">
                        {(f.first_name?.[0] || "").toUpperCase()}
                        {(f.last_name?.[0] || "").toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                  {/* faculty details */}
                <div className="text-[15px]">
                  <h1 className="text-2xl font-semibold mb-1">Dr. {fullName}</h1>
                  <p className="mt-0.5 text-slate-600">
                    Faculty id:{" "}
                    <span className="font-medium">{f.faculty_id ?? "—"}</span>
                    <span
                    className={`rounded-full px-3 py-0.5 ml-5 text-xs font-semibold ${
                      f.status?.toLowerCase() === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {f.status || "Unknown"}
                  </span>
                  </p>
                  <p className="mt-0.5 text-slate-600">
                    Designation:{" "}
                    <span className="font-medium">{TitleCase(f.designation) ?? "—"}</span>
                  </p>
                  <p className="mt-0.5 text-slate-600">
                    Department:{" "}
                    <span className="font-medium">{f.department ?? "—"}</span>
                  </p>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex flex-col sm:items-end sm:justify-end">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/hod/faculty/assign-subject?faculty_id=${f.faculty_id}`}
                    className="rounded-md border border-indigo-600 bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 shadow-sm hover:shadow-md"
                  >
                    Assign Subject
                  </Link>
                  <button className="rounded-md border px-3 py-2 text-sm border-indigo-600 bg-white text-indigo-700 hover:bg-indigo-50 shadow-sm hover:shadow-md">
                    Message faculty
                  </button>
                  <button className="rounded-md border px-3 py-2 text-sm border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm hover:shadow-md">
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

      {/* Tabs (keeping simple for now; you can add more later) */}
      <section className="mb-3">
        <div className="flex border-b-2 border-slate-300">
          {["overview"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-6 py-2 text-md capitalize hover:text-slate-900 hover:bg-white hover:border-b-1 hover:border-slate-900 hover:shadow-sm ${
                tab === t
                  ? "border-slate-900 text-black font-sans bg-white shadow-md"
                  : "border-transparent text-slate-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

     {tab === "overview" && (
  <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
    {/* Left: faculty details */}
    <div className="lg:col-span-2 rounded-lg border bg-white p-4 shadow-sm hover:shadow-lg">
      <h2 className="mb-3 text-base font-semibold">Faculty details</h2>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 w-64 rounded bg-slate-200" />
          ))}
        </div>
      ) : f ? (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">Email</dt>
            <dd className="text-md transition-all duration-100 hover:underline hover:underline-offset-2 hover:text-indigo-600 hover:font-semibold">
              {f.email ? <a href={`mailto:${f.email}`}>{f.email}</a> : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Contact number</dt>
            <dd className="text-md">{f.contact_number ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Date of birth</dt>
            <dd className="text-md">{formattedDob}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Gender</dt>
            <dd className="text-md">{TitleCase(f.gender || "—")}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Status</dt>
            <dd className="text-md">{TitleCase(f.status || "—")}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Joining Date</dt>
            <dd className="text-md">
              {f.joining_date ? new Date(f.joining_date).toLocaleDateString() : "—"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-slate-600">No data.</p>
      )}
    </div>

    {/* Right: subjects assigned */}
    <div className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-lg">
      {/* top heading */}
      <h2 className="flex justify-between pr-2 mb-3 font-semibold">
        <span>Subjects assigned</span>
        <span className="ml-2 text-sm ">
          ({subjectsLength})
        </span>
      </h2>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-4 rounded bg-slate-200" />
          ))}
        </div>
      ) : subjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 overflow-y-auto max-h-40 pr-1">
          {subjects.map((subject) => (
            <div
              key={subject.subject_code}   // add this line
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm hover:shadow-md transition"
            >
              <p className="text-sm font-semibold text-slate-900">
                {subject.subject_code}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {subject.subject_name}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No subjects available.</p>
      )}
    </div>
      </section>
     )}
    </main>
  );
}
