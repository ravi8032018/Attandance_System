"use client";

import React, { useState, useEffect } from "react";
import { useUserMe } from "@/hooks/useUserMe";
import { apiFetch } from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { DataTable, Column } from "@/components/ui/DataTable";
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
  const facultyId = user?.faculty_id || user?.unique_id || user?.id || "";
  const department = user?.department || "CS";

  const [threshold, setThreshold] = useState<number>(75.0);
  const [subjectCode, setSubjectCode] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"defaulters" | "workload">("defaulters");

  const [defaulters, setDefaulters] = useState<DefaulterStudent[]>([]);
  const [workload, setWorkload] = useState<FacultyWorkload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFacultyReports() {
      if (!user) return;
      setLoading(true);
      try {
        const currentFacId = user?.faculty_id || user?.unique_id || user?.id || "";
        const dept = user?.department || "CS";

        const [defRes, workRes] = await Promise.all([
          apiFetch(
            `/reports/defaulters?department=${encodeURIComponent(dept)}&faculty_id=${encodeURIComponent(currentFacId)}&subject_code=${encodeURIComponent(subjectCode)}&threshold=${threshold}`
          ),
          apiFetch(`/reports/workload?department=${encodeURIComponent(dept)}`),
        ]);

        if (defRes.ok) {
          const defData = await defRes.json();
          setDefaulters(defData?.data || []);
        }

        if (workRes.ok) {
          const workData = await workRes.json();
          const items: FacultyWorkload[] = workData?.data || [];
          let myWorkload = currentFacId
            ? items.find((w) => w.faculty_id.toUpperCase() === currentFacId.toUpperCase())
            : null;

          if (!myWorkload && items.length > 0) {
            myWorkload = items[0];
          }

          setWorkload(myWorkload || null);
        }
      } catch (e) {
        // Silent catch
      } finally {
        setLoading(false);
      }
    }

    loadFacultyReports();
  }, [user, threshold, subjectCode]);

  const exportColumns: ReportColumn[] = [
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
    exportToCSV(`Faculty_Defaulters_${facultyId}_(${threshold}pct).csv`, exportColumns, defaulters);
  }

  function handleExportPDF() {
    exportToPDF(
      `Faculty Attendance Report`,
      `${threshold}%`,
      department,
      `All Semesters`,
      exportColumns,
      defaulters
    );
  }

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
      accessor: (st) => <Badge variant="muted">Sem {st.semester}</Badge>,
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
        <span className={`text-sm font-mono font-bold ${st.attendance_pct < 40
          ? "text-rose-600 dark:text-rose-400"
          : st.attendance_pct < 75
            ? "text-amber-600 dark:text-amber-400"
            : "text-emerald-600 dark:text-emerald-400"
          }`}>
          {st.attendance_pct}%
        </span>
      ),
    },
    {
      header: "Status Badge",
      accessor: () => (
        <Badge variant="warning">⚠️ Low Attendance (&lt;{threshold}%)</Badge>
      ),
    },
  ];

  const assignedSubs = workload?.assigned_subjects || [];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <span>📈 Attendance & Teaching Analytics</span>
          {/* <Badge variant="primary" className="text-xs font-mono">{workload?.faculty_id || facultyId}</Badge> */}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Personal teaching metrics, course attendance breakdown, and low attendance warning rosters.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Teaching Load"
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
          <div className="flex flex-col flex-row items-stretch xs:items-center gap-2 bg-muted p-1 rounded-xl border border-border w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("defaulters")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${activeTab === "defaulters"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Defaulter Warning Roster ({defaulters.length})
            </button>
            <button
              onClick={() => setActiveTab("workload")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${activeTab === "workload"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Assigned Subjects ({workload?.assigned_subjects.length || 0})
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold transition-all active:scale-95 shadow-xs"
            >
              <span>📥 Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-bold transition-all active:scale-95 shadow-xs"
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
            {/* Defaulter Roster Enclosure Filters Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-foreground">Defaulter Warning Controls</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto min-w-0">
                <CustomSelect
                  label="Subject"
                  value={subjectCode}
                  onChange={setSubjectCode}
                  className="w-full sm:w-60"
                  options={[
                    {
                      value: "all",
                      label: assignedSubs.length <= 1 ? "All Assigned Subjects" : `All Assigned Subjects (${assignedSubs.length})`,
                    },
                    ...assignedSubs.map((sub) => ({
                      value: sub.subject_code,
                      label: `${sub.subject_code} - ${sub.subject_name}`,
                    })),
                  ]}
                />

                <CustomSelect
                  label="Cutoff"
                  value={String(threshold)}
                  onChange={(val) => setThreshold(Number(val))}
                  className="w-full sm:w-56"
                  options={[
                    { value: "75", label: "Below 75% (Mandatory)" },
                    { value: "60", label: "Below 60% (Moderate Risk)" },
                    { value: "50", label: "Below 50% (Severe Risk)" },
                  ]}
                />
              </div>
            </div>

            <DataTable
              columns={defaulterColumns}
              data={defaulters}
              keyExtractor={(st) => st.registration_no}
              loading={loading}
              maxHeight="max-h-[420px]"
              textsize="text-xs"
              emptyMessage={`No defaulters flagged meeting the ${threshold}% requirement.`}
            />
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
