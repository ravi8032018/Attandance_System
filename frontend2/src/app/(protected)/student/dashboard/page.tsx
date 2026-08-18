"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { useUserMe } from "@/hooks/useUserMe";
import { apiFetch } from "@/lib/api";
import { ProfileCompletionBanner } from "@/components/ui/ProfileCompletionBanner";
import { CustomSelect, CustomSelectOption } from "@/components/ui/CustomSelect";

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

function getPaletteForAttendance(pct: number) {
  if (pct >= 75) {
    return {
      gradient: "from-emerald-600 via-teal-500 to-green-400",
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      barBg: "bg-emerald-500",
      textColor: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-500/30",
    };
  }
  if (pct >= 60) {
    return {
      gradient: "from-indigo-600 via-violet-500 to-blue-400",
      badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      barBg: "bg-indigo-500",
      textColor: "text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-500/30",
    };
  }
  if (pct >= 40) {
    return {
      gradient: "from-amber-600 via-orange-500 to-yellow-400",
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      barBg: "bg-amber-500",
      textColor: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500/30",
    };
  }
  return {
    gradient: "from-rose-600 via-pink-500 to-red-400",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    barBg: "bg-rose-500",
    textColor: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/30",
  };
}

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
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Profile Completion Warning Banner */}
      <ProfileCompletionBanner
        isProfileComplete={user?.profile_complete ?? true}
        userRole="student"
      />

      {/* Header Greeting */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex flex-col items-start sm:flex-row sm:items-center">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Welcome back, {data?.student_info?.student_name || user?.name || "Student"}
            </h1>
          </div>
        </div>

        {/* Action Link */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:mt-0">
          <Link
            href="/student/reports"
            className="w-full sm:w-auto flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0"
          >
            📋 Official Statement
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
        <div className="space-y-6">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Overall Attendance"
              value={`${data.overall_attendance_pct}%`}
              description={`${data.overall_attended} / ${data.overall_total_classes} Classes`}
              trend={{
                value:
                  data.overall_total_classes === 0
                    ? "No Classes Conducted Yet"
                    : data.is_eligible
                      ? "Good Standing"
                      : "Low Attendance Alert",
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
          <div className="solid-card rounded-2xl p-6 border border-border space-y-4 bg-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
              <div>
                <h2 className="text-base font-black text-foreground flex items-center justify-between gap-2">
                  <span>Subject Attendance</span>
                  <Badge variant="primary" className="text-xs font-mono">{data.subject_breakdown.length}</Badge>
                </h2>
              </div>

              {/* View Selector Toggle Buttons (Hidden on mobile < md, shown on tablet/desktop >= md) */}
              <div className="hidden md:flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border shrink-0">
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

            {/* TABLET & DESKTOP VIEW (MD+): GRAPH OR CARDS TOGGLEABLE */}
            <div className="hidden md:block">
              {viewMode === "graph" ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto pb-2 scrollbar-thin">
                    <div className="min-w-[640px] grid grid-cols-[50px_1fr_130px] items-stretch gap-0 h-[280px] pt-4 pb-2 relative">

                      {/* LEFT Y-AXIS TICKS (0, 25, 50, 75, 100%) */}
                      <div className="flex flex-col justify-between items-end pr-3 text-[11px] font-black font-mono text-muted-foreground/80 py-1 border-r border-border/40">
                        <span>100%</span>
                        <span className="text-amber-500 font-black">75%</span>
                        <span>50%</span>
                        <span>25%</span>
                        <span>0%</span>
                      </div>

                      {/* INTERIOR PLOT CANVAS */}
                      <div className="relative w-full h-full border-l-2 border-b-2 border-r-2 border-foreground/30 rounded-br-lg bg-muted/10">

                        {/* 4 BACKDROP ZONE GRADIENT BANDS */}
                        <div
                          className="absolute inset-0 rounded-br-lg overflow-hidden pointer-events-none opacity-40"
                          style={{
                            background: `linear-gradient(
                              to top,
                              rgba(244, 63, 94, 0.25) 0%,
                              rgba(244, 63, 94, 0.20) 25%,
                              rgba(245, 158, 11, 0.20) 25%,
                              rgba(245, 158, 11, 0.20) 50%,
                              rgba(99, 102, 241, 0.20) 50%,
                              rgba(99, 102, 241, 0.20) 75%,
                              rgba(16, 185, 129, 0.25) 75%,
                              rgba(16, 185, 129, 0.25) 100%
                            )`,
                          }}
                        />

                        {/* GOLDEN 75% TARGET CUTOFF LINE */}
                        <div className="absolute left-0 right-0 bottom-[75%] border-b-2 border-dashed border-amber-500/80 shadow-xs z-10 pointer-events-none flex items-center justify-end pr-2">
                          <span className="text-[9px] font-mono font-black text-amber-600 dark:text-amber-400 bg-background/90 px-1.5 py-0.5 rounded border border-amber-500/30">
                            75% Cutoff
                          </span>
                        </div>

                        {/* DYNAMIC DATA PILLARS */}
                        <div className="flex items-end justify-around h-full px-4 relative z-20">
                          {data.subject_breakdown.map((subj) => {
                            const pct = Math.min(100, Math.max(0, subj.attendance_pct));
                            const palette = getPaletteForAttendance(subj.attendance_pct);
                            const isHovered = hoveredSubject?.subject_code === subj.subject_code;

                            return (
                              <div
                                key={subj.subject_code}
                                onMouseEnter={() => setHoveredSubject(subj)}
                                onMouseLeave={() => setHoveredSubject(null)}
                                className="flex flex-col items-center justify-end h-full group cursor-pointer relative px-2 flex-1 max-w-[90px]"
                              >
                                {/* Top Percentage Pill */}
                                <span className={`text-[12px] font-black font-mono mb-2 px-2 py-0.5 rounded-md border z-20 shadow-xs transition-transform duration-200 group-hover:scale-110 ${palette.badge}`}>
                                  {subj.attendance_pct}%
                                </span>

                                {/* Fixed Track Container + Inner Fill */}
                                <div className="w-full max-w-[48px] h-[170px] bg-black/5 dark:bg-white/5 rounded-t-xl overflow-hidden flex items-end p-0.5 border-t border-x border-border/80 shadow-sm relative">
                                  <div
                                    className={`w-full rounded-t-lg bg-gradient-to-t ${palette.gradient} transition-all duration-700 ease-out shadow-md group-hover:brightness-110`}
                                    style={{ height: `${pct}%` }}
                                  />
                                </div>

                                {/* Floating Hover Tooltip Popup Card */}
                                {isHovered && (
                                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 w-64 p-3.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xl space-y-2 border border-indigo-500/40 text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                                    <div className="flex items-center justify-between font-mono font-black">
                                      <span className="font-mono text-xs font-black text-slate-200 dark:text-slate-800 bg-slate-800 dark:bg-slate-200 px-2 py-0.5 rounded border border-slate-700 dark:border-slate-300">
                                        {subj.subject_code}
                                      </span>
                                      <Badge variant={subj.is_eligible ? "success" : "error"}>
                                        {subj.attendance_pct}%
                                      </Badge>
                                    </div>
                                    <p className="font-black text-xs leading-tight">{subj.subject_name}</p>

                                    <div className="pt-1 border-t border-slate-700 dark:border-slate-300 space-y-0.5 text-[10px] font-mono">
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

                      {/* RIGHT Y-AXIS TELEMETRY LABELS */}
                      <div className="flex flex-col justify-between items-start pl-3 pt-4 pb-4 text-[10px] font-extrabold uppercase tracking-wider">
                        <span className="text-emerald-600 dark:text-emerald-400">75-100%</span>
                        <span className="text-indigo-600 dark:text-indigo-400">60-75%</span>
                        <span className="text-amber-600 dark:text-amber-400">40-60%</span>
                        <span className="text-rose-600 dark:text-rose-400">&lt;40%</span>
                      </div>
                    </div>

                    {/* EXTERNAL X-AXIS TELEMETRY */}
                    <div className="min-w-[640px] grid grid-cols-[50px_1fr_130px] pt-1">
                      <div />
                      <div className="flex justify-around px-4">
                        {data.subject_breakdown.map((subj) => (
                          <div key={subj.subject_code} className="text-center space-y-0.5 flex-1 px-1 max-w-[120px]">
                            <span className="font-mono text-xs font-black text-foreground bg-muted px-2 py-0.5 rounded border border-border inline-block">
                              {subj.subject_code}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold block truncate" title={subj.subject_name}>
                              {subj.subject_name}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div />
                    </div>
                  </div>
                </div>
              ) : (
                /* CARDS VIEW FOR TABLET & DESKTOP */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {data.subject_breakdown.map((subj) => {
                    const needed = getClassesNeededFor75(subj.attended_classes, subj.total_classes);
                    const safeMiss = getSafeClassesToMiss(subj.attended_classes, subj.total_classes);
                    const palette = getPaletteForAttendance(subj.attendance_pct);

                    return (
                      <div
                        key={subj.subject_code}
                        className="solid-card rounded-2xl p-5 border border-border space-y-4 bg-background hover:border-indigo-500/40 transition-all shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-black text-foreground bg-muted px-2.5 py-1 rounded-lg border border-border shrink-0">
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

            {/* MOBILE VIEW (< MD): ALWAYS SHOW SUBJECT CARDS */}
            <div className="block md:hidden">
              <div className="grid grid-cols-1 gap-3">
                {data.subject_breakdown.map((subj) => {
                  const needed = getClassesNeededFor75(subj.attended_classes, subj.total_classes);
                  const safeMiss = getSafeClassesToMiss(subj.attended_classes, subj.total_classes);
                  const palette = getPaletteForAttendance(subj.attendance_pct);

                  return (
                    <div
                      key={subj.subject_code}
                      className="solid-card rounded-2xl p-4 border border-border space-y-3 bg-background"
                    >
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
                        <h3 className="text-xs font-extrabold text-foreground leading-snug truncate" title={subj.subject_name}>
                          {subj.subject_name}
                        </h3>
                        <Badge variant={subj.is_eligible ? "success" : "error"}>
                          {subj.attendance_pct}%
                        </Badge>
                      </div>

                      <div className="space-y-1 pt-0.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-muted-foreground font-bold">Attended:</span>
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
            </div>
          </div>

          {/* Interactive Attendance Simulator & Human-Readable Recent Session Log */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive Simulator */}
            <div className="solid-card rounded-2xl p-6 border border-border space-y-4 bg-card flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1">
                    <span>🎯 Attendance Target Simulator</span>
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <CustomSelect
                      label="Select Subject"
                      inlineLabel={false}
                      value={calcSubjectCode}
                      onChange={(val) => setCalcSubjectCode(val)}
                      options={data.subject_breakdown.map((s) => ({
                        value: s.subject_code,
                        label: `${s.subject_code} - ${s.subject_name}`,
                        sublabel: `Current Attendance: ${s.attendance_pct}% (${s.attended_classes}/${s.total_classes} classes)`,
                        badge: `${s.attendance_pct}%`,
                      }))}
                      placeholder="Select Subject..."
                      searchable={data.subject_breakdown.length > 5}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-extrabold mb-1">
                      <span className="text-muted-foreground">Target Upcoming Classes:</span>
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
                      <span className="font-extrabold font-mono text-foreground text-sm">{selectedCalcSubj?.attendance_pct}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-muted-foreground">Predicted Target Rate:</span>
                      <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">{predictedPct}%</span>
                    </div>
                    <div className="pt-1 flex items-center justify-between text-[10px] font-extrabold">
                      <span>Predicted Status:</span>
                      {predictedPct >= 75 ? (
                        <Badge variant="success" showDot={false}>✓ Exam Eligible</Badge>
                      ) : (
                        <Badge variant="error" showDot={false}>⚠️ Still Defaulter</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Human-Readable Recent Attendance Session Log */}
            <div className="lg:col-span-2 solid-card rounded-2xl p-4 sm:p-6 border border-border space-y-4 bg-card flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                  <h3 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5 min-w-0 gap-2">
                    <span className="hidden sm:block truncate">📅 Recent Class Session Activity</span>
                    <span className="sm:hidden truncate">📅 Recent Classes</span>
                    <span className="hidden sm:block">
                      <Badge variant="muted" className="font-mono text-[10px] shrink-0">{data.session_history.length}</Badge>
                    </span>
                  </h3>

                  {recentSessions.length > 0 && (
                    <span className="text-[10px] sm:text-xs font-bold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border shrink-0">
                      <strong className="text-emerald-600 dark:text-emerald-400">{presentCount} Present</strong>
                      <span className="mx-1 text-muted-foreground/60 text-sm">|</span>
                      <strong className="text-rose-600 dark:text-rose-400">{recentSessions.length - presentCount} Absent</strong>
                    </span>
                  )}
                </div>

                {data.session_history.length === 0 ? (
                  <div className="p-8 text-center space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">No recent class session activity recorded.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                    {recentSessions.map((sess, idx) => {
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
