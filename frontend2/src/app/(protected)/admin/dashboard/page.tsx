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
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-col items-start sm:flex-row sm:items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <span>🛡️ System Admin Console</span>
            </h1>
            <Badge variant="primary" className="shrink-0">Super Admin</Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Centralized academic infrastructure, user directory provisioning, curriculum catalog, and system logs console.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-2 md:mt-0">
          <Link
            href="/admin/users"
            className="w-full sm:w-auto flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-xs font-bold transition-all shadow-xs shrink-0 active:scale-95"
          >
            + Onboard New User
          </Link>
          <Link
            href="/admin/curriculum"
            className="w-full sm:w-auto flex items-center justify-center rounded-xl border border-border bg-card hover:bg-muted text-foreground px-4 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-xs font-bold transition-all shrink-0 active:scale-95"
          >
            Manage Curriculum
          </Link>
        </div>
      </div>

      {/* Real Live Metrics Cards */}
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
          description={stats?.departments ? stats.departments.join(", ") : "CS, CSE, ECE, AGRI"}
          icon="🏛️"
          variant="purple"
        />
      </div>

      {/* Core Admin Workspaces Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
          <span>⚡ Executive Workspaces</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Link
            href="/admin/users"
            className="solid-card rounded-2xl p-6 border border-border hover:border-indigo-500/50 hover:bg-muted/40 transition-all block space-y-3 bg-card group relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">👥</span>
              <Badge variant="primary">User CRUD</Badge>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                User Provisioning & Directory
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Provision faculty and student profiles. Promote HODs & Class Representatives, manage credentials & reset passwords.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block pt-2 group-hover:translate-x-1 transition-transform">
              Manage Users →
            </span>
          </Link>

          <Link
            href="/admin/curriculum"
            className="solid-card rounded-2xl p-6 border border-border hover:border-indigo-500/50 hover:bg-muted/40 transition-all block space-y-3 bg-card group relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">📖</span>
              <Badge variant="success">Curriculum</Badge>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Curriculum Catalog & Workload
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Add new subjects, map course codes to departments & semesters, and assign faculty teaching workloads.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block pt-2 group-hover:translate-x-1 transition-transform">
              Manage Curriculum →
            </span>
          </Link>

          <Link
            href="/admin/reports"
            className="solid-card rounded-2xl p-6 border border-border hover:border-indigo-500/50 hover:bg-muted/40 transition-all block space-y-3 bg-card group relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">📊</span>
              <Badge variant="teal">Analytics</Badge>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Reports & Defaulter Intelligence
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                System-wide attendance overview, attendance threshold defaulters, workload distribution, and CSV exports.
              </p>
            </div>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 block pt-2 group-hover:translate-x-1 transition-transform">
              View Analytics →
            </span>
          </Link>

          <Link
            href="/admin/audit-logs"
            className="solid-card rounded-2xl p-6 border border-border hover:border-indigo-500/50 hover:bg-muted/40 transition-all block space-y-3 bg-card group relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">⚡</span>
              <Badge variant="warning">Audit Trail</Badge>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                System Audit & Security Logs
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Track security auth attempts, administrative changes, and backend event activity timestamped in real-time.
              </p>
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block pt-2 group-hover:translate-x-1 transition-transform">
              View Audit Logs →
            </span>
          </Link>

          <Link
            href="/admin/feedback"
            className="solid-card rounded-2xl p-6 border border-border hover:border-indigo-500/50 hover:bg-muted/40 transition-all block space-y-3 bg-card group relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">💬</span>
              <Badge variant="muted">Helpdesk</Badge>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                User Feedback & Issues
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Review submitted student and faculty feedback, resolve system tickets, and track satisfaction trends.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block pt-2 group-hover:translate-x-1 transition-transform">
              Manage Feedback →
            </span>
          </Link>

          <Link
            href="/admin/notifications"
            className="solid-card rounded-2xl p-6 border border-border hover:border-indigo-500/50 hover:bg-muted/40 transition-all block space-y-3 bg-card group relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">🔔</span>
              <Badge variant="primary">Broadcasts</Badge>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Notifications & Announcements
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Dispatch system-wide notifications and announcements to faculty, HODs, and student body.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block pt-2 group-hover:translate-x-1 transition-transform">
              View Notifications →
            </span>
          </Link>
        </div>
      </div>

      {/* System Status Banner */}
      <div className="solid-card rounded-2xl p-6 border border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
            <span>🖥️ Operational Infrastructure Status</span>
          </h3>
          <p className="text-xs text-muted-foreground">FastAPI Async Core, MongoDB Replica Instance, and Auth Cookie Session Engine active.</p>
        </div>
        <Badge variant="success" className="px-3 py-1.5 text-xs font-bold shrink-0">
          🟢 {stats?.system_status || "Operational 100% OK"}
        </Badge>
      </div>
    </main>
  );
}
