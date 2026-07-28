"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { exportToCSV, exportToPDF, ReportColumn } from "@/lib/reportExporter";

interface ReportsOverview {
  department: string;
  semester: string;
  mean_attendance_pct: number;
  total_sessions: number;
  weekly_classes: number;
  monthly_classes: number;
  total_marked_records: number;
  total_active_students: number;
  defaulters_count: number;
}

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
  total_classes_conducted: number;
  avg_class_attendance_pct: number;
}

export default function AdminReportsPage() {
  const [department, setDepartment] = useState("CS");
  const [semester, setSemester] = useState("all");
  const [threshold, setThreshold] = useState<number>(75.0);

  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [defaulters, setDefaulters] = useState<DefaulterStudent[]>([]);
  const [workload, setWorkload] = useState<FacultyWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdminReports() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          ...(department ? { department } : {}),
          ...(semester !== "all" ? { semester } : {}),
        });

        const [ovRes, defRes, workRes] = await Promise.all([
          apiFetch(`/reports/overview?${queryParams.toString()}`),
          apiFetch(`/reports/defaulters?${queryParams.toString()}&threshold=${threshold}`),
          apiFetch(`/reports/workload?${department ? `department=${encodeURIComponent(department)}` : ""}`),
        ]);

        if (ovRes.ok) {
          const ovData = await ovRes.json();
          setOverview(ovData);
        }

        if (defRes.ok) {
          const defData = await defRes.json();
          setDefaulters(defData?.data || []);
        }

        if (workRes.ok) {
          const workData = await workRes.json();
          setWorkload(workData?.data || []);
        }
      } catch (e) {
        // Silent catch
      } finally {
        setLoading(false);
      }
    }

    loadAdminReports();
  }, [department, semester, threshold]);

  const defaulterColumns: ReportColumn[] = [
    { key: "registration_no", label: "Registration No" },
    { key: "student_name", label: "Student Name" },
    { key: "department", label: "Department" },
    { key: "semester", label: "Semester" },
    { key: "attended_classes", label: "Attended Classes" },
    { key: "total_classes", label: "Total Classes" },
    { key: "attendance_pct", label: "Attendance %" },
    { key: "email", label: "Email" },
  ];

  function handleExportCSV() {
    exportToCSV(`Admin_Academic_Defaulters_${department}_(${threshold}pct).csv`, defaulterColumns, defaulters);
  }

  function handleExportPDF() {
    exportToPDF(
      `Institute-Wide Defaulter Academic Audit`,
      `${threshold}%`,
      department || "All",
      semester,
      defaulterColumns,
      defaulters
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <span>🏛️ System Administrative Reports & Audit</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Institute-wide academic performance analytics, department comparison, defaulter auditing, and CSV/PDF data exports.
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

      {/* Filter Toolbar */}
      <div className="solid-card rounded-2xl p-4 border border-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-0.5">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="h-9 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="CS">Computer Science (CS)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-0.5">
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="h-9 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Semesters</option>
              {["1", "2", "3", "4", "5", "6", "7", "8"].map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-0.5">
              Threshold
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
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Overall Attendance Rate"
          value={overview ? `${overview.mean_attendance_pct}%` : "Loading..."}
          trend={{ value: overview ? `${overview.total_marked_records} records` : "", positive: true }}
          icon="📊"
        />
        <StatCard
          title={`Defaulter Audit (<${threshold}%)`}
          value={defaulters ? `${defaulters.length} Students` : "Loading..."}
          trend={{ value: defaulters.length > 0 ? "Flagged" : "Clear", positive: defaulters.length === 0 }}
          icon="⚠️"
        />
        <StatCard
          title="Total Sessions Conducted"
          value={overview ? `${overview.total_sessions} Sessions` : "Loading..."}
          icon="📝"
        />
      </div>

      {/* Main Table */}
      <div className="solid-card rounded-2xl p-5 border border-border space-y-4">
        <h3 className="text-base font-extrabold text-foreground border-b border-border pb-3">
          Institute Academic Audit — Defaulter Roster ({defaulters.length})
        </h3>

        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
            Loading administrative audit...
          </div>
        ) : defaulters.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-xl">
            <div className="text-2xl">🎉</div>
            <h4 className="text-sm font-bold text-foreground">No Defaulter Records</h4>
            <p className="text-xs text-muted-foreground">All students meet the selected {threshold}% requirement.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] font-extrabold uppercase text-muted-foreground">
                  <th className="py-3 px-3">Registration No</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Semester</th>
                  <th className="py-3 px-3">Classes Attended</th>
                  <th className="py-3 px-3">Attendance Rate</th>
                  <th className="py-3 px-3">Risk Tier</th>
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
                      <Badge variant="error">⚠️ Low Attendance (&lt;{threshold}%)</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
