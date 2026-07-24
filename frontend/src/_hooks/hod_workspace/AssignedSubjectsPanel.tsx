import { useState, useMemo } from "react";

type Subject = {
  subject_code: string;
  subject_name: string;
};

type AssignedSubjectsPanelProps = {
  assignedSubjects: Subject[];
  loading: boolean;
  error: string | null;
  onUnassign: (subject: Subject) => void;
  actionLoadingId: string | null;
  facultySelected: boolean;
};

export default function AssignedSubjectsPanel({
  assignedSubjects,
  loading,
  error,
  onUnassign,
  actionLoadingId,
  facultySelected,
}: AssignedSubjectsPanelProps) {
  const [filterQuery, setFilterQuery] = useState("");

  const filteredSubjects = useMemo(() => {
    if (!filterQuery.trim()) return assignedSubjects;
    const q = filterQuery.toLowerCase();
    return assignedSubjects.filter(
      (s) =>
        (s.subject_name || "").toLowerCase().includes(q) ||
        (s.subject_code || "").toLowerCase().includes(q)
    );
  }, [assignedSubjects, filterQuery]);

  if (!facultySelected) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Assigned subjects</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a faculty member to view assignments.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Assigned subjects</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Review and rebalance current load ({assignedSubjects.length}).
          </p>
        </div>
      </div>

      {assignedSubjects.length > 0 && (
        <div className="mt-3">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search assigned subjects..."
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
          />
        </div>
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : error ? (
        <p className="mt-4 text-sm text-error">{error}</p>
      ) : assignedSubjects.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No subjects assigned yet.</p>
      ) : filteredSubjects.length === 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">No assigned subjects match &quot;{filterQuery}&quot;.</p>
      ) : (
        <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {filteredSubjects.map((subject) => {
            const loadingRow = actionLoadingId === subject.subject_code;

            return (
              <div
                key={subject.subject_code}
                className="rounded-xl border border-border bg-muted p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {subject.subject_name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {subject.subject_code}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={loadingRow}
                    onClick={() => onUnassign(subject)}
                    className="rounded-lg border-2 border-rose-300 bg-card px-3 py-1.5 text-sm font-medium text-error hover:bg-rose-200 disabled:opacity-50"
                  >
                    {loadingRow ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}