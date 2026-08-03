"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { exportToCSV, exportToPDF, ReportColumn, BannerItem } from "@/lib/reportExporter";
import { AcademicTermSwitcher } from "@/components/ui/AcademicTermSwitcher";
import { TermMode, getSavedTermMode, getSemesterSelectOptions } from "@/lib/academicTerm";

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
  notice_status?: string;
  contact_number?: string;
  guardian_email?: string;
}

interface AssignedSubjectInfo {
  subject_code: string;
  subject_name: string;
  department: string;
  semester: string;
  sessions_conducted: number;
  target_sessions: number;
  avg_attendance_pct: number;
}

interface FacultyWorkload {
  faculty_id: string;
  faculty_name: string;
  designation: string;
  department: string;
  email: string;
  assigned_subjects_count: number;
  assigned_subjects?: AssignedSubjectInfo[];
  total_classes_conducted: number;
  target_sessions?: number;
  completion_pct?: number;
  avg_class_attendance_pct: number;
}

export default function AdminReportsPage() {
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<"defaulters" | "workload" | "analytics">("defaulters");

  // Global Filter Toolbar States
  const [department, setDepartment] = useState("CS");
  const [termMode, setTermMode] = useState<TermMode>("odd");
  const [semester, setSemester] = useState("all");

  useEffect(() => {
    setTermMode(getSavedTermMode());
  }, []);
  const [threshold, setThreshold] = useState<number>(75.0);
  const [duration, setDuration] = useState<string>("semester");
  const [searchTerm, setSearchTerm] = useState("");

  // Data Array States
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [defaulters, setDefaulters] = useState<DefaulterStudent[]>([]);
  const [workload, setWorkload] = useState<FacultyWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  // Dispatch Warnings State
  const [dispatching, setDispatching] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Expandable Row State for Faculty Workload
  const [expandedFaculty, setExpandedFaculty] = useState<Set<string>>(new Set());

  const toggleFacultyExpand = (id: string) => {
    setExpandedFaculty((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        ...(department ? { department } : {}),
        ...(semester !== "all" ? { semester } : {}),
        ...(duration !== "semester" ? { duration } : {}),
      });

      const [ovRes, defRes, workRes] = await Promise.all([
        apiFetch(`/reports/overview?${queryParams.toString()}`),
        apiFetch(`/reports/defaulters?${queryParams.toString()}&threshold=${threshold}`),
        apiFetch(`/reports/workload?${queryParams.toString()}`),
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
      // Silent catch fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [department, semester, threshold, duration]);

  // Dispatch Attendance Warning Notifications
  const handleDispatchWarnings = async () => {
    if (defaulters.length === 0) return;
    const regNos = defaulters.map((d) => d.registration_no);
    setDispatching(true);
    setToastMsg(null);

    try {
      const res = await apiFetch("/reports/dispatch-warnings", {
        method: "POST",
        body: JSON.stringify({
          registration_numbers: regNos,
          threshold: threshold,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setToastMsg({
          text: `✅ Dispatched warning protocols to ${data.dispatched_count} student accounts.`,
          type: "success",
        });
        fetchReportsData();
      } else {
        setToastMsg({ text: "Failed to dispatch warning notices.", type: "error" });
      }
    } catch (err) {
      setToastMsg({ text: "Network error dispatching warnings.", type: "error" });
    } finally {
      setDispatching(false);
      setTimeout(() => setToastMsg(null), 5000);
    }
  };

  // Filtered Datasets based on Search Term
  const filteredDefaulters = defaulters.filter((st) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      st.registration_no.toLowerCase().includes(term) ||
      st.student_name.toLowerCase().includes(term) ||
      st.email.toLowerCase().includes(term)
    );
  });

  const filteredWorkload = workload.filter((fac) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      fac.faculty_id.toLowerCase().includes(term) ||
      fac.faculty_name.toLowerCase().includes(term) ||
      fac.email.toLowerCase().includes(term) ||
      fac.designation.toLowerCase().includes(term)
    );
  });

  // Export Columns Configuration
  const defaulterColumns: ReportColumn[] = [
    { key: "registration_no", label: "Registration No", align: "left" },
    { key: "student_name", label: "Student Name", align: "left" },
    { key: "department", label: "Department", align: "center" },
    { key: "semester", label: "Semester", align: "center" },
    { key: "attended_classes", label: "Attended Classes", align: "center" },
    { key: "total_classes", label: "Total Classes", align: "center" },
    { key: "attendance_pct", label: "Attendance Rate (%)", align: "center" },
    { key: "notice_status", label: "Notice Status", align: "center" },
    { key: "email", label: "Email", align: "left" },
  ];

  const workloadColumns: ReportColumn[] = [
    { key: "faculty_id", label: "Faculty ID", align: "center" },
    { key: "faculty_name", label: "Faculty Name", align: "left" },
    { key: "designation", label: "Designation", align: "left" },
    { key: "department", label: "Department", align: "center" },
    { key: "assigned_subjects_count", label: "Assigned Subjects", align: "center" },
    { key: "total_classes_conducted", label: "Classes Conducted", align: "center" },
    { key: "completion_pct", label: "Completion Rate (%)", align: "center" },
    { key: "avg_class_attendance_pct", label: "Avg Attendance Rate (%)", align: "center" },
    { key: "email", label: "Email", align: "left" },
  ];

  // Export Trigger Handlers
  const handleExportCSV = () => {
    if (activeTab === "defaulters") {
      exportToCSV(`Admin_Academic_Defaulters_${department}_(${threshold}pct).csv`, defaulterColumns, filteredDefaulters);
    } else if (activeTab === "workload") {
      exportToCSV(`Admin_Faculty_Workload_Audit_${department}.csv`, workloadColumns, filteredWorkload);
    } else {
      exportToCSV(`Admin_Academic_Defaulters_${department}_(${threshold}pct).csv`, defaulterColumns, filteredDefaulters);
    }
  };

  const handleExportPDF = () => {
    const timelineLabel =
      duration === "semester"
        ? "Entire Semester"
        : duration === "month"
        ? "Last 30 Days"
        : duration === "week"
        ? "Last 7 Days"
        : "Today Only";

    const semLabel = semester === "all" ? "All Semesters" : `Semester ${semester}`;

    const deptLabel =
      department === "CS"
        ? "Computer Science (CS)"
        : department === "IT"
        ? "Information Tech (IT)"
        : department === "ECE"
        ? "Electronics (ECE)"
        : department === "EE"
        ? "Electrical (EE)"
        : department === "ME"
        ? "Mechanical (ME)"
        : department;

    if (activeTab === "defaulters") {
      const bannerItems: BannerItem[] = [
        { label: "Issuing Authority:", value: "System Administration" },
        { label: "Report Type:", value: "Defaulters Academic Shortfall Audit" },
        { label: "Target Department:", value: deptLabel },
        { label: "Semester Cohort:", value: semLabel },
        { label: "Timeline / Horizon:", value: timelineLabel },
        { label: "Attendance Cutoff:", value: `Below ${threshold}%` },
        { label: "Total Defaulters:", value: `${filteredDefaulters.length}` },
      ];
      if (searchTerm.trim()) {
        bannerItems.push({ label: "Active Search Filter:", value: `"${searchTerm.trim()}"` });
      }

      exportToPDF(
        "Institute-Wide Defaulter Academic Audit",
        bannerItems,
        defaulterColumns,
        filteredDefaulters,
        undefined,
        undefined,
        "portrait"
      );
    } else if (activeTab === "workload") {
      const bannerItems: BannerItem[] = [
        { label: "Issuing Authority:", value: "System Administration" },
        { label: "Report Type:", value: "Faculty Workload & Teaching Audit" },
        { label: "Target Department:", value: deptLabel },
        { label: "Semester Cohort:", value: semLabel },
        { label: "Timeline / Horizon:", value: timelineLabel },
        { label: "Total Faculty Records:", value: `${filteredWorkload.length}` },
      ];
      if (searchTerm.trim()) {
        bannerItems.push({ label: "Active Search Filter:", value: `"${searchTerm.trim()}"` });
      }

      exportToPDF(
        "Faculty Workload & Teaching Audit Report",
        bannerItems,
        workloadColumns,
        filteredWorkload,
        undefined,
        undefined,
        "portrait"
      );
    } else {
      const bannerItems: BannerItem[] = [
        { label: "Issuing Authority:", value: "System Administration" },
        { label: "Report Type:", value: "Administrative Analytics Summary" },
        { label: "Target Department:", value: deptLabel },
        { label: "Semester Cohort:", value: semLabel },
        { label: "Timeline / Horizon:", value: timelineLabel },
        { label: "Active Enrolled Students:", value: `${overview?.total_active_students || 0}` },
        { label: "Total Conducted Sessions:", value: `${overview?.total_sessions || 0}` },
      ];
      if (searchTerm.trim()) {
        bannerItems.push({ label: "Active Search Filter:", value: `"${searchTerm.trim()}"` });
      }

      exportToPDF(
        "Institute Academic Summary Audit",
        bannerItems,
        defaulterColumns,
        filteredDefaulters,
        undefined,
        undefined,
        "portrait"
      );
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Compliance Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <span>🏛️ Administrative Intelligence & Audit Suite</span>
            </h1>
            <Badge variant="primary">Institute Executive Telemetry</Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Academic shortfall auditing, faculty teaching workload evaluation, session volume tracking, and compliance exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchReportsData}
            className="rounded-xl border border-border bg-card hover:bg-muted text-foreground px-3.5 py-2 text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
          >
            <span>🔄 Refresh Data</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
          >
            <span>📥 Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
          >
            <span>📄 Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Dispatch Toast Notification Banner */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between shadow-xs ${toastMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
            }`}
        >
          <span>{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)} className="opacity-70 hover:opacity-100 font-black">
            ✕
          </button>
        </div>
      )}

      {/* Global Seamless Filter Toolbar */}
      <div className="solid-card rounded-2xl p-4 sm:p-5 border border-border bg-card space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/70 pb-3 gap-2">
          <span className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span>🔍 Global Report Controls & Pivots</span>
          </span>
          <AcademicTermSwitcher currentMode={termMode} onModeChange={(mode) => setTermMode(mode)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Filter 1: Department */}
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-1">
              🏢 Department Filter
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="CS">Computer Science (CS)</option>
            </select>
          </div>

          {/* Filter 2: Semester */}
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-1">
              🎓 Semester Cohort
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {getSemesterSelectOptions(termMode, true).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Shortfall Threshold Cutoff */}
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-1">
              ⚠️ Attendance Threshold
            </label>
            <select
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value={75.0}>Below 75% (Mandatory Cutoff)</option>
              <option value={60.0}>Below 60% (Moderate Shortfall)</option>
              <option value={50.0}>Below 50% (Critical Risk)</option>
            </select>
          </div>

          {/* Filter 4: Duration Horizon */}
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-1">
              📅 Time Horizon
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="semester">Entire Semester</option>
              <option value="month">Last 30 Days</option>
              <option value="week">Last 7 Days</option>
              <option value="today">Today Only</option>
            </select>
          </div>

          {/* Filter 5: Quick Text Search */}
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-1">
              🔎 Search Record
            </label>
            <input
              type="text"
              placeholder="Search name, ID, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>

      {/* Top Executive Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Overall Attendance Rate"
          value={overview ? `${overview.mean_attendance_pct}%` : "Loading..."}
          trend={{ value: overview ? `${overview.total_marked_records} records` : "", positive: true }}
          icon="📊"
        />
        <StatCard
          title={`Defaulter Students (<${threshold}%)`}
          value={defaulters ? `${defaulters.length} Students` : "Loading..."}
          trend={{ value: defaulters.length > 0 ? "Shortfall Flagged" : "Compliant", positive: defaulters.length === 0 }}
          icon="⚠️"
        />
        <StatCard
          title="Total Sessions Conducted"
          value={overview ? `${overview.total_sessions} Sessions` : "Loading..."}
          trend={{ value: overview ? `${overview.weekly_classes} this week` : "", positive: true }}
          icon="📝"
        />
      </div>

      {/* Multi-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("defaulters")}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all border ${activeTab === "defaulters"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-card hover:bg-muted text-muted-foreground border-border"
              }`}
          >
            <span>⚠️ Academic Defaulters Audit ({filteredDefaulters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("workload")}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all border ${activeTab === "workload"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-card hover:bg-muted text-muted-foreground border-border"
              }`}
          >
            <span>👨‍🏫 Faculty Workload & Delivery ({filteredWorkload.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all border ${activeTab === "analytics"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-card hover:bg-muted text-muted-foreground border-border"
              }`}
          >
            <span>📊 Academic Volume & Analytics</span>
          </button>
        </div>

        {/* Forensic Security Telemetry Shortcut */}
        <Link
          href="/admin/audit-logs"
          className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          <span>🛡️ View System Telemetry Audit Matrix →</span>
        </Link>
      </div>

      {/* TAB 1: ACADEMIC SHORTFALL & DEFAULTER AUDIT */}
      {activeTab === "defaulters" && (
        <div className="solid-card rounded-2xl p-5 border border-border bg-card space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <span>⚠️ Defaulter Roster Audit (&lt;{threshold}%)</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Students falling below mandatory attendance thresholds requiring academic warning dispatch.
              </p>
            </div>

            {filteredDefaulters.length > 0 && (
              <button
                type="button"
                onClick={handleDispatchWarnings}
                disabled={dispatching}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
              >
                <span>{dispatching ? "⏳ Dispatching..." : "🚀 Dispatch Warning Notifications"}</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
              Parsing academic shortfall audit telemetry...
            </div>
          ) : filteredDefaulters.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-border rounded-xl space-y-2">
              <div className="text-3xl">🎉</div>
              <h4 className="text-sm font-bold text-foreground">No Defaulter Records Found</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                All enrolled students in {department} (Semester {semester}) comply with the required {threshold}% threshold.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 border-b border-border font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Registration No</th>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Semester</th>
                    <th className="py-3 px-3">Attended / Total</th>
                    <th className="py-3 px-3">Attendance Rate</th>
                    <th className="py-3 px-3">Warning Notice</th>
                    <th className="py-3 px-3">Risk Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredDefaulters.map((st) => (
                    <tr key={st.registration_no} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                        {st.registration_no}
                      </td>
                      <td className="py-3 px-3 font-bold text-foreground">
                        <div>{st.student_name}</div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="muted">Sem {st.semester}</Badge>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        {st.attended_classes} / {st.total_classes}
                      </td>
                      <td className="py-3 px-3 font-mono font-extrabold">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs ${st.attendance_pct < 40
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                              : st.attendance_pct < 60
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                            }`}
                        >
                          {st.attendance_pct}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={st.notice_status === "Sent" ? "success" : "warning"}>
                          {st.notice_status === "Sent" ? "✓ Notice Dispatched" : "⏳ Pending Dispatch"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={st.risk_tier === "critical" ? "error" : "warning"}>
                          {st.risk_tier === "critical" ? "🔴 Severe Shortfall" : "🟠 Moderate Shortfall"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FACULTY WORKLOAD & TEACHING DELIVERY AUDIT */}
      {activeTab === "workload" && (
        <div className="solid-card rounded-2xl p-5 border border-border bg-card space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <span>👨‍🏫 Faculty Workload & Delivery Audit</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Monitoring assigned course subjects, sessions conducted, target completion rates, and average class attendance.
              </p>
            </div>

            <Badge variant="primary">{filteredWorkload.length} Active Faculty Members</Badge>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
              Calculating teaching workload matrix...
            </div>
          ) : filteredWorkload.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-border rounded-xl">
              <h4 className="text-sm font-bold text-foreground">No Faculty Workload Records Found</h4>
              <p className="text-xs text-muted-foreground">No faculty assignments matching current department filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 border-b border-border font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-8"></th>
                    <th className="py-3 px-3">Faculty ID & Name</th>
                    <th className="py-3 px-3">Designation</th>
                    <th className="py-3 px-3">Assigned Subjects</th>
                    <th className="py-3 px-3">Sessions Conducted</th>
                    <th className="py-3 px-3">Target Completion</th>
                    <th className="py-3 px-3">Avg Class Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredWorkload.map((fac) => {
                    const isExpanded = expandedFaculty.has(fac.faculty_id);
                    const targetSessions = fac.target_sessions || Math.max(fac.assigned_subjects_count * 24, 24);
                    const completionPct = fac.completion_pct || Math.round((fac.total_classes_conducted / targetSessions) * 100);

                    return (
                      <React.Fragment key={fac.faculty_id}>
                        <tr
                          onClick={() => toggleFacultyExpand(fac.faculty_id)}
                          className="cursor-pointer hover:bg-muted/40 transition-colors"
                        >
                          <td className="py-3 px-3 text-center text-muted-foreground font-bold">
                            {fac.assigned_subjects && fac.assigned_subjects.length > 0 ? (isExpanded ? "▼" : "▶") : "•"}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-extrabold text-foreground">{fac.faculty_name}</div>
                            <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                              {fac.faculty_id} • {fac.email}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-muted-foreground">{fac.designation}</td>
                          <td className="py-3 px-3">
                            <Badge variant="primary">{fac.assigned_subjects_count} Subjects</Badge>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-foreground">
                            {fac.total_classes_conducted} / {targetSessions} Sessions
                          </td>
                          <td className="py-3 px-3">
                            <div className="w-32 space-y-1">
                              <div className="flex justify-between text-[10px] font-mono font-bold">
                                <span>{completionPct}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${completionPct >= 75
                                      ? "bg-emerald-500"
                                      : completionPct >= 40
                                        ? "bg-amber-500"
                                        : "bg-rose-500"
                                    }`}
                                  style={{ width: `${Math.min(100, completionPct)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono font-extrabold">
                            <span
                              className={`px-2 py-0.5 rounded-md text-xs ${fac.avg_class_attendance_pct >= 75
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : fac.avg_class_attendance_pct >= 60
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                }`}
                            >
                              {fac.avg_class_attendance_pct}%
                            </span>
                          </td>
                        </tr>

                        {/* Expandable Sub-Drawer for Assigned Subjects */}
                        {isExpanded && fac.assigned_subjects && fac.assigned_subjects.length > 0 && (
                          <tr className="bg-muted/20">
                            <td colSpan={7} className="p-4">
                              <div className="bg-card rounded-xl border border-border p-3.5 space-y-2 shadow-xs">
                                <span className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
                                  📚 Course Subject Teaching Breakdown for {fac.faculty_name}
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {fac.assigned_subjects.map((sub, sIdx) => (
                                    <div
                                      key={sIdx}
                                      className="p-2.5 rounded-lg border border-border bg-background space-y-1 text-xs"
                                    >
                                      <div className="flex justify-between font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                        <span>{sub.subject_code}</span>
                                        <span>Sem {sub.semester}</span>
                                      </div>
                                      <div className="font-bold text-foreground truncate">{sub.subject_name}</div>
                                      <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                                        <span>Sessions: {sub.sessions_conducted}</span>
                                        <span className="font-mono font-bold text-foreground">
                                          Avg {sub.avg_attendance_pct}%
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACADEMIC VOLUME & VOLUME ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="solid-card rounded-2xl p-4 border border-border bg-card space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">
                👥 Total Active Enrolled
              </span>
              <span className="text-2xl font-black text-foreground font-mono">
                {overview ? overview.total_active_students : "-"} Students
              </span>
              <span className="text-[11px] text-muted-foreground block">Across {department} Department</span>
            </div>

            <div className="solid-card rounded-2xl p-4 border border-border bg-card space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">
                📝 Total Sessions Conducted
              </span>
              <span className="text-2xl font-black text-foreground font-mono">
                {overview ? overview.total_sessions : "-"} Classes
              </span>
              <span className="text-[11px] text-muted-foreground block">Recorded in system DB</span>
            </div>

            <div className="solid-card rounded-2xl p-4 border border-border bg-card space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">
                📅 Recent Weekly Sessions
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {overview ? overview.weekly_classes : "-"} Sessions
              </span>
              <span className="text-[11px] text-muted-foreground block">Conducted last 7 days</span>
            </div>

            <div className="solid-card rounded-2xl p-4 border border-border bg-card space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">
                📊 Attendance Token Count
              </span>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {overview ? overview.total_marked_records : "-"} Records
              </span>
              <span className="text-[11px] text-muted-foreground block">Individual attendance marks</span>
            </div>
          </div>

          {/* Forensic Telemetry Quick Banner */}
          <div className="solid-card rounded-2xl p-6 border border-border bg-gradient-to-r from-indigo-500/10 via-card to-card flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <span>🛡️ Forensic System Telemetry & Audit Logs</span>
              </h3>
              <p className="text-xs text-muted-foreground max-w-xl">
                Inspect raw user agent headers, IP address telemetry, payload differential states, and security modification logs.
              </p>
            </div>

            <Link
              href="/admin/audit-logs"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs shrink-0"
            >
              Open Audit Telemetry Matrix →
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
