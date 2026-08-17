"use client";

import React, { useState, useEffect } from "react";
import { useUserMe } from "@/hooks/useUserMe";
import { useAvailableSubjects } from "@/hooks/useAvailableSubjects";
import { apiFetch } from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { DataTable, Column } from "@/components/ui/DataTable";
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

  // Selectors
  const [semester, setSemester] = useState("all");
  const [subjectCode, setSubjectCode] = useState("all");
  const [duration, setDuration] = useState("semester");
  const [threshold, setThreshold] = useState<number>(75.0);
  const [activeTab, setActiveTab] = useState<"defaulters" | "workload">("defaulters");
  const [searchQuery, setSearchQuery] = useState("");

  // Dynamic Subject Pool
  const { availableSubjects, availableLoading } = useAvailableSubjects({
    semester: semester === "all" ? "all" : semester,
    department,
  });

  // Data State
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [defaulters, setDefaulters] = useState<DefaulterStudent[]>([]);
  const [workload, setWorkload] = useState<FacultyWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  // Dispatch Notice State
  const [noticeStatuses, setNoticeStatuses] = useState<Record<string, "Pending" | "Sent" | "Acknowledged">>({});
  const [dispatchAlert, setDispatchAlert] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);

  // Expandable Faculty Row State
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

  // Dispatch Warning Notice Action
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
          `🚀 Warning Protocols Dispatched! Official attendance shortfall notifications sent to ${targetRegNos.length} student units.`
        );
      } else {
        setDispatchAlert("⚠️ Failed to dispatch warning notices. Please try again.");
      }
    } catch (e) {
      setDispatchAlert("⚠️ Network error while dispatching warning protocols.");
    } finally {
      setIsDispatching(false);
      setTimeout(() => setDispatchAlert(null), 5000);
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
        setDispatchAlert(`✉️ Attendance warning notice dispatched to ${studentName} (${regNo}).`);
      }
    } catch (e) {
      // Silent catch
    }
    setTimeout(() => setDispatchAlert(null), 4000);
  }

  function toggleFacultyExpand(facId: string) {
    setExpandedFacultyId((prev) => (prev === facId ? null : facId));
  }

  // Filtered rosters based on search query
  const filteredDefaulters = defaulters.filter((st) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      st.student_name.toLowerCase().includes(q) ||
      st.registration_no.toLowerCase().includes(q) ||
      st.email.toLowerCase().includes(q)
    );
  });

  const filteredWorkload = workload.filter((fac) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      fac.faculty_name.toLowerCase().includes(q) ||
      fac.faculty_id.toLowerCase().includes(q) ||
      fac.designation.toLowerCase().includes(q) ||
      fac.email.toLowerCase().includes(q)
    );
  });

  // Export Configurations
  const defaulterExportColumns: ReportColumn[] = [
    { key: "registration_no", label: "Registration No", align: "center" },
    { key: "student_name", label: "Student Name", align: "left" },
    { key: "semester", label: "Semester", align: "center" },
    { key: "attended_classes", label: "Attended Classes", align: "center" },
    { key: "total_classes", label: "Total Classes", align: "center" },
    { key: "attendance_pct", label: "Attendance %", align: "center" },
    { key: "email", label: "Student Email", align: "left" },
  ];

  const workloadExportColumns: ReportColumn[] = [
    { key: "faculty_id", label: "Faculty ID", align: "center" },
    { key: "faculty_name", label: "Faculty Name", align: "left" },
    { key: "designation", label: "Designation", align: "left" },
    { key: "assigned_subjects_count", label: "Assigned Subjects Count", align: "center" },
    { key: "total_classes_conducted", label: "Classes Conducted", align: "center" },
    { key: "avg_class_attendance_pct", label: "Avg Attendance Rate (%)", align: "center" },
    { key: "email", label: "Email", align: "left" },
  ];

  function handleExportCSV() {
    if (activeTab === "defaulters") {
      exportToCSV(`Defaulter_Students_${department}_Sem_${semester}_(${threshold}pct).csv`, defaulterExportColumns, filteredDefaulters);
    } else {
      exportToCSV(`Faculty_Workload_Summary_${department}.csv`, workloadExportColumns, filteredWorkload);
    }
  }

  function handleExportPDF() {
    if (activeTab === "defaulters") {
      exportToPDF(
        "Attendance Shortfall Report",
        `${threshold}%`,
        department,
        semester === "all" ? "All Semesters" : `Semester ${semester}`,
        defaulterExportColumns,
        filteredDefaulters,
        "portrait"
      );
    } else {
      exportToPDF(
        "Faculty Workload & Teaching Summary",
        [
          { label: "Report Type:", value: "Faculty Workload & Teaching Summary" },
          { label: "Department:", value: department },
          { label: "Active Faculty:", value: `${filteredWorkload.length}` },
        ],
        workloadExportColumns,
        filteredWorkload
      );
    }
  }

  // DataTable Columns Matching faculty/reports
  const defaulterColumns: Column<DefaulterStudent>[] = [
    {
      header: "Registration No",
      accessor: (st) => (
        <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
          {st.registration_no}
        </span>
      ),
    },
    {
      header: "Student Name",
      accessor: (st) => (
        <span className="font-bold text-foreground">
          {st.student_name}
        </span>
      ),
    },
    {
      header: "Semester",
      accessor: (st) => <Badge variant="muted" showDot={false}>Sem {st.semester}</Badge>,
    },
    {
      header: "Attended Classes",
      accessor: (st) => (
        <span className="font-mono font-bold">
          {st.attended_classes} / {st.total_classes}
        </span>
      ),
    },
    {
      header: "Attendance Rate",
      accessor: (st) => (
        <span
          className={`text-sm font-mono font-bold ${st.attendance_pct < 40
            ? "text-rose-600 dark:text-rose-400"
            : st.attendance_pct < 75
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400"
            }`}
        >
          {st.attendance_pct}%
        </span>
      ),
    },
    {
      header: "Risk Tier",
      accessor: (st) => (
        st.risk_tier === "critical" || st.attendance_pct < 40 ? (
          <Badge variant="error" showDot={false}>🚨 Critical (&lt;40%)</Badge>
        ) : (
          <Badge variant="warning" showDot={false}>⚠️ Warning (&lt;{threshold}%)</Badge>
        )
      ),
    },
    {
      header: "Notice Status",
      accessor: (st) => {
        const status = noticeStatuses[st.registration_no] || st.notice_status || "Pending";
        if (status === "Sent") return <Badge variant="warning" showDot={false}>✉️ Dispatched</Badge>;
        if (status === "Acknowledged") return <Badge variant="success" showDot={false}>✓ Acknowledged</Badge>;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSingleDispatch(st.registration_no, st.student_name);
            }}
            className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
          >
            ⏳ Dispatch Notice
          </button>
        );
      },
    },
    {
      header: "Contact Email",
      accessor: (st) => (
        <a
          href={`mailto:${st.email}`}
          className="text-xs font-mono text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {st.email}
        </a>
      ),
    },
  ];

  const workloadTableColumns: Column<FacultyWorkload>[] = [
    {
      header: "",
      accessor: (fac) => {
        const isExpanded = expandedFacultyId === fac.faculty_id;
        return (
          <span className="text-muted-foreground font-bold text-xs">
            {isExpanded ? "▼" : "▶"}
          </span>
        );
      },
    },
    {
      header: "Faculty ID",
      accessor: (fac) => (
        <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
          {fac.faculty_id}
        </span>
      ),
    },
    {
      header: "Faculty Name",
      accessor: (fac) => <span className="font-bold text-foreground">{fac.faculty_name}</span>,
    },
    {
      header: "Designation",
      accessor: (fac) => <span className="text-xs text-muted-foreground font-medium">{fac.designation}</span>,
    },
    {
      header: "Assigned Subjects",
      accessor: (fac) => (
        <Badge variant="primary" showDot={false}>{fac.assigned_subjects_count} Subjects</Badge>
      ),
    },
    {
      header: "Class Target Ratio",
      accessor: (fac) => {
        const targetSessions = fac.target_sessions || 24;
        const completionPct = fac.completion_pct || 0;
        return (
          <div className="space-y-1 min-w-[150px] mx-auto">
            <div className="flex items-center justify-between font-mono text-xs font-bold">
              <span className="text-foreground">{fac.total_classes_conducted} / {targetSessions}</span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black">({completionPct}%)</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                style={{ width: `${Math.min(completionPct, 100)}%` }}
                className={`h-full rounded-full transition-all duration-500 ${completionPct >= 75 ? "bg-emerald-500" : completionPct >= 40 ? "bg-amber-500" : "bg-rose-500"
                  }`}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: "Avg Attendance Rate",
      accessor: (fac) => (
        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
          {fac.avg_class_attendance_pct}%
        </span>
      ),
    },
  ];

  // Options for Compliant CustomSelect Controls
  const semesterOptions = [
    { value: "all", label: "All Semesters" },
    ...["1", "2", "3", "4", "5", "6", "7", "8"].map((s) => ({
      value: s,
      label: `Semester ${s}`,
    })),
  ];

  const subjectOptions = [
    { value: "all", label: availableSubjects.length <= 1 ? "All Subjects" : `All Subjects (${availableSubjects.length})` },
    ...availableSubjects.map((sub) => ({
      value: sub.subject_code,
      label: `${sub.subject_code} - ${sub.subject_name}`,
    })),
  ];

  const durationOptions = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "semester", label: "This Semester" },
  ];

  const thresholdOptions = [
    { value: "75", label: "Below 75% (Mandatory)" },
    { value: "60", label: "Below 60% (Moderate Risk)" },
    { value: "50", label: "Below 50% (Severe Risk)" },
    { value: "40", label: "Below 40% (Critical)" },
  ];

  const pendingNoticesCount = defaulters.filter((d) => noticeStatuses[d.registration_no] !== "Sent").length;

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Page Header matching faculty/reports */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex flex-row items-center justify-between gap-2">
          <span>📈 Reports & Analytics</span>
          <Badge variant="primary" className="text-xs font-mono uppercase">{department}</Badge>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Departmental teaching metrics, course attendance breakdown, faculty workload allocation, and low attendance warning rosters.
        </p>
      </div>

      {/* Action Alert Banner */}
      {dispatchAlert && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-between shadow-xs">
          <span>{dispatchAlert}</span>
          <button
            onClick={() => setDispatchAlert(null)}
            className="text-muted-foreground hover:text-foreground font-black text-sm px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stat Cards matching faculty/reports */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Dept Mean Attendance"
          value={overview ? `${overview.mean_attendance_pct}%` : "Loading..."}
          trend={{ value: overview ? `${overview.total_marked_records} records` : "Live DB", positive: true }}
          icon="📊"
        />
        <StatCard
          title={`Defaulter Students (<${threshold}%)`}
          value={overview ? `${defaulters.length} Students` : "Loading..."}
          trend={{ value: defaulters.length > 0 ? `${pendingNoticesCount} Pending Notices` : "Healthy Roster", positive: defaulters.length === 0 }}
          icon="⚠️"
        />
        <StatCard
          title="Total Conducted Sessions"
          value={overview ? `${overview.total_sessions} Sessions` : "Loading..."}
          trend={{ value: overview ? `${overview.weekly_classes} this week` : "", positive: true }}
          icon="📝"
        />
      </div>

      {/* Main Console matching faculty/reports */}
      <div className="solid-card rounded-2xl p-4 sm:p-5 border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 sm:flex sm:w-auto w-full gap-1 bg-muted p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab("defaulters")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center min-h-[36px] ${activeTab === "defaulters"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <span className="hidden lg:inline">Defaulter Warning Roster</span>
              <span className="lg:hidden">Defaulters</span>
              <span className="ml-1">({defaulters.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("workload")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center min-h-[36px] ${activeTab === "workload"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <span className="hidden lg:inline">Faculty Workload</span>
              <span className="lg:hidden">Workload</span>
              <span className="ml-1">({workload.length})</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {activeTab === "defaulters" && (
              <button
                type="button"
                onClick={handleLaunchWarningProtocols}
                disabled={defaulters.length === 0 || isDispatching}
                className="w-full sm:w-auto h-9 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all active:scale-95 shadow-xs disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <span>✉️ Launch Warnings ({defaulters.length})</span>
              </button>
            )}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full sm:w-auto h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-95 shadow-xs inline-flex items-center justify-center gap-1.5"
              >
                <span>📥 Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="w-full sm:w-auto h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all active:scale-95 shadow-xs inline-flex items-center justify-center gap-1.5"
              >
                <span>📄 Print / PDF</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
            Loading reports...
          </div>
        ) : activeTab === "defaulters" ? (
          <div className="space-y-4">
            {/* Filter Toolbar + Search Input */}
            <div className="flex flex-col justify-between gap-3 border-b border-border/50 pb-1 min-w-0">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Search student name, reg no, email..."
                  className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 text-xs text-muted-foreground hover:text-foreground font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* CustomSelect Dropdowns (2 per row on mobile) */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 w-full lg:w-auto min-w-0">
                <CustomSelect
                  label="Semester"
                  value={semester}
                  onChange={(val) => {
                    setSemester(val);
                    setSubjectCode("all");
                  }}
                  options={semesterOptions}
                  className="w-full"
                />

                <CustomSelect
                  label="Subject"
                  value={subjectCode}
                  onChange={setSubjectCode}
                  options={subjectOptions}
                  disabled={availableLoading}
                  searchable={true}
                  className="w-full"
                />

                <CustomSelect
                  label="Duration"
                  value={duration}
                  onChange={setDuration}
                  options={durationOptions}
                  className="w-full"
                />

                <CustomSelect
                  label="Cutoff"
                  value={String(threshold)}
                  onChange={(val) => setThreshold(Number(val))}
                  options={thresholdOptions}
                  className="w-full"
                />
              </div>
            </div>

            {/* Mobile Card List View for Defaulters */}
            <div className="block md:hidden space-y-3">
              {filteredDefaulters.length === 0 ? (
                <div className="p-8 text-center text-xs font-bold text-muted-foreground border border-dashed border-border rounded-xl bg-card">
                  {searchQuery
                    ? `No defaulters match search query "${searchQuery}".`
                    : `No defaulters flagged meeting the ${threshold}% requirement.`}
                </div>
              ) : (
                filteredDefaulters.map((st) => {
                  const status = noticeStatuses[st.registration_no] || st.notice_status || "Pending";
                  return (
                    <div
                      key={st.registration_no}
                      className="p-3.5 rounded-2xl border border-border bg-card space-y-3 shadow-xs"
                    >
                      {/* Card Header: Student Info + Risk Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold text-sm text-foreground truncate">{st.student_name}</h3>
                          <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px] text-muted-foreground">
                          </div>
                        </div>
                        <div className="shrink-0">
                          {st.risk_tier === "critical" || st.attendance_pct < 40 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              🚨 Critical (&lt;40%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              ⚠️ Warning (&lt;{threshold}%)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Metrics 2-Col Stats Box */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/50">
                        <div>
                          <div className="text-[9px] uppercase font-extrabold tracking-wider text-muted-foreground">Attended Classes</div>
                          <div className="text-xs font-mono font-extrabold text-foreground mt-0.5">
                            {st.attended_classes} / {st.total_classes}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase font-extrabold tracking-wider text-muted-foreground">Attendance Rate</div>
                          <div className={`text-xs font-mono font-extrabold mt-0.5 ${st.attendance_pct < 40
                            ? "text-rose-600 dark:text-rose-400"
                            : st.attendance_pct < 75
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                            }`}>
                            {st.attendance_pct}%
                          </div>
                        </div>
                        <div className="col-span-2 h-1.5 w-full rounded-full bg-muted overflow-hidden mt-1">
                          <div
                            style={{ width: `${Math.min(st.attendance_pct, 100)}%` }}
                            className={`h-full rounded-full transition-all duration-500 ${st.attendance_pct < 40 ? "bg-rose-500" : st.attendance_pct < 75 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                          />
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-0.5 text-xs gap-2">
                        {/* <a
                          href={`mailto:${st.email}`}
                          className="font-mono text-[11px] text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 truncate flex-1 min-w-0"
                          title={st.email}
                        >
                          ✉️ {st.email}
                        </a> */}
                        <Badge variant="muted">Sem {st.semester}</Badge>
                        <div className="shrink-0">
                          {status === "Sent" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              ✉️ Dispatched
                            </span>
                          ) : status === "Acknowledged" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              ✓ Acknowledged
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSingleDispatch(st.registration_no, st.student_name)}
                              className="text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 px-2.5 py-1 rounded-lg transition-all shadow-xs"
                            >
                              Dispatch Notice
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop DataTable for Defaulters */}
            <div className="hidden md:block">
              <DataTable
                columns={defaulterColumns}
                data={filteredDefaulters}
                keyExtractor={(st) => st.registration_no}
                loading={loading}
                maxHeight="max-h-[460px]"
                textsize="text-xs"
                emptyMessage={
                  searchQuery
                    ? `No defaulters match search query "${searchQuery}".`
                    : `No defaulters flagged meeting the ${threshold}% requirement.`
                }
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search Filter for Faculty Workload */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Search faculty name, ID, designation, email..."
                  className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 text-xs text-muted-foreground hover:text-foreground font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Card List View for Faculty Workload */}
            <div className="block md:hidden space-y-3">
              {filteredWorkload.length === 0 ? (
                <div className="p-8 text-center text-xs font-bold text-muted-foreground border border-dashed border-border rounded-xl bg-card">
                  {searchQuery
                    ? `No faculty members match "${searchQuery}".`
                    : "No active faculty workload records found."}
                </div>
              ) : (
                filteredWorkload.map((fac) => {
                  const isExpanded = expandedFacultyId === fac.faculty_id;
                  const targetSessions = fac.target_sessions || 24;
                  const completionPct = fac.completion_pct || 0;
                  return (
                    <div
                      key={fac.faculty_id}
                      className="p-3.5 rounded-2xl border border-border bg-card space-y-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold text-sm text-foreground truncate">{fac.faculty_name}</h3>
                        </div>
                        <span className="shrink-0 inline-flex items-center justify-center px-2 py-1 rounded-lg text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          {fac.assigned_subjects_count} Subjects
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/50">
                        <div>
                          <div className="text-[9px] uppercase font-extrabold tracking-wider text-muted-foreground">Classes Conducted</div>
                          <div className="text-xs font-mono font-extrabold text-foreground mt-0.5">
                            {fac.total_classes_conducted} / {targetSessions} <span className="text-[10px] text-muted-foreground font-normal">({completionPct}%)</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase font-extrabold tracking-wider text-muted-foreground">Avg Attendance</div>
                          <div className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {fac.avg_class_attendance_pct}%
                          </div>
                        </div>
                        <div className="col-span-2 h-1.5 w-full rounded-full bg-muted overflow-hidden mt-1">
                          <div
                            style={{ width: `${Math.min(completionPct, 100)}%` }}
                            className={`h-full rounded-full transition-all duration-500 ${completionPct >= 75 ? "bg-emerald-500" : completionPct >= 40 ? "bg-amber-500" : "bg-rose-500"
                              }`}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-0.5 text-xs gap-2">
                        <Badge variant="muted" showDot={false}>{fac.faculty_id}</Badge>
                        <button
                          type="button"
                          onClick={() => toggleFacultyExpand(fac.faculty_id)}
                          className="shrink-0 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition-all"
                        >
                          {isExpanded ? "Hide Courses ▲" : "View Courses ▼"}
                        </button>
                      </div>

                      {/* In-place Mobile Payload Drawer */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-border space-y-2 animate-fadeIn">
                          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                            <span>📦 Assigned Courses ({fac.assigned_subjects.length})</span>
                            <button
                              onClick={() => setExpandedFacultyId(null)}
                              className="text-[10px] text-muted-foreground hover:text-foreground font-bold"
                            >
                              ✕
                            </button>
                          </div>

                          {fac.assigned_subjects.length === 0 ? (
                            <div className="p-2 text-center text-xs text-muted-foreground italic">
                              No subjects assigned.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {fac.assigned_subjects.map((sub) => (
                                <div
                                  key={sub.subject_code}
                                  className="p-2 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between gap-2 text-xs"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-foreground text-xs truncate">{sub.subject_name}</div>
                                    <div className="font-mono text-[10px] text-muted-foreground">
                                      {sub.subject_code}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                                    <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold text-[10px] border border-border/50">
                                      Sem {sub.semester}
                                    </span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                      {sub.avg_attendance_pct}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop DataTable for Faculty Workload */}
            <div className="hidden md:block">
              <DataTable
                columns={workloadTableColumns}
                data={filteredWorkload}
                keyExtractor={(fac) => fac.faculty_id}
                loading={loading}
                maxHeight="max-h-[460px]"
                textsize="text-xs"
                onRowClick={(fac) => toggleFacultyExpand(fac.faculty_id)}
                isRowExpanded={(fac) => expandedFacultyId === fac.faculty_id}
                renderExpandedRow={(fac) => (
                  <div className="p-3 rounded-xl border border-border bg-card/60 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <span>📦 Assigned Courses ({fac.assigned_subjects.length})</span>
                        <Badge variant="primary" showDot={false}>
                          {fac.faculty_name}
                        </Badge>
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedFacultyId(null);
                        }}
                        className="text-xs font-bold text-muted-foreground hover:text-foreground"
                      >
                        Close ✕
                      </button>
                    </div>

                    {fac.assigned_subjects.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground italic">
                        No subjects assigned to this faculty.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {fac.assigned_subjects.map((sub) => (
                          <div
                            key={sub.subject_code}
                            className="p-3 rounded-xl border border-border bg-background space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                {sub.subject_code}
                              </span>
                              <Badge variant="muted" showDot={false}>Sem {sub.semester}</Badge>
                            </div>
                            <div className="text-xs font-bold text-foreground">
                              {sub.subject_name}
                            </div>
                            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-1 border-t border-border/40">
                              <span>
                                Sessions: <strong className="text-foreground">{sub.sessions_conducted} / {sub.target_sessions || 24}</strong>
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
                )}
                emptyMessage={
                  searchQuery
                    ? `No faculty members match "${searchQuery}".`
                    : "No active faculty workload records found."
                }
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
