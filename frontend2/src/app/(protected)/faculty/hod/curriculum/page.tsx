"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { FacultyAvatar } from "@/components/ui/FacultyAvatar";
import { apiFetch } from "@/lib/api";
import { useUserMe } from "@/hooks/useUserMe";

interface CurriculumSubject {
  subject_code: string;
  subject_name: string;
  department: string;
  semester: string;
  faculty_id?: string;
  faculty_name?: string;
  total_sessions?: number;
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function BookIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function GridViewIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function ListViewIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export default function HODCurriculumPage() {
  const router = useRouter();
  const { user } = useUserMe();
  const department = user?.department || "CS";
  const [semester, setSemester] = useState("4");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadCurriculum() {
      setLoading(true);
      try {
        const res = await apiFetch(`/curriculum?department=${encodeURIComponent(department)}&semester=${encodeURIComponent(semester)}`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const items = Array.isArray(data?.data) ? data.data : [];
          const list = items.flatMap((item: any) =>
            (item.subjects || []).map((s: any) => ({
              ...s,
              department: item.department || department,
              semester: item.semester || semester,
            }))
          );
          setSubjects(list);
        }
      } catch (e) {
        // console.error("Failed to load curriculum subjects", e);
      } finally {
        setLoading(false);
      }
    }
    loadCurriculum();
  }, [semester, department]);

  const filteredSubjects = subjects.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.subject_name.toLowerCase().includes(q) ||
      s.subject_code.toLowerCase().includes(q) ||
      (s.faculty_name && s.faculty_name.toLowerCase().includes(q))
    );
  });

  const tableColumns: Column<CurriculumSubject>[] = [
    {
      header: "Subject Code",
      accessor: (item) => (
        <span className="font-mono text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400">
          {item.subject_code}
        </span>
      ),
    },
    {
      header: "Subject Title",
      accessor: (item) => (
        <span className="font-bold text-foreground block text-left">
          {item.subject_name}
        </span>
      ),
    },
    {
      header: "Department & Sem",
      accessor: (item) => (
        <div className="flex items-center justify-center gap-1.5">
          <Badge variant="primary">{item.department}</Badge>
          <Badge variant="muted">Sem {item.semester}</Badge>
        </div>
      ),
    },
    {
      header: "Assigned Faculty",
      accessor: (item) => (
        <div className="flex items-center justify-left gap-2">
          <FacultyAvatar firstName={item.faculty_name || "Unassigned"} size="sm" />
          <span className="text-xs font-semibold text-foreground">{item.faculty_name || "Unassigned"}</span>
        </div>
      ),
    },
    {
      header: "Conducted Classes",
      accessor: (item) => (
        <span className="text-xs font-mono font-bold text-foreground">
          {item.total_sessions || 0} Sessions
        </span>
      ),
    },
    {
      header: "Action",
      accessor: (item) => (
        <Link
          href={`/faculty/hod/curriculum/${encodeURIComponent(item.subject_code)}`}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Open Workspace →
        </Link>
      ),
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <BookIcon className="text-indigo-600 dark:text-indigo-400" />
            <span>Curriculum Catalog</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Academic department subject pool, assigned faculty workload, and course structure. Click any subject card to open its dedicated analytics workspace.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl border border-border self-start sm:self-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "grid"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <GridViewIcon />
            <span>Cards</span>
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "table"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <ListViewIcon />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="solid-card rounded-2xl p-4 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="w-full md:w-auto">
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-1">
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="h-10 w-full sm:w-40 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {["1", "2", "3", "4", "5", "6", "7", "8"].map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3.5 top-3 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subject title or code..."
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Main Display */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
          Loading curriculum catalog...
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="solid-card rounded-2xl p-12 text-center space-y-2 border border-border">
          <div className="text-3xl">📚</div>
          <h2 className="text-base font-bold text-foreground">No Subjects Found</h2>
          <p className="text-xs text-muted-foreground">
            No subjects match your selected filters. Try choosing a different semester or department.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredSubjects.map((subject) => (
            <div
              key={subject.subject_code}
              onClick={() => router.push(`/faculty/hod/curriculum/${encodeURIComponent(subject.subject_code)}`)}
              className="solid-card rounded-2xl border border-border p-5 hover:border-indigo-500/50 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden bg-card space-y-4"
            >
              <div className="space-y-3">
                {/* Header Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                    {subject.subject_code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="muted">Sem {subject.semester}</Badge>
                    <Badge variant="primary">{subject.department}</Badge>
                  </div>
                </div>

                {/* Main Subject Title */}
                <h4 className="text-base font-black text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                  {subject.subject_name}
                </h4>

                {/* Faculty Info & Session Stats */}
                <div className="pt-2 border-t border-border/60 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <FacultyAvatar firstName={subject.faculty_name || "Unassigned"} size="md" />
                    <div className="truncate">
                      {subject.faculty_id ? (
                        <Link
                          href={`/faculty/hod/faculty/${encodeURIComponent(subject.faculty_id)}`}
                          className="font-bold text-sm text-foreground/95 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline truncate block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {subject.faculty_name || "Unassigned"}
                        </Link>
                      ) : (
                        <span className="font-bold text-sm text-foreground truncate block">
                          {subject.faculty_name || "Unassigned"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground pt-1">
                    <span>Classes Conducted:</span>
                    <strong className="text-foreground font-bold font-mono">
                      {subject.total_sessions || 0} Sessions
                    </strong>
                  </div>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="pt-3 border-t border-border/80 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                <span>Open Subject Workspace</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          columns={tableColumns}
          data={filteredSubjects}
          keyExtractor={(item) => item.subject_code}
          loading={loading}
          emptyMessage="No subjects found."
          onRowClick={(item) => router.push(`/faculty/hod/curriculum/${encodeURIComponent(item.subject_code)}`)}
        />
      )}
    </main>
  );
}

