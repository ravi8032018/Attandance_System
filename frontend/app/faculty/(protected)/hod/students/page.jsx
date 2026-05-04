// app/faculty/(protected)/hod/students/page.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStudentsList } from "@/src/_hooks/getStudentsList";
import { TitleCase } from "@/src/_hooks/toTitleCase";
import { formatDisplayName } from "@/src/_hooks/basic_fn";

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export default function HodStudentsPage() {
  const [studentList, setStudentList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(9);
  const [query, setQuery] = useState("");
  const [semester, setSemester] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // get students list whenever page, limit, query, semester, or status changes
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr("");

      try {
        const skip = (page - 1) * limit;

        const res = await getStudentsList({
          skip,
          limit,
          first_name: query,
          semester: semester,
          status: status,
          sort_by: "created_at",
          sort_order: "desc",
        });

        if (!cancelled) {
          setStudentList(res?.data || []);
          setTotalCount(res?.total_count || 0);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load students");
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
  }, [page, limit, query, semester, status]);

  const totalPages = Math.ceil(totalCount / limit);

  function handleQueryChange(e) {
    setPage(1);
    setQuery(e.target.value);
  }

  function handleSemesterChange(e) {
    setPage(1);
    setSemester(e.target.value);
  }

  function handleStatusChange(e) {
    setPage(1);
    setStatus(e.target.value);
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Student Management</h1>
          <p className="mt-2 text-muted-foreground">
            View and manage department students, semester grouping, and academic records.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold text-foreground shrink-0">
            Students ({totalCount})
          </h2>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <input
              type="text"
              placeholder="Search by name..."
              value={query}
              onChange={handleQueryChange}
              className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:focus:border-primary sm:w-56"
            />

            {/* Semester filter */}
            <select
              value={semester}
              onChange={handleSemesterChange}
              className="rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none focus:focus:border-primary bg-card cursor-pointer"
            >
              <option value="">All Semesters</option>
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={status}
              onChange={handleStatusChange}
              className="rounded-md border border-border px-3 py-2 text-sm text-foreground outline-none focus:focus:border-primary bg-card cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-2xl border border-border bg-muted"
            />
          ))}
        </div>
      ) : err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {err}
        </div>
      ) : studentList.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          No students found.
        </div>
      ) : (
        <>
          {/* Student Cards */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {studentList.map((student) => {
              const key = student.registration_no || student._id || student.id;
              const fullName = formatDisplayName(student.first_name, student.last_name);            

              return (
                <Link
                  key={key}
                  href={`/faculty/hod/students/${student.registration_no}`}
                  className="block rounded-2xl border border-border bg-card p-5 shadow-xs transition hover:-translate-y-1 hover:shadow-sm cursor-pointer"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-foreground truncate">
                        {fullName || "—"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {student.registration_no || ""}
                      </p>
                    </div>

                    <span
                      className={`shrink-0  rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        student.status?.toLowerCase() === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-warning/20 text-warning"
                      }`}
                    >
                      {TitleCase(student.status || "Unknown")}
                    </span>
                  </div>

                  {/* Card data */}
                  <div className="mt-4 space-y-2 text-sm text-foreground">
                    {/* Email */}
                    <p className="truncate">
                      <span className="font-medium text-foreground">Email:</span>{" "}
                      {student.email ? (
                        <a
                          href={`mailto:${student.email}`}
                          className="hover:underline hover:font-semibold"
                        >
                          {student.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>

                    {/* Course */}
                    <p>
                      <span className="font-medium text-foreground">Course:</span>{" "}
                      {student.course ? TitleCase(student.course) : "—"}
                    </p>

                    {/* Semester */}
                    <p>
                      <span className="font-medium text-foreground">Semester:</span>{" "}
                      {student.semester ? ` ${student.semester}` : "—"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages || 1}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-50 disabled:bg-muted hover:bg-muted transition-colors"
              >
                Previous
              </button>

              <button
                onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                disabled={page >= totalPages}
                className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-50 disabled:bg-muted hover:bg-muted transition-colors"
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
