"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useUserMe } from "@/hooks/useUserMe";
import { apiFetch } from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { exportToCSV, exportToPDF, ReportColumn } from "@/lib/reportExporter";

interface StudentReportData {
  student_info: {
    registration_no: string;
    student_name: string;
    email: string;
    department: string;
    semester: string;
    course: string;
  };
  overall_attended: number;
  overall_total_classes: number;
  overall_attendance_pct: number;
  is_eligible: boolean;
  subject_breakdown: Array<{
    subject_code: string;
    subject_name: string;
    attended_classes: number;
    total_classes: number;
    attendance_pct: number;
    is_eligible: boolean;
  }>;
  session_history: Array<{
    session_id: string;
    date: string;
    subject_code: string;
    status: "present" | "absent";
  }>;
}

function getPaletteForAttendance(pct: number) {
  if (pct >= 75) {
    return {
      gradient: "from-emerald-600 via-teal-500 to-green-400",
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      textColor: "text-emerald-600 dark:text-emerald-400",
      barBg: "bg-emerald-500",
    };
  }
  if (pct >= 60) {
    return {
      gradient: "from-indigo-600 via-violet-500 to-blue-400",
      badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      textColor: "text-indigo-600 dark:text-indigo-400",
      barBg: "bg-indigo-500",
    };
  }
  if (pct >= 40) {
    return {
      gradient: "from-amber-600 via-orange-500 to-yellow-400",
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      textColor: "text-amber-600 dark:text-amber-400",
      barBg: "bg-amber-500",
    };
  }
  return {
    gradient: "from-rose-600 via-pink-500 to-red-400",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    textColor: "text-rose-600 dark:text-rose-400",
    barBg: "bg-rose-500",
  };
}

function getClassesNeededFor75(attended: number, total: number) {
  if (total === 0) return 0;
  const currentPct = (attended / total) * 100;
  if (currentPct >= 75.0) return 0;
  const needed = Math.ceil((0.75 * total - attended) / 0.25);
  return Math.max(0, needed);
}

function getSafeClassesToMiss(attended: number, total: number) {
  if (total === 0) return 0;
  const currentPct = (attended / total) * 100;
  if (currentPct < 75.0) return 0;
  const allowed = Math.floor((attended - 0.75 * total) / 0.75);
  return Math.max(0, allowed);
}

function formatHumanDate(dateStr?: string) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function StudentReportsPage() {
  const { user } = useUserMe();
  const [report, setReport] = useState<StudentReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionLimit, setSessionLimit] = useState(10);
  const [viewMode, setViewMode] = useState<"auto" | "table" | "cards">("auto");

  useEffect(() => {
    async function loadStudentReport() {
      setLoading(true);
      try {
        const res = await apiFetch("/reports/student-summary");
        if (res.ok) {
          const data = await res.json();
          setReport(data);
        }
      } catch (e) {
        // Silent catch
      } finally {
        setLoading(false);
      }
    }
    loadStudentReport();
  }, []);

  const subjectColumns: ReportColumn[] = [
    { key: "subject_code", label: "Subject Code" },
    { key: "subject_name", label: "Subject Name" },
    { key: "attended_classes", label: "Attended Classes" },
    { key: "total_classes", label: "Total Classes" },
    { key: "attendance_pct", label: "Attendance %" },
  ];

  function handleExportCSV() {
    if (!report) return;
    exportToCSV(`Personal_Attendance_Statement_${report.student_info.registration_no}.csv`, subjectColumns, report.subject_breakdown);
  }

  function handleExportPDF() {
    if (!report) return;
    exportToPDF(
      `Personal Academic Attendance Statement`,
      `75%`,
      report.student_info.department,
      report.student_info.semester,
      subjectColumns,
      report.subject_breakdown
    );
  }

  const subjectNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    report?.subject_breakdown?.forEach((sub) => {
      map[sub.subject_code] = sub.subject_name;
    });
    return map;
  }, [report]);

  const presentCount = (report?.session_history || []).filter((s) => s.status === "present").length;
  const absentCount = (report?.session_history || []).length - presentCount;

  const filteredSessions = (report?.session_history || []).filter((sess) => {
    if (!sessionSearch.trim()) return true;
    const q = sessionSearch.toLowerCase();
    const formattedDate = formatHumanDate(sess.date).toLowerCase();
    const subjTitle = (subjectNameMap[sess.subject_code] || sess.subject_code).toLowerCase();
    return (
      sess.subject_code.toLowerCase().includes(q) ||
      subjTitle.includes(q) ||
      sess.session_id.toLowerCase().includes(q) ||
      sess.status.toLowerCase().includes(q) ||
      formattedDate.includes(q)
    );
  });

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header with Splitted Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              📋
            </span>
            <span>My Attendance Records</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">
            Course-wise attendance breakdown, examination eligibility indicator, and attendance history log.
          </p>
        </div>

        {/* Splitted 2-Column Export Buttons Grid on Mobile, Flex on Desktop */}
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-3 py-1 text-xs font-extrabold transition-all active:scale-[0.98] shadow-xs hover:shadow"
          >
            <span className="text-sm">📥</span>
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3 py-1 text-xs font-extrabold transition-all active:scale-[0.98] shadow-xs hover:shadow"
          >
            <span className="text-sm">📄</span>
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
          Fetching attendance report from database...
        </div>
      ) : !report ? (
        <div className="solid-card rounded-2xl p-12 text-center space-y-2 border border-border">
          <div className="text-3xl">⚠️</div>
          <h3 className="text-sm font-bold text-foreground">Report Not Found</h3>
          <p className="text-xs text-muted-foreground">Could not load attendance records.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat Cards Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <StatCard
              title="Overall Attendance Rate"
              value={`${report.overall_attendance_pct}%`}
              trend={{
                value: report.overall_total_classes === 0 ? "No Classes Conducted Yet" : report.is_eligible ? "Eligible for Exams (≥75%)" : "Low Attendance Warning (<75%)",
                positive: report.overall_total_classes === 0 || report.is_eligible,
              }}
              variant={report.overall_attendance_pct >= 75 ? "emerald" : "rose"}
              icon={<span className="text-xl">📊</span>}
            />
            <StatCard
              title="Total Classes Attended"
              value={`${report.overall_attended} / ${report.overall_total_classes}`}
              description="Classes attended across all subjects"
              variant="indigo"
              icon={<span className="text-xl">✅</span>}
            />
            <StatCard
              title="Exam Eligibility Status"
              value={report.overall_total_classes === 0 ? "Good Standing" : report.is_eligible ? "Eligible" : "Warning"}
              trend={{ value: report.overall_total_classes === 0 ? "No Sessions Held" : report.is_eligible ? "Safe Zone" : "Required Cutoff: 75%", positive: report.overall_total_classes === 0 || report.is_eligible }}
              variant={report.is_eligible ? "emerald" : "rose"}
              icon={<span className="text-xl">{report.overall_total_classes === 0 ? "🎓" : report.is_eligible ? "🎓" : "⚠️"}</span>}
            />
          </div>

          {/* Subject Breakdown Cards (Enhanced like My Courses page) */}
          <div className="solid-card rounded-2xl p-5 border border-border space-y-4 bg-card">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2 truncate">
                <span>Attendance Records</span>
              </h3>
              <Badge variant="muted" className="font-mono text-[11px]" showDot={false}>
                {report.subject_breakdown.length} Courses
              </Badge>
            </div>

            {report.subject_breakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground p-6 text-center font-medium">
                No course attendance sessions logged yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {report.subject_breakdown.map((sub) => {
                  const isEligible = sub.is_eligible;
                  const pct = sub.attendance_pct;
                  const palette = getPaletteForAttendance(pct);
                  const needed = getClassesNeededFor75(sub.attended_classes, sub.total_classes);
                  const safeMiss = getSafeClassesToMiss(sub.attended_classes, sub.total_classes);

                  return (
                    <Link
                      key={sub.subject_code}
                      href={`/student/courses/${encodeURIComponent(sub.subject_code)}`}
                      className="group solid-card rounded-2xl p-5 border border-border bg-card hover:border-indigo-500/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-4 relative overflow-hidden cursor-pointer"
                    >
                      {/* Accent Top Bar */}
                      <div
                        className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${palette.gradient}`}
                      />

                      <div className="space-y-1">
                        {/* Course Header */}
                        <div className="flex items-center justify-between gap-1">
                          {/* Title */}
                          <h4 className="text-sm font-extrabold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                            {sub.subject_name}
                          </h4>
                          <Badge variant={isEligible ? "success" : "error"} showDot={false} className="text-[10px] font-extrabold">
                            {isEligible ? "Eligible" : "Defaulter"}
                          </Badge>
                        </div>

                        {/* Attendance Score & Meter */}
                        <div className="space-y-2 pt-2 border-t border-border/60">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-muted-foreground">Attendance Score</span>
                            <span className={`font-mono text-sm font-black ${palette.textColor}`}>
                              {pct}%
                            </span>
                          </div>

                          {/* Progress Bar Container with 75% Cutoff Indicator */}
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden relative">
                            <div
                              className="absolute top-0 bottom-0 w-1 bg-amber-500 z-10"
                              style={{ left: "75%" }}
                              title="75% Cutoff Threshold"
                            />
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${palette.gradient} transition-all duration-500`}
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold pt-0.5">
                            <span>{sub.attended_classes} Attended</span>
                            <span>{sub.total_classes} Total Classes</span>
                          </div>
                        </div>

                        {/* Attendance Insight Hint & Details Indicator */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px] font-bold">
                          {sub.total_classes === 0 ? (
                            <span className="text-indigo-500">ℹ️ No classes held yet.</span>
                          ) : isEligible ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Can miss up to {safeMiss} {safeMiss === 1 ? "class" : "classes"}.</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">⚠️ Attend next {needed} {needed === 1 ? "class" : "classes"}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Attendance Session Logs (Dashboard Card Style) */}
          {report.session_history && report.session_history.length > 0 && (
            <div className="solid-card rounded-2xl p-4 sm:p-6 border border-border space-y-4 bg-card">
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center justify-between gap-2.5">
                  <h3 className="text-base font-extrabold text-foreground flex items-center gap-2 truncate">
                    <span>📅 Attendance Logs</span>
                  </h3>
                  <span className="hidden sm:block">
                    <Badge showDot={false} variant="muted" className=" font-mono text-[10px]">
                      {filteredSessions.length}
                    </Badge>
                  </span>

                  {report.session_history.length > 0 && (
                    <span className="text-[10px] sm:text-xs font-bold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border shrink-0">
                      <strong className="text-emerald-600 dark:text-emerald-400">{presentCount} Present</strong>
                      <span className="mx-1 text-muted-foreground/60 text-sm">|</span>
                      <strong className="text-rose-600 dark:text-rose-400">{absentCount} Absent</strong>
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* Search Filter Input */}
                  <div className="relative">
                    <svg
                      className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by code, title, date or status..."
                      value={sessionSearch}
                      onChange={(e) => {
                        setSessionSearch(e.target.value);
                        setSessionLimit(10);
                      }}
                      className="w-full sm:w-60 pl-9 pr-3.5 py-1.5 rounded-xl border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* Desktop View Mode Switcher Toggle */}
                  <div className="hidden sm:flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode("auto")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${viewMode === "auto" ? "bg-indigo-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${viewMode === "table" ? "bg-indigo-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Table
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("cards")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${viewMode === "cards" ? "bg-indigo-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Cards
                    </button>
                  </div>
                </div>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="p-8 text-center text-xs font-bold text-muted-foreground">
                  No matching attendance session logs found.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Dashboard Card Style View */}
                  <div
                    className={
                      viewMode === "table"
                        ? "hidden"
                        : "space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar"
                    }
                  >
                    {filteredSessions.slice(0, sessionLimit).map((sess, idx) => {
                      const subjTitle = subjectNameMap[sess.subject_code] || sess.subject_code;
                      const formattedDate = formatHumanDate(sess.date);
                      const isPresent = sess.status === "present";

                      return (
                        <div
                          key={sess.session_id || idx}
                          className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all text-xs gap-2.5 ${isPresent
                            ? "bg-emerald-500/[0.03] border-emerald-500/20 hover:border-emerald-500/40"
                            : "bg-rose-500/[0.03] border-rose-500/20 hover:border-rose-500/40"
                            }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${isPresent
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                }`}
                            >
                              {isPresent ? "✓" : "✕"}
                            </div>

                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-foreground text-xs truncate" title={subjTitle}>
                                  {subjTitle}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-semibold block truncate">
                                {formattedDate}
                              </span>
                            </div>
                          </div>

                          <Badge
                            variant={isPresent ? "success" : "error"}
                            showDot={false}
                            className="shrink-0 font-extrabold text-[10px] px-2.5 py-0.5"
                          >
                            {isPresent ? "Present" : "Absent"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View (Only when Table view mode explicitly selected) */}
                  {viewMode === "table" && (
                    <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] font-extrabold tracking-wider">
                            <th className="p-3">Session ID</th>
                            <th className="p-3">Subject Name</th>
                            <th className="p-3">Date</th>
                            <th className="p-3 text-right">Attendance Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredSessions.slice(0, sessionLimit).map((sess, idx) => {
                            const subjTitle = subjectNameMap[sess.subject_code] || sess.subject_code;
                            return (
                              <tr key={sess.session_id || idx} className="hover:bg-muted/30 transition-colors">
                                <td className="p-3 font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                  {sess.session_id || `SESS_${idx + 1}`}
                                </td>
                                <td className="p-3 font-extrabold text-foreground">{subjTitle}</td>
                                <td className="p-3 text-muted-foreground font-medium">{formatHumanDate(sess.date)}</td>
                                <td className="p-3 text-right">
                                  <Badge variant={sess.status === "present" ? "success" : "error"}>
                                    {sess.status === "present" ? "✓ Present" : "✕ Absent"}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Load More Logs Button */}
                  {sessionLimit < filteredSessions.length && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setSessionLimit((prev) => prev + 10)}
                        className="px-5 py-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all shadow-xs active:scale-[0.98] inline-flex items-center justify-center gap-2"
                      >
                        <span>Show More Logs</span>
                        <span className="bg-white/20 px-2 py-0.5 rounded-md font-mono text-[10px]">
                          +{Math.min(10, filteredSessions.length - sessionLimit)} remaining
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}


