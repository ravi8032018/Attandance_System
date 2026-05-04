"use client";
import React from "react";
import { SubjectSelect } from "@/src/_hooks/basic_fn";


export default function AvailableSubjectsPanel({
  semester,
  setSemester,
  department,
  setDepartment,
  allSubjects,
  allSubjectsLoading,
  allSubjectsError,
  assignedCodes,
  onAssign,
  actionLoadingId,
  facultySelected,
}) {
  const [selectedSubject, setSelectedSubject] = React.useState(null);

  function handleSelectChange(e) {
    const code = e.target.value;
    console.log("Selected subject code:", code);
    if (!code) return;

    const subject = allSubjects.find(
      (s) =>
        s.subject_code === code || String(s.subject_code) === String(code)
    );
    if (!subject) return;
    console.log("Selected subject object:", subject);
    
    if (subject) {
      setSelectedSubject(subject);
      onAssign(subject);
      
      // Optional: Clear the "Selected" message after 3 seconds 
      // so the UI stays clean after the action is done.
      setTimeout(() => setSelectedSubject(null), 3000);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      {/* header */}
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Available subjects
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a subject from the list and assign it to the selected faculty.
          </p>
        </div>
      </div>

      {/* filters */}
      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          placeholder="Semester"
          className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:focus:border-primary"
        />
        <input
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="Department"
          className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:focus:border-primary"
        />
      </div>

      {/* dropdown */}
      <SubjectSelect
        allSubjects={allSubjects}
        allSubjectsLoading={allSubjectsLoading}
        allSubjectsError={allSubjectsError}
        assignedCodes={assignedCodes}
        actionLoadingId={actionLoadingId}
        facultySelected={facultySelected}
        handleSelectChange={handleSelectChange}
      />  

      {selectedSubject && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-indigo-100 bg-primary/10/50 px-4 py-3 text-sm text-primary animate-in fade-in slide-in-from-top-2">
          <span>
            Assigning: <span className="font-semibold text-indigo-900">{selectedSubject.subject_name}</span>
          </span>
          <span className="text-xs font-medium bg-primary/20 px-2 py-0.5 rounded text-primary">
            {selectedSubject.subject_code}
          </span>
        </div>
      )}

      {!facultySelected && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-warning/10 px-4 py-3 text-sm text-warning">
          Select a faculty member to enable subject assignment.
        </div>
      )}  
    </section>
  );
}