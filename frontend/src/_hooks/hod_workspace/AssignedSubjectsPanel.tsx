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
  if (!facultySelected) {
    return (
      <section className="...">
        <h2>Assigned subjects</h2>
        <p className="text-sm text-slate-500">
          Choose a faculty member to view assignments.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Assigned subjects</h2>
      <p className="mt-1 text-sm text-slate-500">
        Review and rebalance the selected faculty’s current subject load.
      </p>

      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <p className="mt-4 text-sm text-rose-600">{error}</p>
      ) : assignedSubjects.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No subjects assigned yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {assignedSubjects.map((subject) => {
            const loadingRow = actionLoadingId === subject.subject_code;

            return (
              <div
                key={subject.subject_code}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {subject.subject_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {subject.subject_code}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={loadingRow}
                    onClick={() => onUnassign(subject)}
                    className="rounded-lg border-2 border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-200 disabled:opacity-50"
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