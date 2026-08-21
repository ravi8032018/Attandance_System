"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useUserMe } from "@/hooks/useUserMe";
import { FacultyAvatar } from "@/components/ui/FacultyAvatar";
import { Badge } from "@/components/ui/Badge";

function AdminProfileContent() {
  const { user, isAdmin, loading } = useUserMe();

  const firstName = user?.first_name || user?.name || "Admin";
  const lastName = user?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Administrator";
  const email = user?.email || "";
  const department = user?.department || null;
  const rolesList = Array.isArray(user?.role) ? user.role : user?.role ? [user.role] : ["admin"];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span>🛡️ System Administrator Profile</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Administrative account credentials, system privileges, and access controls.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2.5 w-full sm:w-auto">
          <Link
            href="/admin/users"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-xs gap-1.5 shrink-0"
          >
            <span>👥 User Manager</span>
          </Link>
          <Link
            href="/admin/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-border bg-card hover:bg-muted text-foreground px-4 py-2.5 text-xs font-bold transition-all shadow-xs gap-1.5 shrink-0"
          >
            <span>← Console</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="solid-card rounded-2xl p-8 border border-border animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-muted rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-1/4" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Profile Header Card (Oriented identically to HOD/Faculty Profile) */}
          <div className="solid-card rounded-2xl p-4 sm:p-6 border border-border space-y-4 bg-card">
            <div className="flex flex-col md:flex-row items-center justify-between gap-5 pb-6 border-b border-border text-center md:text-left">
              {/* Avatar & User Info */}
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 w-full md:w-auto">
                <div className="shrink-0">
                  <FacultyAvatar
                    firstName={firstName}
                    lastName={lastName}
                    photoUrl={user?.photo_url}
                    size="3xl"
                  />
                </div>
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    {fullName}
                  </h2>
                  {email && <p className="text-xs font-semibold text-muted-foreground">{email}</p>}
                  <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                    <Badge variant="success" className="px-2.5 py-1 text-xs font-bold">
                      System Administrator
                    </Badge>
                    {department && (
                      <Badge variant="primary" className="px-2.5 py-1 text-xs font-bold">
                        {department}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Admin Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
                <Link
                  href="/admin/audit-logs"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0"
                >
                  <span>📜 Audit Logs</span>
                </Link>
                <Link
                  href="/admin/curriculum"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0"
                >
                  <span>📚 Curriculum Control</span>
                </Link>
              </div>
            </div>

            {/* Profile Info Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 md:bg-transparent md:border-none md:p-0">
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                  Account Name
                </label>
                <p className="mt-1 text-xs font-bold text-foreground">{fullName}</p>
              </div>

              {email && (
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 md:bg-transparent md:border-none md:p-0">
                  <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                    Account Email
                  </label>
                  <p className="mt-1 text-xs font-bold text-foreground truncate">{email}</p>
                </div>
              )}

              {department && (
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 md:bg-transparent md:border-none md:p-0">
                  <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                    Department
                  </label>
                  <p className="mt-1 text-xs font-bold text-foreground">{department}</p>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 md:bg-transparent md:border-none md:p-0">
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                  Assigned Roles
                </label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {rolesList.map((r: string) => (
                    <span key={r} className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Admin Tools & Workspaces Navigation */}
          <div className="solid-card rounded-2xl p-6 border border-border space-y-4 bg-card">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <span>⚡ Administrative Control Center</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/admin/users"
                className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/70 hover:border-indigo-500/40 transition-all space-y-1.5 group"
              >
                <div className="text-xl">👥</div>
                <h4 className="text-xs font-extrabold text-foreground group-hover:text-indigo-500 transition-colors">
                  User Management
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Create, configure, and manage faculty and student accounts system-wide.
                </p>
              </Link>

              <Link
                href="/admin/curriculum"
                className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/70 hover:border-emerald-500/40 transition-all space-y-1.5 group"
              >
                <div className="text-xl">📚</div>
                <h4 className="text-xs font-extrabold text-foreground group-hover:text-emerald-500 transition-colors">
                  Curriculum &amp; Workload
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Manage department subject pools, semester curriculums, and workload distribution.
                </p>
              </Link>

              <Link
                href="/admin/audit-logs"
                className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/70 hover:border-purple-500/40 transition-all space-y-1.5 group"
              >
                <div className="text-xl">📊</div>
                <h4 className="text-xs font-extrabold text-foreground group-hover:text-purple-500 transition-colors">
                  System Audit Logs
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Monitor system access logs, authentication events, and data changes in real time.
                </p>
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function AdminProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-bold text-muted-foreground animate-pulse">
          Loading admin profile...
        </div>
      }
    >
      <AdminProfileContent />
    </Suspense>
  );
}

