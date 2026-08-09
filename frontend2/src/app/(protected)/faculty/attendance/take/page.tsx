"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Student, Subject } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useRouter } from "next/navigation";

interface CurriculumGroup {
  department: string;
  semester: string;
  subjects: Subject[];
}

export default function TakeAttendancePage() {
  const router = useRouter();
  const [curriculumGroups, setCurriculumGroups] = useState<CurriculumGroup[]>([]);
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, "present" | "absent">>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [msg, setMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // 5-Second Auto-Dismiss for Messages System-Wide
  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => setMsg(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  // 1. Fetch ALL assigned curriculum items for this faculty on mount
  useEffect(() => {
    async function loadFacultyCurriculum() {
      setLoading(true);
      try {
        const res = await apiFetch(`/curriculum/my-subjects-for-sem`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const items: CurriculumGroup[] = Array.isArray(data?.data) ? data.data : [];
          setCurriculumGroups(items);

          if (items.length > 0) {
            const firstGroup = items[0];
            const initDept = firstGroup.department || "CS";
            const initSem = String(firstGroup.semester || "4");
            const firstSubj = firstGroup.subjects?.[0]?.subject_code || "";

            setDepartment(initDept);
            setSemester(initSem);
            setSubjectCode(firstSubj);
          } else {
            setDepartment("");
            setSemester("");
            setSubjectCode("");
          }
        }
      } catch (e) {
        setCurriculumGroups([]);
      } finally {
        setLoading(false);
      }
    }
    loadFacultyCurriculum();
  }, []);

  // Compute options strictly based on assigned curriculumGroups
  const assignedDepts = Array.from(
    new Set(curriculumGroups.map((g) => g.department).filter(Boolean))
  );

  const assignedSems = Array.from(
    new Set(
      curriculumGroups
        .filter((g) => g.department.toUpperCase() === department.toUpperCase())
        .map((g) => String(g.semester))
        .filter(Boolean)
    )
  );

  const availableSubjects = curriculumGroups
    .filter(
      (g) =>
        g.department.toUpperCase() === department.toUpperCase() &&
        String(g.semester) === String(semester)
    )
    .flatMap((g) => g.subjects || []);

  // 2. Fetch student roster whenever department, semester, or subjectCode changes
  useEffect(() => {
    async function loadStudents() {
      if (!department || !semester || !subjectCode) {
        setStudents([]);
        setAttendanceMap({});
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ semester, department, limit: "100" });
        const stuRes = await apiFetch(`/student/my/?${params.toString()}`);
        if (stuRes.ok) {
          const stuData = await stuRes.json().catch(() => ({}));
          const stuList = Array.isArray(stuData?.data) ? stuData.data : [];
          setStudents(stuList);
          const initialMap: Record<string, "present" | "absent"> = {};
          stuList.forEach((st: Student) => {
            initialMap[st.registration_no] = "present";
          });
          setAttendanceMap(initialMap);
        } else {
          setStudents([]);
        }
      } catch (e) {
        setStudents([]);
        setAttendanceMap({});
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, [department, semester, subjectCode]);

  function handleDepartmentChange(newDept: string) {
    setDepartment(newDept);
    const matchingGroups = curriculumGroups.filter(
      (g) => g.department.toUpperCase() === newDept.toUpperCase()
    );
    const newSem = matchingGroups[0]?.semester ? String(matchingGroups[0].semester) : "";
    setSemester(newSem);

    const subjs = matchingGroups
      .filter((g) => String(g.semester) === newSem)
      .flatMap((g) => g.subjects || []);
    setSubjectCode(subjs[0]?.subject_code || "");
  }

  function handleSemesterChange(newSem: string) {
    setSemester(newSem);
    const subjs = curriculumGroups
      .filter(
        (g) =>
          g.department.toUpperCase() === department.toUpperCase() &&
          String(g.semester) === newSem
      )
      .flatMap((g) => g.subjects || []);
    setSubjectCode(subjs[0]?.subject_code || "");
  }

  function toggleStudentStatus(regNo: string) {
    const st = students.find((s) => s.registration_no === regNo);
    if (st && ((st.status || "").toLowerCase() === "frozen" || (st.status || "").toLowerCase() === "suspended")) return;
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
      const activeEnrolled = students.filter(
        (st) => (st.status || "").toLowerCase() !== "frozen" && (st.status || "").toLowerCase() !== "suspended"
      );
      const payload = {
        subject_code: subjectCode,
        department,
        semester,
        class_date: new Date().toISOString(),
        attendance_data: activeEnrolled.map((st) => ({
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

  const filteredStudents = students.filter((st) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const fullName = `${st.first_name || ""} ${st.last_name || ""}`.toLowerCase();
    const regNo = (st.registration_no || "").toLowerCase();
    const rollNo = (st.roll_number || "").toLowerCase();
    const email = (st.email || "").toLowerCase();
    return fullName.includes(q) || regNo.includes(q) || rollNo.includes(q) || email.includes(q);
  });

  const activeStudents = students.filter(
    (st) => (st.status || "").toLowerCase() !== "frozen" && (st.status || "").toLowerCase() !== "suspended"
  );
  const presentCount = activeStudents.filter(
    (st) => attendanceMap[st.registration_no] === "present"
  ).length;
  const absentCount = activeStudents.length - presentCount;
  const presentPct = activeStudents.length > 0 ? Math.round((presentCount / activeStudents.length) * 100) : 0;

  return (
    <main className="p-4 sm:p-6 pb-6 space-y-6 max-w-7xl mx-auto min-h-screen flex flex-col justify-between gap-12">
      <div className="space-y-6">
        {/* Header with Title and Ping CR Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
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
        <div className="rounded-2xl solid-card p-4 sm:p-5 border border-border bg-card space-y-3 lg:space-y-0 lg:flex lg:items-center lg:gap-4 min-w-0">
          <div className="flex flex-row gap-4 items-center justify-center">
            <CustomSelect
              label="Semester"
              value={semester}
              onChange={(val) => handleSemesterChange(val)}
              disabled={assignedSems.length === 0}
              placeholder={assignedSems.length === 0 ? "No Assigned Semesters" : "Select Semester..."}
              className="w-full lg:w-48"
              options={assignedSems.map((s) => ({
                value: s,
                label: `${s}`,
              }))}
            />

            <CustomSelect
              label="Department"
              value={department}
              onChange={(val) => handleDepartmentChange(val)}
              disabled={assignedDepts.length === 0}
              placeholder={assignedDepts.length === 0 ? "No Assigned Depts" : "Select Department..."}
              className="w-full lg:w-52"
              options={assignedDepts.map((d) => ({
                value: d,
                label: `${d}`,
              }))}
            />
          </div>
          <CustomSelect
            label="Assigned Subject"
            value={subjectCode}
            onChange={setSubjectCode}
            disabled={availableSubjects.length === 0}
            placeholder={availableSubjects.length === 0 ? "No Assigned Subjects" : "Select Subject..."}
            className="w-full lg:flex-1 lg:min-w-0"
            options={availableSubjects.map((subj) => ({
              value: subj.subject_code,
              label: `${subj.subject_code} • ${subj.subject_name}`,
              badge: subj.subject_code,
            }))}
          />
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

        {/* Roster Table or Empty State */}
        {availableSubjects.length === 0 ? (
          <div className="rounded-2xl solid-card border border-border p-10 text-center space-y-3">
            <div className="text-4xl">📚</div>
            <h3 className="text-base font-extrabold text-foreground">
              No Teaching Assignments Found
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto font-medium">
              You currently do not have any subjects assigned in the system. Class attendance marking is only available for assigned subjects.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl solid-card border border-border overflow-hidden bg-card space-y-0">
            {/* Search Bar & Roster Action Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-border bg-card">
              <div className="relative w-full sm:w-80">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">🔍</span>
                <input
                  type="text"
                  placeholder="Search student by name, reg no, roll no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-8 rounded-xl border border-border bg-background text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Quick Batch Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const newMap = { ...attendanceMap };
                    activeStudents.forEach((st) => {
                      newMap[st.registration_no] = "present";
                    });
                    setAttendanceMap(newMap);
                  }}
                  disabled={students.length === 0}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-extrabold transition-all disabled:opacity-40"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newMap = { ...attendanceMap };
                    activeStudents.forEach((st) => {
                      newMap[st.registration_no] = "absent";
                    });
                    setAttendanceMap(newMap);
                  }}
                  disabled={students.length === 0}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-xs font-extrabold transition-all disabled:opacity-40"
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            {/* Table Container with Dual-Axis Scroll and Sticky Header */}
            <div className="w-full overflow-auto custom-scrollbar max-h-[420px]">
              <table className="w-full text-center text-sm border-collapse min-w-[650px] relative">
                <thead className="sticky top-0 z-10 bg-card border-b border-border text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest text-center shadow-xs">
                  <tr>
                    <th className="py-3.5 px-4 text-center sticky top-0 bg-card shadow-xs">Status</th>
                    <th className="py-3.5 px-4 text-center sticky top-0 bg-card shadow-xs">Name</th>
                    <th className="py-3.5 px-4 text-center sticky top-0 bg-card shadow-xs">Registration No</th>
                    <th className="py-3.5 px-4 text-center sticky top-0 bg-card shadow-xs">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={4} className="py-4 px-4 text-center">
                          <div className="h-4 bg-muted rounded-lg w-full" />
                        </td>
                      </tr>
                    ))
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-sm font-medium text-muted-foreground">
                        No active students enrolled in this section.
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-sm font-medium text-muted-foreground">
                        No students match search query &quot;{searchQuery}&quot;.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => {
                      const isSuspended = (st.status || "").toLowerCase() === "frozen" || (st.status || "").toLowerCase() === "suspended";
                      const isPresent = attendanceMap[st.registration_no] === "present";
                      return (
                        <tr
                          key={st.registration_no}
                          onClick={() => !isSuspended && toggleStudentStatus(st.registration_no)}
                          className={`transition-colors duration-150 text-center ${isSuspended
                            ? "opacity-50 bg-slate-100/60 dark:bg-slate-900/30 cursor-not-allowed select-none"
                            : "cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/40 hover:border-l-2 hover:border-l-indigo-600 dark:hover:border-l-indigo-500"
                            }`}
                        >
                          <td className="py-3.5 px-4 text-center">
                            {isSuspended ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 mx-auto">
                                <span>❄️</span> Suspended
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStudentStatus(st.registration_no);
                                }}
                                className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors duration-150 mx-auto ${isPresent
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                                  }`}
                              >
                                <span>{isPresent ? "✓ Present" : "✕ Absent"}</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-foreground flex items-center justify-center gap-2">
                            <span>{st.first_name} {st.last_name}</span>
                            {isSuspended && (
                              <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                                [Suspended]
                              </span>
                            )}
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
        )}
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
