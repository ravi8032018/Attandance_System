"use client";

import React, { useState, useEffect } from "react";
import { useUserMe } from "@/hooks/useUserMe";
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
  contact_number?: string;
  guardian_email?: string;
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

export default function HODReportsPage() {
  const { user } = useUserMe();
  const department = user?.department || "CS";

  const [semester, setSemester] = useState("all");
  const [threshold, setThreshold] = useState<number>(75.0);
  const [activeTab, setActiveTab] = useState<"defaulters" | "workload" | "subjects">("defaulters");

  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [defaulters, setDefaulters] = useState<DefaulterStudent[]>([]);
  const [workload, setWorkload] = useState<FacultyWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReportsData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          department,
          ...(semester !== "all" ? { semester } : {}),
        });

        const [ovRes, defRes, workRes] = await Promise.all([
          apiFetch(`/reports/overview?${queryParams.toString()}`),
          apiFetch(`/reports/defaulters?${queryParams.toString()}&threshold=${threshold}`),
          apiFetch(`/reports/workload?department=${encodeURIComponent(department)}`),
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

    loadReportsData();
  }, [department, semester, threshold]);

  // Export handlers
  const defaulterColumns: ReportColumn[] = [
    { key: "registration_no", label: "Registration No" },
    { key: "student_name", label: "Student Name" },
    { key: "semester", label: "Sem" },
    { key: "department", label: "Dept" },
    { key: "attended_classes", label: "Attended Classes" },
    { key: "total_classes", label: "Total Classes" },
    { key: "attendance_pct", label: "Attendance %" },
    { key: "email", label: "Student Email" },
    { key: "guardian_email", label: "Guardian Email" },
  ];

  const workloadColumns: ReportColumn[] = [
    { key: "faculty_id", label: "Faculty ID", align: "center" },
    { key: "faculty_name", label: "Faculty Name", align: "left" },
    { key: "designation", label: "Designation", align: "left" },
    { key: "assigned_subjects_count", label: "Assigned Subjects Count", align: "center" },
    { key: "total_classes_conducted", label: "Classes Conducted", align: "center" },
    { key: "avg_class_attendance_pct", label: "Avg Attendance Rate (%)", align: "center" },
    { key: "email", label: "Email", align: "left" },
  ];

  function handleExportDefaultersCSV() {
    exportToCSV(`Defaulter_Students_${department}_Sem_${semester}_(${threshold}pct).csv`, defaulterColumns, defaulters);
  }

  function handleExportDefaultersPDF() {
    const reportTitle = "Attendance Shortfall Report";
    const thresholdValue = `${threshold}%`;
    exportToPDF(
      reportTitle,
      thresholdValue,
      department,
      semester,
      defaulterColumns,
      defaulters
    );
  }

  function handleExportWorkloadCSV() {
    exportToCSV(`Faculty_Workload_Summary_${department}.csv`, workloadColumns, workload);
  }

  function handleExportWorkloadPDF() {
    exportToPDF(
      `Faculty Workload & Teaching Summary`,
      [
        { label: "Report Type:", value: "Faculty Workload & Teaching Summary" },
        { label: "Department:", value: department },
        { label: "Active Faculty:", value: `${workload.length}` },
        { label: "Total Records:", value: `${workload.length}` },
      ],
      workloadColumns,
      workload
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <span>📊 Reports & Analytics Console</span>
            <Badge variant="primary" className="text-xs uppercase">{department} Dept</Badge>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Department-wide academic statistics, threshold flags, faculty workload allocation, and real-time CSV/PDF report generators.
          </p>
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-muted p-2 rounded-2xl border border-border">
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
              Warning Cutoff
            </label>
            <select
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="h-9 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value={75.0}>Below 75% (Mandatory)</option>
              <option value={60.0}>Below 60% (Moderate Risk)</option>
              <option value={50.0}>Below 50% (Severe Risk)</option>
              <option value={40.0}>Below 40% (Critical)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Real Live Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Department Mean Attendance"
          value={overview ? `${overview.mean_attendance_pct}%` : "Loading..."}
          trend={{ value: overview ? `${overview.total_marked_records} marked records` : "Live DB", positive: true }}
          icon="📊"
        />
        <StatCard
          title={`Defaulter Students (<${threshold}%)`}
          value={overview ? `${defaulters.length} Students` : "Loading..."}
          trend={{ value: defaulters.length > 0 ? "Action Needed" : "Healthy Roster", positive: defaulters.length === 0 }}
          icon="⚠️"
        />
        <StatCard
          title="Total Sessions Conducted"
          value={overview ? `${overview.total_sessions} Sessions` : "Loading..."}
          trend={{ value: overview ? `${overview.weekly_classes} this week` : "", positive: true }}
          icon="📝"
        />
      </div>

      {/* Tab Switcher & Export Controls */}
      <div className="solid-card rounded-2xl p-5 border border-border space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("defaulters")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "defaulters"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Defaulter Warning List ({defaulters.length})
            </button>
            <button
              onClick={() => setActiveTab("workload")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "workload"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Faculty Workload & Performance ({workload.length})
            </button>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {activeTab === "defaulters" ? (
              <>
                <button
                  type="button"
                  onClick={handleExportDefaultersCSV}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold transition-all active:scale-95 shadow-xs"
                >
                  <span>📥 Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportDefaultersPDF}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-bold transition-all active:scale-95 shadow-xs"
                >
                  <span>📄 Print / PDF</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleExportWorkloadCSV}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold transition-all active:scale-95 shadow-xs"
                >
                  <span>📥 Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportWorkloadPDF}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-bold transition-all active:scale-95 shadow-xs"
                >
                  <span>📄 Print / PDF</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
            Fetching analytics data from database...
          </div>
        ) : activeTab === "defaulters" ? (
          /* Defaulters Roster Table */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-md font-extrabold text-foreground">
                  Students Below {threshold}% Attendance Threshold ({defaulters.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Flagged students requiring academic warning or attendance intervention.
                </p>
              </div>
            </div>

            {defaulters.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl space-y-1">
                <div className="text-2xl">🎉</div>
                <h4 className="text-sm font-bold text-foreground">No Defaulters Found</h4>
                <p className="text-xs text-muted-foreground">
                  All active students are meeting or exceeding the {threshold}% attendance requirement!
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
                      <th className="py-3 px-3">Classes Attended</th>
                      <th className="py-3 px-3">Attendance Rate</th>
                      <th className="py-3 px-3">Risk Tier</th>
                      <th className="py-3 px-3">Contact</th>
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
                        <td className={`py-3 px-3 text-sm font-mono font-bold ${st.attendance_pct < 40
                          ? "text-rose-600 dark:text-rose-400"
                          : st.attendance_pct < 75
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                          }`}>
                          {st.attendance_pct}%
                        </td>
                        <td className="py-3 px-3">
                          {st.risk_tier === "critical" ? (
                            <Badge variant="error">🚨 Critical (&lt;40%)</Badge>
                          ) : (
                            <Badge variant="warning">⚠️ Warning (&lt;75%)</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-[12px] flex items-center justify-center">
                          <a
                            href={`mailto:${st.email}`}
                            className="text-foreground dark:text-foreground hover:underline flex items-center gap-1"
                            title={`Send email to ${st.student_name}`}
                          >
                            {st.email}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Faculty Workload Table */
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-foreground">
                Faculty Workload & Teaching Performance Summary ({workload.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Subject allocation counts, total classes conducted, and average student attendance rates.
              </p>
            </div>

            {workload.length === 0 ? (
              <p className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No active faculty records found for this department.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-extrabold uppercase text-muted-foreground">
                      <th className="py-3 px-3">Faculty ID</th>
                      <th className="py-3 px-3">Faculty Name</th>
                      <th className="py-3 px-3">Designation</th>
                      <th className="py-3 px-3">Assigned Subjects</th>
                      <th className="py-3 px-3">Classes Held</th>
                      <th className="py-3 px-3">Avg Class Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {workload.map((fac) => (
                      <tr key={fac.faculty_id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {fac.faculty_id}
                        </td>
                        <td className="py-3 px-3 font-bold text-foreground">
                          {fac.faculty_name}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground font-medium">
                          {fac.designation}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
                            {fac.assigned_subjects_count} Subjects
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">
                          {fac.total_classes_conducted} Sessions
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {fac.avg_class_attendance_pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
