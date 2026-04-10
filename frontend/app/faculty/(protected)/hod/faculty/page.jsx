// app/hod/faculty/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getFacultyList } from "@/src/_hooks/getFacultyList";
import { TitleCase } from "@/src/_hooks/toTitleCase";

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
    <div className="p-6 space-y-6">

      {/* header section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Faculty Management</h1>
          <p className="mt-2 text-slate-600">
            Manage faculty profiles, assignments, and teaching workload.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/faculty/hod/faculty/assign-subject"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Assign Subject
          </Link>

          <Link
            href="/hod/faculty/workload"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View Workload
          </Link>
        </div>
      </div>

      {/* total count and search */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Department Faculty ({totalCount})
          </h2>

          <input
            type="text"
            placeholder="Search by first name..."
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 md:w-72"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-slate-300 bg-slate-100"
            />
          ))}
        </div>
      ) : err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {err}
        </div>
      ) : facultyList.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">
          No faculty found.
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
            {facultyList.map((faculty) => (
              <div
              key={faculty.id || faculty._id || faculty.faculty_id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"  
              >
                {/* card header */}
                <div>  
                  <h3 className="text-lg font-semibold text-slate-900"><span>Dr. </span>
                    {[faculty.first_name, faculty.last_name].filter(Boolean).join(" ")}
                  </h3>
                </div>
                <div className="flex items-start justify-between mt-1">
                  <div>
                    <p className="text-sm text-slate-500">
                      {TitleCase(faculty.designation || "Faculty")}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                      faculty.status?.toLowerCase() === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {faculty.status || "Unknown"}
                  </span>
                </div>

                {/* card data */}
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  {/* faculty id */}
                  <p>
                    <span className="font-medium text-slate-900">Faculty id:</span>{" "}
                    {faculty.faculty_id || "—"}
                  </p>
                  {/* mail */}
                  <p>
                    <span className="font-medium text-slate-900">Email:</span>{" "}
                    <a
                      href={`mailto:${faculty.email}`}
                      className="hover:underline hover:font-semibold"
                    >
                      {faculty.email || "—"}
                    </a>
                  </p>
                  {/* department */}
                  <p>
                    <span className="font-medium text-slate-900">Department:</span>{" "}
                    {faculty.department || "—"}
                  </p>
                </div>

                    {/* Lower buttons */}
                <div className="mt-4 flex justify-start gap-3">
                  <Link
                    href={`/faculty/hod/faculty/${faculty.faculty_id}`}
                    className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
                  >
                    View Profile
                  </Link>

                  <Link
                    href={`/faculty/hod/faculty/assign-subject?faculty_id=${faculty.faculty_id}`}
                    className="text-white rounded-md border border-slate-100 bg-slate-600 px-4 py-2 text-sm font-medium hover:bg-slate-700"
                  >
                    Assign
                  </Link>
                </div>
              </div>
            ))}
          </div>
            {/* pagination */}
          <div className="flex items-center justify-between rounded-lg border-1 border-slate-400 bg-white px-4 py-2">
            <p className="text-sm text-slate-600">
              Page {page} of {totalPages || 1}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
              >
                Previous
              </button>

              <button
                onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                disabled={page >= totalPages}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
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