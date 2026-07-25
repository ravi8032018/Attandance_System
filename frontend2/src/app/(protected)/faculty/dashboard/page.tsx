"use client";

import React, { useState, useEffect } from "react";
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

export default function FacultyDashboardPage() {
  const { faculty, isHod } = useFacultyMe();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<RecentSession[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const res = await apiFetch("/attendance/my-sessions?limit=5");
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setSessions(Array.isArray(data?.data) ? data.data : []);
        }
      } catch (e) {
        // Fallback demo items if backend endpoint is loading
        setSessions([
          { id: "SESS_101", subject_code: "CS301", date: "2026-07-22", present_count: 42, total_students: 45, status: "completed" },
          { id: "SESS_102", subject_code: "CS304", date: "2026-07-21", present_count: 38, total_students: 40, status: "completed" },
          { id: "SESS_103", subject_code: "CS308", date: "2026-07-20", present_count: 40, total_students: 45, status: "completed" },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

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
        const pct = Math.round((item.present_count / item.total_students) * 100);
        return (
          <div className="flex items-center gap-2">
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
              <Badge variant="primary" className="ml-1">
                HOD Workspace Access
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Academic Attendance & Workload Console Overview
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
            Approve Sessions
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Classes"
          value="4 Sessions"
          description="Next: CS301 at 10:30 AM"
          icon="📚"
          variant="indigo"
        />
        <StatCard
          title="Avg Attendance Rate"
          value="88.4%"
          trend={{ value: "+2.1%", positive: true }}
          description="vs. previous week"
          icon="📊"
          variant="emerald"
        />
        <StatCard
          title="Total Enrolled Students"
          value="142"
          description="Across 3 sections"
          icon="🎓"
          variant="blue"
        />
        <StatCard
          title="Pending Approvals"
          value="2 Requests"
          trend={{ value: "Action Required", positive: false }}
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
            <h2 className="text-base font-bold text-foreground">Recent Lecture Sessions</h2>
            <Link href="/faculty/attendance/take" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              View All →
            </Link>
          </div>
          <DataTable
            columns={columns}
            data={sessions}
            keyExtractor={(item) => item.id}
            loading={loading}
            emptyMessage="No recent attendance sessions found."
          />
        </div>

        {/* Quick Schedule & Info Panel */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">Today's Schedule</h2>
          <div className="solid-card rounded-2xl p-4 border border-border space-y-3">
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <p className="text-xs font-bold text-foreground">CS301 • Data Structures</p>
                <p className="text-[11px] text-muted-foreground">09:00 AM – 10:00 AM • Room 302</p>
              </div>
              <Badge variant="success">Completed</Badge>
            </div>
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <p className="text-xs font-bold text-foreground">CS304 • Database Management</p>
                <p className="text-[11px] text-muted-foreground">10:30 AM – 11:30 AM • Lab 04</p>
              </div>
              <Badge variant="primary">Next Up</Badge>
            </div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">CS308 • Operating Systems</p>
                <p className="text-[11px] text-muted-foreground">02:00 PM – 03:00 PM • Room 105</p>
              </div>
              <Badge variant="muted">Scheduled</Badge>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
