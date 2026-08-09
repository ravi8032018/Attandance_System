"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { useUserMe } from "@/hooks/useUserMe";
import { apiFetch } from "@/lib/api";
import { ProfileCompletionBanner } from "@/components/ui/ProfileCompletionBanner";

interface SubjectStat {

  subject_code: string;
  subject_name: string;
  attended_classes: number;
  total_classes: number;
  attendance_pct: number;
  is_eligible: boolean;
}

interface SessionLog {
  session_id: string;
  date: string;
  subject_code: string;
  status: "present" | "absent";
}

interface StudentSummaryData {
  student_info: {
    registration_no: string;
    student_name: string;
    email: string;
    department: string;
    semester: string;
  };
  overall_attended: number;
  overall_total_classes: number;
  overall_attendance_pct: number;
  is_eligible: boolean;
  subject_breakdown: SubjectStat[];
  session_history: SessionLog[];
}

const subjectPalettes = [
  { gradient: "from-purple-600 via-violet-500 to-indigo-400", badge: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  { gradient: "from-cyan-600 via-teal-500 to-sky-400", badge: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  { gradient: "from-emerald-600 via-teal-500 to-green-400", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { gradient: "from-amber-600 via-orange-500 to-yellow-400", badge: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { gradient: "from-rose-600 via-pink-500 to-red-400", badge: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
];

export default function StudentDashboardPage() {
  const { user } = useUserMe();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentSummaryData | null>(null);

  // View Mode: "graph" | "cards"
  const [viewMode, setViewMode] = useState<"graph" | "cards">("graph");

  // Hovered Subject for Tooltip
  const [hoveredSubject, setHoveredSubject] = useState<SubjectStat | null>(null);

  // Interactive Calculator State
  const [calcSubjectCode, setCalcSubjectCode] = useState<string>("");
  const [futureClasses, setFutureClasses] = useState<number>(5);

  useEffect(() => {
    async function loadStudentData() {
      setLoading(true);
      try {
        const res = await apiFetch("/reports/student-summary");
        if (res.ok) {
          const resData: StudentSummaryData = await res.json();
          setData(resData);
          if (resData?.subject_breakdown?.length > 0) {
            setCalcSubjectCode(resData.subject_breakdown[0].subject_code);
          }
        }
      } catch (e) {
        // Silent catch
      } finally {
        setLoading(false);
      }
    }
    loadStudentData();
  }, []);

  // Helper to format date humanly
  function formatHumanDate(rawDate: string) {
    if (!rawDate) return "N/A";
    try {
      const dt = new Date(rawDate);
      if (isNaN(dt.getTime())) return String(rawDate).slice(0, 10);
      return dt.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return String(rawDate).slice(0, 10);
    }
  }

  // Helper to get attendance zone
  function getAttendanceZone(pct: number) {
    if (pct >= 75) return { name: "🟢 Safe Zone (≥75%)", color: "text-emerald-500" };
    if (pct >= 60) return { name: "🔵 Moderate Zone (60-75%)", color: "text-indigo-500" };
    if (pct >= 40) return { name: "🟠 Critical Zone (40-60%)", color: "text-amber-500" };
    return { name: "🔴 Defaulter Hazard (<40%)", color: "text-rose-500" };
  }

  // Helper to calculate classes needed to hit 75%
  function getClassesNeededFor75(attended: number, total: number) {
    if (total === 0) return 0;
    const currentPct = (attended / total) * 100;
    if (currentPct >= 75.0) return 0;
    const needed = Math.ceil((0.75 * total - attended) / 0.25);
    return Math.max(0, needed);
  }

  // Helper to calculate safe classes to miss
  function getSafeClassesToMiss(attended: number, total: number) {
    if (total === 0) return 0;
    const currentPct = (attended / total) * 100;
    if (currentPct < 75.0) return 0;
    const allowed = Math.floor((attended - 0.75 * total) / 0.75);
    return Math.max(0, allowed);
  }

  // Subject Name Lookup Map
  const subjectNameMap: Record<string, string> = {};
  if (data?.subject_breakdown) {
    data.subject_breakdown.forEach((s) => {
      subjectNameMap[s.subject_code] = s.subject_name;
    });
  }

  const selectedCalcSubj = data?.subject_breakdown.find(
    (s) => s.subject_code === calcSubjectCode
  ) || data?.subject_breakdown[0];

  const calcAttended = (selectedCalcSubj?.attended_classes || 0) + futureClasses;
  const calcTotal = (selectedCalcSubj?.total_classes || 0) + futureClasses;
  const predictedPct = calcTotal > 0 ? Math.round((calcAttended / calcTotal) * 1000) / 10 : 0;

  // Session activity summary stats
  const recentSessions = data?.session_history?.slice(0, 10) || [];
  const presentCount = recentSessions.filter((s) => s.status === "present").length;

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Profile Completion Warning Banner */}
      <ProfileCompletionBanner
        isProfileComplete={user?.profile_complete ?? true}
        userRole="student"
      />

      {/* Header Greeting */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-col items-start sm:flex-row sm:items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Welcome back, {data?.student_info?.student_name || user?.name || "Student"}
            </h1>
            <Badge variant="primary" className="font-mono shrink-0">
              {data?.student_info?.registration_no || user?.registration_no}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Academic Attendance Portal • Department of {data?.student_info?.department || "CS"} (Semester {data?.student_info?.semester || "4"})
          </p>
        </div>

        {/* Action Link */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-2 md:mt-0">
          <Link
            href="/student/reports"
            className="w-full sm:w-auto flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0"
          >
            📋 Official Statement →
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
          Loading student attendance intelligence...
        </div>
      ) : !data ? (
        <div className="solid-card rounded-2xl p-12 text-center space-y-2 border border-border">
          <div className="text-3xl">⚠️</div>
          <h3 className="text-sm font-bold text-foreground">Attendance Records Unavailable</h3>
          <p className="text-xs text-muted-foreground">
            No attendance records found for registration number {user?.registration_no}.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Overall Attendance"
              value={`${data.overall_attendance_pct}%`}
              description={`${data.overall_attended} / ${data.overall_total_classes} Total Classes`}
              trend={{
                value:
                  data.overall_total_classes === 0
                    ? "No Classes Conducted Yet"
                    : data.is_eligible
                      ? "Good Standing (≥75%)"
                      : "Low Attendance Alert (<75%)",
                positive: data.overall_total_classes === 0 || data.is_eligible,
              }}
              icon="🎓"
              variant={data.overall_total_classes === 0 ? "indigo" : data.is_eligible ? "indigo" : "rose"}
            />
            <StatCard
              title="Exam Eligibility Status"
              value={
                data.overall_total_classes === 0
                  ? "Good Standing"
                  : data.is_eligible
                    ? "Eligible"
                    : "Defaulter Flagged"
              }
              description={
                data.overall_total_classes === 0
                  ? "No sessions held for this batch yet"
                  : data.is_eligible
                    ? "Safe Zone for Examinations"
                    : "Requires 75% Cutoff"
              }
              trend={{
                value:
                  data.overall_total_classes === 0
                    ? "No Sessions Yet"
                    : data.is_eligible
                      ? "Eligible"
                      : "Warning Cutoff",
                positive: data.overall_total_classes === 0 || data.is_eligible,
              }}
              icon={data.overall_total_classes === 0 ? "🎓" : data.is_eligible ? "✓" : "⚠️"}
              variant={data.overall_total_classes === 0 ? "emerald" : data.is_eligible ? "emerald" : "rose"}
            />
            <StatCard
              title="Enrolled Courses"
              value={`${data.subject_breakdown.length} Subjects`}
              description={`Active in Semester ${data.student_info.semester}`}
              icon="📚"
              variant="blue"
            />
            <StatCard
              title="Mandatory Threshold"
              value="75.0%"
              description="Minimum for exam eligibility"
              icon="⚖️"
              variant="purple"
            />
          </div>


          {/* 4-ZONE ATTENDANCE HEATMAP GRAPH COMPONENT */}
          <div className="solid-card rounded-2xl p-6 border border-border space-y-6 bg-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-base font-black text-foreground flex items-center gap-2">
                  <span>Subject Wise Attendance</span>
                  <Badge variant="primary" className="text-xs font-mono">{data.subject_breakdown.length} Subjects</Badge>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  Course performance scaled across 4 background performance zones (Green, Blue, Orange, Red) relative to the 75% cutoff line.
                </p>
              </div>

              {/* View Selector Toggle Buttons */}
              <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("graph")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all ${viewMode === "graph"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  📊&nbsp;Graph&nbsp;
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all ${viewMode === "cards"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  🎴 Subject Cards
                </button>
              </div>
            </div>

            {/* GRAPH VIEW (TABLET & DESKTOP MD+) */}
            {viewMode === "graph" ? (
              <>
                <div className="hidden md:block space-y-4">
                  {/* DUAL-AXIS 4-TIER ATMOSPHERIC MATRIX CONTAINER (Compact Height & Overflow Visible) */}
                  <div className="grid grid-cols-[50px_1fr_130px] items-stretch gap-0 h-[240px] pt-2 pb-1 relative">

                    {/* LEFT Y-AXIS TICKS (0, 25, 50, 75, 100%) */}
                    <div className="flex flex-col justify-between items-end pr-3 text-[11px] font-black font-mono text-muted-foreground/80 py-0.5 border-r border-border/40">
                      <span>100%</span>
                      <span className="text-amber-500 font-black">75%</span>
                      <span>50%</span>
                      <span>25%</span>
                      <span>0%</span>
                    </div>

                    {/* INTERIOR PLOT CANVAS (Overflow Visible for Tooltips) */}
                    <div className="relative w-full h-full border-l-2 border-b-2 border-r-2 border-foreground/40 rounded-br-lg transition-all duration-300">

                      {/* 4 BACKDROP ZONE GRADIENT BANDS (Strictly Clipped inside Canvas) */}
                      <div
                        className="absolute inset-0 rounded-br-lg overflow-hidden pointer-events-none"
                        style={{
                          background: `linear-gradient(
                            to top,
                            rgba(244, 63, 94, 0.25) 0%,
                            rgba(244, 63, 94, 0.20) 22%,
                            rgba(245, 158, 11, 0.20) 28%,
                            rgba(245, 158, 11, 0.20) 47%,
                            rgba(99, 102, 241, 0.20) 53%,
                            rgba(99, 102, 241, 0.20) 72%,
                            rgba(16, 185, 129, 0.25) 78%,
                            rgba(16, 185, 129, 0.25) 100%
                          )`,
                        }}
                      />

                      {/* GOLDEN 75% TARGET CUTOFF LINE */}
                      <div className="absolute left-0 right-10 left-10 bottom-[75%] border-b-2 border-dashed border-amber-600 dark:border-amber-400 shadow-md shadow-amber-500/40 flex items-center justify-start pointer-events-none">
                      </div>

                      {/* DYNAMIC DATA PILLARS (Gravitational Anchoring to Bottom X-Axis) */}
                      <div className="grid grid-cols-7 gap-3 sm:gap-6 items-end h-full px-4 relative z-20">
                        {data.subject_breakdown.map((subj, index) => {
                          const pct = Math.min(100, Math.max(0, subj.attendance_pct));
                          const palette = subjectPalettes[index % subjectPalettes.length];
                          const isHovered = hoveredSubject?.subject_code === subj.subject_code;
                          const zone = getAttendanceZone(subj.attendance_pct);

                          return (
                            <div
                              key={subj.subject_code}
                              onMouseEnter={() => setHoveredSubject(subj)}
                              onMouseLeave={() => setHoveredSubject(null)}
                              className="flex flex-col items-center h-full justify-end group cursor-pointer relative"
                            >
                              {/* Top Percentage Pill */}
                              <span className={`text-[13px] font-black font-mono mb-2 px-1.5 py-0.5 rounded-md border z-20 shadow-sm transition-transform duration-200 group-hover:scale-120 ${palette.badge}`}>
                                {subj.attendance_pct}%
                              </span>

                              {/* Column Bar (Anchored Directly on Bottom X-Axis) */}
                              <div className="w-full max-w-[42px] bg-black/10 dark:bg-white/10 rounded-t-xl overflow-hidden flex items-end p-0.5 border-t border-x border-border/80 shadow-md" style={{ height: `${pct}%` }}>
                                <div className={`w-full h-full rounded-t-lg bg-gradient-to-t ${palette.gradient} transition-all duration-700 ease-out shadow-lg group-hover:brightness-110`} />
                              </div>

                              {/* Floating Hover Tooltip Popup Card */}
                              {isHovered && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-60 p-3.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xl space-y-2 border border-indigo-500/40 text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                                  <div className="flex items-center justify-between font-mono font-black">
                                    <span>{subj.subject_code}</span>
                                    <Badge variant={subj.is_eligible ? "success" : "error"}>
                                      {subj.attendance_pct}%
                                    </Badge>
                                  </div>
                                  <p className="font-black text-xs leading-tight">{subj.subject_name}</p>

                                  <div className="pt-1 border-t border-slate-700 dark:border-slate-300 space-y-0.5 text-[10px] font-mono">
                                    <div className="flex justify-between">

                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400 dark:text-slate-500">Attended Ratio:</span>
                                      <strong>{subj.attended_classes} / {subj.total_classes} Classes</strong>
                                    </div>
                                  </div>

                                  <p className="text-[10px] font-bold pt-1 text-slate-300 dark:text-slate-600">
                                    {subj.is_eligible
                                      ? `✓ Safe! Can miss up to ${getSafeClassesToMiss(subj.attended_classes, subj.total_classes)} classes.`
                                      : `⚠️ Attend next ${getClassesNeededFor75(subj.attended_classes, subj.total_classes)} classes to reach 75%.`}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT Y-AXIS TELEMETRY LABELS (Externalized 4 Equal Bands) */}
                    <div className="flex flex-col justify-between items-start pl-3 pt-5 pb-5 text-[10px] font-extrabold uppercase tracking-wider py-0.5">
                      <span className="text-emerald-600 dark:text-emerald-400">75-100%</span>
                      <span className="text-indigo-600 dark:text-indigo-400">50-75%</span>
                      <span className="text-amber-600 dark:text-amber-400">25-50%</span>
                      <span className="text-rose-600 dark:text-rose-400">&lt;25%</span>
                    </div>
                  </div>

                  {/* EXTERNAL X-AXIS TELEMETRY (Anchored Firmly Below X-Axis) */}
                  <div className="grid grid-cols-7 gap-3 sm:gap-6 pl-[50px] pr-[130px] pt-2 text-center">
                    {data.subject_breakdown.map((subj) => {
                      return (
                        <div key={subj.subject_code} className="space-y-0.5 max-w-full">
                          <span className="font-mono text-xs font-black text-foreground block">
                            {subj.subject_code}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-semibold block truncate max-w-[130px] mx-auto" title={subj.subject_name}>
                            {subj.subject_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* MOBILE FALLBACK: CARDS VIEW (< MD) */}
                <div className="block md:hidden grid grid-cols-1 gap-4">
                  {data.subject_breakdown.map((subj, index) => {
                    const needed = getClassesNeededFor75(subj.attended_classes, subj.total_classes);
                    const safeMiss = getSafeClassesToMiss(subj.attended_classes, subj.total_classes);
                    const palette = subjectPalettes[index % subjectPalettes.length];

                    return (
                      <div
                        key={subj.subject_code}
                        className="solid-card rounded-2xl p-4 border border-border space-y-3 bg-background"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg border ${palette.badge}`}>
                            {subj.subject_code}
                          </span>
                          <Badge variant={subj.is_eligible ? "success" : "error"}>
                            {subj.attendance_pct}%
                          </Badge>
                        </div>

                        <h3 className="text-xs font-extrabold text-foreground leading-snug truncate" title={subj.subject_name}>
                          {subj.subject_name}
                        </h3>

                        <div className="space-y-1 pt-0.5">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-muted-foreground font-semibold">Attended:</span>
                            <strong className="text-foreground">{subj.attended_classes} / {subj.total_classes} Classes</strong>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              style={{ width: `${subj.attendance_pct}%` }}
                              className={`h-full rounded-full bg-gradient-to-r ${palette.gradient} transition-all duration-500`}
                            />
                          </div>
                        </div>

                        <div className="pt-1.5 border-t border-border/60 text-[11px] font-bold">
                          {subj.is_eligible ? (
                            <span className="text-emerald-600 dark:text-emerald-400">✓ Safe! Can miss up to {safeMiss} classes.</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">⚠️ Attend next {needed} classes to reach 75%.</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* CARDS VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {data.subject_breakdown.map((subj, index) => {
                  const needed = getClassesNeededFor75(subj.attended_classes, subj.total_classes);
                  const safeMiss = getSafeClassesToMiss(subj.attended_classes, subj.total_classes);
                  const palette = subjectPalettes[index % subjectPalettes.length];

                  return (
                    <div
                      key={subj.subject_code}
                      className="solid-card rounded-2xl p-5 border border-border space-y-4 bg-background hover:border-indigo-500/40 transition-all shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg border ${palette.badge}`}>
                          {subj.subject_code}
                        </span>
                        <Badge variant={subj.is_eligible ? "success" : "error"}>
                          {subj.attendance_pct}%
                        </Badge>
                      </div>

                      <h3 className="text-sm font-extrabold text-foreground leading-snug truncate" title={subj.subject_name}>
                        {subj.subject_name}
                      </h3>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-muted-foreground font-semibold">Attended:</span>
                          <strong className="text-foreground">{subj.attended_classes} / {subj.total_classes} Classes</strong>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            style={{ width: `${subj.attendance_pct}%` }}
                            className={`h-full rounded-full bg-gradient-to-r ${palette.gradient} transition-all duration-500`}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/60 text-[11px] font-bold">
                        {subj.total_classes === 0 ? (
                          <div className="flex items-center gap-1.5 text-indigo-500 font-semibold">
                            <span>ℹ️ No classes conducted for this course yet.</span>
                          </div>
                        ) : subj.is_eligible ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <span>✓ Safe! You can miss up to {safeMiss} {safeMiss === 1 ? "class" : "classes"}.</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                            <span>⚠️ Attend next {needed} consecutive {needed === 1 ? "class" : "classes"} to reach 75%.</span>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Interactive Attendance Simulator & Human-Readable Recent Session Log */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive Simulator */}
            <div className="solid-card rounded-2xl p-6 border border-border space-y-4 bg-card">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <span>🎯 Attendance Target Simulator</span>
                </h3>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                Test how attending future classes will improve your attendance rate before exams.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-1">
                    Select Subject
                  </label>
                  <select
                    value={calcSubjectCode}
                    onChange={(e) => setCalcSubjectCode(e.target.value)}
                    className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {data.subject_breakdown.map((s) => (
                      <option key={s.subject_code} value={s.subject_code}>
                        {s.subject_code} - {s.subject_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-extrabold mb-1">
                    <span className="text-muted-foreground">Attend Next Upcoming Classes:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm">{futureClasses} Classes</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={futureClasses}
                    onChange={(e) => setFutureClasses(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">Current Rate:</span>
                    <span className="font-extrabold font-mono text-foreground">{selectedCalcSubj?.attendance_pct}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">Predicted Target Rate:</span>
                    <span className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-400">{predictedPct}%</span>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[11px] font-extrabold">
                    <span>Predicted Status:</span>
                    {predictedPct >= 75 ? (
                      <Badge variant="success">✓ Exam Eligible</Badge>
                    ) : (
                      <Badge variant="error">⚠️ Still Defaulter</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Human-Readable Recent Attendance Session Log */}
            <div className="lg:col-span-2 solid-card rounded-2xl p-6 border border-border space-y-4 bg-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <span>📅 Recent Class Session Activity</span>
                  <Badge variant="muted" className="font-mono">{data.session_history.length}</Badge>
                </h3>

                {recentSessions.length > 0 && (
                  <span className="text-xs font-bold text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border border-border">
                    Last {recentSessions.length} Classes: <strong className="text-emerald-600 dark:text-emerald-400">{presentCount} Present</strong>, <strong className="text-rose-600 dark:text-rose-400">{recentSessions.length - presentCount} Absent</strong>
                  </span>
                )}
              </div>

              {data.session_history.length === 0 ? (
                <p className="text-xs text-muted-foreground p-8 text-center">No recent class session activity logged.</p>
              ) : (
                <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                  {recentSessions.map((sess, idx) => {
                    const subjTitle = subjectNameMap[sess.subject_code] || sess.subject_code;
                    const formattedDate = formatHumanDate(sess.date);

                    return (
                      <div
                        key={sess.session_id || idx}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted/40 transition-colors text-xs gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                              {sess.subject_code}
                            </span>
                            <span className="font-extrabold text-foreground truncate max-w-[220px]" title={subjTitle}>
                              {subjTitle}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-semibold block">
                            Held on {formattedDate}
                          </span>
                        </div>

                        <Badge variant={sess.status === "present" ? "success" : "error"} className="shrink-0 font-bold">
                          {sess.status === "present" ? "✓ Present" : "✕ Absent"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
