"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Student, Subject } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { useRouter } from "next/navigation";

export default function TakeAttendancePage() {
  const router = useRouter();
  const [semester, setSemester] = useState("4");
  const [department, setDepartment] = useState("CS");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectCode, setSubjectCode] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, "present" | "absent">>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [msg, setMsg] = useState("");

  // 1. Fetch ONLY subjects assigned to the logged-in faculty for dept & sem
  useEffect(() => {
    async function loadFacultySubjects() {
      try {
        const res = await apiFetch(
          `/curriculum/my-subjects-for-sem?department=${encodeURIComponent(department)}&semester=${encodeURIComponent(semester)}`
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const items = Array.isArray(data?.data) ? data.data : [];
          const list = items.flatMap((item: any) => item.subjects || []);
          setSubjects(list);
          if (list.length > 0) {
            setSubjectCode(list[0].subject_code);
          } else {
            setSubjectCode("");
          }
        } else {
          setSubjects([]);
          setSubjectCode("");
        }
      } catch (e) {
        console.error("Failed to load faculty subjects", e);
        setSubjects([]);
        setSubjectCode("");
      }
    }
    loadFacultySubjects();
  }, [semester, department]);

  // 2. Fetch students roster when semester & dept changes
  useEffect(() => {
    async function loadStudents() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ semester, department, limit: "100" });
        const res = await apiFetch(`/student/my/?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const list = Array.isArray(data?.data) ? data.data : [];
          setStudents(list);
          const initialMap: Record<string, "present" | "absent"> = {};
          list.forEach((st: Student) => {
            initialMap[st.registration_no] = "present";
          });
          setAttendanceMap(initialMap);
        }
      } catch (e) {
        console.error("Failed to load students roster", e);
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, [semester, department]);

  function toggleStudentStatus(regNo: string) {
    setAttendanceMap((prev) => ({
      ...prev,
      [regNo]: prev[regNo] === "present" ? "absent" : "present",
    }));
  }

  // 3. Submit attendance directly as Faculty
  async function handleSaveAttendance() {
    if (!subjectCode || students.length === 0) return;
    setSaving(true);
    setMsg("");

    try {
      const payload = {
        subject_code: subjectCode,
        department,
        semester,
        class_date: new Date().toISOString(),
        attendance_data: students.map((st) => ({
          registration_no: st.registration_no,
          status: attendanceMap[st.registration_no] || "present",
        })),
      };

      const res = await apiFetch("/attendance/mark-by-faculty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setMsg(`Attendance saved successfully • Session ID: ${data.session_id || "N/A"}`);
        setTimeout(() => {
          router.push("/faculty/dashboard");
        }, 3000);
      } else {
        throw new Error(data.detail || "Failed to save attendance session");
      }
    } catch (e: any) {
      setMsg(`Error: ${e?.message || "Failed to save attendance"}`);
      setTimeout(() => {
        setMsg("");
      }, 5000);
    } finally {
      setSaving(false);
    }
  }

  // 4. Delegate attendance marking to CR (Ping CR)
  async function handlePingCR() {
    if (!subjectCode || !department || !semester) {
      setMsg("Error: Please select department, semester, and subject before pinging CR.");
      setTimeout(() => setMsg(""), 4000);
      return;
    }

    setPinging(true);
    setMsg("");

    try {
      const payload = {
        subject_code: subjectCode,
        department,
        semester,
        class_date: new Date().toISOString(),
      };

      const res = await apiFetch("/attendance/initiate-for-cr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setMsg("Ping request sent to CR successfully! The CR now has 15 minutes to mark attendance.");
        setTimeout(() => router.push("/faculty/dashboard"), 3000);
      } else {
        throw new Error(data.detail || "Failed to ping CR for attendance.");
      }
    } catch (e: any) {
      setMsg(`Error: ${e?.message || "Could not ping CR"}`);
      setTimeout(() => setMsg(""), 4000);
    } finally {
      setPinging(false);
    }
  }

  const presentCount = Object.values(attendanceMap).filter((v) => v === "present").length;
  const absentCount = students.length - presentCount;
  const presentPct = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  return (
    <main className="p-4 sm:p-6 pb-6 space-y-6 max-w-7xl mx-auto min-h-screen flex flex-col justify-between gap-12">
      <div className="space-y-6">
        {/* Header with Title and Ping CR Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Take Class Attendance
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Mark student present or absent status, or delegate marking to the Class Representative (CR).
            </p>
          </div>

          <button
            type="button"
            onClick={handlePingCR}
            disabled={pinging || !subjectCode}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white px-5 py-2.5 text-sm font-bold transition-all duration-150 shadow-sm disabled:opacity-50 shrink-0"
            title="Send attendance marking request to CR (valid for 15 minutes)"
          >
            <span>{pinging ? "Pinging CR..." : "Ping CR"}</span>
          </button>
        </div>

        {/* Control Bar */}
        <div className="rounded-2xl solid-card p-5 border border-border grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-colors duration-150"
            >
              {["1", "2", "3", "4", "5", "6", "7", "8"].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-colors duration-150"
            >
              {["CS", "CSE", "ECE", "AGRI"].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Assigned Subject
            </label>
            <select
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              disabled={subjects.length === 0}
              className="h-10 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-colors duration-150 disabled:opacity-50"
            >
              {subjects.length === 0 ? (
                <option value="">No subjects assigned to you for Sem {semester}</option>
              ) : (
                subjects.map((subj) => (
                  <option key={subj.subject_code} value={subj.subject_code}>
                    {`${subj.subject_code} • ${subj.subject_name}`}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {msg && (
          <div
            className={`rounded-2xl border p-4 text-xs font-bold ${msg.startsWith("Error")
              ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
              : "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
              }`}
          >
            {msg}
          </div>
        )}

        {/* Roster Table */}
        <div className="rounded-2xl solid-card border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[650px]">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                <tr>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Registration No</th>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Roll No</th>
                  <th className="py-3.5 px-4">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="py-4 px-4">
                        <div className="h-4 bg-muted rounded-lg w-full" />
                      </td>
                    </tr>
                  ))
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm font-medium text-muted-foreground">
                      No students enrolled in this section.
                    </td>
                  </tr>
                ) : (
                  students.map((st) => {
                    const isPresent = attendanceMap[st.registration_no] === "present";
                    return (
                      <tr
                        key={st.registration_no}
                        onClick={() => toggleStudentStatus(st.registration_no)}
                        className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/40 hover:border-l-2 hover:border-l-indigo-600 dark:hover:border-l-indigo-500 transition-colors duration-150"
                      >
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStudentStatus(st.registration_no);
                            }}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors duration-150 ${isPresent
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                              }`}
                          >
                            <span>{isPresent ? "✓ Present" : "✕ Absent"}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-extrabold text-xs text-indigo-600 dark:text-indigo-400">
                          {st.registration_no}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          {st.first_name} {st.last_name}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-muted-foreground">
                          {st.roll_number || st.registration_no || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">{st.email}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sleek, Non-Overlapping Footer Bar (contained strictly inside main content container) */}
      <div className="sticky bottom-24 z-20 mt-6 rounded-2xl border border-border bg-card/95 backdrop-blur-md px-5 py-3 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs font-medium">
            <div>
              Present:{" "}
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                {presentCount}
              </span>
            </div>
            <div>
              Absent:{" "}
              <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                {absentCount}
              </span>
            </div>
            <div>
              Total: <span className="font-extrabold text-foreground text-sm">{students.length}</span>
            </div>
            <Badge variant={presentPct >= 75 ? "success" : presentPct >= 60 ? "warning" : "error"}>
              {presentPct}% Present Rate
            </Badge>
          </div>

          <button
            type="button"
            disabled={saving || students.length === 0 || !subjectCode}
            onClick={handleSaveAttendance}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 px-5 py-2 text-xs sm:text-sm font-extrabold tracking-wider uppercase text-white disabled:opacity-50 transition-colors duration-150 w-full sm:w-auto shadow-sm"
          >
            {saving ? "Saving Session..." : "Save Attendance Session"}
          </button>
        </div>
      </div>
    </main>
  );
}
