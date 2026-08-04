"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { FacultyAvatar } from "@/components/ui/FacultyAvatar";
import { apiFetch } from "@/lib/api";
import { formatFacultyName, formatDesignation } from "@/lib/utils";
import { useUserMe } from "@/hooks/useUserMe";

interface FacultyItem {
  faculty_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  designation?: string;
  status?: string;
  assigned_count?: number;
  photo_url?: string;
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function UsersIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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

export default function HODFacultyListPage() {
  const router = useRouter();
  const { user } = useUserMe();
  const hodDept = user?.department || "CS";
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [facultyList, setFacultyList] = useState<FacultyItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchFaculty() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: "100",
          ...(search ? { first_name: search } : {}),
        });
        const res = await apiFetch(`/faculty?${params.toString()}`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
          setFacultyList(list);
        }
      } catch (e) {
        setFacultyList([
          { faculty_id: "CSFAC01", first_name: "Prodipto", last_name: "Das", email: "pd@aus.ac.in", department: "CS", designation: "Assistant Professor", assigned_count: 3 },
          { faculty_id: "CSFAC02", first_name: "Pankaj Kumar", last_name: "Deva", email: "pankaj@aus.ac.in", department: "CS", designation: "Assistant Professor", assigned_count: 2 },
          { faculty_id: "CSFAC03", first_name: "Biswa Ranjan", last_name: "Roy", email: "brr@aus.ac.in", department: "CS", designation: "Assistant Professor", assigned_count: 2 },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchFaculty();
  }, [search]);

  const filteredFaculty = facultyList.filter((f) => {
    if (f.department && f.department.toUpperCase() !== hodDept.toUpperCase()) {
      return false;
    }
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const fullName = `${f.first_name || ""} ${f.last_name || ""}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (f.faculty_id && f.faculty_id.toLowerCase().includes(q)) ||
      (f.email && f.email.toLowerCase().includes(q))
    );
  });

  const tableColumns: Column<FacultyItem>[] = [
    {
      header: "Faculty ID",
      accessor: (item) => (
        <span className="font-mono text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400">
          {item.faculty_id}
        </span>
      ),
    },
    {
      header: "Faculty Member",
      accessor: (item) => {
        const name = formatFacultyName(`${item.first_name || ""} ${item.last_name || ""}`.trim());
        return (
          <div className="flex items-center justify-center gap-3">
            <FacultyAvatar firstName={item.first_name} lastName={item.last_name} photoUrl={item.photo_url} size="sm" />
            <div>
              <span className="font-bold text-foreground block">{name}</span>
              {/* <span className="text-xs text-muted-foreground">{item.email}</span> */}
            </div>
          </div>
        );
      },
    },
    {
      header: "Designation",
      accessor: (item) => (
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">{formatDesignation(item.designation)}</span>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (item) => <Badge variant={item.status === "inactive" ? "error" : "success"}>{item.status || "Active"}</Badge>,
    },
    {
      header: "Action",
      accessor: (item) => (
        <div className="flex items-center justify-center gap-3 text-xs font-bold">
          <Link
            href={`/faculty/hod/faculty/${encodeURIComponent(item.faculty_id)}`}
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            View Details &rarr;
          </Link>
        </div>
      ),
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <UsersIcon className="text-indigo-600 dark:text-indigo-400" />
            <span>Faculty Registry & Workload</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground md:max-w-sm lg:max-w-lg xl:max-w-7xl">
            Academic subject assignments, and live attendance metrics. Click any card to open detailed faculty analytics.
          </p>
        </div>

        <div className="flex items-center gap-3 justify-center">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl border border-border">
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

          <Link
            href="/faculty/hod/faculty/assign-subject"
            className="inline-flex items-center justify-center sm:w-auto w-full gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-1 py-2 text-[11px] font-bold text-white shadow-xs transition-all active:scale-100 md:px-3 md:py-2.5"
          >
            <span>+ Assign Subjects</span>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="solid-card rounded-2xl p-4 border border-border flex flex-col md:flex-row justify-end gap-4 bg-card">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3.5 top-3 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search faculty name, ID, or email..."
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Faculty Cards / Table */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
          Loading faculty members directory...
        </div>
      ) : filteredFaculty.length === 0 ? (
        <div className="solid-card rounded-2xl p-12 text-center space-y-2 border border-border">
          <div className="text-3xl">👨‍🏫</div>
          <h2 className="text-base font-bold text-foreground">No Faculty Members Found</h2>
          <p className="text-xs text-muted-foreground">
            No faculty members match your search criteria. Try modifying your filters.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredFaculty.map((f) => {
            const rawFullName = `${f.first_name || ""} ${f.last_name || ""}`.trim();
            const formattedName = formatFacultyName(rawFullName);

            return (
              <div
                key={f.faculty_id}
                onClick={() => router.push(`/faculty/hod/faculty/${encodeURIComponent(f.faculty_id)}`)}
                className="solid-card rounded-2xl border border-border p-5 hover:border-indigo-500/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between group relative bg-card space-y-4 cursor-pointer"
              >
                <div className="space-y-3">
                  {/* Top ID & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                      {f.faculty_id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="primary">{f.department || "CS"}</Badge>
                      <Badge variant={f.status === "inactive" ? "error" : "success"}>
                        {f.status || "Active"}
                      </Badge>
                    </div>
                  </div>

                  {/* Avatar & Name formatted with Dr. prefix */}
                  <div className="flex items-center gap-3 pt-1">
                    <FacultyAvatar
                      firstName={f.first_name}
                      lastName={f.last_name}
                      photoUrl={f.photo_url}
                      size="lg"
                    />
                    <div className="truncate">
                      <h3 className="text-base font-black text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {formattedName}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">{f.email}</p>
                      <span className="text-[11px] font-semibold text-muted-foreground/80 block mt-0.5">
                        {formatDesignation(f.designation)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Links */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-xs font-bold">
                  <Link
                    href={`/faculty/hod/faculty/${encodeURIComponent(f.faculty_id)}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Details &rarr;
                  </Link>

                  <Link
                    href={`/faculty/hod/faculty/assign-subject?faculty_id=${encodeURIComponent(f.faculty_id)}`}
                    className="text-muted-foreground hover:text-foreground bg-muted px-2.5 py-1 rounded-lg border border-border hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Assign Subject
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <DataTable
          columns={tableColumns}
          data={filteredFaculty}
          keyExtractor={(item) => item.faculty_id}
          loading={loading}
          emptyMessage="No faculty members found."
          onRowClick={(item) => router.push(`/faculty/hod/faculty/${encodeURIComponent(item.faculty_id)}`)}
        />
      )}
    </main>
  );
}

