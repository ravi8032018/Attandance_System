"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {CapitalizeEachWord, CopyButton} from "@/src/_hooks/basic_fn";
import {ContactCell} from "@/src/Contact_Cell";
import { apiFetch } from "@/src/api_fetch";
import { SemesterPie as AttendancePie } from "@/src/_hooks/charts";

async function makeStudentCR(registrationNo, studentName) {
  // Cross verification confirmation
  const confirmed = window.confirm(
    `Are you sure you want to promote ${studentName} [${registrationNo}] to CR? This action cannot be undone.`
  );
  
  if (!confirmed) {
    console.log("Student promotion cancelled by user");
    return;
  }

  try {
    const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
    const url = `${base}/student/${encodeURIComponent(registrationNo)}/promote-to-cr`;
    
    const res = await apiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        typeof data?.detail === "string"
          ? data.detail
          : data?.message || "Failed to promote student to CR";
      throw new Error(msg);
    }

    alert("Student promoted to CR successfully!");
    return data;
  } catch (e) {
    alert(`Error: ${e?.message || "Failed to promote student to CR"}`);
    console.error("makeStudentCR error:", e);
  }
}

export default function ProfileClient({ registrationNo, initialTab = "overview" }) {
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [s, setS] = useState(null); // student

  const [subjectCode, setSubjectCode] = useState("");
  const [subjects, setSubjects] = useState([]); 
  const ALL_SUBJECTS = "__ALL__";
  const [attendance, setAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");


  // Fetch student profile on mount or when registrationNo changes on overview tab
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr("");
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

        // Try direct profile endpoint if you have it: /student/{registration_no}
        let url = `${base}/student/registration-no/${encodeURIComponent(registrationNo)}`;
        let res = await apiFetch(url, { headers: { Accept: "application/json" } });
        console.log("--> res: ",res);

        if (res.status === 404) {
          throw new Error("Student not found");
        }

        const data = await res.json().catch(() => ({}));
        console.log("--> data: ",data);
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

  // Load subjects for dropdown when student data is available (needs dept and sem)
  useEffect(() => {
    let ignore = false;

    async function loadSubjects() {
      console.log("loadSubjects called, student:", s);

      if (!s || !s.department || !s.semester) {
        console.log("No department/semester yet, clearing subjects");
        setSubjects([]);
        return;
      }

      try {
        const api = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
        const params = new URLSearchParams({
          department: s.department,
          semester: s.semester,
        });
        const url = `${api}/curriculum?${params.toString()}`;
        console.log("Fetching curriculum from:", url);

        const res = await apiFetch(url, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const data = await res.json().catch(() => ({}));
        console.log("--> Subjects API raw : ", data);

        if (!res.ok) {
          console.error("Subjects API error status:", res.status, data);
          throw new Error(data?.detail || data?.message || "Failed to load subjects");
        }
        if (ignore) return;

        const curriculumList = Array.isArray(data?.data) ? data.data : [];
        const allSubjects = curriculumList.flatMap((item) => item.subjects || []);
        console.log("--> Subjects array used for dropdown : ", allSubjects);

        setSubjects(allSubjects);

        if (allSubjects.length > 0 && !subjectCode) {
          console.log("Preselecting first subject:", allSubjects[0].subject_code);
          // Option A: preselect first subject
          setSubjectCode(allSubjects[0].subject_code);
          // Option B: force “nothing selected” and let user choose:
          // setSubjectCode("");
        }

      } catch (e) {
        if (!ignore) {
          setSubjects([]);
          console.error("Failed to load subjects:", e);
        }
      }
    }

    loadSubjects();
    return () => {
      ignore = true;
    };
  }, [s]); 

  // Load attendance data when tab is "attendance" and subjectCode is set
  useEffect(() => {
    let cancelled = false;

    async function loadAttendance() {
      if (tab !== "attendance" || !subjectCode) {
        console.log("Skipping attendance fetch (tab or subjectCode missing)");
        setAttendance(null);
        setAttendanceError("");
        return;
      }
      console.log("loadAttendance called, tab:", tab, "subjectCode:", subjectCode);

      setAttendanceLoading(true);
      setAttendanceError("");

      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
        // Build URL based on whether we want single or all
        let url = `${base}/attendance/report/student-subject?registration_no=${encodeURIComponent(
          registrationNo
        )}`;
        if (subjectCode !== ALL_SUBJECTS) {
          url += `&subject_code=${encodeURIComponent(subjectCode)}`;
        }

        console.log("Fetching attendance from:", url);

        const res = await apiFetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        const data = await res.json().catch(() => ({}));
        console.log("--> attendance data (multi):", data);

        if (!res.ok) {
          const msg =
            typeof data?.detail === "string"
              ? data.detail
              : data?.message || "Failed to load attendance";
          throw new Error(msg);
        }

        const reports = Array.isArray(data?.reports) ? data.reports : [];
        console.log("--> reports:", reports);

        let combined = null;

        if (subjectCode === ALL_SUBJECTS) {
          // Combine all subjects
          let totalPresent = 0;
          let totalAbsent = 0;
          let totalExcused = 0;
          let totalClasses = 0;
          const allDaily = [];

          for (const r of reports) {
            totalPresent += r.present_count || 0;
            totalAbsent += r.absent_count || 0;
            totalExcused += r.excused_count || 0;
            totalClasses += r.total_classes || 0;
            if (Array.isArray(r.daily_records)) {
              allDaily.push(
                ...r.daily_records.map((d) => ({
                  ...d,
                  subject_code: r.subject_code,
                }))
              );
            }
          }

          const attendance_percentage =
            totalClasses > 0
              ? Math.round((totalPresent / totalClasses) * 100)
              : 0;

          combined = {
            subject_code: "ALL",
            total_classes: totalClasses,
            present_count: totalPresent,
            absent_count: totalAbsent,
            excused_count: totalExcused,
            attendance_percentage,
            daily_records: allDaily,
          };
        } else {
          // single subject: pick the matching report or first
          combined =
            reports.find((r) => r.subject_code === subjectCode) ??
            reports[0] ??
            null;
        }

        console.log("--> normalized attendance:", combined);

        if (cancelled) return;
        setAttendance(combined);
      } catch (e) {
        if (!cancelled) {
          setAttendance(null);
          setAttendanceError(e?.message || "Failed to load attendance");
        }
      } finally {
        if (!cancelled) setAttendanceLoading(false);
      }
    }

    loadAttendance();
    return () => {
      cancelled = true;
    };
  }, [tab, registrationNo, subjectCode]);

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
      <section className="mb-4 rounded-xl border bg-white p-4 shadow-sm hover:shadow-lg">
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
            <div className="flex items-start gap-3 ">
              {/* Avatar with image + initials fallback */}
              <div className="relative">
                {s.photo_url ? (
                  <img
                    src={s.photo_url}
                    alt={`${fullName} photo`}
                    className="h-auto w-50 rounded-full object-cover ring-1 ring-gray-500"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="h-26 w-26 rounded-full grid place-items-center ring-2 ring-slate-200 bg-indigo-100 text-indigo-800"
                    aria-label="avatar fullname"
                  >
                    <span className="font-semibold">
                      {(s.first_name)?.toUpperCase() || ""}
                      {(s.last_name)?.toUpperCase() || ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Identity text */}
              <div className={`text-md`}>
                <h1 className="text-2xl font-semibold">{fullName}</h1>
                <p className="mt-0.5 text-slate-600">
                  Reg no: <span className="font-medium">{s.registration_no}<br></br></span>
                </p>
                <p className="text-slate-600">
                  Course: {s.course ?? "—"}<br></br>Sem: {s.semester ?? "—"}
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-col sm:items-end sm:justify-end pt-21">
              <div className="flex gap-2">
                <button onClick={() => setTab("attendance")} className="inline-flex items-center justify-center rounded-md border-2 border-indigo-600 bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 shadow-sm hover:shadow-md">
                  View attendance
                </button>
                <button onClick={()=> makeStudentCR(s.registration_no, fullName)} className="rounded-md border border-indigo-600 bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 shadow-sm hover:shadow-md">
                  Promote to CR
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
    </div>

      {/* Tabs */}
      <section className="mb-3">
        <div className="flex border-b-2 border-slate-300">
          {["overview", "attendance"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-6 py-2 text-md capitalize hover:text-slate-900 hover:bg-white hover:border-b-1 hover:border-slate-900 hover:shadow-sm ${
                tab === t ? "border-slate-900 text-black font-sans bg-white shadow-md" : "border-transparent text-slate-600  "
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {tab === "overview" && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Left: details */}
          <div className="lg:col-span-2 rounded-lg border bg-white p-4  shadow-sm hover:shadow-lg">
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
                  <dt className="flex text-sm text-slate-500">Email</dt>
                    <dd className="text-md transition-all duration-100 hover:underline  hover:underline-offset-2 hover:text-indigo-600 hover:font-semibold">
                      <a href={`mailto:${s.email}`}>{s.email ?? "—"}</a>
                    </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Roll number</dt>
                  <dd className="text-md">{s.roll_number ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Contact</dt>
                  <dd className="text-md">
                    <ContactCell student={s} />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Guardian email</dt>
                  <dd className="text-md">{s.guardian_email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Course</dt>
                  <dd className="text-md">{s.course ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Semester</dt>
                  <dd className="text-md">{s.semester ?? "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate-600">No data.</p>
            )}
          </div>

          {/* Right: contact/guardian */}
          <div className="rounded-lg border bg-white p-4  shadow-sm hover:shadow-lg">
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
        <section className="">
          {/* Outer card always present */}
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm max-w-200">
            {/* Card header + selector */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 px-1">
                  Attendance
                </h2>
              </div>
              {/* Selector ALWAYS visible */}
              <div className="flex flex-col ">
                <select
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  className="rounded-lg border-2 border-slate-300 bg-white/50 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 overflow-ellipsis"
                >
                  <option value="">Select subject</option>
                  <option value={ALL_SUBJECTS}>All subjects (combined)</option>
                  {subjects.map((subj) => (
                    <option key={subj.subject_code} value={subj.subject_code}>
                      {`${subj.subject_code} • ${subj.subject_name}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Main content area: 2‑column layout with skeletons */}
            <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
              {/* LEFT: KPIs + messages */}
              <div className="flex flex-col gap-3 mb-2 text-xs w-full max-w-xs">
                {/* Loading skeleton */}
                {attendanceLoading && (
                  <>
                    <div className="h-14 w-full animate-pulse rounded-xl bg-slate-100" />
                    <div className="h-14 w-full animate-pulse rounded-xl bg-slate-100" />
                    <div className="h-14 w-full animate-pulse rounded-xl bg-slate-100" />
                  </>
                )}

                {!attendanceLoading && subjectCode && !attendance && (
                    <p className="mt-1 text-sm text-slate-600">
                      No attendance data available for this subject.
                    </p>
                )}

                {!attendanceLoading &&
                  attendance &&
                  !attendanceError &&
                  subjectCode && (
                    <>
                      <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 h-14">
                        <div className="flex items-center text-sm font-medium text-emerald-700">
                          Present
                        </div>
                        <div className="text-2xl font-bold text-emerald-700">
                          {attendance.present_count}
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 h-14">
                        <div className="flex items-center text-sm font-medium text-rose-700">
                          Absent
                        </div>
                        <div className="text-2xl font-semibold text-rose-700">
                          {attendance.absent_count}
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-sky-100 bg-[#f59e0b]/13 px-3 py-2 h-14">
                        <div className="flex items-center text-sm font-medium text-[#d99621]">
                          Excused
                        </div>
                        <div className="text-2xl font-semibold text-[#f59e0b]">
                          {attendance.excused_count}
                        </div>
                      </div>
                    </>
                  )}

                {/* Messages for global states */}
                {!attendanceLoading && attendanceError && (
                  <p className="text-sm text-rose-700">{attendanceError}</p>
                )}
                {!attendanceLoading && !attendanceError && !subjectCode && (
                  <p className="text-sm text-slate-600">
                    Select a subject above to view attendance.
                  </p>
                )}
              </div>

              {/* RIGHT: pie or its skeleton, always visible when a subject is chosen */}
            <div className="flex flex-col items-center gap-2 mt-2 mr-15">
              <div>
                {attendanceLoading && subjectCode && (
                  <div className="h-40 w-40 animate-pulse rounded-full bg-slate-100" />
                )}
                {!attendanceLoading && attendance && subjectCode && (
                  <AttendancePie
                    present={attendance.present_count}
                    absent={attendance.absent_count}
                    // h={55}
                    // w={55}
                  />
                )}
              </div>
            
              <div>
                {subjectCode && attendance && !attendanceLoading && !attendanceError && (
                  <p className="text-xs text-slate-500">
                    Total classes{" "}
                    <span className="text-sm font-semibold text-slate-800">
                      {attendance.total_classes}
                    </span>{" "}
                    &nbsp;·Attendance{" "}
                    <span className="text-sm font-semibold text-emerald-600">
                      {attendance.attendance_percentage}%
                    </span>
                  </p>
                )}
              </div>               
            </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
