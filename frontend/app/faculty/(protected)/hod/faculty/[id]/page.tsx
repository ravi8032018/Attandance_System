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
            { label: "HOD", href: "/faculty/hod/dashboard" },
            { label: "Faculty Management", href: "/faculty/hod/faculty" },
            { label: facultyId },
          ]}
        />

      {/* Header */}
      <div className="grid grid-cols-2 sm:grid-cols-1">
        <section className="mb-4 rounded-xl border bg-card p-4 shadow-sm hover:shadow-lg">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-6 w-60 rounded bg-muted" />
              <div className="mt-2 h-4 w-96 rounded bg-muted" />
            </div>
          ) : err ? (
            <div className="text-error">{err}</div>
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
                      className="h-26 w-26 rounded-full grid place-items-center ring-2 ring-border bg-primary/20 text-primary"
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
                  <p className="mt-0.5 text-muted-foreground">
                    Faculty id:{" "}
                    <span className="font-medium">{f.faculty_id ?? "—"}</span>
                    <span
                    className={`rounded-full px-3 py-0.5 ml-5 text-xs font-semibold ${
                      f.status?.toLowerCase() === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-warning"
                    }`}
                  >
                    {f.status || "Unknown"}
                  </span>
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    Designation:{" "}
                    <span className="font-medium">{TitleCase(f.designation) ?? "—"}</span>
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    Department:{" "}
                    <span className="font-medium">{f.department ?? "—"}</span>
                  </p>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex flex-col sm:items-end sm:justify-end">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/faculty/hod/faculty/assign-subject?faculty_id=${f.faculty_id}`}
                    className="rounded-md border border-primary bg-primary px-3 py-2 text-sm text-white hover:opacity-90 shadow-sm hover:shadow-md"
                  >
                    Assign Subject
                  </Link>
                  <button className="rounded-md border px-3 py-2 text-sm border-primary bg-card text-primary hover:bg-primary/10 shadow-sm hover:shadow-md">
                    Message faculty
                  </button>
                  <button className="rounded-md border px-3 py-2 text-sm border-border bg-card hover:bg-muted text-foreground shadow-sm hover:shadow-md">
                    Export profile
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">No profile found.</div>
          )}
        </section>
      </div>

      {/* Tabs */}
      <section className="mb-3">
        <div className="flex border-b-2 border-border">
          {["overview", "assigned-subjects", "workload"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-6 py-2 text-md capitalize hover:text-foreground hover:bg-card hover:border-b-1 hover:border-foreground hover:shadow-sm ${
               tab === t
                 ? "border-foreground text-foreground bg-card shadow-md font-semibold"
                 : "border-transparent text-muted-foreground"
              }`}
            >
              {t.replace("-", " ")}
            </button>
          ))}
        </div>
      </section>

     {tab === "overview" && (
  <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
    {/* Left: faculty details */}
    <div className="lg:col-span-2 rounded-lg border bg-card p-4 shadow-sm hover:shadow-lg">
      <h2 className="mb-3 text-base font-semibold">Faculty details</h2>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 w-64 rounded bg-muted" />
          ))}
        </div>
      ) : f ? (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Email</dt>
            <dd className="text-md transition-all duration-100 hover:underline hover:underline-offset-2 hover:text-primary hover:font-semibold">
              {f.email ? <a href={`mailto:${f.email}`}>{f.email}</a> : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Contact number</dt>
            <dd className="text-md">{f.contact_number ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Date of birth</dt>
            <dd className="text-md">{formattedDob}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Gender</dt>
            <dd className="text-md">{TitleCase(f.gender || "—")}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Status</dt>
            <dd className="text-md">{TitleCase(f.status || "—")}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Joining Date</dt>
            <dd className="text-md">
              {f.joining_date ? new Date(f.joining_date).toLocaleDateString() : "—"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">No data.</p>
      )}
    </div>

    {/* Right: subjects assigned */}
    <div className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-lg">
      <h2 className="flex justify-between pr-2 mb-3 font-semibold">
        <span>Subjects assigned</span>
        <span className="ml-2 text-sm text-primary font-bold">
          ({subjectsLength})
        </span>
      </h2>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-4 rounded bg-muted" />
          ))}
        </div>
      ) : subjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 overflow-y-auto max-h-40 pr-1">
          {subjects.map((subject) => (
            <div
              key={subject.subject_code}
              className="rounded-xl border border-border bg-muted p-3 shadow-sm hover:shadow-md transition"
            >
              <p className="text-sm font-semibold text-foreground">
                {subject.subject_code}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {subject.subject_name}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No subjects available.</p>
      )}
    </div>
  </section>
     )}

     {tab === "assigned-subjects" && (
       <section className="rounded-lg border bg-card p-5 shadow-sm">
         <div className="flex items-center justify-between mb-4">
           <div>
             <h2 className="text-base font-semibold">All Assigned Subjects</h2>
             <p className="text-xs text-muted-foreground mt-0.5">Comprehensive curriculum overview for Dr. {fullName}</p>
           </div>
           <Link
             href={`/faculty/hod/faculty/assign-subject?faculty_id=${facultyId}`}
             className="rounded-md border border-primary bg-primary px-3 py-1.5 text-xs text-white hover:opacity-90 shadow-sm"
           >
             + Assign / Remove Subjects
           </Link>
         </div>

         {subjectsLoading ? (
           <div className="grid gap-3 md:grid-cols-2">
             {Array.from({ length: 4 }).map((_, i) => (
               <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
             ))}
           </div>
         ) : subjects.length === 0 ? (
           <p className="text-sm text-muted-foreground">No subjects assigned to this faculty member yet.</p>
         ) : (
           <div className="grid gap-3 md:grid-cols-2">
             {subjects.map((s) => (
               <div key={s.subject_code} className="rounded-xl border border-border bg-muted/60 p-4 shadow-sm">
                 <div className="flex items-start justify-between">
                   <div>
                     <span className="font-semibold text-primary text-sm">{s.subject_code}</span>
                     <h3 className="font-medium text-foreground text-sm mt-0.5">{s.subject_name}</h3>
                   </div>
                   <span className="text-[11px] bg-card px-2 py-0.5 rounded border border-border text-muted-foreground font-mono">
                     Sem {s.semester || "N/A"}
                   </span>
                 </div>
               </div>
             ))}
           </div>
         )}
       </section>
     )}

     {tab === "workload" && (
       <section className="rounded-lg border bg-card p-5 shadow-sm max-w-2xl">
         <h2 className="text-base font-semibold mb-1">Workload Capacity & Balance</h2>
         <p className="text-xs text-muted-foreground mb-4">Teaching load distribution relative to department standard capacity (5 subjects).</p>

         <div className="grid grid-cols-2 gap-4 mb-4">
           <div className="rounded-xl bg-muted p-3.5">
             <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Assigned Count</p>
             <p className="mt-1 font-bold text-foreground text-lg">{subjectsLength} / 5</p>
           </div>
           <div className="rounded-xl bg-muted p-3.5">
             <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Status</p>
             <span className={`mt-1 inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
               subjectsLength === 0
                 ? "bg-muted text-muted-foreground"
                 : subjectsLength <= 2
                 ? "bg-success/15 text-success border border-success/30"
                 : subjectsLength <= 4
                 ? "bg-primary/15 text-primary border border-primary/30"
                 : "bg-warning/15 text-warning border border-warning/30"
             }`}>
               {subjectsLength === 0 ? "Unassigned" : subjectsLength <= 2 ? "Light Load" : subjectsLength <= 4 ? "Optimal Load" : "Heavy Load"}
             </span>
           </div>
         </div>

         <div className="mb-4">
           <div className="flex justify-between text-xs text-muted-foreground mb-1">
             <span>Capacity utilization</span>
             <span className="font-medium">{Math.min(100, Math.round((subjectsLength / 5) * 100))}%</span>
           </div>
           <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
             <div
               className={`h-2.5 rounded-full transition-all duration-300 ${
                 subjectsLength > 4 ? "bg-warning" : subjectsLength > 2 ? "bg-primary" : "bg-success"
               }`}
               style={{ width: `${Math.min(100, Math.round((subjectsLength / 5) * 100))}%` }}
             />
           </div>
         </div>

         <Link
           href={`/faculty/hod/faculty/assign-subject?faculty_id=${facultyId}`}
           className="inline-block rounded-md border border-primary bg-primary px-4 py-2 text-xs font-medium text-white hover:opacity-90 shadow-sm"
         >
           Manage Faculty Assignments →
         </Link>
       </section>
     )}
    </main>
  );
}
