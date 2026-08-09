"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useFacultySubjects } from "@/hooks/useFacultySubjects";
import { useAvailableSubjects } from "@/hooks/useAvailableSubjects";
import { Badge } from "@/components/ui/Badge";
import { CustomSelect, CustomSelectOption } from "@/components/ui/CustomSelect";
import { AcademicTermSwitcher } from "@/components/ui/AcademicTermSwitcher";
import { TermMode, getSavedTermMode, getSemesterSelectOptions, getActiveSemesters } from "@/lib/academicTerm";
import { apiFetch } from "@/lib/api";
import { useUserMe } from "@/hooks/useUserMe";

function AssignSubjectWorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUserMe();
  const department = user?.department || "CS";
  const initialFacultyId = searchParams.get("faculty_id") || "CSFAC01";

  const [facultyId, setFacultyId] = useState(initialFacultyId);
  const [termMode, setTermMode] = useState<TermMode>("odd");
  const [semester, setSemester] = useState("1");

  useEffect(() => {
    const initialMode = getSavedTermMode();
    setTermMode(initialMode);
    const active = getActiveSemesters(initialMode);
    if (active.length > 0 && !active.includes(semester)) {
      setSemester(active[0]);
    }
  }, []);

  const handleTermModeChange = (newMode: TermMode) => {
    setTermMode(newMode);
    const active = getActiveSemesters(newMode);
    if (active.length > 0 && !active.includes(semester)) {
      setSemester(active[0]);
    }
  };
  const [selectedSubjectCode, setSelectedSubjectCode] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // 5-Second Auto-Dismiss for Status Messages System-Wide
  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [currentFaculty, setCurrentFaculty] = useState<any>(null);
  const [reassignConflict, setReassignConflict] = useState<{ message: string; subjectCode: string } | null>(null);
  const [facultyDropdownOpen, setFacultyDropdownOpen] = useState(false);
  const [facultySearchQuery, setFacultySearchQuery] = useState("");

  // Hook 1: Current faculty assigned subjects
  const { subjects: assignedSubjects, subjectsLoading: loadingAssigned, setSubjects: setAssignedSubjects } = useFacultySubjects(facultyId);

  // Hook 2: Available subjects pool filtered by semester & department
  const { availableSubjects, availableLoading: loadingAvailable } = useAvailableSubjects({ semester, department });

  const filteredFacultyList = facultyList.filter((fac) => {
    const q = facultySearchQuery.toLowerCase();
    const fullName = `${fac.first_name || ""} ${fac.last_name || ""}`.toLowerCase();
    const fid = String(fac.faculty_id || "").toLowerCase();
    return fullName.includes(q) || fid.includes(q);
  });

  useEffect(() => {
    async function loadFacultyList() {
      try {
        const res = await apiFetch("/faculty");
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const list = data.data || data.faculty || (Array.isArray(data) ? data : []);
          setFacultyList(list);
        }
      } catch {
        setFacultyList([]);
      }
    }
    loadFacultyList();
  }, []);

  useEffect(() => {
    async function loadTargetFaculty() {
      if (!facultyId) return;
      try {
        const res = await apiFetch(`/faculty/get-faculty-by-id?id=${encodeURIComponent(facultyId)}`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setCurrentFaculty(data);
        } else {
          const match = facultyList.find((f) => String(f.faculty_id).toUpperCase() === facultyId.toUpperCase());
          setCurrentFaculty(match || null);
        }
      } catch {
        const match = facultyList.find((f) => String(f.faculty_id).toUpperCase() === facultyId.toUpperCase());
        setCurrentFaculty(match || null);
      }
    }
    loadTargetFaculty();
  }, [facultyId, facultyList]);

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

  async function handleAssignSubject(override = false) {
    if (!facultyId || !selectedSubjectCode) return;
    setAssigning(true);
    setStatusMsg("");
    setReassignConflict(null);

    try {
      const res = await apiFetch("/curriculum/assign-subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faculty_id: facultyId,
          subject_code: selectedSubjectCode,
          override: override
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const targetName = currentFaculty?.first_name ? `${currentFaculty.first_name} ${currentFaculty.last_name || ""}` : facultyId;
        setStatusMsg(data.message || `Successfully assigned subject ${selectedSubjectCode} to ${targetName} (${facultyId})`);
        const found = availableSubjects.find((s) => s.subject_code === selectedSubjectCode);
        if (found) {
          setAssignedSubjects((prev) => {
            if (prev.some((s) => s.subject_code === selectedSubjectCode)) return prev;
            return [...prev, found];
          });
        }
      } else if (res.status === 409) {
        const detailMsg = typeof data.detail === "string" ? data.detail : data.detail?.message || "Subject is currently assigned to another faculty member. Reassignment confirmation required.";
        setReassignConflict({
          message: detailMsg,
          subjectCode: selectedSubjectCode
        });
      } else {
        throw new Error(data.detail || "Failed to assign subject");
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

  // Workload indicator calculation
  const count = assignedSubjects.length;
  let workloadBadge: {
    label: string;
    variant: "primary" | "success" | "warning" | "error" | "muted";
    color: string;
    bg: string;
  } = {
    label: "Optimal Capacity",
    variant: "success",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/30"
  };

  if (count === 0) {
    workloadBadge = {
      label: "0 Subjects (No Load)",
      variant: "muted",
      color: "text-slate-400",
      bg: "bg-slate-500/10 border-slate-500/30"
    };
  } else if (count <= 2) {
    workloadBadge = {
      label: `${count} Subjects (Normal Load)`,
      variant: "success",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/30"
    };
  } else if (count === 3) {
    workloadBadge = {
      label: `${count} Subjects (Moderate Load)`,
      variant: "primary",
      color: "text-indigo-500",
      bg: "bg-indigo-500/10 border-indigo-500/30"
    };
  } else if (count === 4) {
    workloadBadge = {
      label: `${count} Subjects (High Load)`,
      variant: "warning",
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/30"
    };
  } else {
    workloadBadge = {
      label: `${count} Subjects (Overloaded!)`,
      variant: "error",
      color: "text-rose-500",
      bg: "bg-rose-500/10 border-rose-500/30"
    };
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
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

      {/* 2-Column High-Productivity Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column (5 Cols): Target Faculty Context + Assign Subject Controls */}
        <div className="lg:col-span-5 space-y-6">

          {/* Panel 1: Target Faculty Context */}
          <div className="solid-card rounded-2xl p-6 border border-border space-y-4 bg-card">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-extrabold text-foreground">
                1. Target Faculty Context
              </h2>
            </div>

            {/* Custom Modern Interactive Searchable Dropdown */}
            <div className="relative space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                Select Faculty Member
              </label>

              {/* Trigger Button */}
              <button
                type="button"
                onClick={() => setFacultyDropdownOpen(!facultyDropdownOpen)}
                className="w-full h-12 rounded-xl border border-border bg-background hover:border-indigo-500/60 flex items-center justify-between px-3.5 py-2 text-sm font-extrabold text-foreground transition-all duration-200 outline-none focus:ring-2 focus:ring-indigo-500/20 group"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-xs">
                    {(currentFaculty?.first_name?.[0] || facultyId?.[0] || "F").toUpperCase()}
                  </div>
                  <div className="text-left truncate">
                    <span className="text-sm font-black text-foreground block truncate">
                      {currentFaculty?.first_name ? `${currentFaculty.first_name} ${currentFaculty.last_name || ""}` : `Faculty (${facultyId})`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="primary" className="font-mono text-[11px] py-0.5">{facultyId}</Badge>
                  <span className={`text-xs text-muted-foreground transition-transform duration-200 ${facultyDropdownOpen ? "rotate-180" : ""}`}>
                    ▼
                  </span>
                </div>
              </button>

              {/* Dropdown Menu Overlay */}
              {facultyDropdownOpen && (
                <>
                  {/* Backdrop click listener */}
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setFacultyDropdownOpen(false)}
                  />

                  {/* Floating Card */}
                  <div className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl border border-border bg-card shadow-2xl p-3 space-y-2 backdrop-blur-md animate-in zoom-in-95 duration-150 max-h-[320px] flex flex-col">
                    {/* Search Input */}
                    <div className="relative">
                      <input
                        type="text"
                        value={facultySearchQuery}
                        onChange={(e) => setFacultySearchQuery(e.target.value)}
                        placeholder="🔍 Search faculty by name or ID..."
                        className="w-full h-9 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground font-semibold outline-none focus:border-indigo-500 transition-colors"
                        autoFocus
                      />
                    </div>

                    {/* Scrollable Faculty Items */}
                    <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                      {filteredFacultyList.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3 text-center">No faculty members found matching search.</p>
                      ) : (
                        filteredFacultyList.map((fac) => {
                          const isSelected = String(fac.faculty_id).toUpperCase() === facultyId.toUpperCase();
                          return (
                            <button
                              key={fac.faculty_id}
                              type="button"
                              onClick={() => {
                                handleFacultyChange(fac.faculty_id);
                                setFacultyDropdownOpen(false);
                                setFacultySearchQuery("");
                              }}
                              className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-all duration-150 ${isSelected
                                ? "bg-indigo-600/15 border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-extrabold"
                                : "hover:bg-muted/60 text-foreground border border-transparent"
                                }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                                  {(fac.first_name?.[0] || "F").toUpperCase()}
                                </div>
                                <div className="truncate">
                                  <span className="text-xs font-bold block truncate">
                                    {fac.first_name} {fac.last_name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground block truncate">
                                    {fac.designation || "Assistant Professor"} • {fac.department || department}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge variant="primary" className="font-mono text-[10px] py-0.5 px-1.5">
                                  {fac.faculty_id}
                                </Badge>
                                {isSelected && <span className="text-indigo-600 dark:text-indigo-400 font-black text-xs">✓</span>}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Panel 2: Available Subjects Pool */}
          <div className="solid-card rounded-2xl p-6 border border-border space-y-4 bg-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
              <h2 className="text-base font-extrabold text-foreground">
                2. Assign Curriculum Subject
              </h2>
              <AcademicTermSwitcher currentMode={termMode} onModeChange={handleTermModeChange} />
            </div>

            <CustomSelect
              label="Active Semester"
              value={semester}
              onChange={setSemester}
              options={getSemesterSelectOptions(termMode, false)}
            />

            <CustomSelect
              label="Subject to Assign"
              value={selectedSubjectCode}
              onChange={setSelectedSubjectCode}
              disabled={loadingAvailable || availableSubjects.length === 0}
              searchable={true}
              placeholder={loadingAvailable ? "Loading subjects..." : "Select subject to assign..."}
              options={availableSubjects.map((subj: any) => {
                const assignedFacName = subj.faculty_name || (subj.faculty_id ? `Assigned to ${subj.faculty_id}` : null);
                return {
                  value: subj.subject_code,
                  label: `${subj.subject_code} — ${subj.subject_name}`,
                  sublabel: assignedFacName ? `(Currently: ${assignedFacName})` : "Unassigned",
                  badge: subj.subject_code,
                };
              })}
            />

            <button
              type="button"
              disabled={assigning || !selectedSubjectCode || isAlreadyAssigned}
              onClick={() => handleAssignSubject(false)}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 mt-2"
            >
              {assigning ? "Assigning Subject..." : isAlreadyAssigned ? "Already Assigned" : "Assign Subject"}
            </button>
          </div>
        </div>

        {/* Right Column (7 Cols): Merged Faculty Workload & Currently Assigned Subjects Console */}
        <div className="lg:col-span-7">
          <div className="solid-card rounded-2xl p-6 border border-border space-y-6 bg-card min-h-full flex flex-col justify-between">
            <div className="space-y-6">
              {/* Merged Header & Workload Indicator */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                <div>
                  <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                    <span>📚 Faculty Workload & Active Assignments</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Managing load for <strong className="text-foreground">{currentFaculty?.first_name ? `${currentFaculty.first_name} ${currentFaculty.last_name || ""}` : facultyId}</strong> ({facultyId})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={workloadBadge.variant} className="font-bold py-1 px-3">
                    {workloadBadge.label}
                  </Badge>
                </div>
              </div>

              {/* Workload Meter Progress Bar */}
              <div className={`p-4 rounded-2xl border ${workloadBadge.bg} space-y-2`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground">Workload Capacity Meter</span>
                  <span className={workloadBadge.color}>{assignedSubjects.length} / 4 Target Max Subjects</span>
                </div>
                <div className="h-3 w-full bg-background/80 rounded-full overflow-hidden border border-border p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${assignedSubjects.length <= 2
                      ? "bg-emerald-500"
                      : assignedSubjects.length === 3
                        ? "bg-indigo-500"
                        : assignedSubjects.length === 4
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                    style={{ width: `${Math.min((assignedSubjects.length / 4) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground pt-0.5">
                  {assignedSubjects.length >= 5
                    ? "⚠️ Warning: Faculty member has exceeded standard recommended load (4 subjects max)."
                    : assignedSubjects.length === 4
                      ? "⚡ Note: Maximum recommended workload target reached (4 subjects)."
                      : "Standard recommended maximum workload: 4 curriculum subjects per semester."}
                </p>
              </div>

              {/* Currently Assigned Subjects List Roster */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                    Assigned Subjects ({assignedSubjects.length})
                  </h3>
                </div>

                {loadingAssigned ? (
                  <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">Loading assigned subjects...</div>
                ) : assignedSubjects.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                    No subjects assigned to this faculty member yet. Select a subject on the left to assign.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {assignedSubjects.map((subject) => (
                      <div
                        key={subject.subject_code}
                        className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div className="space-y-1 truncate pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                              {subject.subject_code}
                            </span>
                            {subject.semester && (
                              <Badge variant="muted" className="text-[10px] py-0 px-1.5">
                                Sem {subject.semester}
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm font-bold text-foreground block truncate">
                            {subject.subject_name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnassignSubject(subject.subject_code)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600 text-rose-600 hover:text-white dark:text-rose-400 dark:hover:text-white border border-rose-600/30 text-xs font-bold transition-all shrink-0 active:scale-95"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Subject Reassignment Confirmation Modal */}
      {reassignConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="solid-card rounded-3xl p-6 border border-border max-w-lg w-full bg-card shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-black text-foreground">Subject Reassignment Required</h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {reassignConflict.message}
            </p>

            <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300">
              <strong className="block font-bold mb-1">Reassignment Effect:</strong>
              Confirming will unassign <strong>{reassignConflict.subjectCode}</strong> from its current faculty and reassign it to <strong>{currentFaculty?.first_name ? `${currentFaculty.first_name} ${currentFaculty.last_name || ""}` : facultyId} ({facultyId})</strong>.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReassignConflict(null)}
                className="px-4 py-2 rounded-xl bg-card hover:bg-muted border border-border text-xs font-bold text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assigning}
                onClick={() => handleAssignSubject(true)}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-md active:scale-95 transition-all"
              >
                {assigning ? "Reassigning..." : "Confirm & Reassign Subject"}
              </button>
            </div>
          </div>
        </div>
      )}
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
