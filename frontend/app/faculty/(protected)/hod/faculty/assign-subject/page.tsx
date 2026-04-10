// app/hod/faculty/assign-subject/page.jsx (or similar)
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFacultySubjects } from "@/src/_hooks/get_subjects_list_for_faculty";
import FacultyPicker from "@/src/_hooks/hod_workspace/FacultyPicker";
import AvailableSubjectsPanel from "@/src/_hooks/hod_workspace/AvailableSubjectsPanel";
import AssignedSubjectsPanel from "@/src/_hooks/hod_workspace/AssignedSubjectsPanel";
import WorkloadSummaryCard from "@/src/_hooks/hod_workspace/WorkloadSummaryCard";
import { apiFetch } from "@/src/api_fetch";
import { useAvailableSubjects } from "@/src/_hooks/getSubjectsList";

type Subject = {
  subject_code: string;
  subject_name: string;
};

export default function FacultyAssignWorkspace() {
  const searchParams = useSearchParams();
  const presetFacultyId = searchParams.get("faculty_id") || "";

  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
  const [semester, setSemester] = useState("");
  const [department, setDepartment] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const effectiveFacultyId =
    selectedFaculty?.faculty_id || presetFacultyId || "";

  // Assigned subjects for selected faculty
  const {
    subjects: assignedSubjects,
    setSubjects: setAssignedSubjects,
    loading: subjectsLoading,
    error: subjectsError,
  } = useFacultySubjects(effectiveFacultyId);

  // Available subjects for dropdown (depends on filters)
  const {
    subjects: availableSubjects,
    loading: availableLoading,
    error: availableError,
    setSubjects: setAvailableSubjects,
  } = useAvailableSubjects({ department, semester });

  const assignedCodes = useMemo(() => {
    return new Set(
      assignedSubjects.map((s) => s.subject_code).filter(Boolean)
    );
  }, [assignedSubjects]);

  async function handleAssign(subject: Subject) {
    if (!effectiveFacultyId) return;

    setActionError("");
    setActionSuccess("");
    const code = subject.subject_code;
    setActionLoadingId(code);

    try {
      const api = process.env.NEXT_PUBLIC_API_BASE;

      const res = await apiFetch(`${api}/curriculum/assign-subject`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          faculty_id: effectiveFacultyId,
          subject_code: subject.subject_code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Failed to assign subject");
      }

      // optimistically add to assigned list
      setAssignedSubjects((prev) => {
        if (prev.some((s) => s.subject_code === subject.subject_code)) return prev;
        return [subject, ...prev];
      });

      // optionally remove from available dropdown so it cannot be picked again
      setAvailableSubjects((prev) =>
        prev.filter((s) => s.subject_code !== subject.subject_code)
      );

      setActionSuccess("Subject assigned successfully.");
    } catch (e: any) {
      setActionError(e?.message || "Failed to assign subject");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleUnassign(subject: Subject) {
    if (!effectiveFacultyId) return;

    setActionError("");
    setActionSuccess("");
    const code = subject.subject_code;
    setActionLoadingId(code);

    try {
      const api = process.env.NEXT_PUBLIC_API_BASE;

      const res = await apiFetch(`${api}/curriculum/unassign-subject`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          faculty_id: effectiveFacultyId,
          subject_code: subject.subject_code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Failed to remove subject");
      }

      // remove from assigned list
      setAssignedSubjects((prev) =>
        prev.filter((s) => s.subject_code !== subject.subject_code)
      );

      // you could also add it back to availableSubjects here if that matches your rules

      setActionSuccess("Subject removed successfully.");
    } catch (e: any) {
      setActionError(e?.message || "Failed to remove subject");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <main className="space-y-3 p-5 bg-[#f4f7fb] min-h-screen">
      {/* header + back */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assign Subjects</h1>
          <p className="mt-1 text-slate-600">
            Manage faculty teaching assignments and balance workload with full context.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/faculty/hod/faculty"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Faculty
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionSuccess}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_350px]">
        <FacultyPicker
          presetFacultyId={presetFacultyId}
          selectedFaculty={selectedFaculty}
          setSelectedFaculty={setSelectedFaculty}
        />

        <AvailableSubjectsPanel
          semester={semester}
          setSemester={setSemester}
          department={department}
          setDepartment={setDepartment}
          allSubjects={availableSubjects}
          allSubjectsLoading={availableLoading}
          allSubjectsError={availableError}
          assignedCodes={assignedCodes}
          onAssign={handleAssign}
          actionLoadingId={actionLoadingId}
          facultySelected={!!effectiveFacultyId}
        />

        <div className="space-y-6">
          <AssignedSubjectsPanel
            assignedSubjects={assignedSubjects}
            loading={subjectsLoading}
            error={subjectsError}
            onUnassign={handleUnassign}
            actionLoadingId={actionLoadingId}
            facultySelected={!!effectiveFacultyId}
          />

          <WorkloadSummaryCard
            faculty={selectedFaculty}
            assignedSubjects={assignedSubjects}
            facultyId={effectiveFacultyId}
          />
        </div>
      </div>
    </main>
  );
}