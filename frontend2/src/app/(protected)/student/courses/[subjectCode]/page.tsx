"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useUserMe } from "@/hooks/useUserMe";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";

interface DailyRecord {
  date: string;
  status: "present" | "absent" | "excused";
}

interface PersonalSubjectReport {
  subject_code: string;
  subject_name: string;
  total_classes: number;
  present_count: number;
  absent_count: number;
  excused_count: number;
  attendance_percentage: number;
  daily_records: DailyRecord[];
}

interface SubjectDetailsResponse {
  subject_code: string;
  subject_name: string;
  department: string;
  semester: string;
  faculty?: {
    faculty_id: string;
    name: string;
    email: string;
    department?: string;
    photo_url?: string;
  };
  stats?: {
    total_classes: number;
    overall_attendance_pct: number;
    weekly_attendance_pct: number;
    monthly_attendance_pct: number;
    total_enrolled: number;
  };
}

function formatPercentage(count: number, total: number): string {
  if (!total) return "0%";
  const pct = (count / total) * 100;
  const rounded = Math.round(pct * 10) / 10;
  return `${rounded}%`;
}

export default function StudentCourseDetailPage({
  params,
}: {
  params: Promise<{ subjectCode: string }>;
}) {
  const resolvedParams = use(params);
  const subjectCode = decodeURIComponent(resolvedParams.subjectCode);
  const { user } = useUserMe();

  const [loading, setLoading] = useState(true);
  const [personalReport, setPersonalReport] = useState<PersonalSubjectReport | null>(null);
  const [subjectMeta, setSubjectMeta] = useState<SubjectDetailsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "logs">("overview");
  const [historySearch, setHistorySearch] = useState("");
  const [displayLimit, setDisplayLimit] = useState(10);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    async function loadSubjectData() {
      if (!user?.registration_no) return;
      setLoading(true);

      try {
        // 1. Fetch Curriculum Metadata & Faculty Details
        const metaRes = await apiFetch(`/curriculum/subject-details/${encodeURIComponent(subjectCode)}`);
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          setSubjectMeta(metaData);
        }

        // 2. Fetch Personal Student Subject Report
        const reportRes = await apiFetch(
          `/attendance/report/student-subject?registration_no=${encodeURIComponent(
            user.registration_no
          )}&subject_code=${encodeURIComponent(subjectCode)}`
        );
        if (reportRes.ok) {
          const reportData = await reportRes.json();
          if (reportData.reports && reportData.reports.length > 0) {
            setPersonalReport(reportData.reports[0]);
          }
        }
      } catch (e) {
        // Silent catch
      } flex: {
        setLoading(false);
      }
    }

    loadSubjectData();
  }, [subjectCode, user?.registration_no]);

  const subjectName = subjectMeta?.subject_name || personalReport?.subject_name || subjectCode;
  const facultyName = subjectMeta?.faculty?.name || "Assigned Faculty";
  const facultyEmail = subjectMeta?.faculty?.email || "N/A";
  const totalClasses = personalReport?.total_classes || 0;
  const presentCount = personalReport?.present_count || 0;
  const absentCount = personalReport?.absent_count || 0;
  const excusedCount = personalReport?.excused_count || 0;
  const attendancePct = personalReport?.attendance_percentage ?? 0;
  const isEligible = attendancePct >= 75;
  const dailyRecords = personalReport?.daily_records || [];

  const facultyPhoto = subjectMeta?.faculty?.photo_url;
  const facultyInitials = (subjectMeta?.faculty?.name || facultyName || "FC")
    .replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "FC";

  const targetNeeded = Math.ceil(0.75 * totalClasses);
  const classesAhead = presentCount - targetNeeded;

  const filteredRecords = dailyRecords.filter((rec) => {
    if (!historySearch) return true;
    const dateStr = new Date(rec.date).toLocaleDateString();
    return dateStr.toLowerCase().includes(historySearch.toLowerCase()) || rec.status.toLowerCase().includes(historySearch.toLowerCase());
  });

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
            <Link href="/student/courses" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              My Courses
            </Link>
            <span>/</span>
            <span className="text-foreground font-mono font-bold">{subjectCode}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <span>{subjectName}</span>
          </h1>
        </div>

        <Link
          href="/student/courses"
          className="rounded-xl border border-border bg-card hover:bg-muted text-foreground px-4 py-2 text-xs font-bold transition-all shadow-xs self-start sm:self-auto flex items-center gap-1.5"
        >
          <span>←</span> Back to All Courses
        </Link>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs font-bold text-muted-foreground animate-pulse">
          Loading course performance & analytics...
        </div>
      ) : (
        <>
          {/* Top Banner: Assigned Faculty & Subject Meta Badges */}
          <div className="solid-card rounded-2xl p-5 border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            {/* Assigned Faculty (Left / Start) */}
            <div className="flex items-center gap-4">
              {facultyPhoto && !imgFailed ? (
                <img
                  src={facultyPhoto}
                  alt={facultyName}
                  className="h-16 w-16 shrink-0 rounded-2xl object-cover border border-border shadow-sm"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white font-black text-sm shadow-sm">
                  {facultyInitials}
                </div>
              )}
              <div className="space-y-0.5 overflow-hidden">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Assigned Faculty
                </span>
                <h4 className="text-base font-extrabold text-foreground truncate" title={facultyName}>
                  {facultyName}
                </h4>
                <p className="text-xs font-semibold text-muted-foreground truncate" title={facultyEmail}>
                  {facultyEmail}
                </p>
              </div>
            </div>

            {/* Subject Meta Badges (Right / End) */}
            <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
              <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                {subjectCode}
              </span>
              <Badge variant="muted">
                Semester {subjectMeta?.semester || user?.semester || "N/A"}
              </Badge>
              <Badge variant="teal">
                Department: {subjectMeta?.department || user?.department || "CS"}
              </Badge>
            </div>
          </div>

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Attendance Rate"
              value={`${attendancePct}%`}
              description={isEligible ? "Above 75% Cutoff" : "Below 75% Cutoff"}
              variant={isEligible ? "emerald" : "rose"}
              icon={<span className="text-xl">🎯</span>}
            />
            <StatCard
              title="Classes Attended"
              value={presentCount}
              description="Present in class"
              variant="emerald"
              icon={<span className="text-xl">✅</span>}
            />
            <StatCard
              title="Classes Absent"
              value={absentCount}
              description="Unexcused absences"
              variant={absentCount > 0 ? "rose" : "blue"}
              icon={<span className="text-xl">❌</span>}
            />
            <StatCard
              title="Excused Leave"
              value={excusedCount}
              description="Approved leave"
              variant="amber"
              icon={<span className="text-xl">📝</span>}
            />
            <StatCard
              title="Total Classes Held"
              value={totalClasses}
              description={`Class Avg: ${subjectMeta?.stats?.overall_attendance_pct ?? 0}%`}
              variant="indigo"
              icon={<span className="text-xl">📅</span>}
            />
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-border pb-2 pt-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${activeTab === "overview"
                ? "bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-xs"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
                }`}
            >
              📊 Performance Charts & Graphs
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${activeTab === "logs"
                ? "bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-xs"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
                }`}
            >
              📋 Session Logs ({dailyRecords.length})
            </button>
          </div>

          {/* Tab 1: Overview & Visual Graphs */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Radial Circular Attendance Gauge */}
              <div className="solid-card rounded-2xl p-6 border border-border bg-card space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-foreground flex items-center justify-between">
                    <span>Attendance Threshold Gauge</span>
                    <Badge variant={isEligible ? "success" : "error"}>75% Cutoff</Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Visual radial meter showing your score against the minimum required exam threshold.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center py-4 relative">
                  <svg className="w-56 h-56 -rotate-90 transform" viewBox="0 0 100 100">
                    {/* Outer Track Circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-muted"
                      strokeWidth="10"
                      fill="transparent"
                    />

                    {/* 75% Cutoff Marker Line */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#f59e0b"
                      strokeWidth="10"
                      strokeDasharray={`${251.2 * 0.75} 251.2`}
                      strokeDashoffset="0"
                      fill="transparent"
                      opacity="0.25"
                    />

                    {/* Progress Circle Arc */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke={isEligible ? "#10b981" : "#ef4444"}
                      strokeWidth="10"
                      strokeDasharray={`${251.2 * (Math.min(100, Math.max(0, attendancePct)) / 100)} 251.2`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>

                  {/* Centered Percentage Badge */}
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className={`text-3xl font-black font-mono ${isEligible ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {attendancePct}%
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {presentCount} / {totalClasses} Classes
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-muted flex items-center justify-center text-[12px] font-bold">
                  <span className={isEligible ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                    {isEligible ? "✓  Eligible for End-Sem Exam" : "⚠️ Shortage of Attendance"}
                  </span>
                </div>
              </div>

              {/* Chart 2: Status Breakdown Bar Graph */}
              <div className="solid-card rounded-2xl p-6 border border-border bg-card space-y-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Attendance Status Distribution</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Side-by-side comparison of present, absent, and excused sessions.
                  </p>
                </div>

                {/* Bars List */}
                <div className="space-y-5 my-auto">
                  {/* Present Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <span>●</span> Present ({presentCount} Sessions)
                      </span>
                      <span className="font-mono">{formatPercentage(presentCount, totalClasses)}</span>
                    </div>
                    <div className="w-full h-4 bg-muted rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Absent Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                        <span>●</span> Absent ({absentCount} Sessions)
                      </span>
                      <span className="font-mono">{formatPercentage(absentCount, totalClasses)}</span>
                    </div>
                    <div className="w-full h-4 bg-muted rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${totalClasses > 0 ? (absentCount / totalClasses) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Excused Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <span>●</span> Excused / Leave ({excusedCount} Sessions)
                      </span>
                      <span className="font-mono">{formatPercentage(excusedCount, totalClasses)}</span>
                    </div>
                    <div className="w-full h-4 bg-muted rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${totalClasses > 0 ? (excusedCount / totalClasses) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-muted flex items-center justify-center text-[12px] font-bold">
                  <span className={`${classesAhead >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {totalClasses === 0
                      ? "0 Classes Held"
                      : classesAhead >= 0
                        ? `+ ${classesAhead} ${classesAhead === 1 ? "Class" : "Classes"} Ahead of Target`
                        : `${Math.abs(classesAhead)} ${Math.abs(classesAhead) === 1 ? "Class" : "Classes"} Short of Target`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Detailed Session Logs Table */}
          {activeTab === "logs" && (
            <div className="solid-card rounded-2xl p-6 border border-border bg-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Class Attendance Log</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Complete list of date-wise attendance records recorded by course instructor or CR.
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="Filter by date or status..."
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setDisplayLimit(10);
                  }}
                  className="px-3.5 py-1.5 rounded-xl border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {filteredRecords.length === 0 ? (
                <div className="p-8 text-center text-xs font-bold text-muted-foreground">
                  No matching attendance session logs found.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-extrabold tracking-wider border-b border-border">
                        <tr>
                          <th className="p-3.5">#</th>
                          <th className="p-3.5">Date & Time</th>
                          <th className="p-3.5">Subject</th>
                          <th className="p-3.5 text-right">Attendance Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredRecords.slice(0, displayLimit).map((record, index) => {
                          const dateObj = new Date(record.date);
                          const formattedDate = dateObj.toLocaleDateString(undefined, {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          });
                          const formattedTime = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                          return (
                            <tr key={index} className="hover:bg-muted/30 transition-colors">
                              <td className="p-3.5 font-mono font-bold text-muted-foreground">
                                {index + 1}
                              </td>
                              <td className="p-3.5 font-semibold text-foreground">
                                <div>{formattedDate}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{formattedTime}</div>
                              </td>
                              <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {subjectCode}
                              </td>
                              <td className="p-3.5 text-right">
                                <Badge
                                  variant={
                                    record.status === "present"
                                      ? "success"
                                      : record.status === "excused"
                                        ? "warning"
                                        : "error"
                                  }
                                  className="uppercase text-[10px]"
                                >
                                  {record.status === "present" ? "✓ Present" : record.status === "excused" ? "📝 Excused" : "❌ Absent"}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Load More Button */}
                  {displayLimit < filteredRecords.length && (
                    <div className="pt-2 text-center">
                      <button
                        onClick={() => setDisplayLimit((prev) => prev + 10)}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all shadow-xs active:scale-[0.99] flex items-center justify-center gap-2 mx-auto"
                      >
                        <span>Show More Logs</span>
                        <span className="bg-white/20 px-2 py-0.5 rounded-md font-mono text-[10px]">
                          +{Math.min(10, filteredRecords.length - displayLimit)} remaining
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
