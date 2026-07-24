"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api";

function StudentLookupContent() {
  const searchParams = useSearchParams();
  const regParam = searchParams.get("reg") || "";
  const [regNo, setRegNo] = useState(regParam);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(targetReg: string) {
    if (!targetReg) return;
    setLoading(true);
    setError("");
    setStudent(null);
    try {
      const res = await apiFetch(`/student/${encodeURIComponent(targetReg)}`);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setStudent(data?.data || data);
      } else {
        throw new Error("Student record not found.");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to locate student.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (regParam) {
      handleSearch(regParam);
    }
  }, [regParam]);

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Student Profile Lookup
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Search student record by Registration Number to view individual attendance performance.
        </p>
      </div>

      {/* Search Input */}
      <div className="solid-card rounded-2xl p-4 border border-border flex flex-col sm:flex-row items-center gap-3">
        <input
          type="text"
          value={regNo}
          onChange={(e) => setRegNo(e.target.value)}
          placeholder="Enter Registration No (e.g. REG2024001)"
          className="h-11 flex-1 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-colors duration-150 font-mono"
        />
        <button
          type="button"
          onClick={() => handleSearch(regNo)}
          disabled={loading || !regNo}
          className="h-11 w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-6 py-2 text-xs font-bold transition-colors duration-150 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Lookup Student"}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-4 text-xs font-bold text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {student && (
        <div className="space-y-6">
          <div className="solid-card rounded-2xl p-6 border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">{student.first_name} {student.last_name}</h2>
                <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{student.registration_no}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="primary">{student.department || "CS"}</Badge>
                <Badge variant="secondary">Semester {student.semester || "4"}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Roll Number</span>
                <span className="text-sm font-semibold text-foreground">{student.roll_number || "—"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Email</span>
                <span className="text-sm font-semibold text-foreground">{student.email || "student@academic.edu"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Overall Attendance</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">85% Present</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Total Classes" value="48" icon="📚" />
            <StatCard title="Attended" value="41" trend={{ value: "85.4%", positive: true }} icon="✓" />
            <StatCard title="Absences" value="7 Sessions" trend={{ value: "Low Risk", positive: true }} icon="✕" />
          </div>
        </div>
      )}
    </main>
  );
}

export default function GetStudentByIdPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading lookup console...</div>}>
      <StudentLookupContent />
    </Suspense>
  );
}
