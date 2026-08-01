"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useUserMe } from "@/hooks/useUserMe";
import { apiFetch } from "@/lib/api";

interface StudentSummaryData {
  student_info: {
    registration_no: string;
    student_name: string;
    email: string;
    department: string;
    semester: string;
    course?: string;
    photo_url?: string;
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
}

export default function StudentProfilePage() {
  const { user, isCr } = useUserMe();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StudentSummaryData | null>(null);

  useEffect(() => {
    async function loadProfile() {
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
    loadProfile();
  }, []);

  const name =
    user?.name ||
    summary?.student_info?.student_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    "Student User";
  const regNo = summary?.student_info?.registration_no || user?.registration_no || "N/A";
  const email = summary?.student_info?.email || user?.email || "N/A";
  const dept = summary?.student_info?.department || user?.department || "CS";
  const sem = summary?.student_info?.semester || user?.sem || user?.semester || "4";
  const course = summary?.student_info?.course || user?.course || "B.Sc Computer Science";
  const photoUrl = user?.photo_url || user?.avatar_url || user?.image_url || summary?.student_info?.photo_url;
  const contactNo = user?.contact_number || user?.phone || "Not Provided";
  const gender = user?.gender || "Not Specified";
  const regYear = user?.registration_year || "2024";

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Student Profile & Credentials
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            Official academic registration credentials, attendance performance, and course enrollment.
          </p>
        </div>

        <Link
          href="/student/dashboard"
          className="rounded-xl border border-border bg-card hover:bg-muted text-foreground px-4 py-2 text-xs font-bold transition-all shadow-xs self-start sm:self-auto flex items-center gap-1.5 shrink-0"
        >
          <span>← Back to Dashboard</span>
        </Link>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs font-bold text-muted-foreground animate-pulse flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span>Loading academic credentials & profile data...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Hero / Profile Card */}
          <div className="solid-card rounded-2xl p-6 sm:p-8 border border-border space-y-6 bg-card shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-border/80">
              {/* Dynamic User Avatar (Image with auto-initials fallback) */}
              <UserAvatar
                name={name}
                firstName={user?.first_name}
                lastName={user?.last_name}
                photoUrl={photoUrl}
                size="3xl"
              />

              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">{name}</h2>
                  {summary && (
                    <Badge variant={summary.is_eligible ? "success" : "error"}>
                      {summary.is_eligible ? "✓ Good Standing (≥75%)" : "⚠️ Low Attendance (<75%)"}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono font-bold text-foreground bg-muted px-2.5 py-1 rounded-md">
                    Reg: {regNo}
                  </span>
                  {
                    isCr ? <Badge variant="primary">CR</Badge> : null
                  }
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
            </div>

            {/* Academic Standing Stat Cards */}
            {summary && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <StatCard
                  title="Overall Attendance"
                  value={`${summary.overall_attendance_pct}%`}
                  subtitle={`${summary.overall_attended} / ${summary.overall_total_classes} Total Classes Attended`}
                  variant={summary.overall_attendance_pct >= 75 ? "emerald" : "rose"}
                  icon={
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <StatCard
                  title="Term Examination Eligibility"
                  value={summary.is_eligible ? "Eligible" : "Flagged"}
                  subtitle={summary.is_eligible ? "Satisfies 75% Cutoff Rule" : "Requires Minimum 75% Attendance"}
                  variant={summary.is_eligible ? "indigo" : "rose"}
                  icon={
                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                />
                <StatCard
                  title="Enrolled Subjects"
                  value={summary.subject_breakdown.length.toString()}
                  subtitle="Curriculum Courses Enrolled"
                  variant="purple"
                  icon={
                    <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  }
                />
              </div>
            )}

            {/* Official Credentials Grid */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                📌 Official Academic & Registration Credentials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border border-border/80 bg-background/60">
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Registration Number</span>
                  <span className="text-xs font-mono font-bold text-foreground">{regNo}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Academic Email</span>
                  <span className="text-xs font-semibold text-foreground truncate block">{email}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Department & Track</span>
                  <span className="text-xs font-semibold text-foreground">{dept} ({course})</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Semester & Year</span>
                  <span className="text-xs font-semibold text-foreground">Sem {sem} • {regYear}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Contact Number</span>
                  <span className="text-xs font-mono text-foreground">{contactNo}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Gender Identification</span>
                  <span className="text-xs font-medium text-foreground capitalize">{gender}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Account Status</span>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">Verified Active</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Class Designation</span>
                  <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{isCr ? "Class Representative (CR)" : "Regular Student"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enrolled Curriculum Roster Section */}
          {summary && summary.subject_breakdown.length > 0 && (
            <div className="solid-card rounded-2xl p-6 sm:p-8 border border-border space-y-4 bg-card shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-base font-extrabold text-foreground">
                    Enrolled Subject Performance Breakdown
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Individual subject attendance tracking for Semester {sem}. Click any subject to view detailed session logs.
                  </p>
                </div>
                <Badge variant="muted" className="font-mono font-bold">{summary.subject_breakdown.length} Courses</Badge>
              </div>

              <div className="space-y-3 pt-1">
                {summary.subject_breakdown.map((sub) => (
                  <Link
                    key={sub.subject_code}
                    href={`/student/courses/${encodeURIComponent(sub.subject_code)}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-background hover:border-indigo-500/50 hover:bg-muted/30 transition-all group"
                  >
                    <div className="space-y-0.5">
                      <h4 className="text-xs sm:text-sm font-extrabold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {sub.subject_name}
                      </h4>
                      <span className="font-mono text-xs font-extrabold text-indigo-600 dark:text-indigo-400 block">
                        {sub.subject_code}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="text-xs font-mono text-muted-foreground font-semibold">
                        {sub.attended_classes} / {sub.total_classes} Attended
                      </span>
                      <Badge variant={sub.is_eligible ? "success" : "error"}>
                        {sub.attendance_pct}%
                      </Badge>
                      <span className="text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-transform group-hover:translate-x-1 font-bold text-xs">
                        →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Direct Navigation Footer */}
          <div className="solid-card rounded-2xl p-6 border border-border bg-card shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">🔗 Quick Navigation Actions</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                href="/student/reports"
                className="p-3 rounded-xl border border-border/80 hover:bg-muted/40 text-center transition-all text-xs font-bold text-foreground flex flex-col items-center gap-1.5"
              >
                <span>📊</span>
                <span>Attendance Summary</span>
              </Link>
              <Link
                href="/student/courses"
                className="p-3 rounded-xl border border-border/80 hover:bg-muted/40 text-center transition-all text-xs font-bold text-foreground flex flex-col items-center gap-1.5"
              >
                <span>📚</span>
                <span>My Courses</span>
              </Link>
              <Link
                href="/student/notifications"
                className="p-3 rounded-xl border border-border/80 hover:bg-muted/40 text-center transition-all text-xs font-bold text-foreground flex flex-col items-center gap-1.5"
              >
                <span>🔔</span>
                <span>Notifications</span>
              </Link>
              {isCr && (
                <Link
                  href="/student/cr"
                  className="p-3 rounded-xl border border-border/80 hover:bg-muted/40 text-center transition-all text-xs font-bold text-amber-600 dark:text-amber-400 flex flex-col items-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>CR Console Hub</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
