"use client";

import React, { useState, useEffect } from "react";
import { useUserMe } from "@/hooks/useUserMe";
import { useAvailableSubjects } from "@/hooks/useAvailableSubjects";
import { apiFetch } from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { exportToCSV, exportToPDF, ReportColumn } from "@/lib/reportExporter";

interface ReportsOverview {
  department: string;
  semester: string;
  subject_code: string;
  duration: string;
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
  notice_status?: "Pending" | "Sent" | "Acknowledged";
  contact_number?: string;
  guardian_email?: string;
}

interface AssignedSubjectDetail {
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
  assigned_subjects: AssignedSubjectDetail[];
  total_classes_conducted: number;
  target_sessions: number;
  completion_pct: number;
  avg_class_attendance_pct: number;
}

export default function HODReportsPage() {
  const { user } = useUserMe();
  const department = user?.department || "CS";

  // Phase 1: Universal Subject & Semester Selectors
  const [semester, setSemester] = useState("all");
  const [subjectCode, setSubjectCode] = useState("all");

  // Phase 2 & 3: DURATION Chronological Vectors & Warning Cutoff in Defaulters Tab
  const [duration, setDuration] = useState("semester");
  const [threshold, setThreshold] = useState<number>(75.0);
  const [activeTab, setActiveTab] = useState<"defaulters" | "workload">("defaulters");

  // Dynamic Subject Pool for the selected Semester & Department
  const { availableSubjects, availableLoading } = useAvailableSubjects({
    semester: semester === "all" ? "1" : semester, // Load pool based on department/semester
    department,
  });

  // Data State
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [defaulters, setDefaulters] = useState<DefaulterStudent[]>([]);
  const [workload, setWorkload] = useState<FacultyWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  // Phase 3 State: Kinetic Warning Protocol Dispatches
  const [noticeStatuses, setNoticeStatuses] = useState<Record<string, "Pending" | "Sent" | "Acknowledged">>({});
  const [dispatchAlert, setDispatchAlert] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);

  // Phase 4 State: Collapsible Cargo Bays for Faculty Workload
  const [expandedFacultyId, setExpandedFacultyId] = useState<string | null>(null);

  useEffect(() => {
    async function loadReportsData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          department,
          duration,
          ...(semester !== "all" ? { semester } : {}),
          ...(subjectCode !== "all" ? { subject_code: subjectCode } : {}),
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
          const defItems: DefaulterStudent[] = defData?.data || [];
          setDefaulters(defItems);

          // Initialize notice statuses if not set
          setNoticeStatuses((prev) => {
            const updated = { ...prev };
            defItems.forEach((st) => {
              if (!updated[st.registration_no]) {
                updated[st.registration_no] = (st.notice_status as any) || "Pending";
              }
            });
            return updated;
          });
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
  }, [department, semester, subjectCode, threshold, duration]);

  // Phase 3 Kinetic Action: Real API Dispatch of Warning Notices
  async function handleLaunchWarningProtocols() {
    const targetRegNos = defaulters.map((st) => st.registration_no);
    if (targetRegNos.length === 0) return;

    setIsDispatching(true);
    try {
      const res = await apiFetch("/reports/dispatch-warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_numbers: targetRegNos,
          threshold: threshold,
        }),
      });

      if (res.ok) {
        setNoticeStatuses((prev) => {
          const updated = { ...prev };
          targetRegNos.forEach((reg) => {
            updated[reg] = "Sent";
          });
          return updated;
        });
        setDispatchAlert(
          `🚀 Warning Protocols Dispatched! Official attendance shortfall notifications sent to ${targetRegNos.length} student units & saved to database.`
        );
      } else {
        setDispatchAlert("⚠️ Failed to dispatch warning notices. Please try again.");
      }
    } catch (e) {
      setDispatchAlert("⚠️ Network error while dispatching warning protocols.");
    } finally {
      setIsDispatching(false);
      setTimeout(() => setDispatchAlert(null), 6000);
    }
  }

  async function handleSingleDispatch(regNo: string, studentName: string) {
    try {
      const res = await apiFetch("/reports/dispatch-warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_numbers: [regNo],
          threshold: threshold,
        }),
      });

      if (res.ok) {
        setNoticeStatuses((prev) => ({ ...prev, [regNo]: "Sent" }));
        setDispatchAlert(`✉️ Attendance warning notice dispatched to ${studentName} (${regNo}) & saved to notifications.`);
      }
    } catch (e) {
      // Silent catch
    }
    setTimeout(() => setDispatchAlert(null), 4000);
  }

  // Phase 4 Cargo Bay Toggle
  function toggleFacultyExpand(facId: string) {
    setExpandedFacultyId((prev) => (prev === facId ? null : facId));
  }

  // Export Columns Configuration
  const defaulterColumns: ReportColumn[] = [
    { key: "registration_no", label: "Registration No", align: "center" },
    { key: "student_name", label: "Student Name", align: "left" },
    { key: "semester", label: "Sem", align: "center" },
    { key: "attended_classes", label: "Attended Classes", align: "center" },
    { key: "total_classes", label: "Total Classes", align: "center" },
    { key: "attendance_pct", label: "Attendance %", align: "center" },
    { key: "email", label: "Student Email", align: "left" },
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
    exportToPDF(
      "Attendance Shortfall Report",
      `${threshold}%`,
      department,
      semester === "all" ? "All Semesters" : `Semester ${semester}`,
      defaulterColumns,
      defaulters,
      "portrait"
    );
  }

  function handleExportWorkloadCSV() {
    exportToCSV(`Faculty_Workload_Summary_${department}.csv`, workloadColumns, workload);
  }

  function handleExportWorkloadPDF() {
    exportToPDF(
      "Faculty Workload & Teaching Summary",
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

  const pendingNoticesCount = defaulters.filter((d) => noticeStatuses[d.registration_no] !== "Sent").length;

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header & Global Command Modules */}
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

        {/* Phase 1: Global Header Array (SUBJECT & SEMESTER Selectors) */}
        <div className="flex flex-wrap items-center gap-3 bg-muted/80 p-2 rounded-2xl border border-border">
          {/* SEMESTER Selector */}
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-0.5 pl-1">
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                setSubjectCode("all");
              }}
              className="h-9 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Semesters</option>
              {["1", "2", "3", "4", "5", "6", "7", "8"].map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          {/* SUBJECT Selector (Installed in Global Header) */}
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-0.5 pl-1">
              Subject
            </label>
            <select
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              disabled={availableLoading}
              className="h-9 max-w-[220px] truncate rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
            >
              <option value="all">All Subjects</option>
              {availableSubjects.map((sub) => (
                <option key={sub.subject_code} value={sub.subject_code}>
                  {sub.subject_code} - {sub.subject_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Kinetic Action Alert Banner */}
      {dispatchAlert && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <span>{dispatchAlert}</span>
          </div>
          <button
            onClick={() => setDispatchAlert(null)}
            className="text-muted-foreground hover:text-foreground font-black text-sm"
          >
            ✕
          </button>
        </div>
      )}

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
          trend={{ value: defaulters.length > 0 ? `${pendingNoticesCount} Pending Warning` : "Healthy Roster", positive: defaulters.length === 0 }}
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
      <div className="solid-card rounded-2xl p-5 border border-border space-y-6">
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

          {/* Export & Kinetic Escalation Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {activeTab === "defaulters" ? (
              <>
                <button
                  type="button"
                  onClick={handleLaunchWarningProtocols}
                  disabled={defaulters.length === 0 || isDispatching}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 text-xs font-bold transition-all active:scale-95 shadow-xs disabled:opacity-50"
                  title="Dispatch automated attendance shortfall warning notices"
                >
                  <span>✉️ Launch Warning Protocols ({defaulters.length})</span>
                </button>
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
            Fetching analytics telemetry from database...
          </div>
        ) : activeTab === "defaulters" ? (
          /* Defaulters Roster Table */
          <div className="space-y-4">
            {/* Phase 3: Relocated & Cloaked Controls (DURATION & WARNING CUTOFF inside Defaulters Enclosure) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-3">
              <div>
                <h3 className="text-md font-extrabold text-foreground">
                  Students Below {threshold}% Attendance Threshold ({defaulters.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Flagged students requiring academic warning or attendance intervention.
                </p>
              </div>

              {/* Anchored Filters (DURATION & WARNING CUTOFF) */}
              <div className="flex flex-wrap items-center gap-3 bg-muted/60 p-2 rounded-2xl border border-border self-start sm:self-auto">
                {/* DURATION Selector (5 Chronological Vectors) */}
                <div>
                  <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-0.5 pl-1">
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="semester">This Semester</option>
                  </select>
                </div>

                {/* WARNING CUTOFF Selector */}
                <div>
                  <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-0.5 pl-1">
                    Warning Cutoff
                  </label>
                  <select
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value={75.0}>Below 75% (Mandatory)</option>
                    <option value={60.0}>Below 60% (Moderate Risk)</option>
                    <option value={50.0}>Below 50% (Severe Risk)</option>
                    <option value={40.0}>Below 40% (Critical)</option>
                  </select>
                </div>
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
                      <th className="py-3 px-3">Notice Status</th>
                      <th className="py-3 px-3">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {defaulters.map((st) => {
                      const status = noticeStatuses[st.registration_no] || st.notice_status || "Pending";
                      return (
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
                          <td
                            className={`py-3 px-3 text-sm font-mono font-bold ${st.attendance_pct < 40
                              ? "text-rose-600 dark:text-rose-400"
                              : st.attendance_pct < 75
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                              }`}
                          >
                            {st.attendance_pct}%
                          </td>
                          <td className="py-3 px-3">
                            {st.risk_tier === "critical" ? (
                              <Badge variant="error">🚨 Critical (&lt;40%)</Badge>
                            ) : (
                              <Badge variant="warning">⚠️ Warning (&lt;75%)</Badge>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {status === "Sent" ? (
                              <Badge variant="warning">✉️ Dispatched</Badge>
                            ) : status === "Acknowledged" ? (
                              <Badge variant="success">✓ Acknowledged</Badge>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSingleDispatch(st.registration_no, st.student_name)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                              >
                                ⏳ Dispatch Notice
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-[12px]">
                            <a
                              href={`mailto:${st.email}`}
                              className="text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline flex items-center gap-1"
                              title={`Send email to ${st.student_name}`}
                            >
                              {st.email}
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Faculty Workload Table (Both DURATION and WARNING CUTOFF are cloaked here!) */
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-foreground">
                Faculty Workload & Teaching Performance Summary ({workload.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Click any faculty row to expand course payload drawers, subject session counts, and student attendance rates.
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
                      <th className="py-3 px-3 w-8"></th>
                      <th className="py-3 px-3">Faculty ID</th>
                      <th className="py-3 px-3">Faculty Name</th>
                      <th className="py-3 px-3">Designation</th>
                      <th className="py-3 px-3">Assigned Subjects</th>
                      <th className="py-3 px-3">Fuel-Burn Ratio (Classes Held)</th>
                      <th className="py-3 px-3">Avg Class Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {workload.map((fac) => {
                      const isExpanded = expandedFacultyId === fac.faculty_id;
                      const targetSessions = fac.target_sessions || 24;
                      const completionPct = fac.completion_pct || 0;

                      return (
                        <React.Fragment key={fac.faculty_id}>
                          <tr
                            onClick={() => toggleFacultyExpand(fac.faculty_id)}
                            className="hover:bg-muted/40 transition-colors cursor-pointer select-none group"
                          >
                            <td className="py-3 px-3 text-muted-foreground font-bold text-center">
                              <span className="inline-block transition-transform duration-200 group-hover:scale-125">
                                {isExpanded ? "▼" : "▶"}
                              </span>
                            </td>
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
                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                                  <span className="text-foreground">{fac.total_classes_conducted}</span>
                                  <span className="text-muted-foreground">/ {targetSessions} Sessions</span>
                                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black">
                                    ({completionPct}%)
                                  </span>
                                </div>
                                <div className="h-1.5 w-28 rounded-full bg-muted overflow-hidden">
                                  <div
                                    style={{ width: `${Math.min(completionPct, 100)}%` }}
                                    className={`h-full rounded-full transition-all duration-500 ${completionPct >= 75
                                      ? "bg-emerald-500"
                                      : completionPct >= 40
                                        ? "bg-amber-500"
                                        : "bg-indigo-500"
                                      }`}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {fac.avg_class_attendance_pct}%
                            </td>
                          </tr>

                          {/* Expandable Cargo Bay Drawer */}
                          {isExpanded && (
                            <tr className="bg-muted/30 dark:bg-slate-900/40">
                              <td colSpan={7} className="p-4 border-b border-border">
                                <div className="space-y-3 bg-background/80 p-4 rounded-xl border border-border">
                                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                                    <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                                      <span>📦 Course Payload & Subject Metrics</span>
                                      <Badge variant="primary">{fac.faculty_name}</Badge>
                                    </h4>
                                    <span className="text-[11px] text-muted-foreground font-mono">
                                      Total Assigned: {fac.assigned_subjects.length} Subjects
                                    </span>
                                  </div>

                                  {fac.assigned_subjects.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">
                                      No courses currently assigned to this faculty member.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {fac.assigned_subjects.map((sub) => (
                                        <div
                                          key={sub.subject_code}
                                          className="p-3 rounded-lg border border-border/80 bg-card space-y-2"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                              {sub.subject_code}
                                            </span>
                                            <Badge variant="muted">Sem {sub.semester}</Badge>
                                          </div>
                                          <div className="text-xs font-bold text-foreground">
                                            {sub.subject_name}
                                          </div>
                                          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/40">
                                            <span>
                                              Sessions: <strong>{sub.sessions_conducted} / {sub.target_sessions || 24}</strong>
                                            </span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                              Att. Rate: {sub.avg_attendance_pct}%
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
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
      </div>
    </main>
  );
}
