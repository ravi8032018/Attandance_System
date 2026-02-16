"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {CapitalizeEachWord, CopyButton} from "@/src/_hooks/basic_fn";
import {ContactCell} from "@/src/Contact_Cell";

function AttendancePie({ present, absent }) {
  const total = present + absent;
  if (total <= 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-500">
        No data to display
      </div>
    );
  }

  const presentRatio = present / total;
  const presentAngle = presentRatio * 360;

  // SVG 100x100, radius 16, centered at 20,20
  const radius = 16;
  const center = 20;

  // Helper to convert polar to cartesian
  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  // Large-arc-flag for present slice
  const largeArc = presentAngle > 180 ? 1 : 0;

  const start = polarToCartesian(center, center, radius, 0);
  const end = polarToCartesian(center, center, radius, presentAngle);

  const presentPath = [
    `M ${center} ${center}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");

  // Absent slice is the remainder of the circle
  const absentPath = [
    `M ${center} ${center}`,
    `L ${end.x} ${end.y}`,
    `A ${radius} ${radius} 0 ${presentAngle > 180 ? 0 : 1} 1 ${start.x} ${start.y}`,
    "Z",
  ].join(" ");

  return (
    <div className="flex items-center gap-4">
      <svg width={80} height={80} viewBox="0 0 40 40">
        <path d={presentPath} fill="#22c55e" /> {/* emerald-500 */}
        <path d={absentPath} fill="#f97373" />   {/* rose-400 */}
      </svg>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" />
          <span className="text-slate-700">
            Present: <span className="font-semibold">{present}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-rose-400" />
          <span className="text-slate-700">
            Absent: <span className="font-semibold">{absent}</span>
          </span>
        </div>
      </div>
    </div>
  );
}


export default function ProfileClient({ registrationNo, initialTab = "overview" }) {
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [s, setS] = useState(null); // student

  const [subjectCode, setSubjectCode] = useState("");
  const [subjects, setSubjects] = useState([]); 
  const [attendance, setAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");


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

useEffect(() => {
  let cancelled = false;

  async function loadAttendance() {
    console.log("loadAttendance called, tab:", tab, "subjectCode:", subjectCode);

    if (tab !== "attendance" || !subjectCode) {
      console.log("Skipping attendance fetch (tab or subjectCode missing)");
      setAttendance(null);
      setAttendanceError("");
      return;
    }

    setAttendanceLoading(true);
    setAttendanceError("");

    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
      const url = `${base}/attendance/report/student-subject?registration_no=${encodeURIComponent(
        registrationNo
      )}&subject_code=${encodeURIComponent(subjectCode)}`;

      console.log("Fetching attendance from:", url);

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      const data = await res.json().catch(() => ({}));
      console.log("--> attendance data:", data);

      if (!res.ok) {
        const msg =
          typeof data?.detail === "string"
            ? data.detail
            : data?.message || "Failed to load attendance";
        throw new Error(msg);
      }

      if (cancelled) return;
      setAttendance(data);
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


  useEffect(() => {
  let ignore = false;

  async function loadSubjects() {
    console.log("loadSubjects called, student:", s);

    // Wait until student data is loaded AND has dept/sem
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

      const res = await fetch(url, {
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
        setSubjectCode(allSubjects[0].subject_code);
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
}, [s, subjectCode]);


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
            <div className="flex items-start gap-3">
              {/* Avatar with image + initials fallback */}
              <div className="relative">
                {s.photo_url ? (
                  <img
                    src={s.photo_url}
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
              <a
                href={`/dashboard/faculty/students/${encodeURIComponent(registrationNo)}/attendance`}
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
    </div>

      {/* Tabs */}
      <section className="mb-3">
        <div className="flex border-b-2 border-slate-300">
          {["overview", "attendance", "courses"].map((t) => (
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
  <section className="rounded-lg border bg-white p-4">
    <h2 className="mb-3 text-base font-semibold">Attendance</h2>

    {/* Subject code input + dropdown from curriculum */}
    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:gap-4">
      <div className="flex flex-col gap-1 md:w-1/3">
        <label className="text-sm text-slate-600">Subject code</label>
        <input
          type="text"
          value={subjectCode}
          onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
          className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-[#ffffff]"
          placeholder="CSDSC251"
        />
      </div>
      <div className="flex flex-col gap-1 md:w-1/3">
        <label className="text-sm text-slate-600">Or pick from list</label>
        <select
          value={subjectCode}
          onChange={(e) => setSubjectCode(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-[#ffffff]"
        >
          <option value="">Select subject</option>
          {subjects.map((subj) => (
            <option key={subj.subject_code} value={subj.subject_code}>
              {`${subj.subject_code} - ${subj.subject_name}`}
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* Content: same card + pie chart as before */}
    {attendanceLoading ? (
      <p className="text-sm text-slate-600">Loading attendance…</p>
    ) : attendanceError ? (
      <p className="text-sm text-rose-700">{attendanceError}</p>
    ) : !subjectCode ? (
      <p className="text-sm text-slate-600">
        Enter or select a subject code to view attendance.
      </p>
    ) : !attendance ? (
      <p className="text-sm text-slate-600">
        No attendance data available for this subject.
      </p>
    ) : (
      <div className="space-y-4">
        {/* Summary card */}
        <div className="rounded-xl border bg-slate-50 px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Summary for {subjectCode}
              </h3>
              <p className="text-xs text-slate-500">
                Total classes:{" "}
                <span className="font-semibold">
                  {attendance.total_classes}
                </span>{" "}
                • Attendance:{" "}
                <span className="font-semibold">
                  {attendance.attendance_percentage}%
                </span>
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md bg-white px-3 py-2 border">
                  <div className="text-slate-500">Present</div>
                  <div className="text-lg font-semibold text-emerald-700">
                    {attendance.present_count}
                  </div>
                </div>
                <div className="rounded-md bg-white px-3 py-2 border">
                  <div className="text-slate-500">Absent</div>
                  <div className="text-lg font-semibold text-rose-700">
                    {attendance.absent_count}
                  </div>
                </div>
                <div className="rounded-md bg-white px-3 py-2 border">
                  <div className="text-slate-500">Excused</div>
                  <div className="text-lg font-semibold text-sky-700">
                    {attendance.excused_count}
                  </div>
                </div>
              </div>
            </div>

            <AttendancePie
              present={attendance.present_count}
              absent={attendance.absent_count}
            />
          </div>
        </div>

        {/* Daily records card (same as before) */}
        {/* ... keep the daily records list code you already have ... */}
      </div>
    )}
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
