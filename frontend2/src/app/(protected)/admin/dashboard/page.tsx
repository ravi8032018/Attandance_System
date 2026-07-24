"use client";

import React from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";

export default function AdminDashboardPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              System Admin Console
            </h1>
            <Badge variant="primary">Super Admin</Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Academic system statistics, user directory overview, and system health status.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Faculty Members" value="42" icon="👥" />
        <StatCard title="Enrolled Students" value="1,280" icon="🎓" />
        <StatCard title="Departments Active" value="4" description="CS, CSE, ECE, AGRI" icon="🏛️" />
        <StatCard title="Backend API Health" value="100% OK" trend={{ value: "FastAPI Online", positive: true }} icon="⚡" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="solid-card rounded-2xl p-6 border border-border space-y-4">
          <h2 className="text-base font-bold text-foreground pb-2 border-b border-border">
            Quick Administrative Links
          </h2>
          <div className="space-y-2">
            <Link
              href="/faculty/list_students"
              className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors duration-150"
            >
              <div>
                <span className="text-xs font-bold text-foreground block">View Student Directory</span>
                <span className="text-[11px] text-muted-foreground block">Filter all enrolled students</span>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Manage →</span>
            </Link>

            <Link
              href="/faculty/hod/faculty"
              className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors duration-150"
            >
              <div>
                <span className="text-xs font-bold text-foreground block">View Faculty Directory</span>
                <span className="text-[11px] text-muted-foreground block">Subject assignment and workload</span>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Manage →</span>
            </Link>
          </div>
        </div>

        <div className="solid-card rounded-2xl p-6 border border-border space-y-4">
          <h2 className="text-base font-bold text-foreground pb-2 border-b border-border">
            System Configuration Status
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Backend API Service:</span>
              <Badge variant="success">FastAPI + MongoDB Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Auth Session Manager:</span>
              <Badge variant="success">Cookie HTTP-Only Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Design System:</span>
              <Badge variant="primary">Restrained Modern Tokens</Badge>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
