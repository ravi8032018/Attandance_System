"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useFacultySubjects } from "@/hooks/useFacultySubjects";
import { useAvailableSubjects } from "@/hooks/useAvailableSubjects";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api";
import { useUserMe } from "@/hooks/useUserMe";

function AssignSubjectWorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUserMe();
  const department = user?.department || "CS";
  const initialFacultyId = searchParams.get("faculty_id") || "CSFAC01";

  const [facultyId, setFacultyId] = useState(initialFacultyId);
  const [semester, setSemester] = useState("4");
  const [selectedSubjectCode, setSelectedSubjectCode] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Hook 1: Current faculty assigned subjects
  const { subjects: assignedSubjects, subjectsLoading: loadingAssigned, setSubjects: setAssignedSubjects } = useFacultySubjects(facultyId);

  // Hook 2: Available subjects pool filtered by semester & department
  const { availableSubjects, availableLoading: loadingAvailable } = useAvailableSubjects({ semester, department });

  useEffect(() => {
    if (availableSubjects.length > 0) {
      setSelectedSubjectCode(availableSubjects[0].subject_code);
    } else {
      setSelectedSubjectCode("");
    }
  }, [availableSubjects]);

  function handleFacultyChange(id: string) {
    setFacultyId(id);
    router.push(`/faculty/hod/faculty/assign-subject?faculty_id=${encodeURIComponent(id)}`);
  }

  async function handleAssignSubject() {
    if (!facultyId || !selectedSubjectCode) return;
    setAssigning(true);
    setStatusMsg("");

    try {
      const res = await apiFetch("/curriculum/assign-subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faculty_id: facultyId, subject_code: selectedSubjectCode }),
      });

      if (res.ok) {
        setStatusMsg(`Successfully assigned subject ${selectedSubjectCode} to ${facultyId}`);
        const found = availableSubjects.find((s) => s.subject_code === selectedSubjectCode);
        if (found) {
          setAssignedSubjects((prev) => [...prev, found]);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.detail || "Failed to assign subject");
      }
    } catch (e: any) {
      setStatusMsg(`Error: ${e?.message || "Assignment failed"}`);
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassignSubject(subjectCode: string) {
    setStatusMsg("");
    try {
      const res = await apiFetch("/curriculum/unassign-subject", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faculty_id: facultyId, subject_code: subjectCode }),
      });

      if (res.ok) {
        setStatusMsg(`Removed subject ${subjectCode} from ${facultyId}`);
        setAssignedSubjects((prev) => prev.filter((s) => s.subject_code !== subjectCode));
      } else {
        throw new Error("Failed to unassign subject");
      }
    } catch (e: any) {
      setStatusMsg(`Error: ${e?.message || "Unassign failed"}`);
    }
  }

  const isAlreadyAssigned = assignedSubjects.some((s) => s.subject_code === selectedSubjectCode);

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Faculty Subject Assignment Workspace
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          HOD management console to assign and unassign curriculum subjects per faculty member.
        </p>
      </div>

      {statusMsg && (
        <div className={`rounded-2xl border p-4 text-xs font-bold ${statusMsg.startsWith("Error") ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400" : "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"}`}>
          {statusMsg}
        </div>
      )}

      {/* 4-Panel Grid Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Panel 1 (FacultyPicker) & Panel 4 (WorkloadSummaryCard) */}
        <div className="space-y-6">
          {/* Panel 1: FacultyPicker */}
          <div className="solid-card rounded-2xl p-5 border border-border space-y-4">
            <h2 className="text-base font-bold text-foreground pb-2 border-b border-border">
              1. Target Faculty Context
            </h2>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Faculty ID
              </label>
              <input
                type="text"
                value={facultyId}
                onChange={(e) => handleFacultyChange(e.target.value)}
                placeholder="Enter Faculty ID (e.g. CSFAC01)"
                className="h-10 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground font-mono font-bold outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-colors duration-150"
              />
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-muted-foreground">Active Faculty:</span>
              <Badge variant="primary">{facultyId || "None"}</Badge>
            </div>
          </div>

          {/* Panel 4: WorkloadSummaryCard */}
          <div className="solid-card rounded-2xl p-5 border border-border space-y-3">
            <h2 className="text-base font-bold text-foreground pb-2 border-b border-border">
              4. Workload Summary
            </h2>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Target Faculty ID:</span>
              <span className="font-mono text-xs font-bold text-foreground">{facultyId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Assigned Subjects Count:</span>
              <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {assignedSubjects.length}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              Recommended maximum workload: 4 subjects per semester.
            </p>
          </div>
        </div>

        {/* Middle Column: Panel 2 (AvailableSubjectsPanel) */}
        <div className="solid-card rounded-2xl p-5 border border-border space-y-4">
          <h2 className="text-base font-bold text-foreground pb-2 border-b border-border">
            2. Available Subjects Pool
          </h2>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Semester Filter</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-colors duration-150"
            >
              {["1", "2", "3", "4", "5", "6", "7", "8"].map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Select Subject</label>
            <select
              value={selectedSubjectCode}
              onChange={(e) => setSelectedSubjectCode(e.target.value)}
              disabled={loadingAvailable || availableSubjects.length === 0}
              className="h-10 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-colors duration-150 disabled:opacity-50"
            >
              {availableSubjects.map((subj) => (
                <option key={subj.subject_code} value={subj.subject_code}>
                  {subj.subject_code} — {subj.subject_name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={assigning || !selectedSubjectCode || isAlreadyAssigned}
            onClick={handleAssignSubject}
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-xs font-extrabold uppercase tracking-wider transition-colors duration-150 disabled:opacity-50 mt-2"
          >
            {assigning ? "Assigning..." : isAlreadyAssigned ? "Already Assigned" : "Assign Selected Subject"}
          </button>
        </div>

        {/* Right Column: Panel 3 (AssignedSubjectsPanel) */}
        <div className="solid-card rounded-2xl p-5 border border-border space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h2 className="text-base font-bold text-foreground">
              3. Currently Assigned Subjects
            </h2>
            <Badge variant="primary">{assignedSubjects.length}</Badge>
          </div>

          {loadingAssigned ? (
            <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">Loading assigned subjects...</div>
          ) : assignedSubjects.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No subjects assigned to this faculty member yet.</div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {assignedSubjects.map((subject) => (
                <div
                  key={subject.subject_code}
                  className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/80 dark:bg-slate-900/40"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
                      {subject.subject_code}
                    </span>
                    <span className="text-xs font-semibold text-foreground block">
                      {subject.subject_name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnassignSubject(subject.subject_code)}
                    className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}

export default function AssignSubjectWorkspacePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading workspace...</div>}>
      <AssignSubjectWorkspaceContent />
    </Suspense>
  );
}
