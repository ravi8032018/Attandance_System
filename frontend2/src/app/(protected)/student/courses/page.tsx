"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useUserMe } from "@/hooks/useUserMe";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";

interface SubjectBreakdown {
  subject_code: string;
  subject_name: string;
  attended_classes: number;
  total_classes: number;
  attendance_pct: number;
  is_eligible: boolean;
}

interface StudentSummaryData {
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
  subject_breakdown: SubjectBreakdown[];
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

export default function StudentCoursesPage() {
  const { user } = useUserMe();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StudentSummaryData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "eligible" | "at_risk">("all");

  useEffect(() => {
    async function loadCourses() {
      setLoading(true);
      try {
        const res = await apiFetch("/reports/student-summary");
        if (res.ok) {
          const data = await res.json();
          setSummary(data);
        }
      } catch (e) {
        // Silent catch
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, []);

  const subjects = summary?.subject_breakdown || [];

  const filteredSubjects = subjects.filter((sub) => {
    const matchesSearch =
      sub.subject_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.subject_name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === "eligible") return sub.is_eligible;
    if (filterStatus === "at_risk") return !sub.is_eligible;
    return true;
  });

  const eligibleCount = subjects.filter((s) => s.is_eligible).length;
  const atRiskCount = subjects.filter((s) => !s.is_eligible).length;

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              📚
            </span>
            <span>My Enrolled Courses</span>
          </h1>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Enrolled Courses"
          value={loading ? "..." : subjects.length}
          description={`Semester ${summary?.student_info?.semester || user?.semester || "N/A"}`}
          variant="indigo"
          icon={<span className="text-xl">📖</span>}
        />
        <StatCard
          title="Overall Attendance"
          value={loading ? "..." : `${summary?.overall_attendance_pct ?? 0}%`}
          description={`${summary?.overall_attended ?? 0} / ${summary?.overall_total_classes ?? 0} Classes`}
          variant={summary && summary.overall_attendance_pct >= 75 ? "emerald" : "rose"}
          icon={<span className="text-xl">📈</span>}
        />
        <StatCard
          title="Good Standing (≥75%)"
          value={loading ? "..." : eligibleCount}
          description="Courses meeting eligibility"
          variant="emerald"
          icon={<span className="text-xl">✅</span>}
        />
        <StatCard
          title="Action Required (<75%)"
          value={loading ? "..." : atRiskCount}
          description="Courses needing attendance boost"
          variant={atRiskCount > 0 ? "amber" : "indigo"}
          icon={<span className="text-xl">⚠️</span>}
        />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="solid-card rounded-2xl p-4 border border-border bg-card space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <svg
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by course code or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-muted-foreground"
          />
        </div>

        {/* Filter Segmented Bar (Equal 3-Col Grid on Mobile, Flex on Desktop - No Horizontal Scroll!) */}
        <div className="w-full sm:w-auto">
          <div className="py-1 px-0 rounded-xl bg-muted/60 border border-border grid grid-cols-3 sm:flex sm:items-center gap-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all duration-150 flex items-center justify-center gap-1 sm:gap-1.5 ${filterStatus === "all"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <span>All</span>
              <span className="hidden sm:inline">Courses</span>
              <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${filterStatus === "all" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground border border-border"
                }`}>
                {subjects.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus("eligible")}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all duration-150 flex items-center justify-center gap-1 sm:gap-1.5 ${filterStatus === "eligible"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                }`}
            >
              <span className="hidden sm:inline">✓</span>
              <span>Eligible</span>
              <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${filterStatus === "eligible" ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                }`}>
                {eligibleCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus("at_risk")}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all duration-150 flex items-center justify-center gap-1 sm:gap-1.5 ${filterStatus === "at_risk"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
                }`}
            >
              <span className="hidden sm:inline">⚠️</span>
              <span>At Risk</span>
              <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${filterStatus === "at_risk" ? "bg-white/20 text-white" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                }`}>
                {atRiskCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Courses Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="solid-card rounded-2xl p-5 border border-border bg-card animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 bg-muted rounded-md" />
                <div className="h-6 w-16 bg-muted rounded-full" />
              </div>
              <div className="h-6 w-3/4 bg-muted rounded-md" />
              <div className="h-3 w-full bg-muted rounded-full" />
              <div className="h-8 w-full bg-muted rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="solid-card rounded-2xl p-12 border border-border bg-card text-center space-y-3">
          <div className="text-4xl">🔍</div>
          <h3 className="text-base font-extrabold text-foreground">No Courses Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery || filterStatus !== "all"
              ? "Try adjusting your search criteria or filter options to view courses."
              : "You are not currently enrolled in any courses for this semester."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((subject) => {
            const isEligible = subject.is_eligible;
            const pct = subject.attendance_pct;
            const palette = getPaletteForAttendance(pct);
            const needed = getClassesNeededFor75(subject.attended_classes, subject.total_classes);
            const safeMiss = getSafeClassesToMiss(subject.attended_classes, subject.total_classes);

            return (
              <div
                key={subject.subject_code}
                className="group solid-card rounded-2xl p-5 border border-border bg-card hover:border-indigo-500/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                {/* Accent Top Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${palette.gradient}`}
                />

                <div className="space-y-1">
                  {/* Course Title */}
                  <div className="flex flex-row gap-2 items-center justify-between pb-1">
                    <h3 className="text-sm font-extrabold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug line-clamp-2 truncate">
                      {subject.subject_name}
                    </h3>
                    <Badge variant={isEligible ? "success" : "error"} showDot={false} className="text-[11px] font-extrabold flex-shrink-0">
                      {isEligible ? "Eligible" : "Warning (<75%)"}
                    </Badge>
                  </div>

                  {/* Attendance Bar & Metrics */}
                  <div className="space-y-2 pt-1 border-t border-border/60">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-muted-foreground">Attendance Score</span>
                      <span className={`font-mono text-sm font-black ${palette.textColor}`}>
                        {pct}%
                      </span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden relative">
                      {/* Cutoff Threshold Line at 75% */}
                      <div
                        className="absolute top-0 bottom-0 w-1.5 bg-amber-500 z-10"
                        style={{ left: "75%" }}
                        title="75% Cutoff Threshold"
                      />
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${palette.gradient} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold pt-0.5">
                      <span>{subject.attended_classes} Attended</span>
                      <span>{subject.total_classes} Total Classes</span>
                    </div>
                  </div>

                  {/* Hint */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-border/60 text-[11px] font-bold">
                    {subject.total_classes === 0 ? (
                      <span className="text-indigo-500">ℹ️ No classes held yet.</span>
                    ) : isEligible ? (
                      <span className="text-emerald-600 dark:text-emerald-400">You Can miss up to {safeMiss} {safeMiss === 1 ? "class" : "classes"}.</span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400">⚠️ Attend next {needed}  {needed === 1 ? "class" : "classes"}</span>
                    )}

                    {/* Footer Action Button */}
                    <Link
                      href={`/student/courses/${encodeURIComponent(subject.subject_code)}`}
                      className="w-fit px-2 py-0.5 rounded-xl border border-indigo-500/20 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 text-indigo-600 dark:text-indigo-300 text-xs transition-all shadow-xs flex items-center justify-center gap-2 group-hover:shadow-md mt-2"
                    >
                      <span>Details</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                  </div>
                </div>


              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

