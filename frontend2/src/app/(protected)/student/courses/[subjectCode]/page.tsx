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

function getPaletteForAttendance(pct: number) {
  if (pct >= 75) {
    return {
      gradient: "from-emerald-600 via-teal-500 to-green-400",
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      textColor: "text-emerald-600 dark:text-emerald-400",
      stroke: "#10b981",
    };
  }
  if (pct >= 60) {
    return {
      gradient: "from-indigo-600 via-violet-500 to-blue-400",
      badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      textColor: "text-indigo-600 dark:text-indigo-400",
      stroke: "#6366f1",
    };
  }
  if (pct >= 40) {
    return {
      gradient: "from-amber-600 via-orange-500 to-yellow-400",
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      textColor: "text-amber-600 dark:text-amber-400",
      stroke: "#f59e0b",
    };
  }
  return {
    gradient: "from-rose-600 via-pink-500 to-red-400",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    textColor: "text-rose-600 dark:text-rose-400",
    stroke: "#ef4444",
  };
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
      } finally {
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
  const palette = getPaletteForAttendance(attendancePct);
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
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap- w-full min-w-0">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground px-1 min-w-0 flex-1">
          <p className="truncate">{subjectName}</p>
        </h1>
        <Badge variant="primary" showDot={false} className="flex-shrink-0">
          {subjectCode}
        </Badge>
      </div>


      {loading ? (
        <div className="p-16 text-center text-xs font-bold text-muted-foreground animate-pulse">
          Loading course performance & analytics...
        </div>
      ) : (
        <>
          {/* Top Banner: Assigned Faculty & Subject Meta Badges */}
          <div className="solid-card rounded-2xl p-4 sm:p-5 border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Assigned Faculty (Left / Start) */}
            <div className="flex items-center gap-3.5">
              {facultyPhoto && !imgFailed ? (
                <img
                  src={facultyPhoto}
                  alt={facultyName}
                  className="h-14 w-14 shrink-0 rounded-2xl object-cover border border-border shadow-sm"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white font-black text-sm shadow-sm">
                  {facultyInitials}
                </div>
              )}
              <div className="space-y-0.5 overflow-hidden">
                <h4 className="text-lg font-extrabold text-foreground truncate" title={facultyName}>
                  {facultyName}
                </h4>
                <p className="text-xs font-semibold text-muted-foreground truncate" title={facultyEmail}>
                  {facultyEmail}
                </p>
              </div>
            </div>

            {/* Subject Meta Badges (Right / End) */}
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Badge variant="teal">
                Semester {subjectMeta?.semester || user?.semester || "N/A"}
              </Badge>
              <Badge variant="muted">
                Dept: {subjectMeta?.department || user?.department || "CS"}
              </Badge>
            </div>
          </div>

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
            <StatCard
              title="Attendance Rate"
              value={`${attendancePct}%`}
              description={isEligible ? "Above 75% Cutoff" : "Below 75% Cutoff"}
              variant={isEligible ? "emerald" : "rose"}
              icon={<span className="text-base sm:text-xl">🎯</span>}
            />
            <StatCard
              title="Attended"
              value={presentCount}
              description="Present in class"
              variant="emerald"
              icon={<span className="text-base sm:text-xl">✅</span>}
            />
            <StatCard
              title="Absent"
              value={absentCount}
              description="Unexcused absences"
              variant={absentCount > 0 ? "rose" : "blue"}
              icon={<span className="text-base sm:text-xl">❌</span>}
            />
            <StatCard
              title="Excused Leave"
              value={excusedCount}
              description="Approved leave"
              variant="amber"
              className="sm:hidden xl:inline"
              icon={<span className="text-base sm:text-xl">📝</span>}
            />
            <StatCard
              title="Total Classes"
              value={totalClasses}
              description={`Class Avg: ${subjectMeta?.stats?.overall_attendance_pct ?? 0}%`}
              variant="indigo"
              icon={<span className="text-base sm:text-xl">📅</span>}
              className="col-span-2 sm:col-span-1 lg:col-span-1"
            />
          </div>

          {/* Navigation Segmented Tabs */}
          <div className="p-1 rounded-xl bg-muted/60 border border-border inline-flex items-center gap-1 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-150 flex items-center justify-center gap-1.5 ${activeTab === "overview"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <span>📊 Performance Overview</span>
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-150 flex items-center justify-center gap-1.5 ${activeTab === "logs"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <span>📋 Session Logs</span>
              <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${activeTab === "logs" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground border border-border"
                }`}>
                {dailyRecords.length}
              </span>
            </button>
          </div>

          {/* Tab 1: Overview & Visual Graphs */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Chart 1: Radial Circular Attendance Gauge */}
              <div className="solid-card rounded-2xl p-5 sm:p-6 border border-border bg-card space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-foreground flex items-center justify-between">
                    <span>Attendance Meter</span>
                    <Badge variant={isEligible ? "success" : "error"} showDot={false}>75% Cutoff</Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Visual radial meter showing your score against the minimum required exam threshold.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center relative">
                  <svg className="w-52 h-52 sm:w-56 sm:h-56 -rotate-90 transform" viewBox="0 0 100 100">
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
                      stroke={palette.stroke}
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
                    <span className={`text-3xl font-black font-mono ${palette.textColor}`}>
                      {attendancePct}%
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {presentCount} / {totalClasses} Classes
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded-xl border border-border bg-muted flex items-center justify-center text-[12px] font-bold">
                  <span className={palette.textColor}>
                    {isEligible ? "✓ Eligible for End-Sem Exam" : "⚠️ Attendance Shortfall"}
                  </span>
                </div>
              </div>

              {/* Chart 2: Status Breakdown Bar Graph */}
              <div className="solid-card rounded-2xl p-5 sm:p-6 border border-border bg-card space-y-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Attendance Distribution</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Side-by-side comparison of present, absent, and excused sessions.
                  </p>
                </div>

                {/* Bars List */}
                <div className="space-y-3 my-auto">
                  {/* Present Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <span>●</span> Present ({presentCount} Sessions)
                      </span>
                      <span className="font-mono">{formatPercentage(presentCount, totalClasses)}</span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden p-0.5">
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
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden p-0.5">
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
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${totalClasses > 0 ? (excusedCount / totalClasses) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded-xl border border-border bg-muted flex items-center justify-center text-[12px] font-bold mt-3">
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
            <div className="solid-card rounded-2xl p-4 sm:p-6 border border-border bg-card space-y-4">
              {/* Header & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="flex items-center justify-between text-base font-extrabold text-foreground gap-2">
                    <span>Class Attendance Log</span>
                    <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                      {filteredRecords.length}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Date-wise session records for this course.
                  </p>
                </div>

                <div className="relative w-full sm:w-auto">
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
                    placeholder="Filter by date or status..."
                    value={historySearch}
                    onChange={(e) => {
                      setHistorySearch(e.target.value);
                      setDisplayLimit(10);
                    }}
                    className="w-full sm:w-64 pl-9 pr-3.5 py-1.5 rounded-xl border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="p-8 text-center text-xs font-bold text-muted-foreground">
                  No matching attendance session logs found.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Session Logs Card Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredRecords.slice(0, displayLimit).map((record, index) => {
                      const dateObj = new Date(record.date);
                      const formattedDate = dateObj.toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                      const formattedTime = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      const isPresent = record.status === "present";
                      const isExcused = record.status === "excused";

                      return (
                        <div
                          key={index}
                          className="p-3.5 rounded-xl border border-border bg-background hover:bg-muted/30 transition-all flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">

                            {/* Subject Name & Date */}
                            <div className="min-w-0 space-y-0.5">
                              <h4
                                className="text-xs sm:text-sm font-extrabold text-foreground truncate"
                                title={subjectName}
                              >
                                {subjectName}
                              </h4>
                              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                <span>📅 {formattedDate}</span>
                              </p>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <Badge
                            variant={isPresent ? "success" : isExcused ? "warning" : "error"}
                            showDot={false}
                            className="uppercase text-[10px] font-extrabold shrink-0"
                          >
                            {isPresent ? "Present" : isExcused ? "Excused" : "Absent"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>

                  {/* Load More Button */}
                  {displayLimit < filteredRecords.length && (
                    <div className=" text-center">
                      <button
                        onClick={() => setDisplayLimit((prev) => prev + 10)}
                        className="px-5 py-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all shadow-xs active:scale-[0.99] flex items-center justify-center gap-2 mx-auto"
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

