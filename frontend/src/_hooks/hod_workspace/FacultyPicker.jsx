"use client";

import { useEffect, useMemo, useState } from "react";
import { getFacultyList } from "@/src/_hooks/getFacultyList";

export default function FacultyPicker({
  presetFacultyId,
  selectedFaculty,
  setSelectedFaculty,
}) {
  const [query, setQuery] = useState("");
  const [facultyList, setFacultyList] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(true);
  const [facultyError, setFacultyError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setFacultyLoading(true);
      setFacultyError("");

      try {
        const res = await getFacultyList({
          skip: 0,
          limit: 100,
          first_name: query,
          sort_by: "created_at",
          sort_order: "desc",
        });

        if (!cancelled) {
          setFacultyList(res?.data || []);
        }
      } catch (e) {
        if (!cancelled) {
          setFacultyError(e?.message || "Failed to load faculty");
        }
      } finally {
        if (!cancelled) setFacultyLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    if (!presetFacultyId || facultyList.length === 0 || selectedFaculty) return;

    const matched = facultyList.find(
      (f) => String(f.faculty_id) === String(presetFacultyId)
    );

    if (matched) {
      setSelectedFaculty(matched);
    }
  }, [presetFacultyId, facultyList, selectedFaculty, setSelectedFaculty]);

  const selectedName = useMemo(() => {
    if (!selectedFaculty) return "No faculty selected";
    return [selectedFaculty.first_name, selectedFaculty.last_name]
      .filter(Boolean)
      .join(" ");
  }, [selectedFaculty]);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Faculty context</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a faculty member to view and manage teaching assignments.
        </p>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search faculty..."
        className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:focus:border-primary"
      />

      <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
        {facultyLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))
        ) : facultyError ? (
          <p className="text-sm text-error">{facultyError}</p>
        ) : facultyList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No faculty found.</p>
        ) : (
          facultyList.map((faculty) => {
            const active =
              selectedFaculty?.faculty_id === faculty.faculty_id ||
              (!selectedFaculty && presetFacultyId === faculty.faculty_id);

            return (
              <button
                key={faculty.faculty_id || faculty.id}
                type="button"
                onClick={() => setSelectedFaculty(faculty)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-indigo-200 bg-primary/10"
                    : "border-border hover:bg-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {[faculty.first_name, faculty.last_name].filter(Boolean).join(" ")}
                    </p>
                    <p className="text-sm text-muted-foreground">{faculty.faculty_id}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {faculty.department || "—"}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="mt-4 rounded-xl bg-muted p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected</p>
        <p className="mt-1 font-semibold text-foreground">{selectedName}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {selectedFaculty?.faculty_id || presetFacultyId || "Choose a faculty to continue"}
        </p>
      </div>
    </section>
  );
}