// app/faculty/(protected)/hod/reports/page.jsx
"use client";

import { useState } from "react";
import { apiFetch } from "@/src/api_fetch";

function attendanceColor(pct) {
  if (pct >= 75) return { bar: "bg-green-500", badge: "bg-green-100 text-green-700" };
  if (pct >= 60) return { bar: "bg-amber-500", badge: "bg-amber-100 text-amber-700" };
  return { bar: "bg-red-500", badge: "bg-red-100 text-red-700" };
}

function AttendanceCard({ report }) {
  const pct = report.attendance_percentage ?? 0;
  const { bar, badge } = attendanceColor(pct);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-sm">
      {/* Top row: code + percentage badge */}
      <div className="flex items-start justify-between gap-2">
        <span className="inline-block rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold tracking-wide text-indigo-700">
          {report.subject_code || "—"}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badge}`}>
          {pct.toFixed(1)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${bar}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-green-50 py-2">
          <p className="font-bold text-green-700">{report.present_count ?? 0}</p>
          <p className="text-green-600">Present</p>
        </div>
        <div className="rounded-lg bg-red-50 py-2">
          <p className="font-bold text-red-700">{report.absent_count ?? 0}</p>
          <p className="text-red-600">Absent</p>
        </div>
        <div className="rounded-lg bg-slate-50 py-2">
          <p className="font-bold text-slate-700">{report.excused_count ?? 0}</p>
          <p className="text-slate-500">Excused</p>
        </div>
      </div>

      {/* Total classes */}
      <p className="mt-3 text-center text-xs text-slate-400">
        {report.total_classes ?? 0} total classes
      </p>
    </div>
  );
}

export default function HodReportsPage() {
  const [regNo, setRegNo] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [searched, setSearched] = useState(false);
  const [searchedReg, setSearchedReg] = useState("");

  async function handleSearch(e) {
    e.preventDefault();
    const trimmed = regNo.trim();
    if (!trimmed) return;

    setLoading(true);
    setErr("");
    setReports([]);
    setSearched(false);

    try {
      const api = process.env.NEXT_PUBLIC_API_BASE;
      const params = new URLSearchParams({ registration_no: trimmed });
      if (subjectCode.trim()) params.set("subject_code", subjectCode.trim());

      const url = `${api}/attendance/report/student-subject?${params.toString()}`;

      const res = await apiFetch(url, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.detail || data?.message || "Failed to fetch attendance report");
      }

      const reportList = Array.isArray(data?.reports) ? data.reports : [];
      setReports(reportList);
      setSearchedReg(trimmed);
      setSearched(true);
    } catch (e) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Summary stats
  const avgPct =
    reports.length > 0
      ? reports.reduce((sum, r) => sum + (r.attendance_percentage ?? 0), 0) / reports.length
      : 0;
  const below75 = reports.filter((r) => (r.attendance_percentage ?? 0) < 75).length;

  return (
    <div className="p-6 space-y-6 min-h-screen bg-[#f2f5f9]">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="mt-2 text-slate-600">
          Access attendance summaries and academic reports for any student.
        </p>
      </div>

      {/* Search Form */}
      <form
        onSubmit={handleSearch}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
      >
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Student Attendance Report
        </h2>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {/* Registration No */}
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Registration Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              placeholder="e.g. CSBSC2024003"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          {/* Subject Code (optional) */}
          <div className="sm:w-52">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Subject Code{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
              placeholder="e.g. CSDSC201"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-indigo-500"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !regNo.trim()}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Searching…" : "Get Report"}
          </button>
        </div>
      </form>

      {/* Error */}
      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <>
          {/* Summary bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Report for{" "}
                  <span className="font-semibold text-slate-800">{searchedReg}</span>
                  {subjectCode && (
                    <> · Subject <span className="font-semibold text-slate-800">{subjectCode}</span></>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {reports.length} subject{reports.length !== 1 ? "s" : ""} found
                </p>
              </div>

              {reports.length > 0 && (
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-slate-900">{avgPct.toFixed(1)}%</p>
                    <p className="text-xs text-slate-500">Avg Attendance</p>
                  </div>
                  <div className="text-center">
                    <p className={`font-bold ${below75 > 0 ? "text-red-600" : "text-green-600"}`}>
                      {below75}
                    </p>
                    <p className="text-xs text-slate-500">Below 75%</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-slate-900">{reports.length - below75}</p>
                    <p className="text-xs text-slate-500">Above 75%</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              No attendance records found for <strong>{searchedReg}</strong>.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {reports.map((report, i) => (
                <AttendanceCard key={report.subject_code || i} report={report} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
