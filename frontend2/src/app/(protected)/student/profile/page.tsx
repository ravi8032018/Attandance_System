"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { useUserMe } from "@/hooks/useUserMe";
import { apiFetch } from "@/lib/api";

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
  const { user } = useUserMe();
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

  const name = summary?.student_info?.student_name || user?.name || "Student User";
  const regNo = summary?.student_info?.registration_no || user?.registration_no || "N/A";
  const email = summary?.student_info?.email || user?.email || "N/A";
  const dept = summary?.student_info?.department || user?.department || "CS";
  const sem = summary?.student_info?.semester || "4";

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Student Profile & Academic Record
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Official academic registration credentials, enrolled subjects, and standing.
          </p>
        </div>

        <Link
          href="/student/dashboard"
          className="rounded-xl border border-border bg-card hover:bg-muted text-foreground px-4 py-2 text-xs font-bold transition-all shadow-xs self-start sm:self-auto"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
          Loading student credentials...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="solid-card rounded-2xl p-6 border border-border space-y-6 bg-card">
            <div className="flex items-center gap-5 pb-6 border-b border-border">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white text-2xl font-black shadow-md">
                {initials || "S"}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-foreground">{name}</h2>
                  {summary && (
                    <Badge variant={summary.is_eligible ? "success" : "error"}>
                      {summary.is_eligible ? "✓ Good Standing (≥75%)" : "⚠️ Low Attendance (<75%)"}
                    </Badge>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="primary">{regNo}</Badge>
                  <Badge variant="secondary">Degree Track: B.Sc</Badge>
                </div>
              </div>
            </div>

            {/* Credentials Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Registration Number</span>
                <span className="text-sm font-mono font-bold text-foreground">{regNo}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Academic Email</span>
                <span className="text-sm font-semibold text-foreground">{email}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Department</span>
                <span className="text-sm font-semibold text-foreground">Computer Science ({dept})</span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Current Semester</span>
                <span className="text-sm font-semibold text-foreground">Semester {sem}</span>
              </div>
              {summary && (
                <>
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Overall Attendance Rate</span>
                    <span className="text-md font-black font-mono text-indigo-600 dark:text-indigo-400">
                      {summary.overall_attendance_pct}% ({summary.overall_attended} / {summary.overall_total_classes} Classes)
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Examination Eligibility</span>
                    <span className={`text-sm font-extrabold ${summary.is_eligible ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {summary.is_eligible ? "Eligible for Term End Exams" : "Warning: Flagged Below Cutoff"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Enrolled Curriculum Roster */}
          {summary && summary.subject_breakdown.length > 0 && (
            <div className="solid-card rounded-2xl p-6 border border-border space-y-4 bg-card">
              <h3 className="text-base font-extrabold text-foreground border-b border-border pb-3 flex items-center justify-between">
                <span>Enrolled Curriculum Courses</span>
                <Badge variant="muted" className="font-mono">{summary.subject_breakdown.length} Courses</Badge>
              </h3>

              <div className="space-y-3">
                {summary.subject_breakdown.map((sub) => (
                  <Link
                    key={sub.subject_code}
                    href={`/student/courses/${encodeURIComponent(sub.subject_code)}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl border border-border bg-background hover:border-indigo-500/50 hover:bg-muted/40 transition-all group"
                  >
                    <div>
                      <h4 className="text-sm font-extrabold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {sub.subject_name}
                      </h4>
                      <span className="mt-1 font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 block">
                        {sub.subject_code}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="text-xs font-mono text-muted-foreground font-semibold">
                        {sub.attended_classes} / {sub.total_classes} Classes
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
        </div>
      )}
    </main>
  );
}
