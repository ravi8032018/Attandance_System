"use client";

import React, { useState, useEffect } from "react";
import { useUserMe } from "@/hooks/useUserMe";
import { apiFetch } from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { exportToCSV, exportToPDF, ReportColumn } from "@/lib/reportExporter";

interface DefaulterStudent {
  registration_no: string;
  student_name: string;
  email: string;
  department: string;
  semester: string;
  attended_classes: number;
  total_classes: number;
  attendance_pct: number;
  risk_tier: "critical" | "warning" | "healthy";
}

interface FacultyWorkload {
  faculty_id: string;
  faculty_name: string;
  designation: string;
  department: string;
  email: string;
  assigned_subjects_count: number;
  assigned_subjects: Array<{
    subject_code: string;
    subject_name: string;
    department: string;
    semester: string;
  }>;
  total_classes_conducted: number;
  avg_class_attendance_pct: number;
}

export default function FacultyReportsPage() {
  const { user } = useUserMe();
  const facultyId = user?.unique_id || "CSFAC01";
  const department = user?.department || "CS";

  const [threshold, setThreshold] = useState<number>(75.0);
  const [activeTab, setActiveTab] = useState<"defaulters" | "workload">("defaulters");

  const [defaulters, setDefaulters] = useState<DefaulterStudent[]>([]);
  const [workload, setWorkload] = useState<FacultyWorkload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFacultyReports() {
      setLoading(true);
      try {
        const [defRes, workRes] = await Promise.all([
          apiFetch(`/reports/defaulters?department=${encodeURIComponent(department)}&threshold=${threshold}`),
          apiFetch(`/reports/workload?department=${encodeURIComponent(department)}`),
        ]);

        if (defRes.ok) {
          const defData = await defRes.json();
          setDefaulters(defData?.data || []);
        }

        if (workRes.ok) {
          const workData = await workRes.json();
          const items: FacultyWorkload[] = workData?.data || [];
          const myWorkload = items.find((w) => w.faculty_id.toUpperCase() === facultyId.toUpperCase()) || items[0] || null;
          setWorkload(myWorkload);
        }
      } catch (e) {
        // Silent catch
      } finally {
        setLoading(false);
      }
    }

    loadFacultyReports();
  }, [department, facultyId, threshold]);

  const defaulterColumns: ReportColumn[] = [
    { key: "registration_no", label: "Registration No" },
    { key: "student_name", label: "Student Name" },
    { key: "semester", label: "Semester" },
    { key: "department", label: "Department" },
    { key: "attended_classes", label: "Attended Classes" },
    { key: "total_classes", label: "Total Classes" },
    { key: "attendance_pct", label: "Attendance %" },
    { key: "email", label: "Email" },
  ];

  function handleExportCSV() {
    exportToCSV(`Faculty_Defaulters_${facultyId}_(${threshold}pct).csv`, defaulterColumns, defaulters);
  }

  function handleExportPDF() {
    exportToPDF(
      `Faculty Attendance Report`,
      `${threshold}%`,
      department,
      `All Semesters`,
      defaulterColumns,
      defaulters
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <span>📈 Faculty Attendance & Teaching Analytics</span>
            <Badge variant="primary" className="text-xs font-mono">{facultyId}</Badge>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Personal teaching metrics, course attendance breakdown, and low attendance warning rosters.
          </p>
        </div>

        {/* Warning Threshold Selector */}
        <div className="flex items-center gap-2 bg-muted p-2 rounded-2xl border border-border">
          <label className="text-xs font-bold text-muted-foreground whitespace-nowrap">
            Warning Cutoff:
          </label>
          <select
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="h-9 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value={75.0}>Below 75% (Mandatory)</option>
            <option value={60.0}>Below 60% (Moderate Risk)</option>
            <option value={50.0}>Below 50% (Severe Risk)</option>
          </select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Assigned Subjects"
          value={workload ? `${workload.assigned_subjects_count} Subjects` : "Loading..."}
          icon="📚"
        />
        <StatCard
          title="Classes Conducted"
          value={workload ? `${workload.total_classes_conducted} Sessions` : "Loading..."}
          icon="📝"
        />
        <StatCard
          title="Avg Class Attendance Rate"
          value={workload ? `${workload.avg_class_attendance_pct}%` : "Loading..."}
          trend={{ value: workload ? `${defaulters.length} Defaulters` : "", positive: defaulters.length === 0 }}
          icon="📊"
        />
      </div>

      {/* Main Console */}
      <div className="solid-card rounded-2xl p-5 border border-border space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab("defaulters")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "defaulters"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Defaulter Warning Roster ({defaulters.length})
            </button>
            <button
              onClick={() => setActiveTab("workload")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "workload"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Assigned Subjects ({workload?.assigned_subjects.length || 0})
            </button>
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
            Loading reports...
          </div>
        ) : activeTab === "defaulters" ? (
          <div className="space-y-4">
            {defaulters.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl">
                <div className="text-2xl">🎉</div>
                <h4 className="text-sm font-bold text-foreground">No Defaulters Flagged</h4>
                <p className="text-xs text-muted-foreground">
                  All students in your classes are currently meeting the {threshold}% requirement.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-extrabold uppercase text-muted-foreground">
                      <th className="py-3 px-3">Registration No</th>
                      <th className="py-3 px-3">Student Name</th>
                      <th className="py-3 px-3">Semester</th>
                      <th className="py-3 px-3">Attended Classes</th>
                      <th className="py-3 px-3">Attendance Rate</th>
                      <th className="py-3 px-3">Status Badge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {defaulters.map((st) => (
                      <tr key={st.registration_no} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-black text-indigo-600 dark:text-indigo-400">
                          {st.registration_no}
                        </td>
                        <td className="py-3 px-3 font-bold text-foreground">
                          {st.student_name}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="muted">Sem {st.semester}</Badge>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">
                          {st.attended_classes} / {st.total_classes}
                        </td>
                        <td className={`py-3 px-3 text-sm font-mono font-bold ${
                          st.attendance_pct < 40
                            ? "text-rose-600 dark:text-rose-400"
                            : st.attendance_pct < 75
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}>
                          {st.attendance_pct}%
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="warning">⚠️ Low Attendance (&lt;{threshold}%)</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workload?.assigned_subjects.map((sub) => (
              <div key={sub.subject_code} className="p-4 rounded-xl border border-border bg-background space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                    {sub.subject_code}
                  </span>
                  <Badge variant="muted">Sem {sub.semester}</Badge>
                </div>
                <h4 className="text-sm font-bold text-foreground">{sub.subject_name}</h4>
                <p className="text-xs text-muted-foreground font-mono">Department: {sub.department}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
