"use client";

export default function WorkloadSummaryCard({
  faculty,
  assignedSubjects,
  facultyId,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Workload summary</h2>
      <p className="mt-1 text-sm text-slate-500">
        Quick snapshot of the selected faculty’s current load.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Faculty ID</p>
          <p className="mt-1 font-semibold text-slate-900">{facultyId || "—"}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Assigned</p>
          <p className="mt-1 font-semibold text-slate-900">{assignedSubjects.length}</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-3">
        <p className="text-sm text-slate-600">
          {faculty
            ? `Review current assignments before adding new subjects to ${faculty.first_name || "this faculty member"}.`
            : "Select a faculty member to review subject allocation."}
        </p>
      </div>
    </section>
  );
}