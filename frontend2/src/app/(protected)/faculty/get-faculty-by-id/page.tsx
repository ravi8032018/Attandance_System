"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { FacultyAvatar } from "@/components/ui/FacultyAvatar";
import { apiFetch } from "@/lib/api";

interface AssignedSubject {
  subject_code: string;
  subject_name: string;
  department?: string;
  semester?: string;
}

function FacultyLookupContent() {
  const searchParams = useSearchParams();
  const facultyIdParam = searchParams.get("faculty_id") || searchParams.get("id") || "";
  const [facultyId, setFacultyId] = useState(facultyIdParam);
  const [faculty, setFaculty] = useState<any>(null);
  const [assignedSubjects, setAssignedSubjects] = useState<AssignedSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(targetId: string) {
    if (!targetId) return;
    const cleanId = targetId.trim().toUpperCase();
    setLoading(true);
    setError("");
    setFaculty(null);
    setAssignedSubjects([]);

    try {
      // 1. Fetch Faculty Profile by ID
      const res = await apiFetch(`/faculty/faculty-id/${encodeURIComponent(cleanId)}`);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setFaculty(data?.data || data);
      } else {
        // Fallback search via list if direct ID lookup fails
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
            setFaculty(found);
          } else {
            throw new Error(`Faculty record not found for ID: ${cleanId}`);
          }
        } else {
          throw new Error(`Faculty record not found for ID: ${cleanId}`);
        }
      }

      // 2. Fetch Assigned Subjects for this Faculty
      try {
        const subjRes = await apiFetch(
          `/curriculum/my-subjects-for-sem?Faculty_id=${encodeURIComponent(cleanId)}`
        );
        if (subjRes.ok) {
          const subjData = await subjRes.json().catch(() => ({}));
          const items = Array.isArray(subjData?.data) ? subjData.data : [];
          const flattened: AssignedSubject[] = items.flatMap((item: any) =>
            (item.subjects || []).map((s: any) => ({
              subject_code: s.subject_code,
              subject_name: s.subject_name || `Subject ${s.subject_code}`,
              department: item.department,
              semester: item.semester,
            }))
          );
          setAssignedSubjects(flattened);
        }
      } catch (e) {
        console.warn("Could not load assigned subjects for faculty", e);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to locate faculty profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (facultyIdParam) {
      handleSearch(facultyIdParam);
    }
  }, [facultyIdParam]);

  const isHodRole =
    faculty?.role?.includes("hod") ||
    faculty?.designation?.toUpperCase().includes("HOD") ||
    faculty?.designation?.toUpperCase().includes("HEAD");

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Faculty Profile & Workload Record
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Detailed academic profile, department credentials, and assigned teaching workload metrics.
        </p>
      </div>

      {/* Search Input */}
      <div className="solid-card rounded-2xl p-4 border border-border flex flex-col sm:flex-row items-center gap-3">
        <input
          type="text"
          value={facultyId}
          onChange={(e) => setFacultyId(e.target.value)}
          placeholder="Enter Faculty ID (e.g. CSFAC01)"
          className="h-11 flex-1 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-colors duration-150 font-mono uppercase"
        />
        <button
          type="button"
          onClick={() => handleSearch(facultyId)}
          disabled={loading || !facultyId}
          className="h-11 w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-6 py-2 text-xs font-bold transition-colors duration-150 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Lookup Faculty"}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-4 text-xs font-bold text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {faculty && (
        <div className="space-y-6">
          {/* Main Profile Card */}
          <div className="solid-card rounded-2xl p-6 border border-border space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
              <div className="flex items-center gap-4">
                <FacultyAvatar
                  firstName={faculty.first_name}
                  lastName={faculty.last_name}
                  photoUrl={faculty.photo_url}
                  size="2xl"
                />
                <div>
                  <h2 className="text-xl font-extrabold text-foreground">
                    {faculty.first_name} {faculty.last_name || ""}
                  </h2>
                  <p className="text-sm font-mono font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wide mt-0.5">
                    {faculty.faculty_id}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">
                    {faculty.email || "No email registered"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary">{faculty.department || "CS"}</Badge>
                {isHodRole && <Badge variant="warning">HOD</Badge>}
                <Badge variant={faculty.status === "active" ? "success" : "secondary"}>
                  {(faculty.status || "active").toUpperCase()}
                </Badge>
                <Link
                  href={`/faculty/hod/faculty/assign-subject?faculty_id=${encodeURIComponent(faculty.faculty_id)}`}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-3.5 py-1.5 text-xs font-bold transition-colors duration-150 shadow-xs"
                >
                  Assign Subjects
                </Link>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Department</span>
                <span className="text-sm font-semibold text-foreground">{faculty.department || "Computer Science"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Designation</span>
                <span className="text-sm font-semibold text-foreground">
                  {faculty.designation || (isHodRole ? "Head of Department (HOD)" : "Assistant Professor")}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Email Address</span>
                <span className="text-sm font-semibold text-foreground">{faculty.email || "—"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Account Status</span>
                <span className="text-sm font-semibold text-foreground capitalize">{faculty.status || "Active"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Profile Completed</span>
                <span className="text-sm font-semibold text-foreground">
                  {faculty.profile_complete ? "Yes" : "Pending Update"}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Assigned Workload</span>
                <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                  {assignedSubjects.length} Subject{assignedSubjects.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          {/* Workload / Teaching Assignments */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">Current Teaching Assignments</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                title="Assigned Subjects Count"
                value={String(assignedSubjects.length)}
                icon="📖"
              />
              <StatCard
                title="Workload Status"
                value={assignedSubjects.length > 0 ? "Active Load" : "No Assignments"}
                trend={{
                  value: assignedSubjects.length >= 3 ? "High Load" : assignedSubjects.length > 0 ? "Normal Load" : "Unassigned",
                  positive: assignedSubjects.length > 0 && assignedSubjects.length <= 4,
                }}
                icon="📊"
              />
            </div>

            <div className="solid-card rounded-2xl p-6 border border-border space-y-4">
              <h4 className="text-sm font-bold text-foreground">Subject Roster</h4>

              {assignedSubjects.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                        <th className="pb-3 px-2">Subject Code</th>
                        <th className="pb-3 px-2">Subject Name</th>
                        <th className="pb-3 px-2 text-center">Department</th>
                        <th className="pb-3 px-2 text-center">Semester</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {assignedSubjects.map((subj, idx) => (
                        <tr key={`${subj.subject_code}-${idx}`}>
                          <td className="py-3 px-2 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            {subj.subject_code}
                          </td>
                          <td className="py-3 px-2 font-semibold text-foreground">
                            {subj.subject_name}
                          </td>
                          <td className="py-3 px-2 text-center font-medium">
                            <Badge variant="secondary">{subj.department || faculty.department || "CS"}</Badge>
                          </td>
                          <td className="py-3 px-2 text-center font-medium">
                            {subj.semester ? `Sem ${subj.semester}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-xs font-medium text-muted-foreground space-y-3">
                  <p>No subjects currently assigned to this faculty member.</p>
                  <Link
                    href={`/faculty/hod/faculty/assign-subject?faculty_id=${encodeURIComponent(faculty.faculty_id)}`}
                    className="inline-block rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 text-white px-4 py-2 text-xs font-bold transition-colors"
                  >
                    + Assign Subject Now
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
