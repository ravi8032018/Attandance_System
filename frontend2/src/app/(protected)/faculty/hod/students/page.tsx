"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Student } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { useUserMe } from "@/hooks/useUserMe";

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function AcademicCapIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-6 h-6 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6" />
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

function StudentAvatar({ firstName = "", lastName = "" }: { firstName?: string; lastName?: string }) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "ST";
  return (
    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm shrink-0 border border-indigo-400/30">
      {initials}
    </div>
  );
}

export default function HODStudentsPage() {
  const router = useRouter();
  const { user } = useUserMe();
  const department = user?.department || "CS";
  const [semester, setSemester] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadStudents() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          ...(semester !== "all" ? { semester } : {}),
          ...(department ? { department } : {}),
          limit: "100",
        });
        const res = await apiFetch(`/student/my/?${params.toString()}`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setStudents(Array.isArray(data?.data) ? data.data : []);
        }
      } catch (e) {
        // console.error("Failed to load students", e);
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, [semester, department]);

  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const fullName = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (s.registration_no && s.registration_no.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.roll_number && s.roll_number.toLowerCase().includes(q))
    );
  });

  const tableColumns: Column<Student>[] = [
    {
      header: "Registration No",
      accessor: (item) => (
        <span className="font-mono text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400">
          {item.registration_no}
        </span>
      ),
    },
    {
      header: "Name",
      className: "!text-left",
      accessor: (item) => (
        <span className="font-semibold text-foreground text-left block">
          {item.first_name} {item.last_name}
        </span>
      ),
    },
    {
      header: "Department & Sem",
      accessor: (item) => (
        <div className="flex items-center justify-center gap-1.5">
          <Badge variant="primary">{item.department || department}</Badge>
          <Badge variant="muted">Sem {item.semester || semester}</Badge>
        </div>
      ),
    },
    {
      header: "Email",
      className: "!text-left",
      accessor: (item) => <span className="text-xs text-muted-foreground text-left block">{item.email}</span>,
    },
    {
      header: "Status",
      accessor: (item) => <Badge variant={item.status === "inactive" ? "error" : "success"}>{item.status || "Active"}</Badge>,
    },
    {
      header: "Action",
      accessor: (item) => (
        <Link
          href={`/faculty/get-student-by-id?reg=${encodeURIComponent(item.registration_no)}`}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          View Profile →
        </Link>
      ),
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <AcademicCapIcon className="text-indigo-600 dark:text-indigo-400" />
            <span>Student Registry & Academic Roster</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Department student directory, semester breakdown, and live academic profiles. Click any card to open detailed student analytics.
          </p>
        </div>

        {/* View Mode Toggle Button */}
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
      <div className="solid-card rounded-2xl p-4 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-1">
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="h-10 w-full sm:w-36 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Semesters</option>
              {["1", "2", "3", "4", "5", "6", "7", "8"].map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3.5 top-3 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student name, registration no, email, or roll..."
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
          Loading department student roster...
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="solid-card rounded-2xl p-12 text-center space-y-2 border border-border">
          <div className="text-3xl">👨‍🎓</div>
          <h2 className="text-base font-bold text-foreground">No Students Found</h2>
          <p className="text-xs text-muted-foreground">
            No student records match your filters or search query.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredStudents.map((s) => (
            <div
              key={s.registration_no}
              onClick={() => router.push(`/faculty/get-student-by-id?reg=${encodeURIComponent(s.registration_no)}`)}
              className="solid-card rounded-2xl border border-border p-5 hover:border-indigo-500/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between group relative bg-card space-y-4 cursor-pointer"
            >
              <div className="space-y-3">
                {/* Top ID & Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="primary">{s.department || department}</Badge>
                    <Badge variant="muted">Sem {s.semester || semester}</Badge>
                    <Badge variant={s.status === "inactive" ? "error" : "success"}>
                      {s.status || "Active"}
                    </Badge>
                  </div>
                </div>

                {/* Avatar & Student Name */}
                <div className="flex items-center gap-3 pt-1">
                  <StudentAvatar firstName={s.first_name} lastName={s.last_name} />
                  <div className="truncate">
                    <h3 className="text-base font-black text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                      {s.first_name} {s.last_name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {s.registration_no}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Action Links */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-xs font-bold">
                <Link
                  href={`/faculty/get-student-by-id?reg=${encodeURIComponent(s.registration_no)}`}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Profile & Analytics &rarr;
                </Link>

                {s.course && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70 bg-muted px-2 py-0.5 rounded-md border border-border">
                    {s.course}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <DataTable
          columns={tableColumns}
          data={filteredStudents}
          keyExtractor={(item) => item.registration_no}
          loading={loading}
          emptyMessage="No student records found."
          onRowClick={(item) => router.push(`/faculty/get-student-by-id?reg=${encodeURIComponent(item.registration_no)}`)}
        />
      )}
    </main>
  );
}

