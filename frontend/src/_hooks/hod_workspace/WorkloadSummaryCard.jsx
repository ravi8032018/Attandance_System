"use client";

export default function WorkloadSummaryCard({
  faculty,
  assignedSubjects,
  facultyId,
}) {
  const count = assignedSubjects?.length || 0;
  const maxRecommended = 5;
  const percentage = Math.min(100, Math.round((count / maxRecommended) * 100));

  const statusLabel =
    count === 0
      ? "Unassigned"
      : count <= 2
      ? "Light Load"
      : count <= 4
      ? "Optimal Load"
      : "Heavy Load";

  const statusColor =
    count === 0
      ? "bg-muted text-muted-foreground"
      : count <= 2
      ? "bg-success/15 text-success border border-success/30"
      : count <= 4
      ? "bg-primary/15 text-primary border border-primary/30"
      : "bg-warning/15 text-warning border border-warning/30";

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Workload summary</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Quick snapshot of current teaching load.
          </p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Faculty ID</p>
          <p className="mt-1 font-semibold text-foreground text-sm">{facultyId || "—"}</p>
        </div>
        <div className="rounded-xl bg-muted p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium font-mono">Assigned Subjects</p>
          <p className="mt-1 font-semibold text-foreground text-sm">{count} / {maxRecommended}</p>
        </div>
      </div>

      {/* Workload Capacity Bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Capacity utilization</span>
          <span className="font-medium">{percentage}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              count > 4 ? "bg-warning" : count > 2 ? "bg-primary" : "bg-success"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
        {faculty
          ? count > 4
            ? `Warning: ${faculty.first_name || "Faculty"} is approaching high teaching workload.`
            : `Balanced workload allocation for ${faculty.first_name || "this faculty member"}.`
          : "Select a faculty member to review subject allocation."}
      </div>
    </section>
  );
}