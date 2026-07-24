"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getFacultyList } from "@/src/_hooks/getFacultyList";
import { TitleCase } from "@/src/_hooks/toTitleCase";
import { Badge } from "@/src/components/ui/Badge";

export default function HodFacultyPage() {
  const [facultyList, setFacultyList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(9);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Fetch faculty list whenever page, limit, or query changes
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr("");

      try {
        const skip = (page - 1) * limit;

        const res = await getFacultyList({
          skip,
          limit,
          first_name: query,
          sort_by: "created_at",
          sort_order: "desc",
        });

        if (!cancelled) {
          setFacultyList(res?.data || []);
          setTotalCount(res?.total_count || 0);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load faculty");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [page, limit, query]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Faculty Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Manage department faculty profiles, curriculum assignments, and teaching workload.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/faculty/hod/faculty/assign-subject"
            className="rounded-lg bg-primary px-4 py-2 text-xs sm:text-sm font-medium text-white hover:opacity-90 shadow-xs transition"
          >
            Assign Subject
          </Link>

          <Link
            href="/faculty/hod/faculty/assign-subject"
            className="rounded-lg border border-border bg-card px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted shadow-xs transition"
          >
            View Workload
          </Link>
        </div>
      </div>

      {/* Filter and Count Bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-foreground">
            All Faculty Roster <span className="text-xs text-primary font-bold">({totalCount})</span>
          </h2>

          <input
            type="text"
            placeholder="Search by first name..."
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
            className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition sm:w-72"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-xl border border-border bg-muted"
            />
          ))}
        </div>
      ) : err ? (
        <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
          {err}
        </div>
      ) : facultyList.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          No faculty members found matching your filter.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {facultyList.map((faculty) => (
              <div
                key={faculty.id || faculty._id || faculty.faculty_id}
                className="rounded-xl border border-border bg-card p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      Dr. {[faculty.first_name, faculty.last_name].filter(Boolean).join(" ")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {TitleCase(faculty.designation || "Faculty")}
                    </p>
                  </div>

                  <Badge
                    variant={faculty.status?.toLowerCase() === "active" ? "success" : "warning"}
                  >
                    {faculty.status || "Unknown"}
                  </Badge>
                </div>

                {/* Card Metadata */}
                <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Faculty ID:</span>{" "}
                    {faculty.faculty_id || "—"}
                  </p>
                  <p className="truncate">
                    <span className="font-medium text-foreground">Email:</span>{" "}
                    <a
                      href={`mailto:${faculty.email}`}
                      className="hover:underline hover:text-primary"
                    >
                      {faculty.email || "—"}
                    </a>
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Department:</span>{" "}
                    {faculty.department || "—"}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="mt-5 flex gap-2 pt-3 border-t border-border">
                  <Link
                    href={`/faculty/hod/faculty/${faculty.faculty_id}`}
                    className="flex-1 text-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition"
                  >
                    View Profile
                  </Link>

                  <Link
                    href={`/faculty/hod/faculty/assign-subject?faculty_id=${faculty.faculty_id}`}
                    className="flex-1 text-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition"
                  >
                    Assign
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
            <p className="text-xs text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span> of{" "}
              <span className="font-semibold text-foreground">{totalPages || 1}</span>
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                disabled={page >= totalPages}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}