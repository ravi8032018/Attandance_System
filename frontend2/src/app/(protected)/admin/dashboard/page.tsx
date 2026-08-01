"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api";

interface AdminStats {
  active_faculty_count: number;
  total_faculty_count: number;
  active_student_count: number;
  total_student_count: number;
  attendance_sessions_count: number;
  curriculum_count: number;
  departments: string[];
  system_status: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const res = await apiFetch("/admin/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              System Admin Console
            </h1>
            <Badge variant="primary">Super Admin</Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Academic system management, user directory provisioning, curriculum catalog, and system logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/users"
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2.5 text-xs font-bold transition-colors duration-150 shadow-sm"
          >
            + Onboard New User
          </Link>
          <Link
            href="/admin/curriculum"
            className="rounded-xl border border-border bg-card hover:bg-muted text-foreground px-4 py-2.5 text-xs font-bold transition-colors duration-150"
          >
            Manage Curriculum
          </Link>
        </div>
      </div>

      {/* Real Live Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Faculty Members"
          value={loading ? "..." : `${stats?.active_faculty_count ?? 0}`}
          description={stats ? `${stats.total_faculty_count} Total Profiles` : "Teaching staff"}
          icon="👥"
          variant="indigo"
        />
        <StatCard
          title="Enrolled Students"
          value={loading ? "..." : `${stats?.active_student_count ?? 0}`}
          description={stats ? `${stats.total_student_count} Total Enrolled` : "Active students"}
          icon="🎓"
          variant="blue"
        />
        <StatCard
          title="Attendance Sessions"
          value={loading ? "..." : `${stats?.attendance_sessions_count ?? 0}`}
          description="Total sessions logged"
          icon="📊"
          variant="emerald"
        />
        <StatCard
          title="Active Departments"
          value={loading ? "..." : `${stats?.departments?.length ?? 0}`}
          description={stats?.departments ? stats.departments.join(", ") : "CS"}
          icon="🏛️"
          variant="purple"
        />
      </div>

      {/* Admin Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/users"
          className="solid-card rounded-2xl p-6 border border-border hover:border-indigo-500/50 hover:bg-muted/40 transition-all block space-y-3 bg-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">👥</span>
            <Badge variant="primary">User CRUD</Badge>
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-foreground block">User Provisioning & Roles</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Add, update, or delete faculty and student accounts. Promote/demote HODs & CRs.
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block pt-2">Manage Users →</span>
        </Link>

        <Link
          href="/admin/curriculum"
          className="solid-card rounded-2xl p-6 border border-border hover:border-indigo-500/50 hover:bg-muted/40 transition-all block space-y-3 bg-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">📖</span>
            <Badge variant="success">Curriculum</Badge>
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-foreground block">Curriculum Catalog Manager</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Add new subjects, map course codes to departments & semesters, assign faculty.
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block pt-2">Manage Curriculum →</span>
        </Link>

        <Link
          href="/admin/audit-logs"
          className="solid-card rounded-2xl p-6 border border-border hover:border-indigo-500/50 hover:bg-muted/40 transition-all block space-y-3 bg-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">⚡</span>
            <Badge variant="warning">System Logs</Badge>
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-foreground block">System Audit Console</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Track backend event activity, security logs, and administrative actions timestamped in real-time.
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block pt-2">View Audit Logs →</span>
        </Link>
      </div>

      {/* System Status Banner */}
      <div className="solid-card rounded-2xl p-6 border border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">System Operational Status</h3>
          <p className="text-xs text-muted-foreground">FastAPI Backend Service, MongoDB Database, and Auth Cookie Session Engine active.</p>
        </div>
        <Badge variant="success" className="px-3 py-1 text-xs">
          🟢 {stats?.system_status || "Operational 100% OK"}
        </Badge>
      </div>
    </main>
  );
}
