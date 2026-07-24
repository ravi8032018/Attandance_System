"use client";

import React from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";

export default function StudentDashboardPage() {
  const subjects = [
    { code: "CS301", name: "Data Structures", attended: 22, total: 24, pct: 91 },
    { code: "CS304", name: "Database Systems", attended: 18, total: 22, pct: 81 },
    { code: "CS308", name: "Operating Systems", attended: 14, total: 20, pct: 70 },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Student Attendance Portal
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Track subject attendance records, eligibility status, and class notices.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Overall Attendance" value="82.4%" trend={{ value: "Good Standing", positive: true }} icon="🎓" />
        <StatCard title="Classes Attended" value="54 / 66" icon="✓" />
        <StatCard title="Mandatory Threshold" value="75.0%" description="Minimum for exam eligibility" icon="⚖️" />
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-bold text-foreground">Subject Attendance Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subjects.map((subj) => (
            <div key={subj.code} className="solid-card rounded-2xl p-5 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{subj.code}</span>
                <Badge variant={subj.pct >= 75 ? "success" : "warning"}>{subj.pct}%</Badge>
              </div>
              <h3 className="text-sm font-bold text-foreground">{subj.name}</h3>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                <span>Attended Sessions:</span>
                <span className="font-bold text-foreground">{subj.attended} / {subj.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
