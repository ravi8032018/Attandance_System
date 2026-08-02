"use client";

import React, { useState, useEffect } from "react";
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

export default function StudentReportsPage() {
  const { user } = useUserMe();
  const [report, setReport] = useState<StudentReportData | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <span>📋 My Academic Attendance Statement</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Personal course attendance breakdown, examination eligibility indicator, and attendance history log.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold transition-all active:scale-95 shadow-xs"
          >
            <span>📥 Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-bold transition-all active:scale-95 shadow-xs"
          >
            <span>📄 Print / PDF</span>
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
          <p className="text-xs text-muted-foreground">Could not load personal attendance statement.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat Cards Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              title="Overall Attendance Rate"
              value={`${report.overall_attendance_pct}%`}
              trend={{
                value: report.overall_total_classes === 0 ? "No Classes Conducted Yet" : report.is_eligible ? "Eligible for Exams (≥75%)" : "Low Attendance Warning (<75%)",
                positive: report.overall_total_classes === 0 || report.is_eligible,
              }}
              icon="📊"
            />
            <StatCard
              title="Total Classes Attended"
              value={`${report.overall_attended} / ${report.overall_total_classes}`}
              icon="✅"
            />
            <StatCard
              title="Exam Eligibility Status"
              value={report.overall_total_classes === 0 ? "Good Standing" : report.is_eligible ? "Eligible" : "Warning"}
              trend={{ value: report.overall_total_classes === 0 ? "No Sessions Held" : report.is_eligible ? "Safe Zone" : "Required Cutoff: 75%", positive: report.overall_total_classes === 0 || report.is_eligible }}
              icon={report.overall_total_classes === 0 ? "🎓" : report.is_eligible ? "🎓" : "⚠️"}
            />

          </div>

          {/* Subject Breakdown Cards */}
          <div className="solid-card rounded-2xl p-5 border border-border space-y-4">
            <h3 className="text-base font-extrabold text-foreground border-b border-border pb-3">
              Subject-wise Attendance Breakdown
            </h3>

            {report.subject_breakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground p-6 text-center">
                No course attendance sessions logged yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.subject_breakdown.map((sub) => (
                  <div key={sub.subject_code} className="p-4 rounded-xl border border-border bg-background space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                        {sub.subject_code}
                      </span>
                      {sub.is_eligible ? (
                        <Badge variant="success">✓ {sub.attendance_pct}% Healthy</Badge>
                      ) : (
                        <Badge variant="error">⚠️ {sub.attendance_pct}% Defaulter</Badge>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-foreground">{sub.subject_name}</h4>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-muted-foreground font-semibold">Attended:</span>
                        <strong className="text-foreground">{sub.attended_classes} / {sub.total_classes} Classes</strong>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          style={{ width: `${sub.attendance_pct}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            sub.attendance_pct >= 75 ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Session History Log Table */}
          {report.session_history && report.session_history.length > 0 && (
            <div className="solid-card rounded-2xl p-6 border border-border space-y-4 bg-card">
              <h3 className="text-base font-extrabold text-foreground border-b border-border pb-3 flex items-center justify-between">
                <span>📅 Class-by-Class Attendance Log</span>
                <Badge variant="muted" className="font-mono">Last {Math.min(10, report.session_history.length)} Sessions Logged</Badge>
              </h3>

              <div className="overflow-x-auto max-h-[350px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] font-extrabold tracking-wider">
                      <th className="p-3">Session ID</th>
                      <th className="p-3">Subject Code</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.session_history.slice(0, 10).map((sess, idx) => (
                      <tr key={sess.session_id || idx} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                          {sess.session_id || `SESS_${idx + 1}`}
                        </td>
                        <td className="p-3 font-extrabold text-foreground">{sess.subject_code}</td>
                        <td className="p-3 text-muted-foreground font-medium">{sess.date ? String(sess.date).slice(0, 10) : "N/A"}</td>
                        <td className="p-3 text-right">
                          <Badge variant={sess.status === "present" ? "success" : "error"}>
                            {sess.status === "present" ? "✓ Present" : "✕ Absent"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
