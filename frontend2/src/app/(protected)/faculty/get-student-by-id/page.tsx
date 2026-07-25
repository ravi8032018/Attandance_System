"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api";

interface SubjectReport {
  subject_code: string;
  subject_name?: string;
  total_classes: number;
  present_count: number;
  absent_count: number;
  excused_count?: number;
  attendance_percentage: number;
}

function StudentLookupContent() {
  const searchParams = useSearchParams();
  const regParam = searchParams.get("reg") || "";
  const [regNo, setRegNo] = useState(regParam);
  const [student, setStudent] = useState<any>(null);
  const [reports, setReports] = useState<SubjectReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [curriculumMap, setCurriculumMap] = useState<Record<string, string>>({});

  async function handleSearch(targetReg: string) {
    if (!targetReg) return;
    setLoading(true);
    setError("");
    setStudent(null);
    setReports([]);
    try {
      // 1. Fetch Student Details
      const res = await apiFetch(`/student/registration-no/${encodeURIComponent(targetReg)}`);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setStudent(data?.data || data);
      } else {
        throw new Error("Student record not found for registration number: " + targetReg);
      }

      // 2. Fetch Curriculum Catalog for complete subject name mapping
      try {
        const currRes = await apiFetch("/curriculum/");
        if (currRes.ok) {
          const currData = await currRes.json().catch(() => ({}));
          const items = Array.isArray(currData?.data) ? currData.data : [];
          const map: Record<string, string> = {};
          items.forEach((item: any) => {
            (item.subjects || []).forEach((s: any) => {
              if (s.subject_code && s.subject_name) {
                map[s.subject_code] = s.subject_name;
              }
            });
          });
          setCurriculumMap(map);
        }
      } catch (e) {
        console.warn("Could not load curriculum catalog", e);
      }

      // 3. Fetch Student Attendance Report
      try {
        const reportRes = await apiFetch(
          `/attendance/report/student-subject?registration_no=${encodeURIComponent(targetReg)}`
        );
        if (reportRes.ok) {
          const reportData = await reportRes.json().catch(() => ({}));
          setReports(Array.isArray(reportData?.reports) ? reportData.reports : []);
        }
      } catch (e) {
        console.warn("Could not load attendance reports for student", e);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to locate student.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (regParam) {
      handleSearch(regParam);
    }
  }, [regParam]);

  // Aggregate attendance numbers across all subjects
  const totalClasses = reports.reduce((sum, r) => sum + (r.total_classes || 0), 0);
  const totalPresent = reports.reduce((sum, r) => sum + (r.present_count || 0) + (r.excused_count || 0), 0);
  const totalAbsent = reports.reduce((sum, r) => sum + (r.absent_count || 0), 0);
  const overallPercentage =
    totalClasses > 0 ? ((totalPresent / totalClasses) * 100).toFixed(1) : null;

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Student Profile & Attendance Record
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Detailed academic credentials, contact info, and subject attendance metrics directly from database.
        </p>
      </div>

      {/* Search Input */}
      <div className="solid-card rounded-2xl p-4 border border-border flex flex-col sm:flex-row items-center gap-3">
        <input
          type="text"
          value={regNo}
          onChange={(e) => setRegNo(e.target.value)}
          placeholder="Enter Registration No (e.g. REG2024001)"
          className="h-11 flex-1 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-colors duration-150 font-mono"
        />
        <button
          type="button"
          onClick={() => handleSearch(regNo)}
          disabled={loading || !regNo}
          className="h-11 w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-6 py-2 text-xs font-bold transition-colors duration-150 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Lookup Student"}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-4 text-xs font-bold text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {student && (
        <div className="space-y-6">
          {/* Main Profile Card */}
          <div className="solid-card rounded-2xl p-6 border border-border space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div className="flex items-center gap-4">
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt={student.first_name || "Student"}
                    className="h-16 w-16 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white font-extrabold text-lg">
                    {(student.first_name?.[0] || "S").toUpperCase()}
                    {(student.last_name?.[0] || "").toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-extrabold text-foreground">
                    {student.first_name ? `${student.first_name} ${student.last_name || ""}` : "Student Record"}
                  </h2>
                  <p className="text-sm sm:text-base font-mono font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wide">
                    {student.registration_no}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {student.department && <Badge variant="primary">{student.department}</Badge>}
                {student.course && <Badge variant="secondary">{student.course}</Badge>}
                {student.semester && <Badge variant="secondary">Semester {student.semester}</Badge>}
                <Badge variant={student.status === "active" ? "success" : "warning"}>
                  {(student.status || "active").toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Information Grid based on backend fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Email Address</span>
                <span className="text-sm font-semibold text-foreground">{student.email || "—"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Contact Number</span>
                <span className="text-sm font-semibold text-foreground">{student.contact_number || "—"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Gender</span>
                <span className="text-sm font-semibold capitalize text-foreground">{student.gender || "—"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Date of Birth</span>
                <span className="text-sm font-semibold text-foreground">{student.dob || "—"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Guardian Email</span>
                <span className="text-sm font-semibold text-foreground">{student.guardian_email || "—"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Batch Name</span>
                <span className="text-sm font-semibold text-foreground">{student.batch_name || "—"}</span>
              </div>
            </div>
          </div>

          {/* Attendance Stats section from real backend aggregates */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">Attendance Overview</h3>
            {totalClasses > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard title="Total Classes" value={String(totalClasses)} icon="📚" />
                  <StatCard
                    title="Attended"
                    value={String(totalPresent)}
                    trend={{ value: `${overallPercentage}%`, positive: Number(overallPercentage) >= 75 }}
                    icon="✓"
                  />
                  <StatCard
                    title="Absences"
                    value={`${totalAbsent} Sessions`}
                    trend={{ value: Number(overallPercentage) >= 75 ? "Satisfactory" : "Low Attendance", positive: Number(overallPercentage) >= 75 }}
                    icon="✕"
                  />
                </div>

                {/* Subject wise breakdown table */}
                <div className="solid-card rounded-2xl p-6 border border-border space-y-4">
                  <h4 className="text-sm font-bold text-foreground">Subject Breakdown</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                          <th className="pb-3 px-2">Subject Code</th>
                          <th className="pb-3 px-2">Subject Name</th>
                          <th className="pb-3 px-2 text-center">Total Classes</th>
                          <th className="pb-3 px-2 text-center">Present</th>
                          <th className="pb-3 px-2 text-center">Absent</th>
                          <th className="pb-3 px-2 text-right">Percentage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {reports.map((report) => {
                          const subjName =
                            report.subject_name ||
                            curriculumMap[report.subject_code] ||
                            student?.subjects?.[report.subject_code] ||
                            "Subject " + report.subject_code;
                          return (
                            <tr key={report.subject_code}>
                              <td className="py-3 px-2 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                {report.subject_code}
                              </td>
                              <td className="py-3 px-2 font-medium text-foreground min-w-[200px]" title={subjName}>
                                {subjName}
                              </td>
                              <td className="py-3 px-2 text-center font-medium">{report.total_classes}</td>
                              <td className="py-3 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                {report.present_count}
                              </td>
                              <td className="py-3 px-2 text-center font-bold text-rose-600 dark:text-rose-400">
                                {report.absent_count}
                              </td>
                              <td className="py-3 px-2 text-right font-extrabold">
                                <span className={report.attendance_percentage >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                                  {report.attendance_percentage}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="solid-card rounded-2xl p-6 border border-border text-center text-xs font-semibold text-muted-foreground">
                No attendance sessions recorded yet for this student.
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function GetStudentByIdPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading lookup console...</div>}>
      <StudentLookupContent />
    </Suspense>
  );
}
