"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { FacultyAvatar } from "@/components/ui/FacultyAvatar";
import { apiFetch } from "@/lib/api";

interface SubjectFullDetails {
  subject_code: string;
  subject_name: string;
  department: string;
  semester: string;
  faculty?: {
    faculty_id: string;
    name: string;
    email: string;
    department: string;
  } | null;
  stats: {
    total_classes: number;
    classes_last_7_days: number;
    classes_last_30_days: number;
    avg_attendance_pct: number;
    weekly_attendance_pct: number;
    monthly_attendance_pct: number;
    total_records_marked: number;
    enrolled_students_count: number;
  };
  distribution?: {
    tier1_above_75?: number;
    tier2_above_60?: number;
    tier3_above_40?: number;
    tier4_below_40?: number;
    excellent: number;
    good: number;
    warning: number;
    critical: number;
  };
  trend_chart_data?: Array<{
    session_id: string;
    date: string;
    present_pct: number;
    present_count: number;
    absent_count: number;
    class_size: number;
  }>;
  sessions: Array<{
    session_id: string;
    date: string;
    status: string;
    submitted_by: string;
    present_count: number;
    absent_count: number;
    class_size: number;
  }>;
  student_roster: Array<{
    registration_no: string;
    student_name: string;
    attended_classes: number;
    total_classes: number;
    attendance_pct: number;
    is_at_risk: boolean;
  }>;
}

function ArrowLeftIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

export default function SubjectDetailsPage() {
  const params = useParams();
  const rawCode = params?.subject_code;
  const subjectCode = Array.isArray(rawCode) ? rawCode[0] : rawCode || "";

  const [details, setDetails] = useState<SubjectFullDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [rosterFilter, setRosterFilter] = useState<"all" | "at_risk" | "healthy">("all");
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<number | null>(null);
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      if (!subjectCode) return;
      setLoading(true);
      try {
        const res = await apiFetch(`/curriculum/subject-details/${encodeURIComponent(subjectCode)}`);
        if (res.ok) {
          const data = await res.json();
          console.log("--> Subject Data: ", data);
          setDetails(data);
        }
      } catch (e) {
        console.error("Failed to load subject details", e);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [subjectCode]);

  const filteredRoster = (details?.student_roster || []).filter((s) => {
    if (rosterFilter === "at_risk") return s.is_at_risk;
    if (rosterFilter === "healthy") return !s.is_at_risk;
    return true;
  });

  const atRiskCount = (details?.student_roster || []).filter((s) => s.is_at_risk).length;
  const totalEnrolled = details?.stats.enrolled_students_count || 1;

  const dist = details?.distribution || { excellent: 0, good: 0, warning: 0, critical: 0 };
  const trendData = details?.trend_chart_data || [];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Back Button & Header */}
      <div className="space-y-3">
        <Link
          href="/faculty/hod/curriculum"
          className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-500/10 px-3.5 py-1.5 rounded-xl border border-indigo-500/20 transition-all active:scale-95"
        >
          <ArrowLeftIcon />
          <span>Back to Curriculum Catalog</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-lg">
                {subjectCode}
              </span>
              <Badge variant="secondary">Semester {details?.semester || ""}</Badge>
              <Badge variant="primary">Dept {details?.department || ""}</Badge>
              <Badge variant="success">Active Subject</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {details?.subject_name || subjectCode}
            </h1>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
          Fetching subject analytics, instructor workload, real attendance graphs, and student roster from database...
        </div>
      ) : !details ? (
        <div className="solid-card rounded-2xl p-12 text-center space-y-2 border border-border">
          <div className="text-3xl">⚠️</div>
          <h2 className="text-base font-bold text-foreground">Subject Details Not Found</h2>
          <p className="text-xs text-muted-foreground">
            Could not locate information for subject code <strong className="font-mono">{subjectCode}</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Instructor & Core Metrics Header Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Instructor Card */}
            <div className="solid-card rounded-2xl border border-border p-5 bg-card flex flex-col justify-between shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-2">
                Course Instructor
              </span>
              <div className="flex items-center gap-3">
                <FacultyAvatar firstName={details.faculty?.name || "Unassigned"} size="md" />
                <div className="truncate">
                  <h3 className="text-sm font-extrabold text-foreground truncate">
                    {details.faculty?.name || "Unassigned"}
                  </h3>
                  {details.faculty?.email ? (
                    <p className="text-xs text-muted-foreground truncate">{details.faculty.email}</p>
                  ) : (
                    <p className="text-xs text-amber-500 font-semibold">No Faculty Assigned</p>
                  )}
                  {details.faculty?.faculty_id && (
                    <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
                      ID: {details.faculty.faculty_id}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Overall Attendance Performance Card */}
            <div className="solid-card rounded-2xl border border-border p-5 bg-card flex flex-col justify-between shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                Overall Attendance Rate
              </span>
              <div>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {details.stats.avg_attendance_pct}%
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Across {details.stats.total_records_marked} marked student records
                </p>
              </div>
            </div>

            {/* Total Classes Conducted Card */}
            <div className="solid-card rounded-2xl border border-border p-5 bg-card flex flex-col justify-between shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                Classes Conducted
              </span>
              <div>
                <div className="text-3xl font-black text-foreground">
                  {details.stats.total_classes} <span className="text-sm font-semibold text-muted-foreground">Sessions</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 font-medium">
                  <span>Last 7 Days: <strong className="text-foreground font-bold">{details.stats.classes_last_7_days}</strong></span>
                  <span>•</span>
                  <span>Last 30 Days: <strong className="text-foreground font-bold">{details.stats.classes_last_30_days}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* REAL INTERACTIVE DATA GRAPHS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Graph 1: Class Session Attendance Trend Chart (Bar & Line Chart) */}
            <div className="lg:col-span-2 solid-card rounded-2xl p-5 sm:p-6 border border-border bg-card space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-foreground flex items-center gap-2">
                    <span>📈 Class Session Attendance Trend</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Real-time present ratio (%) per class session held for this course.
                  </p>
                </div>
                <Badge variant="primary" className="self-start sm:self-auto font-mono text-xs">
                  {trendData.length} Sessions Logged
                </Badge>
              </div>

              {trendData.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No session attendance data recorded yet to display trend graph.
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {/* Smooth SVG Gradient Area & Line Trend Chart */}
                  <div className="h-48 sm:h-56 w-full pt-4 pb-2 px-2 bg-muted/20 rounded-2xl border border-border/60 relative flex flex-col justify-between overflow-hidden">
                    <svg viewBox="0 0 500 160" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="50%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>

                      {/* Area & Smooth Line Path */}
                      {(() => {
                        const n = trendData.length;
                        const pts = trendData.map((item, i) => {
                          const x = 30 + (n > 1 ? (i / (n - 1)) * 440 : 220);
                          const y = 140 - (item.present_pct / 100) * 110;
                          return { x, y, item, i };
                        });

                        if (pts.length === 0) return null;

                        let lineD = `M ${pts[0].x},${pts[0].y}`;
                        for (let i = 0; i < pts.length - 1; i++) {
                          const curr = pts[i];
                          const next = pts[i + 1];
                          const cp1x = curr.x + (next.x - curr.x) / 2;
                          const cp1y = curr.y;
                          const cp2x = curr.x + (next.x - curr.x) / 2;
                          const cp2y = next.y;
                          lineD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
                        }

                        const areaD = `${lineD} L ${pts[pts.length - 1].x},140 L ${pts[0].x},140 Z`;

                        return (
                          <>
                            {/* Area Fill */}
                            <path d={areaD} fill="url(#areaGradient)" />

                            {/* Smooth Line */}
                            <path d={lineD} fill="none" stroke="url(#lineGradient)" strokeWidth="3" strokeLinecap="round" />

                            {/* Interactive Data Points with Wide Hit Area */}
                            {pts.map((pt) => {
                              const isHovered = hoveredTrendPoint === pt.i;
                              const stepWidth = n > 1 ? 440 / (n - 1) : 100;
                              return (
                                <g key={pt.item.session_id + pt.i}>
                                  {/* Wide Invisible Hover Target Hitbox - Prevents Flickering */}
                                  <rect
                                    x={pt.x - stepWidth / 2}
                                    y="0"
                                    width={stepWidth}
                                    height="160"
                                    fill="transparent"
                                    className="cursor-pointer"
                                    onMouseEnter={() => setHoveredTrendPoint(pt.i)}
                                    onMouseLeave={() => setHoveredTrendPoint(null)}
                                  />

                                  {isHovered && (
                                    <circle cx={pt.x} cy={pt.y} r="12" fill="#6366f1" opacity="0.25" className="animate-ping pointer-events-none" />
                                  )}

                                  <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r={isHovered ? "6.5" : "4.5"}
                                    fill={pt.item.present_pct >= 75 ? "#10b981" : pt.item.present_pct >= 60 ? "#f59e0b" : "#f43f5e"}
                                    stroke="#ffffff"
                                    strokeWidth={isHovered ? "2.5" : "1.5"}
                                    className="transition-all duration-150 pointer-events-none"
                                  />

                                  <text
                                    x={pt.x}
                                    y={pt.y - 9}
                                    textAnchor="middle"
                                    fill="currentColor"
                                    fontSize="9"
                                    fontWeight="bold"
                                    className={`font-mono transition-opacity pointer-events-none ${isHovered ? "opacity-100 font-black fill-indigo-600 dark:fill-indigo-400" : "opacity-70"}`}
                                  >
                                    {pt.item.present_pct}%
                                  </text>
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>

                    {/* Floating Tooltip */}
                    {hoveredTrendPoint !== null && trendData[hoveredTrendPoint] && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-[11px] px-3.5 py-2 rounded-xl shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 border border-border flex items-center gap-3 pointer-events-none">
                        <div>
                          <p className="font-extrabold">{new Date(trendData[hoveredTrendPoint].date).toLocaleDateString()}</p>
                          <p className="text-[10px] opacity-80">{trendData[hoveredTrendPoint].session_id}</p>
                        </div>
                        <div className="border-l border-white/20 dark:border-slate-800/20 pl-3 font-mono font-bold">
                          <span className="text-emerald-400 dark:text-emerald-600 font-extrabold block">
                            {trendData[hoveredTrendPoint].present_pct}% Attendance
                          </span>
                          <span className="text-[10px] opacity-90 block">
                            {trendData[hoveredTrendPoint].present_count} / {trendData[hoveredTrendPoint].class_size} Students Present
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground px-2">
                    <span>← Oldest Session</span>
                    <span>Most Recent Session →</span>
                  </div>
                </div>
              )}
            </div>

            {/* Graph 2: Student Attendance Distribution Solid SVG Pie / Micro-Donut Chart */}
            <div className="solid-card rounded-2xl p-5 sm:p-6 border border-border bg-card space-y-4 flex flex-col justify-between shadow-xs">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-foreground flex items-center gap-2">
                  <span>📊 Student Attendance Distribution</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Roster breakdown by attendance percentage tier.
                </p>
              </div>

              {/* Solid SVG Pie / Micro-Donut Chart with Boundary Gaps & Pop-up Tooltips */}
              <div className="flex flex-col items-center justify-center space-y-4 py-2 my-auto relative">
                <div className="relative w-52 h-52 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 180 180" className="w-full h-full overflow-visible">
                    {(() => {
                      const total = totalEnrolled || 1;
                      const tiers = [
                        { key: "above_75", label: "≥ 75% Target Tier", desc: "Above 75% Attendance", count: dist.tier1_above_75 ?? dist.excellent, color: "#10b981", badgeColor: "text-emerald-500" },
                        { key: "above_60", label: "60% - 74.9% Target Tier", desc: "Moderate Attendance", count: dist.tier2_above_60 ?? dist.good, color: "#3b82f6", badgeColor: "text-blue-500" },
                        { key: "above_40", label: "40% - 59.9% Target Tier", desc: "Warning Tier", count: dist.tier3_above_40 ?? dist.warning, color: "#f59e0b", badgeColor: "text-amber-500" },
                        { key: "below_40", label: "< 40% Target Tier", desc: "Critical Risk Tier", count: dist.tier4_below_40 ?? dist.critical, color: "#f43f5e", badgeColor: "text-rose-500" },
                      ].filter((t) => t.count > 0);

                      if (tiers.length === 0) {
                        return <circle cx="90" cy="90" r="70" fill="#374151" opacity="0.4" />;
                      }

                      const outerR = 74;
                      const innerR = 14; // Small center area cutout
                      const gap = tiers.length > 1 ? 0.04 : 0; // Boundary gap between colors

                      let currentAngle = 0;

                      return tiers.map((tier, idx) => {
                        const totalAngle = (tier.count / total) * 2 * Math.PI;
                        const a1 = currentAngle + gap / 2;
                        const a2 = currentAngle + totalAngle - gap / 2;
                        currentAngle += totalAngle;

                        const isHovered = hoveredPieIndex === idx;
                        const midAngle = (a1 + a2) / 2;

                        // Outward shift vector on hover
                        const hoverOffset = isHovered ? 6 : 0;
                        const shiftX = hoverOffset * Math.cos(midAngle - Math.PI / 2);
                        const shiftY = hoverOffset * Math.sin(midAngle - Math.PI / 2);

                        const x1_out = 90 + outerR * Math.cos(a1 - Math.PI / 2);
                        const y1_out = 90 + outerR * Math.sin(a1 - Math.PI / 2);
                        const x2_out = 90 + outerR * Math.cos(a2 - Math.PI / 2);
                        const y2_out = 90 + outerR * Math.sin(a2 - Math.PI / 2);

                        const x1_in = 90 + innerR * Math.cos(a2 - Math.PI / 2);
                        const y1_in = 90 + innerR * Math.sin(a2 - Math.PI / 2);
                        const x2_in = 90 + innerR * Math.cos(a1 - Math.PI / 2);
                        const y2_in = 90 + innerR * Math.sin(a1 - Math.PI / 2);

                        const largeArc = a2 - a1 > Math.PI ? 1 : 0;

                        const pathD = `
                          M ${x1_out},${y1_out}
                          A ${outerR},${outerR} 0 ${largeArc},1 ${x2_out},${y2_out}
                          L ${x1_in},${y1_in}
                          A ${innerR},${innerR} 0 ${largeArc},0 ${x2_in},${y2_in}
                          Z
                        `;

                        return (
                          <path
                            key={tier.key}
                            d={pathD}
                            fill={tier.color}
                            stroke="var(--card)"
                            strokeWidth="3.5"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            style={{
                              transform: `translate(${shiftX}px, ${shiftY}px)`,
                              transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease",
                            }}
                            className={`cursor-pointer ${isHovered ? "opacity-100 drop-shadow-md" : "opacity-90 hover:opacity-100"}`}
                            onMouseEnter={() => setHoveredPieIndex(idx)}
                            onMouseLeave={() => setHoveredPieIndex(null)}
                          />
                        );
                      });
                    })()}

                    {/* Small Center Circle Cutout */}
                    <circle cx="90" cy="90" r="12" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
                  </svg>

                  {/* Hover Floating Tooltip Overlay */}
                  {hoveredPieIndex !== null && (() => {
                    const tiers = [
                      { key: "above_75", label: "≥ 75% Target Tier", count: dist.tier1_above_75 ?? dist.excellent, color: "text-emerald-500" },
                      { key: "above_60", label: "60% - 74.9% Target Tier", count: dist.tier2_above_60 ?? dist.good, color: "text-blue-500" },
                      { key: "above_40", label: "40% - 59.9% Target Tier", count: dist.tier3_above_40 ?? dist.warning, color: "text-amber-500" },
                      { key: "below_40", label: "< 40% Target Tier", count: dist.tier4_below_40 ?? dist.critical, color: "text-rose-500" },
                    ].filter((t) => t.count > 0);

                    const target = tiers[hoveredPieIndex];
                    if (!target) return null;
                    const total = totalEnrolled || 1;
                    const pct = Math.round((target.count / total) * 100);

                    return (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-[11px] px-3.5 py-2 rounded-xl shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 border border-border text-center pointer-events-none">
                        <p className={`font-black ${target.color}`}>{target.label}</p>
                        <div className="mt-0.5 font-mono font-bold flex items-center justify-center gap-2">
                          <span className="text-indigo-400 dark:text-indigo-600 font-extrabold">{pct}%</span>
                          <span className="opacity-40">•</span>
                          <span className="text-foreground dark:text-foreground">{target.count} / {totalEnrolled} Students</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="pt-2 border-t border-border text-center">
                <span className="text-[11px] text-muted-foreground font-semibold">
                  Total Enrolled Roster: <strong className="text-foreground">{totalEnrolled} Students</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Analytical Trends: Weekly & Monthly Performance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="solid-card rounded-2xl p-5 border border-border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                  📅 Weekly Attendance (Last 7 Days)
                </span>
                <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {details.stats.classes_last_7_days} Classes
                </span>
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {details.stats.weekly_attendance_pct}%
              </div>
              <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  style={{ width: `${details.stats.weekly_attendance_pct}%` }}
                  className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Average present ratio for sessions held in the past 7 days.
              </p>
            </div>

            <div className="solid-card rounded-2xl p-5 border border-border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                  📆 Monthly Attendance (Last 30 Days)
                </span>
                <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {details.stats.classes_last_30_days} Classes
                </span>
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {details.stats.monthly_attendance_pct}%
              </div>
              <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  style={{ width: `${details.stats.monthly_attendance_pct}%` }}
                  className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Average present ratio for sessions held in the past 30 days.
              </p>
            </div>
          </div>

          {/* Enrolled Student Attendance Roster Table */}
          <div className="solid-card rounded-2xl border border-border overflow-hidden bg-card space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h3 className="text-base font-extrabold text-foreground">
                  Enrolled Student Attendance Roster ({details.stats.enrolled_students_count})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Per-student attendance performance for this subject.
                </p>
              </div>

              {/* Roster Filter Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRosterFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${rosterFilter === "all"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                >
                  All ({details.stats.enrolled_students_count})
                </button>
                <button
                  type="button"
                  onClick={() => setRosterFilter("at_risk")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${rosterFilter === "at_risk"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                >
                  At Risk &lt;75% ({atRiskCount})
                </button>
                <button
                  type="button"
                  onClick={() => setRosterFilter("healthy")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${rosterFilter === "healthy"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Healthy &ge;75% ({details.stats.enrolled_students_count - atRiskCount})
                </button>
              </div>
            </div>

            {filteredRoster.length === 0 ? (
              <p className="text-xs text-muted-foreground p-6 text-center">
                No student records match the selected filter.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-extrabold uppercase text-muted-foreground">
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Registration No</th>
                      <th className="py-2.5 px-3">Classes Attended</th>
                      <th className="py-2.5 px-3">Attendance Rate</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredRoster.map((st) => (
                      <tr key={st.registration_no} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-foreground">{st.student_name}</td>
                        <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {st.registration_no}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {st.attended_classes} / {st.total_classes}
                        </td>
                        <td className="py-3 px-3 font-black text-sm">
                          {st.attendance_pct}%
                        </td>
                        <td className="py-3 px-3">
                          {st.is_at_risk ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 text-[10px] font-bold">
                              ⚠️ At-Risk (&lt;75%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                              ✓ Good Standing
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Attendance Sessions Log */}
          <div className="solid-card rounded-2xl border border-border p-5 bg-card space-y-4">
            <h3 className="text-base font-extrabold text-foreground">
              Recent Attendance Sessions Log ({details.sessions.length})
            </h3>

            {details.sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground p-6 text-center">
                No attendance sessions recorded for this subject yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-extrabold uppercase text-muted-foreground">
                      <th className="py-2.5 px-3">Class Date & Time</th>
                      <th className="py-2.5 px-3">Session ID</th>
                      <th className="py-2.5 px-3">Conducted By</th>
                      <th className="py-2.5 px-3">Present / Class Size</th>
                      <th className="py-2.5 px-3">Approval Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {details.sessions.map((sess) => (
                      <tr key={sess.session_id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-foreground">
                          {new Date(sess.date).toLocaleDateString()} {new Date(sess.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3 px-3 font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                          {sess.session_id}
                        </td>
                        <td className="py-3 px-3 font-semibold text-foreground">
                          {sess.submitted_by}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">
                          {sess.present_count} / {sess.class_size} Present
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              sess.status === "approved" || sess.status === "marked_by_faculty"
                                ? "success"
                                : "warning"
                            }
                          >
                            {sess.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
