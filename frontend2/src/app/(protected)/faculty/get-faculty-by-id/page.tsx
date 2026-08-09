"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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

function FacultyLookupContent() {
  const searchParams = useSearchParams();
  const facultyIdParam =
    searchParams.get("fac") ||
    searchParams.get("faculty_id") ||
    searchParams.get("id") ||
    searchParams.get("reg") ||
    "";

  const [searchQuery, setSearchQuery] = useState(facultyIdParam);
  const [details, setDetails] = useState<FacultyFullDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(targetId: string) {
    if (!targetId) return;
    const cleanId = targetId.trim().toUpperCase();
    setLoading(true);
    setError("");
    setDetails(null);

    try {
      // 1. Fetch full real-time database analytics for faculty
      const res = await apiFetch(`/faculty/faculty-details/${encodeURIComponent(cleanId)}`);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.faculty) {
          setDetails(data);
        } else {
          throw new Error(`Faculty profile for ID "${cleanId}" not found.`);
        }
      } else {
        // Fallback: search by list if direct lookup fails
        const listRes = await apiFetch(`/faculty?limit=100`);
        if (listRes.ok) {
          const listData = await listRes.json().catch(() => ({}));
          const list = Array.isArray(listData?.data) ? listData.data : Array.isArray(listData) ? listData : [];
          const found = list.find(
            (f: any) =>
              f.faculty_id?.toUpperCase() === cleanId ||
              f.first_name?.toUpperCase() === cleanId ||
              f.email?.toUpperCase() === cleanId
          );
          if (found) {
            // Re-fetch using matched ID
            const retryRes = await apiFetch(`/faculty/faculty-details/${encodeURIComponent(found.faculty_id)}`);
            if (retryRes.ok) {
              const retryData = await retryRes.json();
              setDetails(retryData);
            } else {
              throw new Error(`Faculty record not found for ID: ${cleanId}`);
            }
          } else {
            throw new Error(`Faculty record not found for ID: ${cleanId}`);
          }
        } else {
          throw new Error(`Faculty record not found for ID: ${cleanId}`);
        }
      }
    } catch (e: any) {
      setError(e?.message || "Failed to locate faculty profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (facultyIdParam) {
      setSearchQuery(facultyIdParam);
      handleSearch(facultyIdParam);
    }
  }, [facultyIdParam]);

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
    <main className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-24 sm:pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
          Faculty Profile & Workload Record
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Detailed academic credentials, assigned teaching workload, and class attendance analytics.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="solid-card rounded-2xl p-3.5 sm:p-4 border border-border flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 bg-card shadow-xs">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch(searchQuery);
          }}
          placeholder="Enter Faculty ID (e.g. CSFAC01, CSFAC09) or email"
          className="h-10 sm:h-11 flex-1 w-full rounded-xl border border-border bg-background px-3.5 sm:px-4 py-2 text-xs sm:text-sm text-foreground outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-colors duration-150 font-mono uppercase"
        />
        <button
          type="button"
          onClick={() => handleSearch(searchQuery)}
          disabled={loading || !searchQuery}
          className="h-10 sm:h-11 w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-5 sm:px-6 text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 shrink-0"
        >
          {loading ? "Searching..." : "Lookup Faculty"}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-4 text-xs font-bold text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
          Loading faculty workload, assigned courses, and teaching attendance metrics...
        </div>
      ) : details ? (
        <div className="space-y-4 sm:space-y-6">
          {/* Header Profile Title Bar */}
          <div className="solid-card rounded-2xl p-4 sm:p-6 border border-border bg-card space-y-4 sm:space-y-6 shadow-xs">
            <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-border text-center md:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4 w-full md:w-auto">
                <div className="shrink-0">
                  <FacultyAvatar
                    firstName={details.faculty.name}
                    photoUrl={details.faculty.photo_url}
                    size="2xl"
                  />
                </div>
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mb-0.5">
                    <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-lg">
                      {details.faculty.faculty_id.toUpperCase()}
                    </span>
                    <Badge variant="primary">{details.faculty.department || "CS"}</Badge>
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
                      {details.faculty.status || "Active"}
                    </Badge>
                  </div>
                  <h2 className="text-lg sm:text-2xl font-black text-foreground">
                    {formattedFacultyName}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {formatDesignation(details.faculty.designation)} • {details.faculty.email}
                  </p>
                </div>
              </div>

              <Link
                href={`/faculty/hod/faculty/assign-subject?faculty_id=${encodeURIComponent(details.faculty.faculty_id)}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95 shrink-0"
              >
                <span>+ Assign / Manage Subjects</span>
              </Link>
            </div>

            {/* Credential Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-0.5 overflow-hidden">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Department</span>
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate block">{details.faculty.department || "Computer Science"}</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-0.5 overflow-hidden">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Designation</span>
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate block">{formatDesignation(details.faculty.designation)}</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-0.5 overflow-hidden">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Email Address</span>
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate block" title={details.faculty.email || "—"}>{details.faculty.email || "—"}</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-0.5 overflow-hidden">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Account Status</span>
                <span className="text-xs sm:text-sm font-semibold text-foreground capitalize truncate block">{details.faculty.status || "Active"}</span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-0.5 overflow-hidden">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Assigned Workload</span>
                <span className="text-xs sm:text-sm font-extrabold text-indigo-600 dark:text-indigo-400 truncate block">
                  {details.stats.total_assigned_subjects} Subject{details.stats.total_assigned_subjects === 1 ? "" : "s"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-0.5 overflow-hidden">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Overall Class Attendance</span>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 truncate block">
                  {details.stats.avg_attendance_pct}% Avg
                </span>
              </div>
            </div>
          </div>

          {/* Key Analytics Cards Grid */}
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
                  <span>7 Days: <strong className="text-foreground font-bold">{details.stats.classes_last_7_days}</strong></span>
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
                  Across {details.stats.total_records_marked} marked records
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
              maxHeight="max-h-[420px]"
              textsize="text-xs"
              emptyMessage="No class attendance sessions recorded by this faculty member yet."
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function GetFacultyByIdPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading faculty lookup console...</div>}>
      <FacultyLookupContent />
    </Suspense>
  );
}
