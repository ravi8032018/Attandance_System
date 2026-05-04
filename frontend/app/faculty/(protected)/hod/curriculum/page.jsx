// app/faculty/(protected)/hod/curriculum/page.jsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useAvailableSubjects } from "@/src/_hooks/getSubjectsList";

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export default function HodCurriculumPage() {
  const [semester, setSemester] = useState("1");
  const [department, setDepartment] = useState("");

  const { subjects, loading, error } = useAvailableSubjects({ department, semester });

  return (
    <div className="p-6 space-y-6 min-h-screen bg-[#f2f5f9]">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Curriculum</h1>
          <p className="mt-2 text-muted-foreground">
            Review semester-wise subjects and manage faculty-subject assignments.
          </p>
        </div>

        <Link
          href="/faculty/hod/faculty/assign-subject"
          className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors"
        >
          Manage Assignments
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Department input */}
          <div className="flex items-center gap-3">
            <label className="shrink-0 text-sm font-medium text-foreground">
              Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value.toUpperCase())}
              placeholder="e.g. CS"
              className="w-28 rounded-md border border-border px-3 py-1.5 text-sm uppercase outline-none focus:focus:border-primary"
            />
          </div>

          {/* Semester count badge */}
          {!loading && !error && (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{subjects.length}</span> subject{subjects.length !== 1 ? "s" : ""} in Semester {semester}
            </p>
          )}
        </div>

        {/* Semester tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          {SEMESTERS.map((s) => (
            <button
              key={s}
              onClick={() => setSemester(s)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                semester === s
                  ? "bg-primary text-white shadow-xs"
                  : "border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              Sem {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-border bg-muted"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          No subjects found for Semester {semester}
          {department ? ` in department "${department}"` : ""}.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {subjects.map((subject, i) => (
            <div
              key={subject.subject_code || i}
              className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              {/* Subject code badge */}
              <span className="inline-block rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-primary ">
                {subject.subject_code || "—"}
              </span>

              {/* Subject name */}
              <p className="mt-3 text-md font-semibold leading-snug text-foreground">
                {subject.subject_name || "—"}
              </p>

              {/* Quick assign link */}
              <Link
                href={`/faculty/hod/faculty/assign-subject?subject_code=${subject.subject_code}`}
                className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
              >
                View assignments →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
