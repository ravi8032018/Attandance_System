"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { useFacultyMe } from "@/hooks/useFacultyMe";
import { apiFetch } from "@/lib/api";

interface RecentSession {
  id: string;
  subject_code: string;
  date: string;
  present_count: number;
  total_students: number;
  status: "completed" | "pending";
}

interface AssignedSubjectItem {
  subject_code: string;
  subject_name: string;
  semester: string;
  department: string;
}

export default function FacultyDashboardPage() {
  const router = useRouter();
  const { faculty, isHod } = useFacultyMe();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<AssignedSubjectItem[]>([]);
  const [workload, setWorkload] = useState<any>(null);
  const [enrolledStudentCount, setEnrolledStudentCount] = useState<number>(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  useEffect(() => {
    async function loadDashboardData() {
      if (!faculty) return;
      setLoading(true);
      try {
        // 1. Fetch assigned subjects for this faculty
        const currRes = await apiFetch("/curriculum/my-subjects-for-sem");
        let flatSubjects: AssignedSubjectItem[] = [];
        if (currRes.ok) {
          const currData = await currRes.json().catch(() => ({}));
          const items = Array.isArray(currData?.data) ? currData.data : [];
          flatSubjects = items.flatMap((item: any) =>
            (item.subjects || []).map((s: any) => ({
              subject_code: s.subject_code,
              subject_name: s.subject_name || s.subject_code,
              semester: String(item.semester || "N/A"),
              department: item.department || faculty?.department || "CS",
            }))
          );
          setAssignedSubjects(flatSubjects);
        }

        // 2. Fetch workload stats for this faculty
        const dept = faculty?.department || "CS";
        const wlRes = await apiFetch(`/reports/workload?department=${encodeURIComponent(dept)}`);
        if (wlRes.ok) {
          const wlData = await wlRes.json().catch(() => ({}));
          const list = Array.isArray(wlData?.data) ? wlData.data : [];
          const myWl = list.find((f: any) => f.faculty_id === faculty.faculty_id) || list[0] || null;
          setWorkload(myWl);
        }

        // 3. Fetch enrolled student count for assigned semesters
        if (flatSubjects.length > 0) {
          const sems = Array.from(new Set(flatSubjects.map((s) => s.semester)));
          const stuRes = await apiFetch(`/student/my/?department=${encodeURIComponent(dept)}&semester=${encodeURIComponent(sems[0])}&limit=100`);
          if (stuRes.ok) {
            const stuData = await stuRes.json().catch(() => ({}));
            const list = Array.isArray(stuData?.data) ? stuData.data : [];
            setEnrolledStudentCount(list.length);
          }
        }

        // 4. Fetch pending session approval count
        const appRes = await apiFetch("/attendance/approvals?status=pending");
        if (appRes.ok) {
          const appData = await appRes.json().catch(() => ({}));
          setPendingApprovalsCount(appData?.total ?? appData?.items?.length ?? 0);
        }

        // 5. Fetch recent attendance sessions marked for this faculty (max 10)
        const sessRes = await apiFetch("/attendance/my-sessions?limit=10");
        if (sessRes.ok) {
          const sessData = await sessRes.json().catch(() => ({}));
          const rawSessions = Array.isArray(sessData?.data) ? sessData.data : [];
          // Filter to only include approved/completed sessions and assigned subjects
          const approvedSessions = rawSessions.filter(
            (s: any) => s.status === "completed" || s.status === "approved" || s.status === "marked_by_faculty"
          );
          if (flatSubjects.length > 0) {
            const assignedSet = new Set(flatSubjects.map((s) => s.subject_code.toUpperCase()));
            setSessions(approvedSessions.filter((s: any) => assignedSet.has(String(s.subject_code || "").toUpperCase())));
          } else {
            setSessions(approvedSessions);
          }
        }
      } catch (e) {
        // Silent catch
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [faculty]);

  const columns: Column<RecentSession>[] = [
    {
      header: "Session ID",
      accessor: (item) => <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{item.id}</span>,
    },
    {
      header: "Subject Code",
      accessor: (item) => <span className="font-semibold">{item.subject_code}</span>,
    },
    {
      header: "Date",
      accessor: (item) => <span className="text-xs text-muted-foreground">{item.date}</span>,
    },
    {
      header: "Attendance Ratio",
      accessor: (item) => {
        const pct = item.total_students > 0 ? Math.round((item.present_count / item.total_students) * 100) : 0;
        return (
          <div className="flex items-center gap-2 justify-center">
            <span className="font-bold text-xs">{item.present_count} / {item.total_students}</span>
            <Badge variant={pct >= 75 ? "success" : pct >= 60 ? "warning" : "error"}>
              {pct}%
            </Badge>
          </div>
        );
      },
    },
    {
      header: "Status",
      accessor: (item) => (
        <Badge variant={item.status === "completed" ? "success" : "warning"}>
          {item.status}
        </Badge>
      ),
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Welcome back, {faculty ? `${faculty.first_name} ${faculty.last_name}` : "Faculty"}
            </h1>
            {isHod && (
              <Link href="/faculty/hod/dashboard">
                <Badge variant="primary" className="ml-1 hover:underline cursor-pointer">
                  HOD Workspace Access →
                </Badge>
              </Link>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Personal teaching metrics, attendance rosters, and class session activity.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/faculty/attendance/take"
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2.5 text-xs font-bold transition-colors duration-150 shadow-sm"
          >
            + Take Attendance
          </Link>
          <Link
            href="/faculty/attendance/approve"
            className="rounded-xl border border-border bg-card hover:bg-muted text-foreground px-4 py-2.5 text-xs font-bold transition-colors duration-150"
          >
            Approve Sessions ({pendingApprovalsCount})
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Courses"
          value={`${assignedSubjects.length} Courses`}
          description={assignedSubjects.length > 0 ? `${assignedSubjects[0].subject_code} (${assignedSubjects[0].department})` : "Active load"}
          icon="📚"
          variant="indigo"
        />
        <StatCard
          title="Avg Attendance Rate"
          value={workload ? `${workload.avg_class_attendance_pct}%` : "74.4%"}
          trend={{ value: workload ? `${workload.total_classes_conducted} Sessions` : "32 Sessions", positive: (workload?.avg_class_attendance_pct ?? 74.4) >= 75 }}
          description="Across assigned courses"
          icon="📊"
          variant="emerald"
        />
        <StatCard
          title="Enrolled Students"
          value={`${enrolledStudentCount}`}
          description="In active sections"
          icon="🎓"
          variant="blue"
        />
        <StatCard
          title="Pending Approvals"
          value={`${pendingApprovalsCount} Requests`}
          trend={{ value: pendingApprovalsCount > 0 ? "Action Required" : "Up to date", positive: pendingApprovalsCount === 0 }}
          description="Submitted by CRs"
          icon="✅"
          variant="amber"
        />
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sessions Table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>Recent Lecture Sessions</span>
              <Badge variant="muted" className="font-mono">{sessions.length}</Badge>
            </h2>
            <Link href="/faculty/reports" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              View All →
            </Link>
          </div>
          <DataTable
            columns={columns}
            data={sessions}
            keyExtractor={(item) => item.id}
            loading={loading}
            emptyMessage="No recent attendance sessions found for your assigned subjects."
          />
        </div>

        {/* Course Load & Schedule Panel */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">Teaching Assignments</h2>
          <div className="solid-card rounded-2xl p-5 border border-border space-y-3 bg-card">
            {assignedSubjects.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 text-center">No subjects currently assigned to your profile.</p>
            ) : (
              assignedSubjects.map((sub) => (
                <div key={sub.subject_code} className="flex items-start justify-between pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 block">
                      {sub.subject_code}
                    </span>
                    <p className="text-xs font-extrabold text-foreground">{sub.subject_name}</p>
                    <span className="text-[10px] text-muted-foreground block font-medium">Department {sub.department}</span>
                  </div>
                  <Badge variant="primary">Sem {sub.semester}</Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
