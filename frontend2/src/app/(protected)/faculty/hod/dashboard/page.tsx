"use client";

import React from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";

export default function HODDashboardPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              HOD Department Overview
            </h1>
            <Badge variant="primary">Computer Science Dept</Badge>
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
          value="18 Members"
          description="Active teaching staff"
          icon="👥"
        />
        <StatCard
          title="Enrolled Students"
          value="340"
          description="Across Semesters 1-8"
          icon="🎓"
        />
        <StatCard
          title="Dept Attendance Avg"
          value="86.2%"
          trend={{ value: "+1.8%", positive: true }}
          description="Target threshold: 75%"
          icon="📈"
        />
        <StatCard
          title="Active Curriculum"
          value="24 Subjects"
          description="Covering 4 academic tracks"
          icon="📚"
        />
      </div>

      {/* Workspace Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="solid-card rounded-2xl p-6 border border-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-base font-bold text-foreground">Faculty Workload Allocation</h2>
            <Link href="/faculty/hod/faculty" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              Assign Subjects →
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage subject assignments per faculty member, inspect semester load, and prevent overload.
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-border">
              <span className="font-semibold">Dr. Alan Turing (CSFAC01)</span>
              <Badge variant="success">3 Subjects Assigned</Badge>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-border">
              <span className="font-semibold">Prof. Grace Hopper (CSFAC02)</span>
              <Badge variant="warning">1 Subject Assigned</Badge>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5">
              <span className="font-semibold">Dr. Donald Knuth (CSFAC03)</span>
              <Badge variant="success">2 Subjects Assigned</Badge>
            </div>
          </div>
        </div>

        <div className="solid-card rounded-2xl p-6 border border-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-base font-bold text-foreground">Department Quick Utilities</h2>
            <Link href="/faculty/hod/reports" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              Full Reports →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/faculty/hod/students"
              className="rounded-xl border border-border p-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors duration-150 block"
            >
              <span className="text-lg block mb-1">🎓</span>
              <span className="text-xs font-bold text-foreground block">Student Roster</span>
              <span className="text-[10px] text-muted-foreground block">View by semester</span>
            </Link>
            <Link
              href="/faculty/hod/curriculum"
              className="rounded-xl border border-border p-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors duration-150 block"
            >
              <span className="text-lg block mb-1">📖</span>
              <span className="text-xs font-bold text-foreground block">Curriculum Catalog</span>
              <span className="text-[10px] text-muted-foreground block">Subject codes & details</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
