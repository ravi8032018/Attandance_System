"use client";

import React from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";

export default function HODReportsPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Reports & Analytics Console
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Department-wide attendance statistics, threshold flags, and report export tools.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Department Mean Attendance" value="86.2%" trend={{ value: "+1.8%", positive: true }} icon="📊" />
        <StatCard title="Low Attendance Alerts (<75%)" value="14 Students" trend={{ value: "Warning Flagged", positive: false }} icon="⚠️" />
        <StatCard title="Total Sessions Conducted" value="128 Sessions" icon="📝" />
      </div>

      <div className="solid-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-base font-bold text-foreground pb-2 border-b border-border">
          Export Academic Reports
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
            <h3 className="text-xs font-bold text-foreground">Monthly Department Attendance Report</h3>
            <p className="text-[11px] text-muted-foreground">Complete breakdown of all subjects and attendance percentages.</p>
            <button
              type="button"
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-bold transition-colors duration-150"
            >
              Export CSV
            </button>
          </div>

          <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
            <h3 className="text-xs font-bold text-foreground">Faculty Workload Distribution</h3>
            <p className="text-[11px] text-muted-foreground">Subject allocation and teaching load per faculty member.</p>
            <button
              type="button"
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-bold transition-colors duration-150"
            >
              Export Report
            </button>
          </div>

          <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
            <h3 className="text-xs font-bold text-foreground">Defaulter Student Warning List</h3>
            <p className="text-[11px] text-muted-foreground">List of students falling below the mandatory 75% attendance threshold.</p>
            <button
              type="button"
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-bold transition-colors duration-150"
            >
              Export Defaulters
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
