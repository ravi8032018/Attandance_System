"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { DataTable, Column } from "@/components/ui/DataTable";
import { FacultyAvatar } from "@/components/ui/FacultyAvatar";
import { apiFetch } from "@/lib/api";
import { formatFacultyName, formatDesignation } from "@/lib/utils";

interface FacultyFullDetails {
  faculty: {
    faculty_id: string;
    name: string;
    email: string;
    department: string;
    designation: string;
    status: string;
    office_location?: string;
    contact_number?: string;
    photo_url?: string;
    is_hod?: boolean;
    role?: string | string[];
  };
  stats: {
    total_assigned_subjects: number;
    total_classes_conducted: number;
    classes_last_7_days: number;
    classes_last_30_days: number;
    avg_attendance_pct: number;
    pending_approvals_count: number;
    cr_delegated_count: number;
    total_records_marked: number;
  };
  assigned_subjects: Array<{
    subject_code: string;
    subject_name: string;
    department: string;
    semester: string;
    total_sessions: number;
    avg_attendance_pct: number;
  }>;
  recent_sessions: Array<{
    session_id: string;
    date: string;
    subject_code: string;
    subject_name: string;
    status: string;
    submitted_by: string;
    present_count: number;
    absent_count: number;
    class_size: number;
  }>;
}

function ArrowLeftIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

export default function DedicatedFacultyDetailsPage() {
  const params = useParams();
  const rawId = params?.faculty_id;
  const facultyId = Array.isArray(rawId) ? rawId[0] : rawId || "";

  const [details, setDetails] = useState<FacultyFullDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      if (!facultyId) return;
      setLoading(true);
      try {
        const res = await apiFetch(`/faculty/faculty-details/${encodeURIComponent(facultyId)}`);
        if (res.ok) {
          const data = await res.json();
          setDetails(data);
        }
      } catch (e) {
        // console.error("Failed to load faculty details", e);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [facultyId]);

  const formattedFacultyName = formatFacultyName(details?.faculty.name);

  type RecentSession = FacultyFullDetails["recent_sessions"][number];

  const sessionColumns: Column<RecentSession>[] = [
    {
      header: "Class Date & Time",
      accessor: (sess) => (
        <span className="font-bold text-foreground">
          {new Date(sess.date).toLocaleDateString()} {new Date(sess.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      header: "Subject Name / Code",
      accessor: (sess) => (
        <div>
          <span className="font-bold text-foreground block">{sess.subject_name}</span>
          <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
            {sess.subject_code}
          </span>
        </div>
      ),
    },
    {
      header: "Conducted By",
      accessor: (sess) => (
        <span className="font-semibold text-foreground">
          {sess.submitted_by}
        </span>
      ),
    },
    {
      header: "Present / Class Size",
      accessor: (sess) => (
        <span className="font-mono font-bold">
          {sess.present_count} / {sess.class_size} Present
        </span>
      ),
    },
    {
      header: "Approval Status",
      accessor: (sess) => (
        <Badge
          variant={
            sess.status === "approved" || sess.status === "marked_by_faculty"
              ? "success"
              : "warning"
          }
        >
          {sess.status}
        </Badge>
      ),
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      {/* Back Button & Navigation */}
      <div>
        <Link
          href="/faculty/hod/faculty"
          className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-500/10 px-3.5 py-1.5 rounded-xl border border-indigo-500/20 transition-all active:scale-95"
        >
          <ArrowLeftIcon />
          <span>Back to Faculty Registry</span>
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse bg-muted/80 rounded-2xl">
          Loading faculty workload, assigned courses, and teaching attendance metrics...
        </div>
      ) : !details ? (
        <div className="solid-card rounded-2xl p-12 text-center space-y-2 border border-border">
          <div className="text-3xl">👨‍🏫</div>
          <h2 className="text-base font-bold text-foreground">Faculty Member Not Found</h2>
          <p className="text-xs text-muted-foreground">
            Could not locate information for Faculty ID <strong className="font-mono">{facultyId}</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Profile Card (Matching get-student-by-id UI design) */}
          <div className="solid-card rounded-2xl p-6 border border-border space-y-6 bg-card shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">

              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 text-center sm:text-left w-full sm:w-auto">
                <div className="shrink-0">
                  <FacultyAvatar
                    firstName={details.faculty.name}
                    photoUrl={details.faculty.photo_url}
                    size="2xl"
                  />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">
                    {formattedFacultyName}
                  </h2>
                  <p className="text-sm sm:text-base font-mono font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wide">
                    {details.faculty.faculty_id.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 ">
                <Badge variant="primary">{details.faculty.department || "-NA-"}</Badge>
                {Boolean(details.faculty.is_hod) ||
                (Array.isArray(details.faculty.role)
                  ? details.faculty.role.includes("hod")
                  : String(details.faculty.role || "").toLowerCase().includes("hod")) ||
                String(details.faculty.designation || "").toLowerCase().includes("hod") ? (
                  <Badge variant="warning">HOD</Badge>
                ) : (
                  <Badge variant="secondary">{formatDesignation(details.faculty.designation)}</Badge>
                )}
                <Badge variant={details.faculty.status === "inactive" ? "error" : "success"}>
                  {(details.faculty.status || "Active").toUpperCase()}
                </Badge>

                <Link
                  href={`/faculty/hod/faculty/assign-subject?faculty_id=${encodeURIComponent(facultyId)}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95 shrink-0"
                >
                  <span>+ Assign / Manage Subjects</span>
                </Link>
              </div>
            </div>

            {/* Information Grid based on backend fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Email Address</span>
                <span className="text-sm font-semibold text-foreground">{details.faculty.email || "—"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Designation</span>
                <span className="text-sm font-semibold text-foreground">{formatDesignation(details.faculty.designation)}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Department</span>
                <span className="text-sm font-semibold text-foreground">{details.faculty.department || "Computer Science"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Account Status</span>
                <span className="text-sm font-semibold text-foreground capitalize">{details.faculty.status || "Active"}</span>
              </div>
            </div>
          </div>
          {/* Key Metrics Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="solid-card rounded-2xl border border-border p-5 bg-card flex flex-col justify-between shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                Assigned Courses
              </span>
              <div>
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                  {details.stats.total_assigned_subjects} <span className="text-xs font-semibold text-muted-foreground">Subjects</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Active curriculum allocation</p>
              </div>
            </div>

            <div className="solid-card rounded-2xl border border-border p-5 bg-card flex flex-col justify-between shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                Classes Conducted
              </span>
              <div>
                <div className="text-3xl font-black text-foreground">
                  {details.stats.total_classes_conducted} <span className="text-xs font-semibold text-muted-foreground">Sessions</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                  <span>Last 7 Days: <strong className="text-foreground font-bold">{details.stats.classes_last_7_days}</strong></span>
                  <span>•</span>
                  <span>30 Days: <strong className="text-foreground font-bold">{details.stats.classes_last_30_days}</strong></span>
                </div>
              </div>
            </div>

            <div className="solid-card rounded-2xl border border-border p-5 bg-card flex flex-col justify-between shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                Avg Class Attendance
              </span>
              <div>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {details.stats.avg_attendance_pct}%
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Across {details.stats.total_records_marked} marked student records
                </p>
              </div>
            </div>

            <div className="solid-card rounded-2xl border border-border p-5 bg-card flex flex-col justify-between shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                Pending Approvals & CRs
              </span>
              <div>
                <div className="text-3xl font-black text-amber-500">
                  {details.stats.pending_approvals_count} <span className="text-xs font-semibold text-muted-foreground">Pending</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {details.stats.cr_delegated_count} sessions delegated to CRs
                </p>
              </div>
            </div>
          </div>

          {/* Assigned Courses & Workload Breakdown */}
          <div className="solid-card rounded-2xl border border-border p-5 bg-card space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-foreground">
                  Assigned Courses & Teaching Workload ({details.assigned_subjects.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Courses assigned to {formattedFacultyName} for the current academic session.
                </p>
              </div>
            </div>

            {details.assigned_subjects.length === 0 ? (
              <p className="text-xs text-muted-foreground p-6 text-center border border-dashed border-border rounded-xl">
                No subjects currently assigned to this faculty member. Use the "+ Assign / Manage Subjects" button to allocate courses.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {details.assigned_subjects.map((sub) => (
                  <Link
                    key={sub.subject_code}
                    href={`/faculty/hod/curriculum/${encodeURIComponent(sub.subject_code)}`}
                    className="p-4 rounded-xl border border-border bg-background hover:border-indigo-500/50 hover:shadow-md transition-all group space-y-2 block"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                        {sub.subject_code}
                      </span>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary">Sem {sub.semester}</Badge>
                        <Badge variant="primary">{sub.department}</Badge>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                      {sub.subject_name}
                    </h4>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Classes: <strong className="text-foreground">{sub.total_sessions} Held</strong></span>
                      <span>Avg: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{sub.avg_attendance_pct}%</strong></span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Teaching & Class Attendance Activity Log */}
          <div className="solid-card rounded-2xl border border-border p-5 bg-card space-y-4 shadow-xs">
            <h3 className="text-base font-extrabold text-foreground">
              Recent Attendance Sessions Log ({details.recent_sessions.length})
            </h3>

            <DataTable
              columns={sessionColumns}
              data={details.recent_sessions}
              keyExtractor={(sess) => sess.session_id}
              maxHeight="max-h-[400px]"
              textsize="text-xs"
              emptyMessage="No class attendance sessions recorded by this faculty member yet."
            />
          </div>
        </div>
      )}
    </main>
  );
}
