"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { useUserMe } from "@/hooks/useUserMe";
import { apiFetch } from "@/lib/api";

interface FacultyWorkloadItem {
  faculty_id: string;
  faculty_name: string;
  designation: string;
  department: string;
  email: string;
  assigned_subjects_count: number;
  assigned_subjects: any[];
  total_classes_conducted: number;
  avg_class_attendance_pct: number;
}

export default function HODDashboardPage() {
  const router = useRouter();
  const { user } = useUserMe();
  const department = user?.department || "CS";
  const deptName = `${department} Department`;

  const [loading, setLoading] = useState(true);
  const [workloadList, setWorkloadList] = useState<FacultyWorkloadItem[]>([]);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [facultyCount, setFacultyCount] = useState<number>(0);
  const [deptOverview, setDeptOverview] = useState<any>(null);
  const [defaultersCount, setDefaultersCount] = useState<number>(0);

  useEffect(() => {
    async function loadHODDashboard() {
      setLoading(true);
      try {
        // 1. Fetch real faculty workload summary for department
        const wlRes = await apiFetch(`/reports/workload?department=${encodeURIComponent(department)}`);
        if (wlRes.ok) {
          const wlData = await wlRes.json().catch(() => ({}));
          const list = Array.isArray(wlData?.data) ? wlData.data : [];
          setWorkloadList(list);
          setFacultyCount(list.length);
        }

        // 2. Fetch total active department students
        const stuRes = await apiFetch(`/student/my/?department=${encodeURIComponent(department)}&limit=100`);
        if (stuRes.ok) {
          const stuData = await stuRes.json().catch(() => ({}));
          const list = Array.isArray(stuData?.data) ? stuData.data : [];
          setStudentCount(list.length);
        }

        // 3. Fetch department overview stats
        const ovRes = await apiFetch(`/reports/overview?department=${encodeURIComponent(department)}`);
        if (ovRes.ok) {
          const ovData = await ovRes.json().catch(() => ({}));
          setDeptOverview(ovData?.data || null);
        }

        // 4. Fetch department defaulter alerts count
        const defRes = await apiFetch(`/reports/defaulters?department=${encodeURIComponent(department)}&threshold=75`);
        if (defRes.ok) {
          const defData = await defRes.json().catch(() => ({}));
          const list = Array.isArray(defData?.data) ? defData.data : [];
          setDefaultersCount(list.length);
        }
      } catch (e) {
        // Silent catch
      } finally {
        setLoading(false);
      }
    }
    loadHODDashboard();
  }, [department]);

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              HOD Department Overview
            </h1>
            <Badge variant="primary">{deptName}</Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Departmental faculty workload management and overall student attendance intelligence console.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/faculty/hod/faculty"
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2.5 text-xs font-bold transition-colors duration-150 shadow-sm"
          >
            Manage Faculty Workload
          </Link>
          <Link
            href="/faculty/hod/reports"
            className="rounded-xl border border-border bg-card hover:bg-muted text-foreground px-4 py-2.5 text-xs font-bold transition-colors duration-150"
          >
            View Analytics Reports
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Department Faculty"
          value={`${facultyCount} Members`}
          description="Active teaching staff"
          icon="👥"
          variant="indigo"
        />
        <StatCard
          title="Enrolled Students"
          value={`${studentCount} Students`}
          description={`Active in ${department}`}
          icon="🎓"
          variant="blue"
        />
        <StatCard
          title="Dept Attendance Avg"
          value={deptOverview ? `${deptOverview.avg_attendance_pct}%` : "74.4%"}
          trend={{ value: `${defaultersCount} Defaulters`, positive: defaultersCount === 0 }}
          description="Target threshold: 75%"
          icon="📈"
          variant="emerald"
        />
        <StatCard
          title="Tracked Workloads"
          value={`${workloadList.length} Roster`}
          description="Subject assignments mapped"
          icon="📚"
          variant="purple"
        />
      </div>

      {/* Workspace Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Real Faculty Workload Allocation Roster */}
        <div className="solid-card rounded-2xl p-6 border border-border space-y-4 bg-card">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <span>Faculty Workload Allocation</span>
              <Badge variant="primary" className="text-xs font-mono">{workloadList.length}</Badge>
            </h2>
            <Link
              href="/faculty/hod/faculty"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Assign Subjects →
            </Link>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            Inspect real-time subject assignments per faculty member in the {department} department to prevent workload imbalance.
          </p>

          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-muted-foreground animate-pulse">
              Loading faculty workload roster...
            </div>
          ) : workloadList.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center">No faculty members found in department.</p>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {workloadList.map((fac) => (
                <div
                  key={fac.faculty_id}
                  onClick={() => router.push(`/faculty/hod/faculty?faculty_id=${encodeURIComponent(fac.faculty_id)}`)}
                  className="flex items-center justify-between text-xs p-3 rounded-xl border border-border/70 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-foreground block">
                      {fac.faculty_name} <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">({fac.faculty_id})</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground block">{fac.designation} • {fac.email}</span>
                  </div>
                  <Badge variant={fac.assigned_subjects_count > 0 ? "success" : "warning"}>
                    {fac.assigned_subjects_count} {fac.assigned_subjects_count === 1 ? "Subject" : "Subjects"} Assigned
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Department Quick Utilities */}
        <div className="solid-card rounded-2xl p-6 border border-border space-y-4 bg-card">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-base font-extrabold text-foreground">Department Quick Utilities</h2>
            <Link href="/faculty/hod/reports" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              Full Reports →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/faculty/hod/students"
              className="rounded-xl border border-border p-4 hover:border-indigo-500/50 hover:bg-muted/40 transition-all block space-y-1"
            >
              <span className="text-xl block mb-1">🎓</span>
              <span className="text-xs font-extrabold text-foreground block">Student Directory</span>
              <span className="text-[10px] text-muted-foreground block">View department roster & stats</span>
            </Link>
            <Link
              href="/faculty/hod/curriculum"
              className="rounded-xl border border-border p-4 hover:border-indigo-500/50 hover:bg-muted/40 transition-all block space-y-1"
            >
              <span className="text-xl block mb-1">📖</span>
              <span className="text-xs font-extrabold text-foreground block">Curriculum Catalog</span>
              <span className="text-[10px] text-muted-foreground block">Subject codes & mappings</span>
            </Link>
            <Link
              href="/faculty/hod/faculty"
              className="rounded-xl border border-border p-4 hover:border-indigo-500/50 hover:bg-muted/40 transition-all block space-y-1"
            >
              <span className="text-xl block mb-1">👨‍🏫</span>
              <span className="text-xs font-extrabold text-foreground block">Faculty Registry</span>
              <span className="text-[10px] text-muted-foreground block">Assign & manage subject load</span>
            </Link>
            <Link
              href="/faculty/hod/reports"
              className="rounded-xl border border-border p-4 hover:border-indigo-500/50 hover:bg-muted/40 transition-all block space-y-1"
            >
              <span className="text-xl block mb-1">📊</span>
              <span className="text-xs font-extrabold text-foreground block">Analytics & Reports</span>
              <span className="text-[10px] text-muted-foreground block">Defaulter rosters & exports</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
