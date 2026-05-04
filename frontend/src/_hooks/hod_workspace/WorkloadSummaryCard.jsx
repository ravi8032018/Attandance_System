"use client";

export default function WorkloadSummaryCard({
  faculty,
  assignedSubjects,
  facultyId,
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Workload summary</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Quick snapshot of the selected faculty’s current load.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Faculty ID</p>
          <p className="mt-1 font-semibold text-foreground">{facultyId || "—"}</p>
        </div>
        <div className="rounded-xl bg-muted p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Assigned</p>
          <p className="mt-1 font-semibold text-foreground">{assignedSubjects.length}</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-border p-3">
        <p className="text-sm text-muted-foreground">
          {faculty
            ? `Review current assignments before adding new subjects to ${faculty.first_name || "this faculty member"}.`
            : "Select a faculty member to review subject allocation."}
        </p>
      </div>
    </section>
  );
}